package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.payload.request.HealthMetricRequest;
import com.healthcare.aiassistant.payload.response.MessageResponse;
import com.healthcare.aiassistant.security.services.UserDetailsImpl;
import com.healthcare.aiassistant.service.HealthMetricService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/metrics")
@PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR') or hasRole('ADMIN')")
public class HealthMetricController {

    @Autowired
    private HealthMetricService metricService;

    @GetMapping
    public ResponseEntity<?> history(@AuthenticationPrincipal UserDetailsImpl user,
                                     @RequestParam(required = false) String type) {
        if (user == null) return unauthorized();
        return ResponseEntity.ok(metricService.list(user.getId(), type));
    }

    @GetMapping("/latest")
    public ResponseEntity<?> latest(@AuthenticationPrincipal UserDetailsImpl user) {
        if (user == null) return unauthorized();
        return ResponseEntity.ok(metricService.latestPerType(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> log(@AuthenticationPrincipal UserDetailsImpl user,
                                 @Valid @RequestBody HealthMetricRequest req) {
        if (user == null) return unauthorized();
        return ResponseEntity.status(201).body(metricService.create(user.getId(), req));
    }

    @GetMapping("/adherence")
    public ResponseEntity<?> adherence(@AuthenticationPrincipal UserDetailsImpl user) {
        if (user == null) return unauthorized();
        return ResponseEntity.ok(metricService.adherence(user.getId()));
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
    }
}
