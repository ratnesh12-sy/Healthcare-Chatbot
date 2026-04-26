-- V8__Add_Doctor_Profile_Fields.sql
-- Add profile completion tracking and new doctor fields

-- 1. Add is_profile_complete to users table (default true so existing users don't get locked out)
ALTER TABLE users ADD COLUMN is_profile_complete BOOLEAN DEFAULT true;

-- 2. Add license_number to doctors table
ALTER TABLE doctors ADD COLUMN license_number VARCHAR(100) UNIQUE;

-- 3. Add verification_status to doctors table
ALTER TABLE doctors ADD COLUMN verification_status VARCHAR(20) DEFAULT 'PENDING';

-- 4. Set existing demo doctors to verified with dummy license numbers
UPDATE doctors SET license_number = 'DEMO-LIC-' || id, verification_status = 'APPROVED';
