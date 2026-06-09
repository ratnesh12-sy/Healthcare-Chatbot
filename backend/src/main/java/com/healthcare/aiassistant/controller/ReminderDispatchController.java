package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.security.config.PushProperties;
import com.healthcare.aiassistant.service.ReminderDispatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Cron-triggered dispatch endpoint. Intentionally unauthenticated (the caller is an
 * external scheduler with no login) but guarded by a shared secret header so it can't
 * be triggered by anyone. Permitted in WebSecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/reminders")
public class ReminderDispatchController {

    private final ReminderDispatchService dispatchService;
    private final PushProperties pushProperties;

    public ReminderDispatchController(ReminderDispatchService dispatchService,
                                      PushProperties pushProperties) {
        this.dispatchService = dispatchService;
        this.pushProperties = pushProperties;
    }

    @PostMapping("/dispatch")
    public ResponseEntity<?> dispatch(@RequestHeader(value = "X-Dispatch-Token", required = false) String token) {
        String secret = pushProperties.getDispatchSecret();
        if (secret == null || secret.isBlank() || !secret.equals(token)) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }
        int sent = dispatchService.dispatchDue();
        return ResponseEntity.ok(Map.of("dispatched", sent));
    }
}
