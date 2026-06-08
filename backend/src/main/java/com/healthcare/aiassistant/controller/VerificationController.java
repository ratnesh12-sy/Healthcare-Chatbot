package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.DoctorVerification;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.dto.DoctorVerificationDTO;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.service.DoctorVerificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class VerificationController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorVerificationService verificationService;

    // ── Doctor submits verification with document upload ──────────

    @PostMapping(value = "/doctors/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> submitVerification(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("licenseNumber") String licenseNumber,
            @RequestParam("specialty") String specialty,
            @RequestParam("document") MultipartFile document) {

        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();

        verificationService.submitVerification(
                user, licenseNumber, specialty, document);

        return ResponseEntity.ok(Map.of("message", "Verification submitted successfully."));
    }

    // ── Admin fetches all verifications ───────────────────────────

    @GetMapping("/admin/doctors/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DoctorVerificationDTO>> getVerifications() {
        List<DoctorVerificationDTO> dtos = verificationService.getAllVerifications().stream()
                .map(DoctorVerificationDTO::from)
                .toList();
        return ResponseEntity.ok(dtos);
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

    // ── Admin views uploaded document (redirect to Supabase signed URL) ──

    @GetMapping("/admin/doctors/verify/document/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String signedUrl = verificationService.getDocumentSignedUrl(id, userDetails.getUsername());

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, signedUrl)
                .build();
    }
}
