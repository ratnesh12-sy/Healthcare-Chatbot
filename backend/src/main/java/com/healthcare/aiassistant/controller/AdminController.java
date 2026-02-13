package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping("/doctors/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addDoctor(@RequestBody Doctor doctor) {
        return ResponseEntity.ok(doctorRepository.save(doctor));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok("User deleted successfully");
    }
}
