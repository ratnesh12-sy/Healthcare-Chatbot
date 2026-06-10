package com.healthcare.aiassistant.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.healthcare.aiassistant.model.*;
import com.healthcare.aiassistant.payload.request.AppointmentRequest;
import com.healthcare.aiassistant.repository.*;
import com.healthcare.aiassistant.security.services.UserDetailsImpl;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for {@link AppointmentController}.
 *
 * Uses H2 in PostgreSQL compatibility mode with Hibernate create-drop.
 * Security is simulated via MockMvc's {@code .with(user(...))} — no real JWT needed.
 *
 * Test coverage:
 * - Happy path: booking, listing, cancellation
 * - Auth failures: 401 (unauthenticated), 403 (wrong role)
 * - Validation errors: 400 (missing fields, past dates)
 * - Business rules: outside working hours, slot conflict (409)
 * - Ownership: patient can only cancel own appointments
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional // Each test rolls back — full isolation
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AppointmentControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    // ── Test Data ────────────────────────────────────────────────────

    private User patientUser;
    private User doctorUser;
    private User otherPatientUser;
    private Doctor doctor;
    private UserDetailsImpl patientPrincipal;
    private UserDetailsImpl doctorPrincipal;
    private UserDetailsImpl otherPatientPrincipal;

    /** A future date guaranteed to be within working hours (10:00 AM, tomorrow) */
    private LocalDateTime futureSlot;

    @BeforeEach
    void setUp() {
        // Clean slate
        appointmentRepository.deleteAll();
        doctorRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();

        // 1. Create roles
        Role patientRole = new Role(null, ERole.ROLE_PATIENT);
        Role doctorRole = new Role(null, ERole.ROLE_DOCTOR);
        patientRole = roleRepository.save(patientRole);
        doctorRole = roleRepository.save(doctorRole);

        // 2. Create patient user
        patientUser = new User("patient1", "patient1@test.com", "password123");
        patientUser.setFullName("Test Patient");
        patientUser.setRole(patientRole);
        patientUser = userRepository.save(patientUser);

        // 3. Create another patient (for ownership tests)
        otherPatientUser = new User("patient2", "patient2@test.com", "password123");
        otherPatientUser.setFullName("Other Patient");
        otherPatientUser.setRole(patientRole);
        otherPatientUser = userRepository.save(otherPatientUser);

        // 4. Create doctor user + doctor entity
        doctorUser = new User("doctor1", "doctor1@test.com", "password123");
        doctorUser.setFullName("Dr. Test");
        doctorUser.setRole(doctorRole);
        doctorUser = userRepository.save(doctorUser);

        doctor = new Doctor();
        doctor.setUser(doctorUser);
        doctor.setSpecialization("General Medicine");
        doctor.setExperienceYears(5);
        doctor.setBio("Test doctor");
        doctor.setIsAvailable(true);
        doctor.setVerificationStatus(ERequestStatus.APPROVED);
        doctor = doctorRepository.save(doctor);

        // 5. Build security principals
        patientPrincipal = new UserDetailsImpl(
                patientUser.getId(), patientUser.getUsername(), patientUser.getEmail(),
                patientUser.getFullName(), patientUser.getPassword(), true, true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_PATIENT")));

        doctorPrincipal = new UserDetailsImpl(
                doctorUser.getId(), doctorUser.getUsername(), doctorUser.getEmail(),
                doctorUser.getFullName(), doctorUser.getPassword(), true, true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_DOCTOR")));

        otherPatientPrincipal = new UserDetailsImpl(
                otherPatientUser.getId(), otherPatientUser.getUsername(), otherPatientUser.getEmail(),
                otherPatientUser.getFullName(), otherPatientUser.getPassword(), true, true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_PATIENT")));

        // 6. Future slot — tomorrow at 10:00 AM (always within 09:00–16:30 working hours)
        futureSlot = LocalDateTime.now().plusDays(1)
                .withHour(10).withMinute(0).withSecond(0).withNano(0);
    }

    // ====================================================================
    // 1. BOOKING — Happy Path
    // ====================================================================

    @Test
    @Order(1)
    @DisplayName("POST /api/appointments — Patient books appointment → 201 CREATED")
    void bookAppointment_happyPath_returns201() throws Exception {
        AppointmentRequest request = buildRequest(doctor.getId(), futureSlot, "Headache and fever");

        mockMvc.perform(post("/api/appointments")
                        .with(user(patientPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.id").isNumber())
                .andExpect(jsonPath("$.data.doctorName").value("Dr. Test"))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.symptomsSummary").value("Headache and fever"))
                .andExpect(jsonPath("$.data.durationMinutes").value(30));
    }

    // ====================================================================
    // 2. BOOKING — Auth Failures
    // ====================================================================

    @Test
    @Order(2)
    @DisplayName("POST /api/appointments — Unauthenticated → 401")
    void bookAppointment_unauthenticated_returns401() throws Exception {
        AppointmentRequest request = buildRequest(doctor.getId(), futureSlot, "Headache");

        mockMvc.perform(post("/api/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/appointments — Doctor role → 403 FORBIDDEN")
    void bookAppointment_doctorRole_returns403() throws Exception {
        AppointmentRequest request = buildRequest(doctor.getId(), futureSlot, "Headache");

        mockMvc.perform(post("/api/appointments")
                        .with(user(doctorPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // ====================================================================
    // 3. BOOKING — Validation Errors (400)
    // ====================================================================

    @Test
    @Order(4)
    @DisplayName("POST /api/appointments — Missing doctorId → 400")
    void bookAppointment_missingDoctorId_returns400() throws Exception {
        AppointmentRequest request = buildRequest(null, futureSlot, "Headache");

        mockMvc.perform(post("/api/appointments")
                        .with(user(patientPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.doctorId").value("Doctor ID is required"));
    }

    @Test
    @Order(5)
    @DisplayName("POST /api/appointments — Missing appointmentDate → 400")
    void bookAppointment_missingDate_returns400() throws Exception {
        AppointmentRequest request = buildRequest(doctor.getId(), null, "Headache");

        mockMvc.perform(post("/api/appointments")
                        .with(user(patientPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.appointmentDate").exists());
    }

    @Test
    @Order(6)
    @DisplayName("POST /api/appointments — Past date → 400 (Bean Validation @Future)")
    void bookAppointment_pastDate_returns400() throws Exception {
        LocalDateTime pastDate = LocalDateTime.now().minusDays(1).withHour(10).withMinute(0);
        AppointmentRequest request = buildRequest(doctor.getId(), pastDate, "Headache");

        mockMvc.perform(post("/api/appointments")
                        .with(user(patientPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.appointmentDate").value("Appointment date must be in the future"));
    }

    // ====================================================================
    // 4. BOOKING — Business Rule: Outside Working Hours
    // ====================================================================

    @Test
    @Order(7)
    @DisplayName("POST /api/appointments — 07:00 AM (before 09:00) → 400 OutsideWorkingHours")
    void bookAppointment_tooEarly_returns400() throws Exception {
        LocalDateTime earlySlot = futureSlot.withHour(7).withMinute(0);
        AppointmentRequest request = buildRequest(doctor.getId(), earlySlot, "Early appointment");

        mockMvc.perform(post("/api/appointments")
                        .with(user(patientPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("09:00")));
    }

    @Test
    @Order(8)
    @DisplayName("POST /api/appointments — 17:00 (after 16:30) → 400 OutsideWorkingHours")
    void bookAppointment_tooLate_returns400() throws Exception {
        LocalDateTime lateSlot = futureSlot.withHour(17).withMinute(0);
        AppointmentRequest request = buildRequest(doctor.getId(), lateSlot, "Late appointment");

        mockMvc.perform(post("/api/appointments")
                        .with(user(patientPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("09:00")));
    }

    // ====================================================================
    // 5. BOOKING — Slot Conflict (Double-Booking Prevention) → 409
    // ====================================================================

    @Test
    @Order(9)
    @DisplayName("POST /api/appointments — Double-booking same slot → 409 CONFLICT")
    void bookAppointment_duplicateSlot_returns409() throws Exception {
        // First booking succeeds
        AppointmentRequest request = buildRequest(doctor.getId(), futureSlot, "First booking");
        mockMvc.perform(post("/api/appointments")
                        .with(user(patientPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Second booking for the SAME slot → conflict
        AppointmentRequest duplicate = buildRequest(doctor.getId(), futureSlot, "Duplicate booking");
        mockMvc.perform(post("/api/appointments")
                        .with(user(otherPatientPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicate)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already booked")));
    }

    // ====================================================================
    // 6. LIST — Patient Appointments
    // ====================================================================

    @Test
    @Order(10)
    @DisplayName("GET /api/appointments/patient — Returns patient's own appointments")
    void getPatientAppointments_returnsOwnAppointments() throws Exception {
        // Book an appointment first
        createAppointmentInDb(patientUser, doctor, futureSlot, "Test symptoms");

        mockMvc.perform(get("/api/appointments/patient")
                        .with(user(patientPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].patientName").value("Test Patient"))
                .andExpect(jsonPath("$.data[0].doctorName").value("Dr. Test"));
    }

    @Test
    @Order(11)
    @DisplayName("GET /api/appointments/patient — Patient with no appointments → empty list")
    void getPatientAppointments_empty_returnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/appointments/patient")
                        .with(user(patientPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @Order(12)
    @DisplayName("GET /api/appointments/patient — Doctor role → 403")
    void getPatientAppointments_doctorRole_returns403() throws Exception {
        mockMvc.perform(get("/api/appointments/patient")
                        .with(user(doctorPrincipal)))
                .andExpect(status().isForbidden());
    }

    // ====================================================================
    // 7. LIST — Doctor Appointments
    // ====================================================================

    @Test
    @Order(13)
    @DisplayName("GET /api/appointments/doctor — Returns doctor's assigned appointments (paginated)")
    void getDoctorAppointments_returnsPaginatedList() throws Exception {
        createAppointmentInDb(patientUser, doctor, futureSlot, "Doctor view test");

        mockMvc.perform(get("/api/appointments/doctor")
                        .with(user(doctorPrincipal))
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(1)));
    }

    @Test
    @Order(14)
    @DisplayName("GET /api/appointments/doctor — Patient role → 403")
    void getDoctorAppointments_patientRole_returns403() throws Exception {
        mockMvc.perform(get("/api/appointments/doctor")
                        .with(user(patientPrincipal)))
                .andExpect(status().isForbidden());
    }

    // ====================================================================
    // 8. CANCEL — Patient Cancellation
    // ====================================================================

    @Test
    @Order(15)
    @DisplayName("PATCH /api/appointments/{id}/cancel — Patient cancels own PENDING → 200")
    void cancelAppointment_ownPending_returns200() throws Exception {
        Appointment appointment = createAppointmentInDb(patientUser, doctor, futureSlot, "Cancel me");

        mockMvc.perform(patch("/api/appointments/{id}/cancel", appointment.getId())
                        .with(user(patientPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }

    @Test
    @Order(16)
    @DisplayName("PATCH /api/appointments/{id}/cancel — Other patient's appointment → 403 (ownership error)")
    void cancelAppointment_otherPatient_returnsForbidden() throws Exception {
        // Appointment belongs to patientUser
        Appointment appointment = createAppointmentInDb(patientUser, doctor, futureSlot, "Not yours");

        // otherPatient tries to cancel → ownership check fails (AppointmentOwnershipException → 403)
        mockMvc.perform(patch("/api/appointments/{id}/cancel", appointment.getId())
                        .with(user(otherPatientPrincipal)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(17)
    @DisplayName("PATCH /api/appointments/{id}/cancel — Already cancelled → 400 (status check)")
    void cancelAppointment_alreadyCancelled_fails() throws Exception {
        Appointment appointment = createAppointmentInDb(patientUser, doctor, futureSlot, "Already cancelled");
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointmentRepository.save(appointment);

        // Only PENDING can be cancelled (InvalidAppointmentStatusException → 400)
        mockMvc.perform(patch("/api/appointments/{id}/cancel", appointment.getId())
                        .with(user(patientPrincipal)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(18)
    @DisplayName("PATCH /api/appointments/{id}/cancel — Unauthenticated → 401")
    void cancelAppointment_unauthenticated_returns401() throws Exception {
        mockMvc.perform(patch("/api/appointments/{id}/cancel", 1L))
                .andExpect(status().isUnauthorized());
    }

    // ====================================================================
    // 9. AVAILABLE SLOTS
    // ====================================================================

    @Test
    @Order(19)
    @DisplayName("GET /api/appointments/available-slots — Returns slots for valid doctor+date")
    void getAvailableSlots_validParams_returns200() throws Exception {
        mockMvc.perform(get("/api/appointments/available-slots")
                        .with(user(patientPrincipal))
                        .param("doctorId", doctor.getId().toString())
                        .param("date", futureSlot.toLocalDate().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value(futureSlot.toLocalDate().toString()));
    }

    @Test
    @Order(20)
    @DisplayName("GET /api/appointments/available-slots — Unauthenticated → 401")
    void getAvailableSlots_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/appointments/available-slots")
                        .param("doctorId", "1")
                        .param("date", "2025-12-01"))
                .andExpect(status().isUnauthorized());
    }

    // ====================================================================
    // 10. STATUS UPDATE — Doctor updates appointment status
    // ====================================================================

    @Test
    @Order(21)
    @DisplayName("PATCH /api/appointments/{id}/status — Verified doctor confirms → 200")
    void updateStatus_verifiedDoctor_returns200() throws Exception {
        Appointment appointment = createAppointmentInDb(patientUser, doctor, futureSlot, "Confirm me");

        mockMvc.perform(patch("/api/appointments/{id}/status", appointment.getId())
                        .with(user(doctorPrincipal))
                        .param("status", "CONFIRMED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));
    }

    @Test
    @Order(22)
    @DisplayName("PATCH /api/appointments/{id}/status — Unverified doctor → 403")
    void updateStatus_unverifiedDoctor_returns403() throws Exception {
        // Set doctor as unverified
        doctor.setVerificationStatus(ERequestStatus.PENDING);
        doctorRepository.save(doctor);

        Appointment appointment = createAppointmentInDb(patientUser, doctor, futureSlot, "Cannot confirm");

        mockMvc.perform(patch("/api/appointments/{id}/status", appointment.getId())
                        .with(user(doctorPrincipal))
                        .param("status", "CONFIRMED"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(23)
    @DisplayName("PATCH /api/appointments/{id}/status — Patient role → 403")
    void updateStatus_patientRole_returns403() throws Exception {
        Appointment appointment = createAppointmentInDb(patientUser, doctor, futureSlot, "Patient cannot update");

        mockMvc.perform(patch("/api/appointments/{id}/status", appointment.getId())
                        .with(user(patientPrincipal))
                        .param("status", "CONFIRMED"))
                .andExpect(status().isForbidden());
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    private AppointmentRequest buildRequest(Long doctorId, LocalDateTime date, String symptoms) {
        AppointmentRequest req = new AppointmentRequest();
        req.setDoctorId(doctorId);
        req.setAppointmentDate(date);
        req.setSymptomsSummary(symptoms);
        return req;
    }

    /**
     * Directly inserts an appointment into the DB — bypasses controller/service validation.
     * Used for tests that need pre-existing data (cancel, list, status update).
     */
    private Appointment createAppointmentInDb(User patient, Doctor doc, LocalDateTime dateTime, String symptoms) {
        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doc);
        appointment.setAppointmentDate(dateTime);
        appointment.setSymptomsSummary(symptoms);
        appointment.setStatus(AppointmentStatus.PENDING);
        appointment.setDurationMinutes(30);
        appointment.setCreatedAt(LocalDateTime.now());
        return appointmentRepository.save(appointment);
    }
}
