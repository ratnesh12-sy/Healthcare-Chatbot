-- V3: Appointment System Hardening
-- Partial unique index, duplicate cleanup, and legacy data normalization

-- Step A: Auto-fix any existing duplicate active appointments
-- Keeps the most recent (by created_at), cancels older duplicates
UPDATE appointments
SET status = 'CANCELLED'
WHERE status IN ('PENDING', 'CONFIRMED')
AND id NOT IN (
    SELECT DISTINCT ON (doctor_id, appointment_date) id
    FROM appointments
    WHERE status IN ('PENDING', 'CONFIRMED')
    ORDER BY doctor_id, appointment_date, created_at DESC
);

-- Step B: Partial unique index (only active appointments can occupy a slot)
CREATE UNIQUE INDEX uk_appointments_doctor_time_active
ON appointments (doctor_id, appointment_date)
WHERE status IN ('PENDING', 'CONFIRMED');

-- Step C: Clean legacy seconds/nanos (only dirty rows)
UPDATE appointments
SET appointment_date = date_trunc('minute', appointment_date)
WHERE appointment_date != date_trunc('minute', appointment_date);

-- NOTE: Run this MANUALLY in production (cannot use CONCURRENTLY inside Flyway transaction):
-- CREATE INDEX CONCURRENTLY idx_appointments_doctor_date_status
-- ON appointments (doctor_id, appointment_date, status);
