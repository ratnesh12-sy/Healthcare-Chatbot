-- Doctor notes & prescriptions (roadmap #7).
-- One note and one prescription per appointment; prescription has medication items.
-- All cascade-delete with the appointment.
-- NOTE: numbered V18 to stay above the user-delete-cascade branch (V16/V17); when merging
-- multiple feature branches, keep Flyway versions in order (merge V16/V17 before this).

CREATE TABLE IF NOT EXISTS doctor_notes (
    id             BIGSERIAL PRIMARY KEY,
    appointment_id BIGINT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    content        TEXT,
    created_at     TIMESTAMP DEFAULT now(),
    updated_at     TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id                   BIGSERIAL PRIMARY KEY,
    appointment_id       BIGINT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    general_instructions TEXT,
    issued_at            TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescription_items (
    id              BIGSERIAL PRIMARY KEY,
    prescription_id BIGINT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage          VARCHAR(100),
    frequency       VARCHAR(100),
    duration_days   INT,
    instructions    VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);
