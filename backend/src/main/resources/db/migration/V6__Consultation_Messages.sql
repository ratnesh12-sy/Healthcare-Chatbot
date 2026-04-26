-- V6: Consultation Messages Table for AI-Assisted Hybrid Chat System

CREATE TABLE IF NOT EXISTS consultation_messages (
    id                BIGSERIAL PRIMARY KEY,
    appointment_id    BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    sender_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    sender_type       VARCHAR(10) NOT NULL CHECK (sender_type IN ('PATIENT', 'DOCTOR', 'AI')),
    content           TEXT NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'SENT',
    timestamp         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sequence_number   BIGINT NOT NULL DEFAULT 0
);

-- Index for fast chronological queries per appointment
CREATE INDEX IF NOT EXISTS idx_consultation_messages_appointment_id
    ON consultation_messages(appointment_id);

-- Index for ordering by sequence
CREATE INDEX IF NOT EXISTS idx_consultation_messages_sequence
    ON consultation_messages(appointment_id, sequence_number);
