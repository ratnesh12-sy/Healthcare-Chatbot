-- V5__Doctor_Availability.sql

CREATE TABLE doctor_availability (
    id BIGSERIAL PRIMARY KEY,
    doctor_id BIGINT NOT NULL REFERENCES doctors(id),
    day_of_week INT NOT NULL, 
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INT NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT check_day_of_week CHECK (day_of_week BETWEEN 1 AND 7), 
    CONSTRAINT check_time_range CHECK (end_time > start_time),
    CONSTRAINT check_slot_duration CHECK (slot_duration IN (10, 15, 20, 30, 45, 60))
);

CREATE INDEX idx_doctor_day ON doctor_availability(doctor_id, day_of_week);
CREATE INDEX idx_availability_doctor ON doctor_availability(doctor_id);

CREATE TABLE doctor_availability_exception (
    id BIGSERIAL PRIMARY KEY,
    doctor_id BIGINT NOT NULL REFERENCES doctors(id),
    exception_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(doctor_id, exception_date),
    CONSTRAINT check_time_range_exception CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time),
    CONSTRAINT check_exception_logic CHECK (
        (is_available = false AND start_time IS NULL AND end_time IS NULL)
        OR
        (is_available = true AND start_time IS NOT NULL AND end_time IS NOT NULL)
    )
);

CREATE INDEX idx_exception_doctor_date ON doctor_availability_exception(doctor_id, exception_date);
