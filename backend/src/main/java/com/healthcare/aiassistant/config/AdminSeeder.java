package com.healthcare.aiassistant.config;

import com.healthcare.aiassistant.model.ERole;
import com.healthcare.aiassistant.model.Role;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.RoleRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_EMAIL:#{null}}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:#{null}}")
    private String adminPassword;

    public AdminSeeder(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // 1. Transaction Safety: Prevent partial writes by binding logic to a database transaction.
    @Override
    @Transactional
    public void run(String... args) {
        // 2. Startup Visibility
        logger.info("Running Admin Seeder...");

        try {
            if (adminEmail == null || adminPassword == null || adminEmail.isBlank() || adminPassword.isBlank()) {
                logger.error("Admin seeding skipped: ADMIN_EMAIL or ADMIN_PASSWORD environment variables are missing.");
                return;
            }

            // 3. Repository Consistency: Using findByEmail
            if (userRepository.findByEmail(adminEmail).isPresent()) {
                logger.info("Admin already exists.");
                return;
            }

            // Recommend adding UNIQUE constraint on Role.name in DB
            Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                    .orElseGet(() -> {
                        try {
                            return roleRepository.save(new Role(null, ERole.ROLE_ADMIN));
                        } catch (Exception e) {
                            return roleRepository.findByName(ERole.ROLE_ADMIN)
                                    .orElseThrow(() -> new RuntimeException("ROLE_ADMIN not found"));
                        }
                    });

            int atIndex = adminEmail.indexOf("@");
            String baseUsername = atIndex > 0 ? adminEmail.substring(0, atIndex) : "admin";
            String username = baseUsername;
            int counter = 1;

            // 4. Username Collision Fix: Safe check for existing usernames
            while (userRepository.existsByUsername(username)) {
                username = baseUsername + counter;
                counter++;
            }

            User adminUser = new User();
            adminUser.setFullName("Super Admin");
            adminUser.setUsername(username);
            adminUser.setEmail(adminEmail);
            adminUser.setPassword(passwordEncoder.encode(adminPassword));
            
            // 5. Role Mapping: Applying to single Role explicitly as per User entity architecture
            adminUser.setRole(adminRole);
            
            adminUser.setEmailNotificationsEnabled(true);
            adminUser.setTwoFactorEnabled(false);

            try {
                userRepository.save(adminUser);
                logger.info("Admin created successfully.");
            } catch (Exception ex) {
                logger.warn("Admin creation skipped (likely concurrent initialization): {}", ex.getMessage());
            }

        } catch (Exception e) {
            // 6. Logging Improvement: Includes standard trace output
            logger.error("Admin seeding failed.", e);
        }
    }
}
