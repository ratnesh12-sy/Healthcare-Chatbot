package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.dto.AppointmentDTO;
import com.healthcare.aiassistant.payload.request.AppointmentRequest;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> bookAppointment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AppointmentRequest request) {

        User patient = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        AppointmentDTO dto = appointmentService.bookAppointment(
                request.getDoctorId(),
                request.getAppointmentDate(),
                request.getSymptomsSummary(),
                patient);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("status", "SUCCESS", "data", dto));
    }

    @GetMapping("/patient")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> getPatientAppointments(@AuthenticationPrincipal UserDetails userDetails) {
        User patient = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<AppointmentDTO> appointments = appointmentService.getPatientAppointments(patient);
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "data", appointments));
    }

    @GetMapping("/doctor")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> getDoctorAppointments(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Doctor doctor = doctorRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Doctor details not found"));

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<com.healthcare.aiassistant.payload.dto.DoctorAppointmentDTO> appointments = appointmentService.getDoctorAppointmentsPaginated(doctor, pageable);
        return ResponseEntity.ok(com.healthcare.aiassistant.payload.dto.ApiResponse.success(appointments, "Doctor appointments retrieved successfully"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('ADMIN')")
    public ResponseEntity<?> updateAppointmentStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestParam com.healthcare.aiassistant.model.AppointmentStatus status,
            @RequestParam(required = false) String cancelReason) {

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Doctor doctor = doctorRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Doctor details not found"));

        com.healthcare.aiassistant.payload.dto.DoctorAppointmentDTO updated = appointmentService.updateDoctorAppointmentStatus(id, doctor, status, cancelReason);
        return ResponseEntity.ok(com.healthcare.aiassistant.payload.dto.ApiResponse.success(updated, "Status updated successfully"));
    }

    @GetMapping("/available-slots")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> getAvailableSlots(
            @RequestParam Long doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        List<com.healthcare.aiassistant.payload.dto.SlotResponseDTO> slots = appointmentService.getAvailableSlots(doctorId, date);
        return ResponseEntity.ok(Map.of("date", date.toString(), "slots", slots));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> cancelAppointment(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {

        User patient = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        AppointmentDTO dto = appointmentService.cancelAppointment(id, patient.getId());
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "data", dto));
    }
}
