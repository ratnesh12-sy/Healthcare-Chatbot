package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.SystemSetting;
import com.healthcare.aiassistant.repository.SystemSettingRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Central, cached accessor for admin-configurable platform settings (system_settings table).
 *
 * <p>Values are cached in memory and refreshed on {@link #reload()} (called after an admin saves),
 * so hot paths (AI calls, booking, auth) read settings without hitting the DB each time.
 * Unknown/unset keys fall back to {@link #DEFAULTS}. Defaults are chosen to preserve the app's
 * prior behavior (no surprise changes until an admin overrides a value).
 */
@Service
public class SettingsService {

    // ── Setting keys ──
    public static final String AI_MODEL = "aiModel";
    public static final String AI_SYSTEM_PROMPT = "medicalDisclaimer"; // existing key; the AI persona/disclaimer
    public static final String AI_ENABLED = "aiEnabled";
    public static final String AI_MIN_CONFIDENCE = "aiMinConfidence"; // LOW | MEDIUM | HIGH (min to display)
    public static final String REGISTRATION_ENABLED = "registrationEnabled";
    public static final String GOOGLE_SIGNIN_ENABLED = "googleSignInEnabled";
    public static final String SESSION_HOURS = "sessionHours";
    public static final String MIN_PASSWORD_LENGTH = "minPasswordLength";
    public static final String DEFAULT_DURATION_MINUTES = "defaultDurationMinutes";
    public static final String LEAD_TIME_HOURS = "leadTimeHours";
    public static final String MAX_PER_PATIENT_PER_DAY = "maxPerPatientPerDay";
    public static final String CANCELLATION_WINDOW_HOURS = "cancellationWindowHours";
    public static final String MAINTENANCE_MODE = "maintenanceMode";
    public static final String PLATFORM_NAME = "platformName";
    public static final String SUPPORT_EMAIL = "supportEmail";
    public static final String ANNOUNCEMENT = "announcement";

    /** Effective default per key (also the canonical list of known keys). */
    public static final Map<String, String> DEFAULTS = Map.ofEntries(
            Map.entry(AI_MODEL, "llama-3.3-70b-versatile"),
            Map.entry(AI_SYSTEM_PROMPT, "You are a professional healthcare assistant. Provide general guidance only, suggest possible conditions and precautions, and ALWAYS advise consulting a real doctor. You are NOT a doctor and must not override doctor advice."),
            Map.entry(AI_ENABLED, "true"),
            Map.entry(AI_MIN_CONFIDENCE, "LOW"),
            Map.entry(REGISTRATION_ENABLED, "true"),
            Map.entry(GOOGLE_SIGNIN_ENABLED, "true"),
            Map.entry(SESSION_HOURS, "168"),
            Map.entry(MIN_PASSWORD_LENGTH, "6"),
            Map.entry(DEFAULT_DURATION_MINUTES, "30"),
            Map.entry(LEAD_TIME_HOURS, "0"),
            Map.entry(MAX_PER_PATIENT_PER_DAY, "0"),
            Map.entry(CANCELLATION_WINDOW_HOURS, "0"),
            Map.entry(MAINTENANCE_MODE, "false"),
            Map.entry(PLATFORM_NAME, "HealthCare AI Assistant"),
            Map.entry(SUPPORT_EMAIL, ""),
            Map.entry(ANNOUNCEMENT, "")
    );

    /** Keys safe to expose to unauthenticated clients (login page, footer, banner). */
    public static final Set<String> PUBLIC_KEYS = Set.of(
            PLATFORM_NAME, SUPPORT_EMAIL, ANNOUNCEMENT, MAINTENANCE_MODE,
            REGISTRATION_ENABLED, GOOGLE_SIGNIN_ENABLED, AI_ENABLED, MIN_PASSWORD_LENGTH
    );

    @Autowired
    private SystemSettingRepository settingRepository;

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    @PostConstruct
    public void reload() {
        Map<String, String> fresh = new ConcurrentHashMap<>();
        for (SystemSetting s : settingRepository.findAll()) {
            if (s.getSettingKey() != null && s.getSettingValue() != null) {
                fresh.put(s.getSettingKey(), s.getSettingValue());
            }
        }
        cache.clear();
        cache.putAll(fresh);
    }

    public String getString(String key) {
        String v = cache.get(key);
        if (v != null) return v;
        return DEFAULTS.getOrDefault(key, "");
    }

    public boolean getBoolean(String key) {
        return Boolean.parseBoolean(getString(key));
    }

    public int getInt(String key) {
        try {
            return Integer.parseInt(getString(key).trim());
        } catch (NumberFormatException e) {
            try {
                return Integer.parseInt(DEFAULTS.getOrDefault(key, "0").trim());
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
    }

    /** All known settings with their effective (stored-or-default) values, for the admin view. */
    public Map<String, String> getAllEffective() {
        Map<String, String> out = new LinkedHashMap<>();
        for (String key : DEFAULTS.keySet()) {
            out.put(key, getString(key));
        }
        return out;
    }

    /** Subset of effective settings safe for unauthenticated clients. */
    public Map<String, String> getPublicEffective() {
        Map<String, String> out = new LinkedHashMap<>();
        for (String key : PUBLIC_KEYS) {
            out.put(key, getString(key));
        }
        return out;
    }
}
