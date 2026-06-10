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
import com.healthcare.aiassistant.payload.dto.UserResponseDTO;
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
import java.util.stream.Collectors;

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
        
        long totalDoctors = roleRepository.findByName(ERole.ROLE_DOCTOR)
                .map(userRepository::countByRole)
                .orElse(0L);

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

                // Self-demotion guard: an admin cannot strip their own admin role
                // (prevents accidentally locking yourself out of the admin console).
                if (enumRole != ERole.ROLE_ADMIN && user.getUsername().equals(userDetails.getUsername())) {
                    return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You cannot remove your own admin role."));
                }

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
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> new UserResponseDTO(
                        u.getId(),
                        u.getUsername(),
                        u.getEmail(),
                        u.getFullName(),
                        u.getRole() != null ? u.getRole().getName().name() : "UNKNOWN",
                        u.getPhoneNumber(),
                        u.getAuthProvider(),
                        u.getAvatarUrl(),
                        u.getEnabled() == null || u.getEnabled(),
                        u.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    @PatchMapping("/users/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> payload,
                                              @AuthenticationPrincipal UserDetails userDetails) {
        Boolean enabled = payload.get("enabled");
        if (enabled == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing 'enabled' field."));
        }

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();

        // Self-suspension guard: an admin cannot disable their own account (lockout prevention).
        if (!enabled && user.getUsername().equals(userDetails.getUsername())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You cannot suspend your own account."));
        }

        user.setEnabled(enabled);
        userRepository.save(user);
        auditService.logAction(userDetails.getUsername(),
                enabled ? "USER_REACTIVATED" : "USER_SUSPENDED",
                id,
                enabled ? "Account reactivated" : "Account suspended (login blocked)");

        return ResponseEntity.ok(new UserResponseDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole() != null ? user.getRole().getName().name() : "UNKNOWN",
                user.getPhoneNumber(),
                user.getAuthProvider(),
                user.getAvatarUrl(),
                user.getEnabled(),
                user.getCreatedAt()
        ));
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
