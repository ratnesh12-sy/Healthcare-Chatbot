-- V2: User Profile System for medical data storage

CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    gender VARCHAR(10),
    blood_group VARCHAR(5),
    allergies TEXT,
    chronic_diseases TEXT,
    current_medications TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    profile_completed BOOLEAN DEFAULT FALSE,
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_userprofile_user_id ON user_profiles(user_id);
