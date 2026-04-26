package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.SystemSetting;
import com.healthcare.aiassistant.repository.SystemSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.healthcare.aiassistant.service.AuditService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class SettingsController {

    @Autowired
    private SystemSettingRepository settingRepository;

    @Autowired
    private AuditService auditService;

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getAllSettings() {
        List<SystemSetting> settings = settingRepository.findAll();
        Map<String, String> response = new HashMap<>();
        for (SystemSetting setting : settings) {
            response.put(setting.getSettingKey(), setting.getSettingValue());
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, String> payload, @AuthenticationPrincipal UserDetails userDetails) {
        for (Map.Entry<String, String> entry : payload.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();

            Optional<SystemSetting> existing = settingRepository.findBySettingKey(key);
            if (existing.isPresent()) {
                SystemSetting setting = existing.get();
                setting.setSettingValue(value);
                settingRepository.save(setting);
            } else {
                SystemSetting setting = new SystemSetting();
                setting.setSettingKey(key);
                setting.setSettingValue(value);
                settingRepository.save(setting);
            }
        }
        auditService.logAction(userDetails.getUsername(), "SETTINGS_UPDATE", null, "Updated global system configurations");
        return ResponseEntity.ok(Map.of("message", "System Settings updated dynamically."));
    }
}
