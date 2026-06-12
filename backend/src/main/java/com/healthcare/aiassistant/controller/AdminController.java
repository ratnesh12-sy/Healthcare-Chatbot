package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.DoctorRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import com.healthcare.aiassistant.repository.RoleRepository;
import com.healthcare.aiassistant.repository.ChatMessageRepository;
import com.healthcare.aiassistant.repository.PushSubscriptionRepository;
import com.healthcare.aiassistant.model.Role;
import com.healthcare.aiassistant.model.ERole;
import com.healthcare.aiassistant.payload.dto.AuditLogDTO;
import com.healthcare.aiassistant.payload.dto.UserResponseDTO;
import com.healthcare.aiassistant.service.AuditService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Autowired
    private AuditService auditService;

    /** Maps a User entity to the safe admin DTO (incl. soft-delete timestamp). */
    private UserResponseDTO toDTO(User u) {
        UserResponseDTO dto = new UserResponseDTO(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getFullName(),
                u.getRole() != null ? u.getRole().getName().name() : "UNKNOWN",
                u.getPhoneNumber(),
                u.getAuthProvider(),
                u.getAvatarUrl(),
                u.getEnabled() == null || u.getEnabled(),
                u.getCreatedAt());
        dto.setDeletedAt(u.getDeletedAt());
        return dto;
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();
        // Active accounts only — exclude soft-deleted users.
        long totalUsers = userRepository.countByDeletedAtIsNull();
        long totalAppointments = appointmentRepository.count();

        long totalDoctors = roleRepository.findByName(ERole.ROLE_DOCTOR)
                .map(userRepository::countByRoleAndDeletedAtIsNull)
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
        // Active (non-soft-deleted) users only.
        return userRepository.findByDeletedAtIsNull().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @GetMapping("/users/deleted")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponseDTO> getDeletedUsers() {
        return userRepository.findByDeletedAtIsNotNull().stream()
                .map(this::toDTO)
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

        return ResponseEntity.ok(toDTO(user));
    }

    @GetMapping("/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLogDTO>> getAuditLogs() {
        return ResponseEntity.ok(auditService.getRecentLogs());
    }

    @PostMapping("/doctors/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addDoctor(@RequestBody Doctor doctor) {
        return ResponseEntity.ok(doctorRepository.save(doctor));
    }

    /**
     * Soft-delete: anonymize the account, block login, and hide it from the app, while keeping
     * the user's historical records (appointments, chat, metrics). Reversible only by a DBA;
     * for a full wipe use the /permanent endpoint.
     */
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();

        if (user.getUsername().equals(userDetails.getUsername())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You cannot delete your own account."));
        }
        if (user.getDeletedAt() != null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User is already deleted."));
        }

        // Anonymize PII; username/email become unique placeholders so the originals are freed.
        user.setFullName("Deleted User #" + id);
        user.setUsername("deleted_user_" + id);
        user.setEmail("deleted+" + id + "@deleted.invalid");
        user.setPhoneNumber(null);
        user.setAvatarUrl(null);
        user.setPassword(null);
        user.setGoogleSub(null);
        user.setEnabled(false);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);

        // Stop notifications and drop the doctor (if any) out of the booking list.
        pushSubscriptionRepository.deleteByUserId(id);
        doctorRepository.findByUser_Id(id).ifPresent(d -> {
            d.setIsAvailable(false);
            doctorRepository.save(d);
        });

        auditService.logAction(userDetails.getUsername(), "USER_DELETED",
                id, "Account soft-deleted and anonymized (records retained)");
        return ResponseEntity.ok(Map.of("message", "User deleted (anonymized; records retained)."));
    }

    /**
     * Permanent hard delete — removes the user and cascade-deletes ALL related data (V16).
     * Irreversible.
     */
    @DeleteMapping("/users/{id}/permanent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> permanentlyDeleteUser(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (userOpt.get().getUsername().equals(userDetails.getUsername())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You cannot delete your own account."));
        }

        userRepository.deleteById(id);
        auditService.logAction(userDetails.getUsername(), "USER_PURGED",
                id, "Permanently deleted user and all related data");
        return ResponseEntity.ok(Map.of("message", "User permanently deleted."));
    }
}
