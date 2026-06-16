package com.healthcare.aiassistant.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends plain-text email notifications.
 *
 * <p>Gracefully no-ops when SMTP isn't configured: Spring Boot only creates a {@link JavaMailSender}
 * bean when {@code spring.mail.host} is set, so {@code mailSender} is null otherwise. Sends are async
 * and never throw into the calling flow (failures are logged), mirroring the push-notification service.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.email.from:HealthCare AI Assistant <no-reply@healthcare.local>}")
    private String from;

    public boolean isConfigured() {
        return mailSender != null;
    }

    @Async
    public void send(String to, String subject, String body) {
        if (mailSender == null) {
            log.debug("Email skipped (SMTP not configured): to={} subject={}", to, subject);
            return;
        }
        if (to == null || to.isBlank()) {
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent to {} (subject: {})", to, subject);
        } catch (Exception e) {
            // Never let a mail failure break the triggering action (booking, signup, etc.).
            Throwable root = e;
            while (root.getCause() != null) {
                root = root.getCause();
            }
            log.warn("Email send failed to {}: {} | cause: {}", to, e.getMessage(), root.getMessage());
        }
    }
}
