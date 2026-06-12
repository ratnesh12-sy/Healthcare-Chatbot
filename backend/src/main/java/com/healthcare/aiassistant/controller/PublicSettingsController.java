package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.service.SettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Unauthenticated read of the safe subset of platform settings (platform name, support email,
 * announcement, maintenance flag, feature toggles) so the login page, footer, and banners can
 * render without admin rights. Never exposes secrets or internal config.
 */
@RestController
@RequestMapping("/api/public")
public class PublicSettingsController {

    @Autowired
    private SettingsService settingsService;

    @GetMapping("/settings")
    public ResponseEntity<Map<String, String>> getPublicSettings() {
        return ResponseEntity.ok(settingsService.getPublicEffective());
    }
}
