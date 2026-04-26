package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.dto.ApiResponse;
import com.healthcare.aiassistant.payload.dto.AvailabilityBlockDTO;
import com.healthcare.aiassistant.payload.dto.AvailabilityExceptionDTO;
import com.healthcare.aiassistant.exception.IncompleteProfileException;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.service.AvailabilityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctor/availability")
public class AvailabilityController {

    @Autowired
    private AvailabilityService availabilityService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    private Doctor getAuthenticatedDoctor(UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        if (!user.getIsProfileComplete()) {
            throw new IncompleteProfileException("Doctor profile is incomplete");
        }
        
        return doctorRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Doctor details not found"));
    }

    @PostMapping("/schedule/{dayOfWeek}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> saveWeeklySchedule(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer dayOfWeek,
            @RequestBody List<AvailabilityBlockDTO> blocks) {
        Doctor doctor = getAuthenticatedDoctor(userDetails);
        List<AvailabilityBlockDTO> saved = availabilityService.saveWeeklySchedule(doctor, dayOfWeek, blocks);
        return ResponseEntity.ok(ApiResponse.success(saved, "Weekly schedule updated successfully"));
    }

    @GetMapping("/schedule")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> getWeeklySchedule(@AuthenticationPrincipal UserDetails userDetails) {
        Doctor doctor = getAuthenticatedDoctor(userDetails);
        List<AvailabilityBlockDTO> schedule = availabilityService.getWeeklySchedule(doctor);
        return ResponseEntity.ok(ApiResponse.success(schedule, "Weekly schedule retrieved successfully"));
    }

    @PostMapping("/exception")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> saveException(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AvailabilityExceptionDTO exceptionDTO) {
        Doctor doctor = getAuthenticatedDoctor(userDetails);
        AvailabilityExceptionDTO saved = availabilityService.saveException(doctor, exceptionDTO);
        return ResponseEntity.ok(ApiResponse.success(saved, "Exception saved successfully"));
    }

    @GetMapping("/exception")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> getExceptions(@AuthenticationPrincipal UserDetails userDetails) {
        Doctor doctor = getAuthenticatedDoctor(userDetails);
        List<AvailabilityExceptionDTO> exceptions = availabilityService.getExceptions(doctor);
        return ResponseEntity.ok(ApiResponse.success(exceptions, "Exceptions retrieved successfully"));
    }
}
