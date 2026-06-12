package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.ERole;
import com.healthcare.aiassistant.model.Role;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.request.LoginRequest;
import com.healthcare.aiassistant.payload.request.SignupRequest;
import com.healthcare.aiassistant.payload.response.JwtResponse;
import com.healthcare.aiassistant.payload.response.MessageResponse;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.RoleRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.security.jwt.JwtUtils;
import com.healthcare.aiassistant.security.services.UserDetailsImpl;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.Collections;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import java.util.HashMap;
import java.util.Map;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;


@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    DoctorRepository doctorRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    com.healthcare.aiassistant.service.SettingsService settingsService;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.domain:}")
    private String cookieDomain;

    @Value("${google.client-id:}")
    private String googleClientId;

    private ResponseCookie buildAuthCookie(String token, boolean expired) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from("token", token)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSecure ? "None" : "Lax")
            .path("/")
            .maxAge(expired ? 0 : jwtUtils.getSessionMillis() / 1000);

        if (cookieDomain != null && !cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }

        return builder.build();
    }



    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            ResponseCookie cookie = buildAuthCookie(jwt, false);

            // Resolve verification status for doctors
            String verificationStatus = resolveVerificationStatus(userDetails.getId(), roles);

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(new JwtResponse(jwt,
                    userDetails.getId(),
                    userDetails.getUsername(),
                    userDetails.getEmail(),
                    userDetails.getFullName(),
                    userDetails.getIsProfileComplete(),
                    roles,
                    verificationStatus));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Invalid username or password"));
        } catch (org.springframework.security.authentication.DisabledException e) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(new MessageResponse("Your account has been suspended. Please contact an administrator."));
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Login failed. Please try again."));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser() {
        ResponseCookie cookie = buildAuthCookie("", true);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new MessageResponse("You've been signed out!"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED)
                .body(new MessageResponse("Unauthorized"));
        }

        Object principal = authentication.getPrincipal();

        if (!(principal instanceof UserDetailsImpl userDetails)) {
            return ResponseEntity.status(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED)
                .body(new MessageResponse("Invalid authentication principal"));
        }

        List<String> roles = userDetails.getAuthorities()
            .stream()
            .map(item -> item.getAuthority())
            .collect(Collectors.toList());

        // Resolve verification status for doctors
        String verificationStatus = resolveVerificationStatus(userDetails.getId(), roles);

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", userDetails.getId());
        userInfo.put("username", userDetails.getUsername());
        userInfo.put("email", userDetails.getEmail());
        userInfo.put("fullName", userDetails.getFullName());
        userInfo.put("profileComplete", userDetails.getIsProfileComplete());
        userInfo.put("roles", roles);
        userInfo.put("verificationStatus", verificationStatus);

        return ResponseEntity.ok(userInfo);
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        // Registration toggle (admin setting).
        if (!settingsService.getBoolean(com.healthcare.aiassistant.service.SettingsService.REGISTRATION_ENABLED)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(new MessageResponse("New registrations are currently disabled."));
        }

        // Minimum password length (admin setting).
        int minLen = settingsService.getInt(com.healthcare.aiassistant.service.SettingsService.MIN_PASSWORD_LENGTH);
        if (signUpRequest.getPassword() == null || signUpRequest.getPassword().length() < minLen) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Password must be at least " + minLen + " characters."));
        }

        if (userRepository.existsByUsernameIgnoreCase(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Email is already in use!"));
        }

        // Double encode blockade
        if (signUpRequest.getPassword().matches("^\\$2[aby]\\$.*")) {
             return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Password should not already be encoded."));
        }

        // Create new user's account
        User user = new User(signUpRequest.getUsername(),
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()));

        user.setFullName(signUpRequest.getFullName());

        String strRole = signUpRequest.getRole();
        Role role;

        if (strRole == null) {
            role = roleRepository.findByName(ERole.ROLE_PATIENT)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
        } else {
            switch (strRole.toLowerCase()) {
                case "admin":
                    role = roleRepository.findByName(ERole.ROLE_ADMIN)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    user.setIsProfileComplete(true);
                    break;
                case "doctor":
                    role = roleRepository.findByName(ERole.ROLE_DOCTOR)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    user.setIsProfileComplete(false);
                    break;
                default:
                    role = roleRepository.findByName(ERole.ROLE_PATIENT)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    user.setIsProfileComplete(true);
            }
        }

        user.setRole(role);
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleSignIn(@RequestBody Map<String, String> body) {
        if (!settingsService.getBoolean(com.healthcare.aiassistant.service.SettingsService.GOOGLE_SIGNIN_ENABLED)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new MessageResponse("Google sign-in is currently disabled."));
        }
        String idTokenString = body.get("idToken");
        if (idTokenString == null || idTokenString.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Missing Google credential."));
        }
        if (googleClientId == null || googleClientId.isBlank()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new MessageResponse("Google sign-in is not configured."));
        }

        // 1. Verify the ID token against Google's public keys, scoped to our client id.
        GoogleIdToken idToken;
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            idToken = verifier.verify(idTokenString);
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Could not verify Google token."));
        }
        if (idToken == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Invalid Google token."));
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Your Google email is not verified."));
        }

        String email = payload.getEmail();
        String googleSub = payload.getSubject();
        String name = (String) payload.get("name");
        String picture = (String) payload.get("picture");

        // 2. Auto-link by verified email, or create a new patient account.
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setUsername(generateUniqueUsername(email));
            user.setFullName((name != null && !name.isBlank()) ? name : email);
            user.setPassword(null);
            user.setAvatarUrl(picture);
            user.setGoogleSub(googleSub);
            user.setAuthProvider("GOOGLE");
            user.setIsProfileComplete(true); // new Google users are patients
            Role patientRole = roleRepository.findByName(ERole.ROLE_PATIENT)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            user.setRole(patientRole);
            userRepository.save(user);
        } else if (user.getGoogleSub() == null) {
            // Existing password account with the same verified email → link it.
            user.setGoogleSub(googleSub);
            userRepository.save(user);
        }

        // 3. Issue our own JWT cookie — identical session to a normal login.
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        String jwt = jwtUtils.generateJwtToken(authentication);

        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        ResponseCookie cookie = buildAuthCookie(jwt, false);
        String verificationStatus = resolveVerificationStatus(userDetails.getId(), roles);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new JwtResponse(jwt,
                        userDetails.getId(),
                        userDetails.getUsername(),
                        userDetails.getEmail(),
                        userDetails.getFullName(),
                        userDetails.getIsProfileComplete(),
                        roles,
                        verificationStatus));
    }

    /** Derives a unique username from a Google email's local part. */
    private String generateUniqueUsername(String email) {
        String base = email.split("@")[0].replaceAll("[^a-zA-Z0-9._-]", "");
        if (base.isBlank()) base = "user";
        if (base.length() > 40) base = base.substring(0, 40);
        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsernameIgnoreCase(candidate)) {
            candidate = base + suffix;
            suffix++;
        }
        return candidate;
    }

    /**
     * Resolves the verification status for doctor users.
     * Returns null for non-doctor roles (patients, admins).
     */
    private String resolveVerificationStatus(Long userId, List<String> roles) {
        if (!roles.contains("ROLE_DOCTOR")) {
            return null;
        }
        // Use findByUser_Id to avoid LazyInitializationException
        // (loading User proxy then passing it to findByUser fails outside a session)
        return doctorRepository.findByUser_Id(userId)
                .map(doctor -> {
                    var status = doctor.getVerificationStatus();
                    return status != null ? status.name() : null;
                })
                .orElse(null);
    }
}
