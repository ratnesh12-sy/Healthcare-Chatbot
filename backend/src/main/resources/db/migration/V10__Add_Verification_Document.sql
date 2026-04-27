-- Add document_path column to doctor_verifications for file upload feature
ALTER TABLE doctor_verifications ADD COLUMN IF NOT EXISTS document_path VARCHAR(255);
