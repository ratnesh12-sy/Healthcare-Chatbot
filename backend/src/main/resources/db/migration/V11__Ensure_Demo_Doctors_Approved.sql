-- V11: Ensure all demo doctors are APPROVED and have license numbers
-- This fixes issues where demo data might be re-seeded without verification status.

UPDATE doctors 
SET verification_status = 'APPROVED', 
    license_number = COALESCE(license_number, 'DEMO-LIC-' || id)
WHERE user_id IN (
    SELECT id FROM users 
    WHERE username IN ('dr.sharma', 'dr.mehta', 'dr.iyer', 'dr.khan', 'dr.desai')
);
