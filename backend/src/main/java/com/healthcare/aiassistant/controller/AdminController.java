package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import com.healthcare.aiassistant.repository.RoleRepository;
import com.healthcare.aiassistant.repository.AuditLogRepository;
import com.healthcare.aiassistant.repository.ChatMessageRepository;
import com.healthcare.aiassistant.model.Role;
import com.healthcare.aiassistant.model.ERole;
import com.healthcare.aiassistant.model.AuditLog;
import com.healthcare.aiassistant.service.AuditService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private AuditService auditService;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalUsers = userRepository.count();
        long totalAppointments = appointmentRepository.count();
        
        long totalDoctors = userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && "ROLE_DOCTOR".equals(u.getRole().getName()))
                .count();

        stats.put("totalUsers", totalUsers);
        stats.put("totalDoctors", totalDoctors);
        stats.put("totalAppointments", totalAppointments);
        stats.put("aiQueriesProcessed", chatMessageRepository.countByIsFromAi(true)); 
        
        return ResponseEntity.ok(stats);
    }

    @PutMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> payload, @AuthenticationPrincipal UserDetails userDetails) {
        String newRoleName = payload.get("role");
        Optional<User> userOpt = userRepository.findById(id);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            try {
                ERole enumRole = ERole.valueOf(newRoleName);
                Optional<Role> roleOpt = roleRepository.findByName(enumRole);
                if(roleOpt.isPresent()) {
                    user.setRole(roleOpt.get());
                    userRepository.save(user);
                    auditService.logAction(userDetails.getUsername(), "ROLE_UPDATE", id, "Assigned role: " + newRoleName);
                    return ResponseEntity.ok(Map.of("message", "User role updated successfully."));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role specified."));
            }
            return ResponseEntity.badRequest().body(Map.of("error", "Role not found"));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findAllByOrderByTimestampDesc());
    }

    @PostMapping("/doctors/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addDoctor(@RequestBody Doctor doctor) {
        return ResponseEntity.ok(doctorRepository.save(doctor));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        userRepository.deleteById(id);
        auditService.logAction(userDetails.getUsername(), "USER_DELETED", id, "Deleted user record permanently");
        return ResponseEntity.ok("User deleted successfully");
    }
}
