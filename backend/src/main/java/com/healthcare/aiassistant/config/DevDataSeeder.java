package com.healthcare.aiassistant.config;

import com.healthcare.aiassistant.model.*;
import com.healthcare.aiassistant.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.Optional;

@Component
@Profile("dev") // ← ONLY runs when SPRING_PROFILES_ACTIVE=dev
@Transactional
public class DevDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private ConsultationMessageRepository consultationMessageRepository;
    @Autowired private HealthMetricRepository healthMetricRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private DoctorAvailabilityRepository doctorAvailabilityRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Skip if data already exists — prevents re-seeding on every restart
        if (userRepository.count() > 0) {
            log.info("DEV SEEDER: Data already exists, skipping seed.");
            return;
        }

        log.info("DEV SEEDER: Seeding development data...");

        seedUsers();
        seedDoctors();
        seedAvailability();
        seedAppointments();
        seedChatMessages();
        seedHealthMetrics();
        seedAuditLogs();

        log.info("DEV SEEDER: Done. Users seeded: {}", userRepository.count());
    }

    // ─── SECTION 1: USERS ────────────────────────────────────────────────────

    private void seedUsers() {
        Role adminRole  = roleRepository.findByName(ERole.ROLE_ADMIN)
                .orElseThrow(() -> new RuntimeException("ROLE_ADMIN not found"));
        Role doctorRole = roleRepository.findByName(ERole.ROLE_DOCTOR)
                .orElseThrow(() -> new RuntimeException("ROLE_DOCTOR not found"));
        Role patientRole = roleRepository.findByName(ERole.ROLE_PATIENT)
                .orElseThrow(() -> new RuntimeException("ROLE_PATIENT not found"));

        String adminPass   = passwordEncoder.encode("Admin@123");
        String doctorPass  = passwordEncoder.encode("Doctor@123");
        String patientPass = passwordEncoder.encode("Patient@123");

        // Admin
        createUser("admin",     adminPass,   "admin@test.com",              "Admin User",       adminRole);

        // Doctors
        createUser("dr.sharma", doctorPass,  "arjun.sharma@hospital.com",   "Dr. Arjun Sharma", doctorRole);
        createUser("dr.mehta",  doctorPass,  "priya.mehta@hospital.com",    "Dr. Priya Mehta",  doctorRole);
        createUser("dr.iyer",   doctorPass,  "suresh.iyer@hospital.com",    "Dr. Suresh Iyer",  doctorRole);
        createUser("dr.khan",   doctorPass,  "farah.khan@hospital.com",     "Dr. Farah Khan",   doctorRole);
        createUser("dr.desai",  doctorPass,  "rohan.desai@hospital.com",    "Dr. Rohan Desai",  doctorRole);

        // Patients
        createUser("raatnesh",  patientPass, "ratnesh.waghare@gmail.com",   "Ratnesh Waghare",  patientRole);
        createUser("priya.p",   patientPass, "priya.patil@gmail.com",       "Priya Patil",      patientRole);
        createUser("amit.k",    patientPass, "amit.kumar@gmail.com",        "Amit Kumar",       patientRole);
        createUser("sneha.r",   patientPass, "sneha.rajput@gmail.com",      "Sneha Rajput",     patientRole);
        createUser("vikram.s",  patientPass, "vikram.singh@gmail.com",      "Vikram Singh",     patientRole);
        createUser("anita.m",   patientPass, "anita.more@gmail.com",        "Anita More",       patientRole);
        createUser("rohit.j",   patientPass, "rohit.joshi@gmail.com",       "Rohit Joshi",      patientRole);
        createUser("kavya.n",   patientPass, "kavya.nair@gmail.com",        "Kavya Nair",       patientRole);
    }

    private User createUser(String username, String password,
                            String email, String fullName, Role role) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setRole(role);
        return userRepository.save(user);
    }

    // ─── SECTION 2: DOCTORS ──────────────────────────────────────────────────

    private void seedDoctors() {
        createDoctor("dr.sharma", "Cardiologist",        12,
            "Senior cardiologist with expertise in interventional cardiology and heart failure management.");
        createDoctor("dr.mehta",  "Dermatologist",        8,
            "Specialist in clinical and cosmetic dermatology, treating skin conditions and allergies.");
        createDoctor("dr.iyer",   "General Physician",   15,
            "Experienced general physician providing comprehensive primary care and preventive medicine.");
        createDoctor("dr.khan",   "Neurologist",         10,
            "Neurologist specializing in headache disorders, epilepsy, and neurodegenerative diseases.");
        createDoctor("dr.desai",  "Orthopedic Surgeon",   9,
            "Orthopedic surgeon focused on sports injuries, joint replacements, and trauma care.");
    }

    private void createDoctor(String username, String specialization,
                              int experience, String bio) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        Doctor doctor = new Doctor();
        doctor.setUser(user);
        doctor.setSpecialization(specialization);
        doctor.setExperienceYears(experience);
        doctor.setBio(bio);
        doctor.setIsAvailable(true);
        doctorRepository.save(doctor);
    }

    // ─── SECTION 3: AVAILABILITY ─────────────────────────────────────────────

    private void seedAvailability() {
        // dr.sharma: Morning only Mon-Fri (days 2-6)
        addAvailability("dr.sharma", 2, 6, LocalTime.of(10, 0), LocalTime.of(13, 0));

        // dr.mehta: Evening only Mon-Fri
        addAvailability("dr.mehta",  2, 6, LocalTime.of(17, 0), LocalTime.of(20, 0));

        // dr.iyer: Morning + Evening Mon-Fri
        addAvailability("dr.iyer",   2, 6, LocalTime.of(10, 0), LocalTime.of(13, 0));
        addAvailability("dr.iyer",   2, 6, LocalTime.of(17, 0), LocalTime.of(20, 0));

        // dr.khan: Morning + Evening Mon-Fri
        addAvailability("dr.khan",   2, 6, LocalTime.of(10, 0), LocalTime.of(13, 0));
        addAvailability("dr.khan",   2, 6, LocalTime.of(17, 0), LocalTime.of(20, 0));

        // dr.desai: Morning + Evening Mon-Fri + Saturday morning
        addAvailability("dr.desai",  2, 6, LocalTime.of(10, 0), LocalTime.of(13, 0));
        addAvailability("dr.desai",  2, 6, LocalTime.of(17, 0), LocalTime.of(20, 0));
        addAvailability("dr.desai",  7, 7, LocalTime.of(10, 0), LocalTime.of(13, 0));
    }

    private void addAvailability(String username, int fromDay, int toDay,
                                 LocalTime start, LocalTime end) {
        Doctor doctor = getDoctorByUsername(username);
        for (int day = fromDay; day <= toDay; day++) {
            DoctorAvailability avail = new DoctorAvailability();
            avail.setDoctor(doctor);
            avail.setDayOfWeek(day);
            avail.setStartTime(start);
            avail.setEndTime(end);
            avail.setSlotDuration(30);
            avail.setIsActive(true);
            doctorAvailabilityRepository.save(avail);
        }
    }

    // ─── SECTION 4: APPOINTMENTS ─────────────────────────────────────────────

    private void seedAppointments() {
        LocalDateTime now = LocalDateTime.now();

        // COMPLETED
        createAppointment("raatnesh", "dr.sharma", now.minusDays(6).withHour(10).withMinute(0),
                AppointmentStatus.COMPLETED, "Chest pain and breathlessness for 2 days", null, null);
        createAppointment("priya.p",  "dr.mehta",  now.minusDays(5).withHour(17).withMinute(30),
                AppointmentStatus.COMPLETED, "Skin rash on both arms, very itchy", null, null);
        createAppointment("amit.k",   "dr.iyer",   now.minusDays(4).withHour(10).withMinute(30),
                AppointmentStatus.COMPLETED, "High fever 102F with body ache", null, null);
        createAppointment("sneha.r",  "dr.khan",   now.minusDays(4).withHour(17).withMinute(0),
                AppointmentStatus.COMPLETED, "Frequent headaches and dizziness", null, null);
        createAppointment("raatnesh", "dr.mehta",  now.minusDays(3).withHour(17).withMinute(30),
                AppointmentStatus.COMPLETED, "Dry skin and persistent itching", null, null);

        // CANCELLED
        createAppointment("vikram.s", "dr.desai",  now.minusDays(3).withHour(10).withMinute(0),
                AppointmentStatus.CANCELLED, "Knee pain after sports injury",
                "Need to reschedule due to work", "PATIENT");

        // CONFIRMED
        createAppointment("anita.m",  "dr.iyer",   now.plusDays(1).withHour(10).withMinute(0),
                AppointmentStatus.CONFIRMED, "Common cold and sore throat", null, null);
        createAppointment("rohit.j",  "dr.sharma", now.plusDays(1).withHour(12).withMinute(0),
                AppointmentStatus.CONFIRMED, "High blood pressure and dizziness", null, null);
        createAppointment("kavya.n",  "dr.khan",   now.plusDays(3).withHour(17).withMinute(30),
                AppointmentStatus.CONFIRMED, "Recurring migraines with aura", null, null);
        createAppointment("priya.p",  "dr.desai",  now.plusDays(4).withHour(10).withMinute(0),
                AppointmentStatus.CONFIRMED, "Shoulder pain after gym workout", null, null);

        // PENDING
        createAppointment("amit.k",   "dr.sharma", now.plusDays(5).withHour(10).withMinute(0),
                AppointmentStatus.PENDING, "Irregular heartbeat during exercise", null, null);
        createAppointment("sneha.r",  "dr.mehta",  now.plusDays(5).withHour(17).withMinute(0),
                AppointmentStatus.PENDING, "Acne treatment follow-up", null, null);
        createAppointment("vikram.s", "dr.iyer",   now.plusDays(6).withHour(10).withMinute(30),
                AppointmentStatus.PENDING, "Diabetes checkup and blood sugar review", null, null);
        createAppointment("rohit.j",  "dr.khan",   now.plusDays(7).withHour(17).withMinute(0),
                AppointmentStatus.PENDING, "Memory issues and brain fog", null, null);
    }

    private void createAppointment(String patientUsername, String doctorUsername,
                                   LocalDateTime dateTime, AppointmentStatus status,
                                   String symptoms, String cancelReason,
                                   String cancelledBy) {
        User patient = userRepository.findByUsername(patientUsername)
                .orElseThrow(() -> new RuntimeException("Patient not found: " + patientUsername));
        Doctor doctor = getDoctorByUsername(doctorUsername);

        Appointment appt = new Appointment();
        appt.setPatient(patient);
        appt.setDoctor(doctor);
        appt.setAppointmentDate(dateTime);
        appt.setDurationMinutes(30);
        appt.setStatus(status);
        appt.setSymptomsSummary(symptoms);
        if (cancelReason != null) appt.setCancelReason(cancelReason);
        if (cancelledBy != null)  appt.setCancelledBy(cancelledBy);
        appt.setCreatedAt(LocalDateTime.now());
        appointmentRepository.save(appt);
    }

    // ─── SECTION 5: CHAT MESSAGES ────────────────────────────────────────────

    private void seedChatMessages() {
        seedConversation1(); // raatnesh <-> dr.sharma (chest pain)
        seedConversation2(); // priya.p  <-> dr.mehta  (skin rash)
        seedConversation3(); // amit.k   <-> dr.iyer   (fever)
        seedConversation4(); // rohit.j  <-> dr.sharma (BP - live)
    }

    private void seedConversation1() {
        Appointment appt = getAppointment("raatnesh", "Chest pain");
        User patient  = appt.getPatient();
        User doctor   = appt.getDoctor().getUser();
        LocalDateTime base = appt.getAppointmentDate();

        saveMsg(appt, patient, SenderType.PATIENT,
                "Good morning doctor, I have been having chest pain for 2 days now.", base, 1);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "Hello Ratnesh, can you describe the pain? Is it sharp or dull?", base.plusMinutes(1), 2);
        saveMsg(appt, patient, SenderType.PATIENT,
                "It is a dull pressure, especially when I climb stairs.", base.plusMinutes(2), 3);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "Any shortness of breath or sweating?", base.plusMinutes(3), 4);
        saveMsg(appt, patient, SenderType.PATIENT,
                "Yes, slight breathlessness when walking fast.", base.plusMinutes(4), 5);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "I will recommend an ECG and blood test. Please avoid exertion for now.", base.plusMinutes(5), 6);
        saveMsg(appt, patient, SenderType.PATIENT,
                "Thank you doctor, should I take any medicine?", base.plusMinutes(6), 7);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "I will prescribe a mild beta-blocker. Pick it up from the pharmacy.", base.plusMinutes(7), 8);
    }

    private void seedConversation2() {
        Appointment appt = getAppointment("priya.p", "Skin rash");
        User patient  = appt.getPatient();
        User doctor   = appt.getDoctor().getUser();
        LocalDateTime base = appt.getAppointmentDate();

        saveMsg(appt, patient, SenderType.PATIENT,
                "Hello Dr. Mehta, I have a rash on both arms since last week.", base, 1);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "Hi Priya, is the rash itchy or painful?", base.plusMinutes(1), 2);
        saveMsg(appt, patient, SenderType.PATIENT,
                "Very itchy, especially at night. I cannot sleep properly.", base.plusMinutes(2), 3);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "Any new soaps, detergents or food changes recently?", base.plusMinutes(3), 4);
        saveMsg(appt, patient, SenderType.PATIENT,
                "I did switch my detergent brand about 10 days ago.", base.plusMinutes(4), 5);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "That is likely contact dermatitis. Switch back and apply calamine lotion twice daily.",
                base.plusMinutes(5), 6);
    }

    private void seedConversation3() {
        Appointment appt = getAppointment("amit.k", "High fever");
        User patient  = appt.getPatient();
        User doctor   = appt.getDoctor().getUser();
        LocalDateTime base = appt.getAppointmentDate();

        saveMsg(appt, patient, SenderType.PATIENT,
                "Doctor, I have had fever since yesterday. It reached 102 degrees.", base, 1);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "Hello Amit, any cough or cold along with it?", base.plusMinutes(1), 2);
        saveMsg(appt, patient, SenderType.PATIENT,
                "Yes, mild cough and body ache. Very weak.", base.plusMinutes(2), 3);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "Sounds like viral fever. Take paracetamol 500mg every 6 hours and drink plenty of fluids.",
                base.plusMinutes(3), 4);
        saveMsg(appt, patient, SenderType.PATIENT,
                "Should I get a blood test done?", base.plusMinutes(4), 5);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "If fever persists beyond 3 days, yes. Otherwise rest and stay hydrated.",
                base.plusMinutes(5), 6);
    }

    private void seedConversation4() {
        Appointment appt = getAppointment("rohit.j", "High blood pressure");
        User patient  = appt.getPatient();
        User doctor   = appt.getDoctor().getUser();
        LocalDateTime base = LocalDateTime.now().minusHours(2);

        saveMsg(appt, patient, SenderType.PATIENT,
                "Hello Dr. Sharma, I wanted to share my symptoms before our appointment.",
                base, 1);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "Hello Rohit, please go ahead and describe what you are feeling.",
                base.plusMinutes(5), 2);
        saveMsg(appt, patient, SenderType.PATIENT,
                "I have been feeling dizzy in the mornings. My BP reading was 150/95 yesterday.",
                base.plusMinutes(10), 3);
        saveMsg(appt, doctor,  SenderType.DOCTOR,
                "That is elevated. Please bring your last 3 days BP readings to the appointment.",
                base.plusMinutes(15), 4);
    }

    private void saveMsg(Appointment appt, User sender, SenderType senderType,
                         String content, LocalDateTime timestamp, int seq) {
        ConsultationMessage msg = new ConsultationMessage();
        msg.setAppointment(appt);
        msg.setSender(sender);
        msg.setSenderType(senderType);
        msg.setContent(content);
        msg.setStatus("SENT");
        msg.setTimestamp(timestamp);
        msg.setSequenceNumber((long) seq);
        consultationMessageRepository.save(msg);
    }

    // ─── SECTION 6: HEALTH METRICS ───────────────────────────────────────────

    private void seedHealthMetrics() {
        User ratnesh = userRepository.findByUsername("raatnesh")
                .orElseThrow(() -> new RuntimeException("User not found"));

        saveMetric(ratnesh, HealthMetricType.HEART_RATE,     "72",      LocalDateTime.now().minusDays(3));
        saveMetric(ratnesh, HealthMetricType.HEART_RATE,     "78",      LocalDateTime.now().minusDays(2));
        saveMetric(ratnesh, HealthMetricType.HEART_RATE,     "85",      LocalDateTime.now().minusDays(1));
        saveMetric(ratnesh, HealthMetricType.BLOOD_PRESSURE, "120/80",  LocalDateTime.now().minusDays(2));
        saveMetric(ratnesh, HealthMetricType.BLOOD_PRESSURE, "130/85",  LocalDateTime.now().minusDays(1));
        saveMetric(ratnesh, HealthMetricType.SLEEP_HOURS,    "7",       LocalDateTime.now().minusDays(1));
    }

    private void saveMetric(User user, HealthMetricType type, String value, LocalDateTime recordedAt) {
        HealthMetric metric = new HealthMetric();
        metric.setUser(user);
        metric.setMetricType(type);
        metric.setMetricValue(value);
        metric.setRecordedAt(recordedAt);
        healthMetricRepository.save(metric);
    }

    // ─── SECTION 7: AUDIT LOGS ───────────────────────────────────────────────

    private void seedAuditLogs() {
        User admin   = userRepository.findByUsername("admin")
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        saveAuditLog(admin, "USER_REGISTERED",    "raatnesh",
                "Patient registered via signup",         LocalDateTime.now().minusDays(7));
        saveAuditLog(admin, "USER_REGISTERED",    "priya.p",
                "Patient registered via signup",         LocalDateTime.now().minusDays(6));
        saveAuditLog(admin, "DOCTOR_VERIFIED",    "dr.sharma",
                "Doctor license verified and approved",  LocalDateTime.now().minusDays(5));
        saveAuditLog(admin, "ROLE_UPDATE",        "dr.mehta",
                "Assigned role: ROLE_DOCTOR",            LocalDateTime.now().minusDays(5));
        saveAuditLog(admin, "APPOINTMENT_BOOKED", "raatnesh",
                "New appointment booked with Dr. Sharma",LocalDateTime.now().minusDays(3));
        saveAuditLog(admin, "APPOINTMENT_CANCELLED", "vikram.s",
                "Appointment cancelled by patient",      LocalDateTime.now().minusDays(2));
    }

    private void saveAuditLog(User admin, String actionType, String targetUsername,
                              String details, LocalDateTime timestamp) {
        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new RuntimeException("User not found: " + targetUsername));
        AuditLog auditLog = new AuditLog();
        auditLog.setAdminUser(admin);
        auditLog.setActionType(actionType);
        auditLog.setTargetUserId(target.getId());
        auditLog.setDetails(details);
        auditLog.setTimestamp(timestamp);
        auditLogRepository.save(auditLog);
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private Doctor getDoctorByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return doctorRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new RuntimeException("Doctor not found: " + username));
    }

    private Appointment getAppointment(String patientUsername, String symptomsPrefix) {
        User patient = userRepository.findByUsername(patientUsername)
                .orElseThrow(() -> new RuntimeException("Patient not found: " + patientUsername));
        return appointmentRepository
                .findByPatientIdAndSymptomsSummaryStartingWith(patient.getId(), symptomsPrefix)
                .orElseThrow(() -> new RuntimeException("Appointment not found for: " + patientUsername));
    }
}
