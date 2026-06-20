-- V19__Add_Password_Reset_Tokens.sql
-- Backing store for the "forgot password" flow.
--
-- Only the SHA-256 hash of the reset token is stored (token_hash, 64 hex chars) — the raw
-- token lives only in the emailed link, so a database leak cannot be used to reset accounts.
-- Tokens are single-use (used flag) and short-lived (expires_at), and are cascade-deleted
-- with their user.

CREATE TABLE password_reset_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    used        BOOLEAN   NOT NULL DEFAULT false,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_password_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
