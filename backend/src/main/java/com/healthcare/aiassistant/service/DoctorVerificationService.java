package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.exception.DoctorNotVerifiedException;
import com.healthcare.aiassistant.exception.InvalidVerificationTransitionException;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.DoctorVerification;
import com.healthcare.aiassistant.model.ERequestStatus;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.DoctorVerificationRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Centralized service for all doctor verification operations.
 * Enforces state machine transitions, ownership, file handling, and audit logging.
 */
@Service
public class DoctorVerificationService {

    private static final Logger log = LoggerFactory.getLogger(DoctorVerificationService.class);

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf", "image/jpeg", "image/png"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "jpg", "jpeg", "png"
    );
    private static final Path BASE_UPLOAD_DIR = Paths.get("uploads", "doctor-verifications");

    @Autowired
    private DoctorVerificationRepository verificationRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private VerificationStateMachine stateMachine;

    @Autowired
    private Clock clock;

    // ── Submit Verification (with file upload) ────────────────────

    @Transactional
    public DoctorVerification submitVerification(User currentUser, String licenseNumber,
                                                  String specialty, MultipartFile document) {
        // 1. Null safety & validation
        if (licenseNumber == null || licenseNumber.isBlank()) {
            throw new IllegalArgumentException("License number is required");
        }
        if (specialty == null || specialty.isBlank()) {
            throw new IllegalArgumentException("Specialty is required");
        }

        // 2. File validation
        validateDocument(document);

        // 3. Find doctor record
        Doctor doctor = doctorRepository.findByUser(currentUser)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));

        // 4. Ownership protection — doctors can only submit their own verification
        if (!currentUser.getId().equals(doctor.getUser().getId())) {
            log.warn("VERIFICATION_FAILED reason=UNAUTHORIZED_OWNERSHIP doctorId={} attemptedBy={}",
                    doctor.getId(), currentUser.getId());
            throw new org.springframework.security.access.AccessDeniedException(
                    "Cannot submit verification for another user");
        }

        // 5. Determine current status (virtual NOT_SUBMITTED for null)
        String currentVerificationStatus = Optional.ofNullable(doctor.getVerificationStatus()).orElse(null);
        ERequestStatus currentStatus = mapStringToStatus(currentVerificationStatus);

        // 6. State machine check
        if (!stateMachine.isValidTransition(currentStatus, ERequestStatus.PENDING)) {
            String label = stateMachine.getStatusLabel(currentStatus);
            log.warn("VERIFICATION_FAILED reason=INVALID_TRANSITION doctorId={} currentStatus={} attemptedStatus=PENDING",
                    doctor.getId(), label);
            if (currentStatus == ERequestStatus.PENDING) {
                throw new InvalidVerificationTransitionException("Verification already in progress");
            }
            throw new InvalidVerificationTransitionException(
                    "Invalid verification state transition from " + label + " to PENDING");
        }

        // 7. Upsert: update existing record or create new
        Optional<DoctorVerification> existingOpt = verificationRepository.findByDoctor(currentUser);
        DoctorVerification verification;
        String oldDocumentPath = null;

        if (existingOpt.isPresent()) {
            verification = existingOpt.get();
            oldDocumentPath = verification.getDocumentPath(); // track for cleanup
            verification.setStatus(ERequestStatus.PENDING);
            verification.setLicenseNumber(licenseNumber);
            verification.setSpecialty(specialty);
            verification.setSubmittedAt(LocalDateTime.now(clock));
            verification.setResolvedAt(null);
        } else {
            verification = new DoctorVerification(currentUser, licenseNumber, specialty);
            verification.setSubmittedAt(LocalDateTime.now(clock));
        }

        // 8. Save file to disk
        Path savedFilePath = null;
        try {
            savedFilePath = saveDocumentFile(document, doctor.getId());
            verification.setDocumentPath(savedFilePath.toString());
        } catch (IOException e) {
            log.warn("DOCUMENT_UPLOAD_FAILED doctorId={} reason={} timestamp={}",
                    doctor.getId(), e.getMessage(), Instant.now());
            throw new RuntimeException("Failed to save uploaded document", e);
        }

        // 9. Save to DB — with manual rollback if DB fails after file write
        try {
            verificationRepository.save(verification);

            // 10. Sync doctor entity
            doctor.setVerificationStatus("PENDING");
            doctor.setLicenseNumber(licenseNumber);
            doctor.setSpecialization(specialty);
            doctorRepository.save(doctor);
        } catch (Exception dbException) {
            // Manual rollback: delete the newly uploaded file since DB save failed
            log.error("DB_SAVE_FAILED doctorId={} — rolling back uploaded file", doctor.getId(), dbException);
            cleanupFile(savedFilePath);
            throw dbException;
        }

        // 11. Delete old file AFTER successful DB save (safe replacement)
        if (oldDocumentPath != null) {
            cleanupFile(Paths.get(oldDocumentPath));
            log.info("DOCUMENT_DELETED doctorId={} oldPath={} timestamp={}",
                    doctor.getId(), oldDocumentPath, Instant.now());
        }

        log.info("DOCUMENT_UPLOADED doctorId={} fileName={} timestamp={}",
                doctor.getId(), savedFilePath.getFileName(), Instant.now());
        log.info("VERIFICATION_ACTION doctorId={} oldStatus={} newStatus=PENDING action=SUBMIT",
                doctor.getId(), stateMachine.getStatusLabel(currentStatus));

        return verification;
    }

    // ── Resolve Verification (Admin) ──────────────────────────────

    @Transactional
    public DoctorVerification resolveVerification(Long verificationId, String action, String adminUsername) {
        DoctorVerification verification = verificationRepository.findById(verificationId)
                .orElseThrow(() -> new RuntimeException("Verification request not found"));

        // 1. Race condition prevention — ensure still PENDING
        if (verification.getStatus() != ERequestStatus.PENDING) {
            log.warn("VERIFICATION_FAILED reason=ALREADY_PROCESSED verificationId={} currentStatus={}",
                    verificationId, verification.getStatus());
            throw new InvalidVerificationTransitionException(
                    "Verification already " + verification.getStatus());
        }

        // 2. Determine new status from action
        ERequestStatus newStatus;
        if ("APPROVE".equalsIgnoreCase(action)) {
            newStatus = ERequestStatus.APPROVED;
        } else if ("REJECT".equalsIgnoreCase(action)) {
            newStatus = ERequestStatus.REJECTED;
        } else {
            throw new IllegalArgumentException("Invalid action: " + action + ". Expected APPROVE or REJECT.");
        }

        // 3. State machine validation
        ERequestStatus oldStatus = verification.getStatus();
        if (!stateMachine.isValidTransition(oldStatus, newStatus)) {
            log.warn("VERIFICATION_FAILED reason=INVALID_TRANSITION verificationId={} currentStatus={} attemptedStatus={}",
                    verificationId, oldStatus, newStatus);
            throw new InvalidVerificationTransitionException(
                    "Invalid verification state transition from " + oldStatus + " to " + newStatus);
        }

        // 4. Update verification
        verification.setStatus(newStatus);
        verification.setResolvedAt(LocalDateTime.now(clock));
        verificationRepository.save(verification);

        // 5. Sync doctor entity — NO ROLE MUTATION
        User doctorUser = verification.getDoctor();
        Doctor doctor = doctorRepository.findByUser(doctorUser)
                .orElse(null);
        if (doctor != null) {
            doctor.setVerificationStatus(newStatus.name());
            doctorRepository.save(doctor);
        }

        // 6. Structured audit logging with before/after
        String auditDetails = String.format(
                "Doctor verification changed from %s to %s by admin=%s for doctorId=%d",
                oldStatus, newStatus, adminUsername, doctorUser.getId());
        auditService.logAction(adminUsername, "VERIFICATION_" + action.toUpperCase(),
                doctorUser.getId(), auditDetails);

        log.info("VERIFICATION_ACTION verificationId={} doctorId={} adminUser={} oldStatus={} newStatus={} timestamp={}",
                verificationId, doctorUser.getId(), adminUsername,
                oldStatus, newStatus, Instant.now());

        return verification;
    }

    // ── Document Access ───────────────────────────────────────────

    /**
     * Loads a verification document from disk for admin viewing.
     * Validates path safety and file existence.
     *
     * @return the normalized, absolute Path to the file
     * @throws RuntimeException if document is missing or path is unsafe
     */
    public Path getDocumentFile(Long verificationId, String adminUsername) {
        DoctorVerification verification = verificationRepository.findById(verificationId)
                .orElseThrow(() -> new RuntimeException("Verification request not found"));

        String docPath = verification.getDocumentPath();
        if (docPath == null || docPath.isBlank()) {
            log.warn("DOCUMENT_ACCESS_FAILED adminId={} doctorId={} reason=NO_DOCUMENT timestamp={}",
                    adminUsername, verification.getDoctor().getId(), Instant.now());
            throw new RuntimeException("No document uploaded for this verification");
        }

        // Path safety: normalize and ensure it's within our upload directory
        Path filePath = Paths.get(docPath).toAbsolutePath().normalize();
        Path safeBaseDir = BASE_UPLOAD_DIR.toAbsolutePath().normalize();

        if (!filePath.startsWith(safeBaseDir)) {
            log.warn("DOCUMENT_ACCESS_FAILED adminId={} doctorId={} reason=PATH_TRAVERSAL_ATTEMPT path={} timestamp={}",
                    adminUsername, verification.getDoctor().getId(), docPath, Instant.now());
            throw new RuntimeException("Invalid document path");
        }

        if (!Files.exists(filePath)) {
            log.warn("DOCUMENT_ACCESS_FAILED adminId={} doctorId={} reason=FILE_NOT_FOUND path={} timestamp={}",
                    adminUsername, verification.getDoctor().getId(), docPath, Instant.now());
            throw new RuntimeException("Document file not found on server");
        }

        log.info("DOCUMENT_ACCESSED adminId={} doctorId={} timestamp={}",
                adminUsername, verification.getDoctor().getId(), Instant.now());

        return filePath;
    }

    // ── Queries ───────────────────────────────────────────────────

    public List<DoctorVerification> getAllVerifications() {
        return verificationRepository.findAllByOrderBySubmittedAtDesc();
    }

    public List<DoctorVerification> getVerificationsByStatus(ERequestStatus status) {
        return verificationRepository.findByStatusOrderBySubmittedAtDesc(status);
    }

    // ── Guard Methods ─────────────────────────────────────────────

    /**
     * Centralized guard — throws if doctor is not APPROVED.
     * Use in any controller that restricts actions to verified doctors.
     */
    public void ensureDoctorVerified(Doctor doctor) {
        String status = Optional.ofNullable(doctor.getVerificationStatus()).orElse("NOT_SUBMITTED");
        if (!"APPROVED".equals(status)) {
            log.warn("VERIFICATION_FAILED reason=UNAUTHORIZED_ACCESS doctorId={} currentStatus={}",
                    doctor.getId(), status);
            throw new DoctorNotVerifiedException("Doctor not verified. Current status: " + status);
        }
    }

    /**
     * Service-level method to get only verified doctors.
     * Single source of truth — never expose findAll() for public endpoints.
     */
    public List<Doctor> getVerifiedDoctors() {
        return doctorRepository.findByVerificationStatus("APPROVED");
    }

    // ── File Handling Helpers ─────────────────────────────────────

    /**
     * Validates the uploaded document for type, size, and emptiness.
     */
    private void validateDocument(MultipartFile document) {
        if (document == null || document.isEmpty()) {
            throw new IllegalArgumentException("Verification document is required");
        }

        // Size check
        if (document.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 5MB limit");
        }

        // MIME type check
        String contentType = document.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Invalid file type. Allowed: PDF, JPG, PNG");
        }

        // Extension check (defense in depth — don't trust content-type alone)
        String originalFilename = document.getOriginalFilename();
        if (originalFilename != null) {
            String ext = getFileExtension(originalFilename).toLowerCase();
            if (!ALLOWED_EXTENSIONS.contains(ext)) {
                throw new IllegalArgumentException("Invalid file extension. Allowed: .pdf, .jpg, .jpeg, .png");
            }
        }

        // Corrupted stream check
        try {
            if (document.getInputStream() == null) {
                throw new IllegalArgumentException("Uploaded file appears to be corrupted");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read uploaded file");
        }
    }

    /**
     * Saves the document to disk using a safe, unique filename.
     * Structure: uploads/doctor-verifications/{doctorId}/verification_{timestamp}_{uuid}.{ext}
     */
    private Path saveDocumentFile(MultipartFile document, Long doctorId) throws IOException {
        Path doctorDir = BASE_UPLOAD_DIR.resolve(String.valueOf(doctorId));
        Files.createDirectories(doctorDir);

        String originalFilename = document.getOriginalFilename();
        String ext = (originalFilename != null) ? getFileExtension(originalFilename) : "pdf";
        // Sanitized filename: no user-supplied characters, UUID prevents collision
        String safeFilename = "verification_" + System.currentTimeMillis() + "_"
                + UUID.randomUUID().toString().substring(0, 8) + "." + ext;

        Path filePath = doctorDir.resolve(safeFilename).toAbsolutePath().normalize();

        // TODO (Prod): Integrate ClamAV or similar stream-based virus scanning before disk write.
        Files.copy(document.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return filePath;
    }

    /**
     * Safely deletes a file if it exists. Logs but does not throw on failure.
     */
    private void cleanupFile(Path path) {
        if (path == null) return;
        try {
            boolean deleted = Files.deleteIfExists(path.toAbsolutePath().normalize());
            if (deleted) {
                log.debug("Cleaned up file: {}", path);
            }
        } catch (IOException e) {
            log.warn("Failed to cleanup file: {} — {}", path, e.getMessage());
        }
    }

    /**
     * Extracts file extension from a filename.
     */
    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        return (lastDot > 0) ? filename.substring(lastDot + 1) : "";
    }

    // ── Status Helpers ────────────────────────────────────────────

    /**
     * Maps the string-based verificationStatus on Doctor entity to ERequestStatus enum.
     * Returns null for null/"NOT_SUBMITTED" (treated as virtual NOT_SUBMITTED state).
     */
    private ERequestStatus mapStringToStatus(String status) {
        if (status == null || status.isBlank() || "NOT_SUBMITTED".equals(status)) {
            return null;
        }
        try {
            return ERequestStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
