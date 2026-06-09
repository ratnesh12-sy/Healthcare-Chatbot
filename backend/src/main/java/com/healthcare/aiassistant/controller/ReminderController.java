package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.payload.dto.ReminderDTO;
import com.healthcare.aiassistant.payload.request.ReminderRequest;
import com.healthcare.aiassistant.payload.response.MessageResponse;
import com.healthcare.aiassistant.security.services.UserDetailsImpl;
import com.healthcare.aiassistant.service.ReminderService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reminders")
@PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR') or hasRole('ADMIN')")
public class ReminderController {

    @Autowired
    private ReminderService reminderService;

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetailsImpl user) {
        if (user == null) return unauthorized();
        return ResponseEntity.ok(reminderService.list(user.getId()));
    }

    @GetMapping("/due")
    public ResponseEntity<?> due(@AuthenticationPrincipal UserDetailsImpl user) {
        if (user == null) return unauthorized();
        return ResponseEntity.ok(reminderService.due(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal UserDetailsImpl user,
                                    @Valid @RequestBody ReminderRequest req) {
        if (user == null) return unauthorized();
        ReminderDTO dto = reminderService.create(user.getId(), req);
        return ResponseEntity.status(201).body(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@AuthenticationPrincipal UserDetailsImpl user,
                                    @PathVariable Long id,
                                    @Valid @RequestBody ReminderRequest req) {
        if (user == null) return unauthorized();
        return ResponseEntity.ok(reminderService.update(user.getId(), id, req));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggle(@AuthenticationPrincipal UserDetailsImpl user,
                                    @PathVariable Long id) {
        if (user == null) return unauthorized();
        return ResponseEntity.ok(reminderService.toggle(user.getId(), id));
    }

    @PatchMapping("/{id}/snooze")
    public ResponseEntity<?> snooze(@AuthenticationPrincipal UserDetailsImpl user,
                                    @PathVariable Long id,
                                    @RequestParam(required = false) Integer minutes) {
        if (user == null) return unauthorized();
        return ResponseEntity.ok(reminderService.snooze(user.getId(), id, minutes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal UserDetailsImpl user,
                                    @PathVariable Long id) {
        if (user == null) return unauthorized();
        reminderService.delete(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
    }
}
