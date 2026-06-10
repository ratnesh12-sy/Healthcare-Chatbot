-- Account suspension support for the admin users page.
-- `enabled = false` blocks login (Spring Security pre-auth check) and existing JWT cookies
-- (enforced in AuthTokenFilter). Existing rows default to enabled.

ALTER TABLE users ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;
