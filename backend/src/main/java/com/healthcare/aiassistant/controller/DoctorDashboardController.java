package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.AppointmentStatus;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.dto.ApiResponse;
import com.healthcare.aiassistant.payload.dto.DoctorAppointmentDTO;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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

    @GetMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Doctor doctor = doctorRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Doctor details not found"));

        LocalDateTime startOfDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now(ZoneOffset.UTC).atTime(LocalTime.MAX);

        // All appointments for the doctor (for counts)
        var allAppointments = appointmentRepository.findByDoctorOrderByAppointmentDateDesc(doctor);

        long todayCount = allAppointments.stream()
                .filter(a -> !a.getAppointmentDate().isBefore(startOfDay) && !a.getAppointmentDate().isAfter(endOfDay))
                .count();

        long pendingCount = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.PENDING)
                .count();

        long completedCount = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                .count();

        // Today's appointments list
        List<DoctorAppointmentDTO> todayAppointments = allAppointments.stream()
                .filter(a -> !a.getAppointmentDate().isBefore(startOfDay) && !a.getAppointmentDate().isAfter(endOfDay))
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
        data.put("todayAppointments", todayAppointments);

        return ResponseEntity.ok(ApiResponse.success(data, "Dashboard stats retrieved successfully"));
    }
}
