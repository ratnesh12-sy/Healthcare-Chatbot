package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.service.DoctorVerificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@PreAuthorize("isAuthenticated()")
public class DoctorController {
    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private DoctorVerificationService verificationService;

    /**
     * Returns only APPROVED doctors.
     * Uses the centralized service method — never exposes findAll() to public views.
     */
    @GetMapping("/all")
    public List<Doctor> getAllDoctors() {
        List<Doctor> docs = verificationService.getVerifiedDoctors();
        System.out.println("API /doctors/all called! Returning " + docs.size() + " doctors.");
        return docs;
    }

    @GetMapping("/{id}")
    public Doctor getDoctorById(@PathVariable Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        // Ensure only verified doctors are accessible individually
        verificationService.ensureDoctorVerified(doctor);
        return doctor;
    }
}
