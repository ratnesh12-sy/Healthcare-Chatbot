-- Soft-delete support for the admin "Delete user" action.
-- A non-null deleted_at marks an anonymized account that is hidden from the app and cannot log in,
-- while its historical records (appointments, chat, metrics) are retained in the database.
-- A separate admin "Permanently delete" action still hard-deletes (cascading via V16).

ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
