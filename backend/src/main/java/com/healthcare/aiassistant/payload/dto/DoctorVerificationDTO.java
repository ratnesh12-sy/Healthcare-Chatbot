package com.healthcare.aiassistant.payload.dto;

import com.healthcare.aiassistant.model.DoctorVerification;

import java.time.LocalDateTime;

/**
 * Safe response shape for the admin verification queue.
 * Exposes only the doctor fields the UI needs (id/name/username/email) instead of
 * serializing the full User entity (which would leak phone, DOB, role graph, etc.).
 */
public record DoctorVerificationDTO(
        Long id,
        DoctorSummary doctor,
        String licenseNumber,
        String specialty,
        String status,
        LocalDateTime submittedAt,
        LocalDateTime resolvedAt,
        String documentPath
) {
    public record DoctorSummary(Long id, String fullName, String username, String email) {}

    public static DoctorVerificationDTO from(DoctorVerification v) {
        var u = v.getDoctor();
        DoctorSummary summary = (u == null)
                ? null
                : new DoctorSummary(u.getId(), u.getFullName(), u.getUsername(), u.getEmail());
        return new DoctorVerificationDTO(
                v.getId(),
                summary,
                v.getLicenseNumber(),
                v.getSpecialty(),
                v.getStatus() != null ? v.getStatus().name() : null,
                v.getSubmittedAt(),
                v.getResolvedAt(),
                v.getDocumentPath()
        );
    }
}
