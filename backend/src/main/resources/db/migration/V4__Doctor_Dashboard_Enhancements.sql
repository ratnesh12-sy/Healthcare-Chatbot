-- V4__Doctor_Dashboard_Enhancements.sql

-- Index for efficient doctor appointment queries
CREATE INDEX idx_appointments_doctor_date ON appointments (doctor_id, appointment_date);

-- Add fields for cancellation auditing
ALTER TABLE appointments ADD COLUMN cancel_reason VARCHAR(255);
ALTER TABLE appointments ADD COLUMN cancelled_by VARCHAR(50);
