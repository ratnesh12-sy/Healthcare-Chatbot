-- V14__Add_Push_Subscriptions.sql
-- Phase 2 (Web Push): browser push subscriptions + reminder snooze support.

CREATE TABLE push_subscriptions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint    VARCHAR(1000) NOT NULL UNIQUE,
    p256dh      VARCHAR(255) NOT NULL,
    auth        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Snooze support for reminders.
ALTER TABLE reminders ADD COLUMN snooze_until TIMESTAMP;
