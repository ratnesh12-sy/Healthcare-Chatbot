package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.AppointmentStatus;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.dto.ApiResponse;
import com.healthcare.aiassistant.payload.dto.DoctorAppointmentDTO;
import com.healthcare.aiassistant.exception.IncompleteProfileException;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.service.DoctorVerificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctor/dashboard")
public class DoctorDashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private DoctorVerificationService verificationService;

    @GetMapping
    @PreAuthorize("hasRole('DOCTOR')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        if (!user.getIsProfileComplete()) {
            throw new IncompleteProfileException("Doctor profile is incomplete");
        }
        
        Doctor doctor = doctorRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Doctor details not found"));

        // Verification guard — unverified doctors cannot access dashboard stats
        verificationService.ensureDoctorVerified(doctor);

        LocalDateTime startOfDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now(ZoneOffset.UTC).atTime(LocalTime.MAX);

        // Targeted DB queries instead of loading all appointments into memory
        long todayCount = appointmentRepository.countByDoctorAndAppointmentDateBetween(doctor, startOfDay, endOfDay);
        long pendingCount = appointmentRepository.countByDoctorAndStatus(doctor, AppointmentStatus.PENDING);
        long completedCount = appointmentRepository.countByDoctorAndStatus(doctor, AppointmentStatus.COMPLETED);
        long totalCount = appointmentRepository.countByDoctor(doctor);

        // Only fetch today's appointments (the list we actually render)
        List<DoctorAppointmentDTO> todayAppointments = appointmentRepository
                .findByDoctorAndAppointmentDateBetweenOrderByAppointmentDateAsc(doctor, startOfDay, endOfDay)
                .stream()
                .map(appointment -> {
                    DoctorAppointmentDTO dto = new DoctorAppointmentDTO();
                    dto.setId(appointment.getId());
                    dto.setAppointmentDate(appointment.getAppointmentDate());
                    dto.setDurationMinutes(appointment.getDurationMinutes());
                    dto.setStatus(appointment.getStatus().name());
                    dto.setSymptomsSummary(appointment.getSymptomsSummary());
                    dto.setPatientName(appointment.getPatient() != null ? appointment.getPatient().getFullName() : "Unknown");
                    return dto;
                })
                .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("todayCount", todayCount);
        data.put("pendingCount", pendingCount);
        data.put("completedCount", completedCount);
        data.put("totalCount", totalCount);
        data.put("todayAppointments", todayAppointments);

        return ResponseEntity.ok(ApiResponse.success(data, "Dashboard stats retrieved successfully"));
    }
}
