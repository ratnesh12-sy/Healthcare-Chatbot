-- Sign in with Google support.
-- Google users have no password, so make it nullable; add the provider + Google subject id.

ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

ALTER TABLE users ADD COLUMN google_sub VARCHAR(255);
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';

-- Google's `sub` is globally unique. (Postgres allows multiple NULLs under a UNIQUE constraint,
-- so existing password accounts are unaffected.)
ALTER TABLE users ADD CONSTRAINT uk_users_google_sub UNIQUE (google_sub);
