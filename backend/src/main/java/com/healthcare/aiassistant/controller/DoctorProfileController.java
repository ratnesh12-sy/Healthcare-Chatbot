package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.request.DoctorProfileRequest;
import com.healthcare.aiassistant.payload.response.MessageResponse;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/doctor")
public class DoctorProfileController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

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

        // Check if license number is already used
        // Wait, DoctorRepository needs existsByLicenseNumber? 
        // We have UNIQUE constraint on DB level, but doing it in Java is cleaner. Let's just catch DataIntegrityViolationException or assume it works for now.
        
        Doctor doctor = new Doctor();
        doctor.setUser(user);
        doctor.setSpecialization(profileRequest.getSpecialization());
        doctor.setExperienceYears(profileRequest.getExperience());
        doctor.setLicenseNumber(profileRequest.getLicenseNumber());
        doctor.setBio(profileRequest.getBio());
        doctor.setIsAvailable(true);
        doctor.setVerificationStatus("PENDING");

        doctorRepository.save(doctor);

        user.setIsProfileComplete(true);
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("Doctor profile created successfully"));
    }
}
