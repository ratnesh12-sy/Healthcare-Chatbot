-- V13__Add_Reminders.sql
-- Persist patient reminders in the database (previously browser localStorage only).
-- Supports one-time and recurring (scheduled) reminders, plus auto-generated
-- appointment reminders linked to an appointment row.
--
-- Note: `category`, `source` and `status` are plain VARCHARs (no DB CHECK/ENUM) —
-- allowed values are enforced in Java enums, matching the existing convention
-- (e.g. health_metrics.metric_type, users.auth_provider). This keeps "custom"
-- categories possible and lets us add values later without another migration.

CREATE TABLE reminders (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text              VARCHAR(120) NOT NULL,
    category          VARCHAR(20)  NOT NULL DEFAULT 'CUSTOM',
    custom_label      VARCHAR(40),
    source            VARCHAR(10)  NOT NULL DEFAULT 'MANUAL',
    is_completed      BOOLEAN      NOT NULL DEFAULT false,
    status            VARCHAR(12)  NOT NULL DEFAULT 'ACTIVE',
    remind_at         TIMESTAMP,
    every_minutes     INT,
    repeat_until      TIMESTAMP,
    last_notified_at  TIMESTAMP,
    timezone          VARCHAR(40),
    appointment_id    BIGINT REFERENCES appointments(id) ON DELETE CASCADE,
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT check_every_minutes_positive CHECK (every_minutes IS NULL OR every_minutes > 0)
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_due ON reminders(status, remind_at);
CREATE INDEX idx_reminders_appointment ON reminders(appointment_id);
