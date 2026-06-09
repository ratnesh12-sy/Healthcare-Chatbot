package com.healthcare.aiassistant.model;

/**
 * Reminder category. Stored as a String in the DB (no DB-level constraint);
 * validated here. Add new values freely — no migration required.
 */
public enum ReminderCategory {
    MEDICATION,
    HYDRATION,
    REST,
    FOLLOW_UP,
    APPOINTMENT,
    CUSTOM;

    public static ReminderCategory fromString(String value) {
        if (value == null) {
            return CUSTOM;
        }
        try {
            return ReminderCategory.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return CUSTOM;
        }
    }
}
