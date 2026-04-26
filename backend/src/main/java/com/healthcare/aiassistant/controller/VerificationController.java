package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.DoctorVerification;
import com.healthcare.aiassistant.model.ERequestStatus;
import com.healthcare.aiassistant.model.ERole;
import com.healthcare.aiassistant.model.Role;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.DoctorVerificationRepository;
import com.healthcare.aiassistant.repository.RoleRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.service.AuditService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class VerificationController {

    @Autowired
    private DoctorVerificationRepository verificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private Clock clock;

    // Doctor submits their credentials
    @PostMapping("/doctors/verify")
    @PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR')")
    public ResponseEntity<?> submitVerification(@AuthenticationPrincipal UserDetails userDetails,
                                                @RequestBody Map<String, String> payload) {
        String license = payload.get("licenseNumber");
        String specialty = payload.get("specialty");

        if (license == null || specialty == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing license or specialty"));
        }

        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
        
        DoctorVerification verification = new DoctorVerification(user, license, specialty);
        verificationRepository.save(verification);
        return ResponseEntity.ok(Map.of("message", "Verification submitted successfully."));
    }

    // Admin fetches all pending verifications
    @GetMapping("/admin/doctors/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DoctorVerification>> getPendingVerifications() {
        return ResponseEntity.ok(verificationRepository.findAllByOrderBySubmittedAtDesc());
    }

    // Admin approves or rejects the verification
    @PutMapping("/admin/doctors/verify/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resolveVerification(@PathVariable Long id, @RequestBody Map<String, String> payload, @AuthenticationPrincipal UserDetails userDetails) {
        String action = payload.get("action"); // "APPROVE" or "REJECT"
        
        Optional<DoctorVerification> verificationOpt = verificationRepository.findById(id);
        if (!verificationOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        DoctorVerification verification = verificationOpt.get();
        verification.setResolvedAt(LocalDateTime.now(clock));

        if ("APPROVE".equalsIgnoreCase(action)) {
            verification.setStatus(ERequestStatus.APPROVED);
            
            // Actually promote the user to ROLE_DOCTOR if they aren't already
            User user = verification.getDoctor();
            Optional<Role> doctorRole = roleRepository.findByName(ERole.ROLE_DOCTOR);
            doctorRole.ifPresent(user::setRole);
            userRepository.save(user);
            
        } else if ("REJECT".equalsIgnoreCase(action)) {
            verification.setStatus(ERequestStatus.REJECTED);
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid action"));
        }

        verificationRepository.save(verification);
        auditService.logAction(userDetails.getUsername(), "VERIFICATION_" + action.toUpperCase(), verification.getDoctor().getId(), "Resolved doctor application: " + action);
        return ResponseEntity.ok(Map.of("message", "Verification request " + action.toLowerCase() + "d successfully."));
    }
}
