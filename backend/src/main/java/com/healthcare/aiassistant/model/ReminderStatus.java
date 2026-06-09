package com.healthcare.aiassistant.model;

/**
 * Lifecycle state of a reminder.
 * ACTIVE    – live; eligible to fire if it has a schedule.
 * DONE      – the user completed it.
 * EXPIRED   – a recurring reminder passed its repeat_until.
 * CANCELLED – auto-cancelled (e.g. its appointment was cancelled).
 */
public enum ReminderStatus {
    ACTIVE,
    DONE,
    EXPIRED,
    CANCELLED
}
