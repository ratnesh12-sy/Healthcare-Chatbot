package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.AppointmentStatus;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.dto.ApiResponse;
import com.healthcare.aiassistant.payload.dto.DoctorProfileDTO;
import com.healthcare.aiassistant.payload.request.DoctorProfileRequest;
import com.healthcare.aiassistant.payload.response.MessageResponse;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/doctor")
public class DoctorProfileController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @PostMapping("/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> createProfile(
            @Valid @RequestBody DoctorProfileRequest profileRequest,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getIsProfileComplete()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Profile is already complete."));
        }

        Doctor doctor = new Doctor();
        doctor.setUser(user);
        doctor.setSpecialization(profileRequest.getSpecialization());
        doctor.setExperienceYears(profileRequest.getExperience());
        doctor.setLicenseNumber(profileRequest.getLicenseNumber());
        doctor.setBio(profileRequest.getBio());
        doctor.setIsAvailable(true);
        // Status starts as null = NOT_SUBMITTED (virtual state)
        // Doctor must explicitly submit verification via /api/doctors/verify
        doctor.setVerificationStatus(null);

        doctorRepository.save(doctor);

        user.setIsProfileComplete(true);
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("Doctor profile created successfully"));
    }

    /**
     * GET /api/doctor/profile — Returns aggregated doctor profile.
     * All fields from existing User + Doctor entities.
     * totalAppointments and completedAppointments are derived at runtime.
     */
    @GetMapping("/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<DoctorProfileDTO>> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Doctor doctor = doctorRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));

        DoctorProfileDTO dto = buildProfileDTO(user, doctor);

        return ResponseEntity.ok(ApiResponse.success(dto, "Doctor profile retrieved successfully"));
    }

    /**
     * PUT /api/doctor/profile — Updates mutable fields only (bio, isAvailable).
     * Specialization, experience, and licenseNumber are immutable (set during onboarding).
     */
    @PutMapping("/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<DoctorProfileDTO>> updateProfile(
            @RequestBody Map<String, Object> updates,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Doctor doctor = doctorRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));

        // Only allow mutable fields
        if (updates.containsKey("bio")) {
            doctor.setBio((String) updates.get("bio"));
        }
        if (updates.containsKey("isAvailable")) {
            doctor.setIsAvailable((Boolean) updates.get("isAvailable"));
        }

        doctorRepository.save(doctor);

        DoctorProfileDTO dto = buildProfileDTO(user, doctor);

        return ResponseEntity.ok(ApiResponse.success(dto, "Profile updated successfully"));
    }

    /**
     * Builds a DoctorProfileDTO from existing entities + derived counts.
     */
    private DoctorProfileDTO buildProfileDTO(User user, Doctor doctor) {
        DoctorProfileDTO dto = new DoctorProfileDTO();
        // From User entity
        dto.setFullName(user.getFullName());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        // From Doctor entity
        dto.setSpecialization(doctor.getSpecialization());
        dto.setExperienceYears(doctor.getExperienceYears());
        dto.setLicenseNumber(doctor.getLicenseNumber());
        dto.setVerificationStatus(doctor.getVerificationStatus());
        dto.setBio(doctor.getBio());
        dto.setIsAvailable(doctor.getIsAvailable());
        // Derived at runtime from existing appointments table
        dto.setTotalAppointments(appointmentRepository.countByDoctor(doctor));
        dto.setCompletedAppointments(
                appointmentRepository.countByDoctorAndStatus(doctor, AppointmentStatus.COMPLETED));
        return dto;
    }
}
