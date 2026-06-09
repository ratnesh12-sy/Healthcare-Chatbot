package com.healthcare.aiassistant.model;

/**
 * Where a reminder originated. Stored as a String; validated here.
 */
public enum ReminderSource {
    MANUAL,
    AI;

    public static ReminderSource fromString(String value) {
        if (value == null) {
            return MANUAL;
        }
        try {
            return ReminderSource.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return MANUAL;
        }
    }
}
