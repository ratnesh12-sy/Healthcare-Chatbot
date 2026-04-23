package com.healthcare.aiassistant.security.utils;

import org.springframework.web.util.HtmlUtils;

/**
 * Controlled input sanitizer for profile data.
 * - Targets XSS prevention only.
 * - Does NOT aggressively escape valid medical text (dosages, hyphens, commas).
 * - Trims whitespace and normalizes empty strings to null.
 */
public final class InputSanitizer {

    private InputSanitizer() {}

    /**
     * Sanitizes a string input: trims whitespace, converts blank to null,
     * and escapes HTML entities to prevent XSS.
     */
    public static String sanitize(String input) {
        if (input == null) {
            return null;
        }
        String trimmed = input.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return HtmlUtils.htmlEscape(trimmed);
    }

    /**
     * Sanitizes a string but preserves null (does not convert blank to null).
     * Used when we explicitly want to allow clearing a field.
     */
    public static String sanitizePreserveEmpty(String input) {
        if (input == null) {
            return null;
        }
        return HtmlUtils.htmlEscape(input.trim());
    }
}
