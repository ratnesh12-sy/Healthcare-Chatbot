package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.ERole;
import com.healthcare.aiassistant.model.Role;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.request.LoginRequest;
import com.healthcare.aiassistant.payload.request.SignupRequest;
import com.healthcare.aiassistant.payload.response.JwtResponse;
import com.healthcare.aiassistant.payload.response.MessageResponse;
import com.healthcare.aiassistant.repository.RoleRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.security.jwt.JwtUtils;
import com.healthcare.aiassistant.security.services.UserDetailsImpl;
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

@CrossOrigin(origins = "*", maxAge = 3600)
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
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.domain:}")
    private String cookieDomain;

    private ResponseCookie buildAuthCookie(String token, boolean expired) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from("token", token)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSecure ? "None" : "Lax")
            .path("/")
            .maxAge(expired ? 0 : 7 * 24 * 60 * 60);

        if (cookieDomain != null && !cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }

        return builder.build();
    }

    @GetMapping("/testlogin")
    public ResponseEntity<?> testLogin() {
        User u = userRepository.findAll().get(0);
        boolean matches = encoder.matches("password123", u.getPassword());
        boolean matches2 = encoder.matches("password", u.getPassword());
        return ResponseEntity.ok("USER: " + u.getUsername() + ", HASH: " + u.getPassword() + ", matches 'password123': " + matches + ", matches 'password': " + matches2);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
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

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(new JwtResponse(jwt,
                    userDetails.getId(),
                    userDetails.getUsername(),
                    userDetails.getEmail(),
                    roles));
        } catch (Exception e) {
            e.printStackTrace();
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(new MessageResponse("Error: " + e.getMessage()));
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

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", userDetails.getId());
        userInfo.put("username", userDetails.getUsername());
        userInfo.put("email", userDetails.getEmail());
        userInfo.put("roles", roles);

        return ResponseEntity.ok(userInfo);
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
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
                    break;
                case "doctor":
                    role = roleRepository.findByName(ERole.ROLE_DOCTOR)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    break;
                default:
                    role = roleRepository.findByName(ERole.ROLE_PATIENT)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            }
        }

        user.setRole(role);
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }
}
