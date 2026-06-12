-- Make admin "Delete user" cascade reliably.
-- Several FKs to users(id)/doctors(id) were created without ON DELETE rules, so deleting a
-- user with any activity (chat messages, appointments, availability, or audit entries as the
-- acting admin) was blocked by a foreign-key violation. This adds the missing cascade rules.
--
-- Strategy: drop the existing FK on each target column (by catalog lookup, so it works
-- regardless of the auto-generated constraint name on the live DB), then re-add with the
-- desired ON DELETE behavior. Audit logs are preserved on admin deletion (SET NULL) so the
-- security trail survives; everything else cascade-deletes with the user/doctor.

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ( (tc.table_name = 'appointments'                 AND kcu.column_name = 'patient_id')
             OR (tc.table_name = 'appointments'                 AND kcu.column_name = 'doctor_id')
             OR (tc.table_name = 'chat_messages'                AND kcu.column_name = 'user_id')
             OR (tc.table_name = 'audit_logs'                   AND kcu.column_name = 'admin_user_id')
             OR (tc.table_name = 'doctor_availability'          AND kcu.column_name = 'doctor_id')
             OR (tc.table_name = 'doctor_availability_exception' AND kcu.column_name = 'doctor_id') )
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- Audit log must allow a null admin so the row survives when the acting admin is deleted.
ALTER TABLE audit_logs ALTER COLUMN admin_user_id DROP NOT NULL;

-- Re-add with cascade behavior.
ALTER TABLE appointments ADD CONSTRAINT appointments_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE appointments ADD CONSTRAINT appointments_doctor_id_fkey
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_admin_user_id_fkey
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE doctor_availability ADD CONSTRAINT doctor_availability_doctor_id_fkey
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

ALTER TABLE doctor_availability_exception ADD CONSTRAINT doctor_availability_exception_doctor_id_fkey
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
