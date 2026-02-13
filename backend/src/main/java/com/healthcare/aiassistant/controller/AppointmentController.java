package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.Appointment;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.request.AppointmentRequest;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.service.AppointmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {
    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @PostMapping("/book")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> bookAppointment(@AuthenticationPrincipal UserDetails userDetails, @RequestBody AppointmentRequest request) {
        User patient = userRepository.findByUsername(userDetails.getUsername()).get();
        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setSymptomsSummary(request.getSymptomsSummary());

        return ResponseEntity.ok(appointmentService.bookAppointment(appointment));
    }

    @GetMapping("/patient")
    @PreAuthorize("hasRole('PATIENT')")
    public List<Appointment> getPatientAppointments(@AuthenticationPrincipal UserDetails userDetails) {
        User patient = userRepository.findByUsername(userDetails.getUsername()).get();
        return appointmentService.getPatientAppointments(patient);
    }

    @GetMapping("/doctor")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<Appointment> getDoctorAppointments(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername()).get();
        Doctor doctor = doctorRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Doctor details not found"));
        return appointmentService.getDoctorAppointments(doctor);
    }
}
