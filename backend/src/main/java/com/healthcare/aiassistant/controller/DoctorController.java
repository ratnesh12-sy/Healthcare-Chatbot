package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/doctors")
public class DoctorController {
    @Autowired
    private DoctorRepository doctorRepository;

    @GetMapping("/all")
    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    @GetMapping("/{id}")
    public Doctor getDoctorById(@PathVariable Long id) {
        return doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
    }
}
