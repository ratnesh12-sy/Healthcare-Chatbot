-- V7: Demo Seed Data for Live Presentation
-- Clean slate
TRUNCATE TABLE audit_logs, health_metrics, consultation_messages, chat_messages,
               appointments, doctor_availability_exception, doctor_availability,
               doctor_verifications, doctors, users RESTART IDENTITY CASCADE;

-- ===================== SECTION 1: USERS =====================
-- Admin (Admin@123)
INSERT INTO users (username, password, email, full_name, role_id)
VALUES ('admin', '$2a$10$Q6PUBf/fs/34pA35zpMjheol5ODi3Zo1bE8NaTHYEwyXu5sLAf/NC', 'admin@test.com', 'Admin User',
        (SELECT id FROM roles WHERE name = 'ROLE_ADMIN'));

-- Doctors (Doctor@123)
INSERT INTO users (username, password, email, full_name, role_id)
VALUES
('dr.sharma', '$2a$10$S9/COGArv8jwjyDekH9VJ.IVgAS9I9tCxX.T6mn1vsqu7iV82Ud76', 'arjun.sharma@hospital.com', 'Dr. Arjun Sharma', (SELECT id FROM roles WHERE name = 'ROLE_DOCTOR')),
('dr.mehta',  '$2a$10$S9/COGArv8jwjyDekH9VJ.IVgAS9I9tCxX.T6mn1vsqu7iV82Ud76', 'priya.mehta@hospital.com',  'Dr. Priya Mehta',  (SELECT id FROM roles WHERE name = 'ROLE_DOCTOR')),
('dr.iyer',   '$2a$10$S9/COGArv8jwjyDekH9VJ.IVgAS9I9tCxX.T6mn1vsqu7iV82Ud76', 'suresh.iyer@hospital.com',  'Dr. Suresh Iyer',  (SELECT id FROM roles WHERE name = 'ROLE_DOCTOR')),
('dr.khan',   '$2a$10$S9/COGArv8jwjyDekH9VJ.IVgAS9I9tCxX.T6mn1vsqu7iV82Ud76', 'farah.khan@hospital.com',   'Dr. Farah Khan',   (SELECT id FROM roles WHERE name = 'ROLE_DOCTOR')),
('dr.desai',  '$2a$10$S9/COGArv8jwjyDekH9VJ.IVgAS9I9tCxX.T6mn1vsqu7iV82Ud76', 'rohan.desai@hospital.com',  'Dr. Rohan Desai',  (SELECT id FROM roles WHERE name = 'ROLE_DOCTOR'));

-- Patients (Patient@123)
INSERT INTO users (username, password, email, full_name, role_id)
VALUES
('raatnesh', '$2a$10$QRh0gNGktia5jHCceK/AxeTuPTpalFTD.1YJG53sBKppRvoZVbd56', 'ratnesh.waghare@gmail.com',  'Ratnesh Waghare', (SELECT id FROM roles WHERE name = 'ROLE_PATIENT')),
('priya.p',  '$2a$10$QRh0gNGktia5jHCceK/AxeTuPTpalFTD.1YJG53sBKppRvoZVbd56', 'priya.patil@gmail.com',      'Priya Patil',     (SELECT id FROM roles WHERE name = 'ROLE_PATIENT')),
('amit.k',   '$2a$10$QRh0gNGktia5jHCceK/AxeTuPTpalFTD.1YJG53sBKppRvoZVbd56', 'amit.kumar@gmail.com',       'Amit Kumar',      (SELECT id FROM roles WHERE name = 'ROLE_PATIENT')),
('sneha.r',  '$2a$10$QRh0gNGktia5jHCceK/AxeTuPTpalFTD.1YJG53sBKppRvoZVbd56', 'sneha.rajput@gmail.com',     'Sneha Rajput',    (SELECT id FROM roles WHERE name = 'ROLE_PATIENT')),
('vikram.s', '$2a$10$QRh0gNGktia5jHCceK/AxeTuPTpalFTD.1YJG53sBKppRvoZVbd56', 'vikram.singh@gmail.com',     'Vikram Singh',    (SELECT id FROM roles WHERE name = 'ROLE_PATIENT')),
('anita.m',  '$2a$10$QRh0gNGktia5jHCceK/AxeTuPTpalFTD.1YJG53sBKppRvoZVbd56', 'anita.more@gmail.com',       'Anita More',      (SELECT id FROM roles WHERE name = 'ROLE_PATIENT')),
('rohit.j',  '$2a$10$QRh0gNGktia5jHCceK/AxeTuPTpalFTD.1YJG53sBKppRvoZVbd56', 'rohit.joshi@gmail.com',      'Rohit Joshi',     (SELECT id FROM roles WHERE name = 'ROLE_PATIENT')),
('kavya.n',  '$2a$10$QRh0gNGktia5jHCceK/AxeTuPTpalFTD.1YJG53sBKppRvoZVbd56', 'kavya.nair@gmail.com',       'Kavya Nair',      (SELECT id FROM roles WHERE name = 'ROLE_PATIENT'));

-- ===================== SECTION 2: DOCTORS TABLE =====================
INSERT INTO doctors (user_id, specialization, experience_years, bio, is_available)
SELECT id, 'Cardiologist', 12, 'Senior cardiologist with expertise in interventional cardiology and heart failure management.', true
FROM users WHERE username = 'dr.sharma';

INSERT INTO doctors (user_id, specialization, experience_years, bio, is_available)
SELECT id, 'Dermatologist', 8, 'Specialist in clinical and cosmetic dermatology, treating skin conditions and allergies.', true
FROM users WHERE username = 'dr.mehta';

INSERT INTO doctors (user_id, specialization, experience_years, bio, is_available)
SELECT id, 'General Physician', 15, 'Experienced general physician providing comprehensive primary care and preventive medicine.', true
FROM users WHERE username = 'dr.iyer';

INSERT INTO doctors (user_id, specialization, experience_years, bio, is_available)
SELECT id, 'Neurologist', 10, 'Neurologist specializing in headache disorders, epilepsy, and neurodegenerative diseases.', true
FROM users WHERE username = 'dr.khan';

INSERT INTO doctors (user_id, specialization, experience_years, bio, is_available)
SELECT id, 'Orthopedic Surgeon', 9, 'Orthopedic surgeon focused on sports injuries, joint replacements, and trauma care.', true
FROM users WHERE username = 'dr.desai';

-- ===================== SECTION 3: DOCTOR AVAILABILITY =====================
-- dr.sharma: Morning only (Mon-Fri)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT d.id, dow, '10:00', '13:00', 30, true
FROM doctors d JOIN users u ON d.user_id = u.id, generate_series(2, 6) AS dow
WHERE u.username = 'dr.sharma';

-- dr.mehta: Evening only (Mon-Fri)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT d.id, dow, '17:00', '20:00', 30, true
FROM doctors d JOIN users u ON d.user_id = u.id, generate_series(2, 6) AS dow
WHERE u.username = 'dr.mehta';

-- dr.iyer: Split schedule (Mon-Fri morning + evening)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT d.id, dow, '10:00', '13:00', 30, true
FROM doctors d JOIN users u ON d.user_id = u.id, generate_series(2, 6) AS dow
WHERE u.username = 'dr.iyer';
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT d.id, dow, '17:00', '20:00', 30, true
FROM doctors d JOIN users u ON d.user_id = u.id, generate_series(2, 6) AS dow
WHERE u.username = 'dr.iyer';

-- dr.khan: Split schedule (Mon-Fri)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT d.id, dow, '10:00', '13:00', 30, true
FROM doctors d JOIN users u ON d.user_id = u.id, generate_series(2, 6) AS dow
WHERE u.username = 'dr.khan';
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT d.id, dow, '17:00', '20:00', 30, true
FROM doctors d JOIN users u ON d.user_id = u.id, generate_series(2, 6) AS dow
WHERE u.username = 'dr.khan';

-- dr.desai: Split schedule (Mon-Fri) + Saturday morning
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT d.id, dow, '10:00', '13:00', 30, true
FROM doctors d JOIN users u ON d.user_id = u.id, generate_series(2, 6) AS dow
WHERE u.username = 'dr.desai';
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT d.id, dow, '17:00', '20:00', 30, true
FROM doctors d JOIN users u ON d.user_id = u.id, generate_series(2, 6) AS dow
WHERE u.username = 'dr.desai';
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT d.id, 7, '10:00', '13:00', 30, true
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.username = 'dr.desai';

-- Availability Exceptions
INSERT INTO doctor_availability_exception (doctor_id, exception_date, is_available, reason)
SELECT d.id, '2026-04-28', false, 'Personal leave'
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.username = 'dr.sharma';

INSERT INTO doctor_availability_exception (doctor_id, exception_date, is_available, reason)
SELECT d.id, '2026-04-30', false, 'Medical conference'
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.username = 'dr.mehta';

-- ===================== SECTION 4: APPOINTMENTS =====================
-- COMPLETED (Past: Apr 22-25)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-04-22 10:00:00', 30, 'COMPLETED', 'Chest pain and breathlessness for 2 days', NOW() - INTERVAL '5 days'
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'raatnesh' AND du.username = 'dr.sharma';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-04-23 17:30:00', 30, 'COMPLETED', 'Skin rash on both arms, very itchy', NOW() - INTERVAL '4 days'
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'priya.p' AND du.username = 'dr.mehta';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-04-24 10:30:00', 30, 'COMPLETED', 'High fever 102F with body ache', NOW() - INTERVAL '3 days'
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'amit.k' AND du.username = 'dr.iyer';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-04-24 17:00:00', 30, 'COMPLETED', 'Frequent headaches and dizziness', NOW() - INTERVAL '3 days'
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'sneha.r' AND du.username = 'dr.khan';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-04-25 17:30:00', 30, 'COMPLETED', 'Dry skin and persistent itching', NOW() - INTERVAL '2 days'
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'raatnesh' AND du.username = 'dr.mehta';

-- CANCELLED
INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, cancel_reason, cancelled_by, created_at)
SELECT u.id, d.id, '2026-04-25 10:00:00', 30, 'CANCELLED', 'Knee pain after sports injury', 'Need to reschedule due to work', 'PATIENT', NOW() - INTERVAL '2 days'
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'vikram.s' AND du.username = 'dr.desai';

-- CONFIRMED (Upcoming: Apr 27-30)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-04-27 10:00:00', 30, 'CONFIRMED', 'Common cold and sore throat', NOW() - INTERVAL '1 day'
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'anita.m' AND du.username = 'dr.iyer';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-04-27 12:00:00', 30, 'CONFIRMED', 'High blood pressure and dizziness', NOW() - INTERVAL '1 day'
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'rohit.j' AND du.username = 'dr.sharma';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-04-29 17:30:00', 30, 'CONFIRMED', 'Recurring migraines with aura', NOW()
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'kavya.n' AND du.username = 'dr.khan';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-04-30 10:00:00', 30, 'CONFIRMED', 'Shoulder pain after gym workout', NOW()
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'priya.p' AND du.username = 'dr.desai';

-- PENDING (Future: May 1-3)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-05-01 10:00:00', 30, 'PENDING', 'Irregular heartbeat during exercise', NOW()
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'amit.k' AND du.username = 'dr.sharma';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-05-01 17:00:00', 30, 'PENDING', 'Acne treatment follow-up', NOW()
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'sneha.r' AND du.username = 'dr.mehta';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-05-02 10:30:00', 30, 'PENDING', 'Diabetes checkup and blood sugar review', NOW()
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'vikram.s' AND du.username = 'dr.iyer';

INSERT INTO appointments (patient_id, doctor_id, appointment_date, duration_minutes, status, symptoms_summary, created_at)
SELECT u.id, d.id, '2026-05-03 17:00:00', 30, 'PENDING', 'Memory issues and brain fog', NOW()
FROM users u, doctors d JOIN users du ON d.user_id = du.id WHERE u.username = 'rohit.j' AND du.username = 'dr.khan';
-- Part 3: Chat messages, Health metrics, Audit logs
-- This will be appended to V7__Demo_Seed_Data.sql

-- ===================== SECTION 5: CONSULTATION CHAT MESSAGES =====================
-- Conv 1: raatnesh <-> dr.sharma (COMPLETED - Chest pain)
INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'Good morning doctor, I have been having chest pain for 2 days now.', 'SENT',
       a.appointment_date, 1
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'raatnesh' AND a.symptoms_summary LIKE 'Chest pain%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'Hello Ratnesh, can you describe the pain? Is it sharp or dull?', 'SENT',
       a.appointment_date + INTERVAL '1 minute', 2
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'raatnesh' AND a.symptoms_summary LIKE 'Chest pain%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'It is a dull pressure, especially when I climb stairs.', 'SENT',
       a.appointment_date + INTERVAL '2 minutes', 3
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'raatnesh' AND a.symptoms_summary LIKE 'Chest pain%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'Any shortness of breath or sweating?', 'SENT',
       a.appointment_date + INTERVAL '3 minutes', 4
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'raatnesh' AND a.symptoms_summary LIKE 'Chest pain%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'Yes, slight breathlessness when walking fast.', 'SENT',
       a.appointment_date + INTERVAL '4 minutes', 5
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'raatnesh' AND a.symptoms_summary LIKE 'Chest pain%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'I will recommend an ECG and blood test. Please avoid exertion for now.', 'SENT',
       a.appointment_date + INTERVAL '5 minutes', 6
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'raatnesh' AND a.symptoms_summary LIKE 'Chest pain%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'Thank you doctor, should I take any medicine?', 'SENT',
       a.appointment_date + INTERVAL '6 minutes', 7
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'raatnesh' AND a.symptoms_summary LIKE 'Chest pain%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'I will prescribe a mild beta-blocker. Pick it up from the pharmacy.', 'SENT',
       a.appointment_date + INTERVAL '7 minutes', 8
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'raatnesh' AND a.symptoms_summary LIKE 'Chest pain%';

-- Conv 2: priya.p <-> dr.mehta (COMPLETED - Skin rash)
INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'Hello Dr. Mehta, I have a rash on both arms since last week.', 'SENT',
       a.appointment_date, 1
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'priya.p' AND a.symptoms_summary LIKE 'Skin rash%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'Hi Priya, is the rash itchy or painful?', 'SENT',
       a.appointment_date + INTERVAL '1 minute', 2
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'priya.p' AND a.symptoms_summary LIKE 'Skin rash%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'Very itchy, especially at night. I cannot sleep properly.', 'SENT',
       a.appointment_date + INTERVAL '2 minutes', 3
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'priya.p' AND a.symptoms_summary LIKE 'Skin rash%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'Any new soaps, detergents or food changes recently?', 'SENT',
       a.appointment_date + INTERVAL '3 minutes', 4
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'priya.p' AND a.symptoms_summary LIKE 'Skin rash%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'I did switch my detergent brand about 10 days ago.', 'SENT',
       a.appointment_date + INTERVAL '4 minutes', 5
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'priya.p' AND a.symptoms_summary LIKE 'Skin rash%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'That is likely contact dermatitis. Switch back and apply calamine lotion twice daily.', 'SENT',
       a.appointment_date + INTERVAL '5 minutes', 6
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'priya.p' AND a.symptoms_summary LIKE 'Skin rash%';

-- Conv 3: amit.k <-> dr.iyer (COMPLETED - Fever)
INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'Doctor, I have had fever since yesterday. It reached 102 degrees.', 'SENT',
       a.appointment_date, 1
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'amit.k' AND a.symptoms_summary LIKE 'High fever%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'Hello Amit, any cough or cold along with it?', 'SENT',
       a.appointment_date + INTERVAL '1 minute', 2
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'amit.k' AND a.symptoms_summary LIKE 'High fever%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'Yes, mild cough and body ache. Very weak.', 'SENT',
       a.appointment_date + INTERVAL '2 minutes', 3
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'amit.k' AND a.symptoms_summary LIKE 'High fever%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'Sounds like viral fever. Take paracetamol 500mg every 6 hours and drink plenty of fluids.', 'SENT',
       a.appointment_date + INTERVAL '3 minutes', 4
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'amit.k' AND a.symptoms_summary LIKE 'High fever%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'Should I get a blood test done?', 'SENT',
       a.appointment_date + INTERVAL '4 minutes', 5
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'amit.k' AND a.symptoms_summary LIKE 'High fever%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'If fever persists beyond 3 days, yes. Otherwise rest and stay hydrated.', 'SENT',
       a.appointment_date + INTERVAL '5 minutes', 6
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'amit.k' AND a.symptoms_summary LIKE 'High fever%';

-- Conv 4: rohit.j <-> dr.sharma (CONFIRMED - ACTIVE/LIVE chat)
INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'Hello Dr. Sharma, I wanted to share my symptoms before our appointment.', 'SENT',
       NOW() - INTERVAL '2 hours', 1
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'rohit.j' AND a.symptoms_summary LIKE 'High blood pressure%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'Hello Rohit, please go ahead and describe what you are feeling.', 'SENT',
       NOW() - INTERVAL '1 hour 55 minutes', 2
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'rohit.j' AND a.symptoms_summary LIKE 'High blood pressure%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, u.id, 'PATIENT', 'I have been feeling dizzy in the mornings. My BP reading was 150/95 yesterday.', 'SENT',
       NOW() - INTERVAL '1 hour 50 minutes', 3
FROM appointments a JOIN users u ON a.patient_id = u.id
WHERE u.username = 'rohit.j' AND a.symptoms_summary LIKE 'High blood pressure%';

INSERT INTO consultation_messages (appointment_id, sender_id, sender_type, content, status, timestamp, sequence_number)
SELECT a.id, du.id, 'DOCTOR', 'That is elevated. Please bring your last 3 days BP readings to the appointment.', 'SENT',
       NOW() - INTERVAL '1 hour 45 minutes', 4
FROM appointments a JOIN users u ON a.patient_id = u.id
JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
WHERE u.username = 'rohit.j' AND a.symptoms_summary LIKE 'High blood pressure%';

-- ===================== SECTION 6: HEALTH METRICS =====================
INSERT INTO health_metrics (user_id, metric_type, metric_value, recorded_at)
SELECT id, 'HEART_RATE', '72', NOW() - INTERVAL '3 days' FROM users WHERE username = 'raatnesh';
INSERT INTO health_metrics (user_id, metric_type, metric_value, recorded_at)
SELECT id, 'HEART_RATE', '78', NOW() - INTERVAL '2 days' FROM users WHERE username = 'raatnesh';
INSERT INTO health_metrics (user_id, metric_type, metric_value, recorded_at)
SELECT id, 'HEART_RATE', '85', NOW() - INTERVAL '1 day' FROM users WHERE username = 'raatnesh';
INSERT INTO health_metrics (user_id, metric_type, metric_value, recorded_at)
SELECT id, 'BLOOD_PRESSURE', '120/80', NOW() - INTERVAL '2 days' FROM users WHERE username = 'raatnesh';
INSERT INTO health_metrics (user_id, metric_type, metric_value, recorded_at)
SELECT id, 'BLOOD_PRESSURE', '130/85', NOW() - INTERVAL '1 day' FROM users WHERE username = 'raatnesh';
INSERT INTO health_metrics (user_id, metric_type, metric_value, recorded_at)
SELECT id, 'SLEEP_HOURS', '7', NOW() - INTERVAL '1 day' FROM users WHERE username = 'raatnesh';

-- ===================== SECTION 7: AUDIT LOGS =====================
INSERT INTO audit_logs (admin_user_id, action_type, target_user_id, details, timestamp)
SELECT a.id, 'USER_REGISTERED', t.id, 'Patient registered via signup', NOW() - INTERVAL '7 days'
FROM users a, users t WHERE a.username = 'admin' AND t.username = 'raatnesh';

INSERT INTO audit_logs (admin_user_id, action_type, target_user_id, details, timestamp)
SELECT a.id, 'USER_REGISTERED', t.id, 'Patient registered via signup', NOW() - INTERVAL '6 days'
FROM users a, users t WHERE a.username = 'admin' AND t.username = 'priya.p';

INSERT INTO audit_logs (admin_user_id, action_type, target_user_id, details, timestamp)
SELECT a.id, 'DOCTOR_VERIFIED', t.id, 'Doctor license verified and approved', NOW() - INTERVAL '5 days'
FROM users a, users t WHERE a.username = 'admin' AND t.username = 'dr.sharma';

INSERT INTO audit_logs (admin_user_id, action_type, target_user_id, details, timestamp)
SELECT a.id, 'ROLE_UPDATE', t.id, 'Assigned role: ROLE_DOCTOR', NOW() - INTERVAL '5 days'
FROM users a, users t WHERE a.username = 'admin' AND t.username = 'dr.mehta';

INSERT INTO audit_logs (admin_user_id, action_type, target_user_id, details, timestamp)
SELECT a.id, 'APPOINTMENT_BOOKED', t.id, 'New appointment booked with Dr. Sharma', NOW() - INTERVAL '3 days'
FROM users a, users t WHERE a.username = 'admin' AND t.username = 'raatnesh';

INSERT INTO audit_logs (admin_user_id, action_type, target_user_id, details, timestamp)
SELECT a.id, 'APPOINTMENT_CANCELLED', t.id, 'Appointment cancelled by patient', NOW() - INTERVAL '2 days'
FROM users a, users t WHERE a.username = 'admin' AND t.username = 'vikram.s';
