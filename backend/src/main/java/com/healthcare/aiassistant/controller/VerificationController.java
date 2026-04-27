package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.DoctorVerification;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.service.DoctorVerificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class VerificationController {

    private static final Logger log = LoggerFactory.getLogger(VerificationController.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorVerificationService verificationService;

    // ── Doctor submits verification with document upload ──────────

    @PostMapping(value = "/doctors/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR')")
    public ResponseEntity<?> submitVerification(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("licenseNumber") String licenseNumber,
            @RequestParam("specialty") String specialty,
            @RequestParam("document") MultipartFile document) {

        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();

        DoctorVerification verification = verificationService.submitVerification(
                user, licenseNumber, specialty, document);

        return ResponseEntity.ok(Map.of("message", "Verification submitted successfully."));
    }

    // ── Admin fetches all verifications ───────────────────────────

    @GetMapping("/admin/doctors/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DoctorVerification>> getVerifications() {
        return ResponseEntity.ok(verificationService.getAllVerifications());
    }

    // ── Admin approves or rejects ────────────────────────────────

    @PutMapping("/admin/doctors/verify/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resolveVerification(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal UserDetails userDetails) {

        String action = payload.get("action"); // "APPROVE" or "REJECT"

        DoctorVerification verification = verificationService.resolveVerification(
                id, action, userDetails.getUsername());

        return ResponseEntity.ok(Map.of(
                "message", "Verification request " + action.toLowerCase() + "d successfully.",
                "status", verification.getStatus().name()));
    }

    // ── Admin views uploaded document ─────────────────────────────

    @GetMapping("/admin/doctors/verify/document/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Resource> getDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        Path filePath = verificationService.getDocumentFile(id, userDetails.getUsername());

        try {
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            // Dynamic content type detection (never hardcode APPLICATION_PDF)
            String contentType;
            try {
                contentType = Files.probeContentType(filePath);
            } catch (IOException e) {
                contentType = null;
            }
            if (contentType == null) {
                contentType = "application/octet-stream"; // Safe fallback
            }

            // Content-Disposition: inline so PDFs/images preview in browser
            String filename = filePath.getFileName().toString();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);

        } catch (MalformedURLException e) {
            log.error("Failed to construct resource URL for verification document id={}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
