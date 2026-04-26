-- V9: Fix BCrypt password hashes for all demo users
-- The V7 hashes were generated incorrectly and do not match the intended passwords.
-- These hashes are verified using bcryptjs and are fully compatible with Spring Security BCryptPasswordEncoder.

-- Fix Doctor passwords (Doctor@123)
UPDATE users SET password = '$2b$10$wviZQ/CY6jbTvOrhTUxOp.Z/sVsewIpCyKWCWkqOtZWn3hU/QNy1q'
WHERE username IN ('dr.sharma', 'dr.mehta', 'dr.iyer', 'dr.khan', 'dr.desai');

-- Fix Admin password (Admin@123)
UPDATE users SET password = '$2b$10$b0Ecgsc0MYUYyYHE5VCC.exhIXCRabJdDEm6FeYNZCXbUBEDw1mFe'
WHERE username = 'admin';

-- Fix Patient passwords (Patient@123)
UPDATE users SET password = '$2b$10$BBsZ8s8OitfvQ4.RZ9ux7.jbl42kWELIDNLDMO6rUkusxkie0ajaO'
WHERE username IN ('raatnesh', 'priya.p', 'amit.k', 'sneha.r', 'vikram.s', 'anita.m', 'rohit.j', 'kavya.n');
