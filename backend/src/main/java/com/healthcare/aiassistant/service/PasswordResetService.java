package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.PasswordResetToken;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.PasswordResetTokenRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

/**
 * Forgot-password flow: issue a single-use, short-lived, hashed token and email a reset link;
 * then consume that token to set a new password.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.password-reset.expiry-minutes:30}")
    private int expiryMinutes;

    /**
     * Issues a reset token and emails the link IF the email maps to an active, password-based
     * account. Returns silently in every case (unknown email, Google-only, soft-deleted) so the
     * endpoint cannot be used to enumerate which emails are registered.
     */
    @Transactional
    public void requestReset(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        User user = userRepository.findByEmail(email.trim()).orElse(null);

        // Eligible only if: account exists, not soft-deleted, and has a local password to reset
        // (Google-only accounts have a null password — nothing to reset).
        if (user == null || user.getDeletedAt() != null || user.getPassword() == null) {
            log.info("Password reset requested for a non-eligible email — no token issued.");
            return;
        }

        // Replace any outstanding tokens for this user, then issue a fresh one.
        tokenRepository.deleteByUserId(user.getId());

        String rawToken = generateToken();
        PasswordResetToken token = new PasswordResetToken(
                user, sha256(rawToken), LocalDateTime.now().plusMinutes(expiryMinutes));
        tokenRepository.save(token);

        String link = frontendUrl + "/reset-password?token=" + rawToken;
        String who = user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName() : user.getUsername();
        String body = "Hi " + who + ",\n\n"
                + "We received a request to reset your HealthCare AI Assistant password.\n"
                + "Use the link below to choose a new password (valid for " + expiryMinutes + " minutes):\n\n"
                + link + "\n\n"
                + "If you didn't request this, you can safely ignore this email — your password won't change.\n\n"
                + "— HealthCare AI Assistant";
        emailService.send(user.getEmail(), "Reset your password", body);

        // Logged so the flow is testable in local dev where SMTP is off (EmailService no-ops).
        if (!emailService.isConfigured()) {
            log.info("Password reset link (SMTP off, dev only) for userId={}: {}", user.getId(), link);
        } else {
            log.info("Password reset link emailed for userId={}", user.getId());
        }
    }

    /**
     * Consumes a reset token and sets the new password.
     *
     * @return true on success; false if the token is missing, invalid, expired, or already used.
     *         (Password-length validation is handled by the caller against the admin setting.)
     */
    @Transactional
    public boolean resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank() || newPassword == null || newPassword.isBlank()) {
            return false;
        }

        Optional<PasswordResetToken> opt = tokenRepository.findByTokenHash(sha256(rawToken));
        if (opt.isEmpty()) {
            return false;
        }
        PasswordResetToken token = opt.get();
        if (token.isUsed() || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            return false;
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Single-use: mark consumed, then drop any other outstanding tokens for this user.
        token.setUsed(true);
        tokenRepository.save(token);
        tokenRepository.deleteByUserId(user.getId());

        log.info("Password reset completed for userId={}", user.getId());
        return true;
    }

    /** 256 bits of URL-safe randomness — the raw token that goes in the emailed link. */
    private String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Hex SHA-256 (64 chars) — only this is stored, never the raw token. */
    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
