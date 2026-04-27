package com.healthcare.aiassistant.config;

import com.healthcare.aiassistant.model.DoctorVerification;
import com.healthcare.aiassistant.model.ERequestStatus;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.DoctorVerificationRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Demo-only startup initializer that preloads sample doctor license documents
 * into the uploads directory. This ensures documents survive ephemeral filesystem
 * resets (e.g., Render restarts) during live demonstrations.
 *
 * <p>On startup:
 * <ol>
 *   <li>Copies bundled demo license images from classpath to /uploads</li>
 *   <li>Creates corresponding DoctorVerification records (if missing)</li>
 * </ol>
 *
 * <p>TODO (Prod): Remove this component and migrate to S3/Cloudinary for persistent storage.
 */
@Component
public class DemoFileInitializer {

    private static final Logger log = LoggerFactory.getLogger(DemoFileInitializer.class);
    private static final Path BASE_UPLOAD_DIR = Paths.get("uploads", "doctor-verifications");

    // Maps demo doctor usernames to their bundled license files
    private static final Map<String, DemoDoctor> DEMO_DOCTORS = Map.of(
            "dr.sharma", new DemoDoctor("doctor_license_sharma.png", "MCI-2024-78432", "Cardiologist"),
            "dr.mehta",  new DemoDoctor("doctor_license_mehta.png",  "MCI-2024-56219", "Dermatologist"),
            "dr.iyer",   new DemoDoctor("doctor_license_iyer.png",   "MCI-2023-34891", "General Physician")
    );

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorVerificationRepository verificationRepository;

    @PostConstruct
    public void loadDemoFiles() {
        log.warn("DEMO_MODE: Initializing demo verification documents. Remove this in production.");

        for (var entry : DEMO_DOCTORS.entrySet()) {
            String username = entry.getKey();
            DemoDoctor demo = entry.getValue();

            try {
                Optional<User> userOpt = userRepository.findByUsername(username);
                if (userOpt.isEmpty()) {
                    log.debug("Demo doctor '{}' not found in DB — skipping", username);
                    continue;
                }

                User doctorUser = userOpt.get();

                // 1. Copy file from classpath to uploads directory
                Path targetDir = BASE_UPLOAD_DIR.resolve(String.valueOf(doctorUser.getId()));
                Files.createDirectories(targetDir);

                Path targetFile = targetDir.resolve(demo.filename);

                // Only copy if file doesn't already exist (idempotent)
                if (!Files.exists(targetFile)) {
                    Resource resource = new ClassPathResource("demo-documents/" + demo.filename);
                    if (!resource.exists()) {
                        log.warn("Demo file not found on classpath: {}", demo.filename);
                        continue;
                    }

                    try (InputStream is = resource.getInputStream()) {
                        Files.copy(is, targetFile, StandardCopyOption.REPLACE_EXISTING);
                    }
                    log.info("DEMO_FILE_LOADED username={} file={}", username, targetFile);
                }

                // 2. Create verification record if none exists
                Optional<DoctorVerification> existingVerification = verificationRepository.findByDoctor(doctorUser);
                if (existingVerification.isEmpty()) {
                    DoctorVerification verification = new DoctorVerification(
                            doctorUser, demo.licenseNumber, demo.specialty);
                    verification.setStatus(ERequestStatus.APPROVED);
                    verification.setSubmittedAt(LocalDateTime.now().minusDays(7));
                    verification.setResolvedAt(LocalDateTime.now().minusDays(6));
                    verification.setDocumentPath(targetFile.toAbsolutePath().normalize().toString());
                    verificationRepository.save(verification);

                    log.info("DEMO_VERIFICATION_CREATED username={} status=APPROVED", username);
                } else {
                    // Update document path if record exists but file was re-copied
                    DoctorVerification v = existingVerification.get();
                    if (v.getDocumentPath() == null || !Files.exists(Paths.get(v.getDocumentPath()))) {
                        v.setDocumentPath(targetFile.toAbsolutePath().normalize().toString());
                        verificationRepository.save(v);
                        log.info("DEMO_VERIFICATION_UPDATED username={} documentPath restored", username);
                    }
                }

            } catch (IOException e) {
                log.error("Failed to load demo file for {}: {}", username, e.getMessage());
                // Non-fatal — don't crash the app
            }
        }

        log.info("DEMO_MODE: Demo file initialization complete.");
    }

    private record DemoDoctor(String filename, String licenseNumber, String specialty) {}
}
