package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.exception.OutsideWorkingHoursException;
import com.healthcare.aiassistant.exception.PastSlotException;
import com.healthcare.aiassistant.exception.SlotAlreadyBookedException;
import com.healthcare.aiassistant.model.*;
import com.healthcare.aiassistant.payload.dto.AppointmentDTO;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import com.healthcare.aiassistant.repository.DoctorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentService.class);

    private static final LocalTime WORKING_START = LocalTime.of(9, 0);
    private static final LocalTime WORKING_END = LocalTime.of(16, 30);
    private static final int SLOT_DURATION_MINUTES = 30;
    private static final int MAX_FUTURE_MONTHS = 3;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private ReminderService reminderService;

    @Autowired
    private IcsService icsService;

    @Autowired
    private Clock clock;

    @Autowired
    private EmailService emailService;

    /** Emails the patient about an appointment change, if they have email notifications enabled. */
    private void notifyByEmail(User patient, AppointmentDTO dto, String action) {
        if (patient == null || patient.getEmailNotificationsEnabled() == null || !patient.getEmailNotificationsEnabled()) {
            return;
        }
        String who = patient.getFullName() != null ? patient.getFullName() : patient.getUsername();
        String subject = "Appointment " + action + " — " + dto.getDoctorName();
        String body = "Hi " + who + ",\n\n"
                + "Your appointment with " + dto.getDoctorName() + " on " + dto.getAppointmentDate()
                + " has been " + action + ".\n\n— HealthCare AI Assistant";
        emailService.send(patient.getEmail(), subject, body);
    }

    // ── Booking ──────────────────────────────────────────────────

    @Transactional
    public AppointmentDTO bookAppointment(Long doctorId, LocalDateTime requestedDate,
            String symptomsSummary, User patient) {
        // 1. Normalize timestamp — all times floored to nearest 30-min slot
        LocalDateTime normalized = normalizeToSlot(requestedDate);

        // 2. Capture time once — prevents micro-drift within this request
        LocalDateTime now = LocalDateTime.now(clock);

        // 3. Fetch doctor — fail fast if invalid
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        // 4. Working hours — explicit boundary after normalization
        LocalTime time = normalized.toLocalTime();
        if (time.isBefore(WORKING_START) || time.isAfter(WORKING_END)) {
            throw new OutsideWorkingHoursException(
                    "Appointments are only available between 09:00 and 16:30");
        }

        // 5. Past check
        if (normalized.isBefore(now)) {
            throw new PastSlotException("Cannot book an appointment in the past");
        }

        // 6. Future cap — service-only enforcement
        if (normalized.isAfter(now.plusMonths(MAX_FUTURE_MONTHS))) {
            throw new PastSlotException("Cannot book more than " + MAX_FUTURE_MONTHS + " months ahead");
        }

        // 6b. Slot-occupancy pre-check — gives a clean 409 in the common case and
        //     works even where the DB partial unique index is absent (e.g. H2 tests).
        //     The DB constraint below remains the source of truth for race conditions.
        boolean slotTaken = appointmentRepository.existsByDoctorAndAppointmentDateAndStatusIn(
                doctor, normalized, List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED));
        if (slotTaken) {
            throw new SlotAlreadyBookedException("This time slot is already booked");
        }

        // 7. Build entity
        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setAppointmentDate(normalized);
        appointment.setSymptomsSummary(symptomsSummary);
        appointment.setStatus(AppointmentStatus.PENDING);
        appointment.setDurationMinutes(SLOT_DURATION_MINUTES);
        appointment.setCreatedAt(now);

        // 8. Save — DB constraint is sole source of truth
        try {
            appointment = appointmentRepository.save(appointment);
        } catch (DataIntegrityViolationException ex) {
            log.warn("event=slot_conflict_db requestId={} doctorId={} time={} userId={}",
                    MDC.get("requestId"), doctorId, normalized, patient.getId());
            throw new SlotAlreadyBookedException("This time slot is already booked");
        }

        // 9. Log success (PII-safe)
        log.info("event=appointment_booked requestId={} appointmentId={} doctorId={} time={} userId={} status=SUCCESS",
                MDC.get("requestId"), appointment.getId(), doctorId, normalized, patient.getId());

        // 10. Auto-create reminders (T-24h and morning-of), atomically with the booking.
        reminderService.createForAppointment(appointment);

        AppointmentDTO dto = mapToDTO(appointment);
        notifyByEmail(patient, dto, "booked");
        return dto;
    }

    // ── Cancellation ────────────────────────────────────────────

    @Transactional
    public AppointmentDTO cancelAppointment(Long appointmentId, Long currentUserId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        // Ownership check
        if (!appointment.getPatient().getId().equals(currentUserId)) {
            throw new com.healthcare.aiassistant.exception.AppointmentOwnershipException("You do not have access to this appointment");
        }

        // Status check — only PENDING can be cancelled
        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new com.healthcare.aiassistant.exception.InvalidAppointmentStatusException("Appointment is already cancelled");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment = appointmentRepository.save(appointment);

        // Cancel any pending reminders tied to this appointment.
        reminderService.cancelForAppointment(appointment.getId());

        log.info("event=appointment_cancelled requestId={} appointmentId={} userId={} status=SUCCESS",
                MDC.get("requestId"), appointment.getId(), currentUserId);

        AppointmentDTO dto = mapToDTO(appointment);
        notifyByEmail(appointment.getPatient(), dto, "cancelled");
        return dto;
    }

    @Autowired
    private AvailabilityService availabilityService;

    // ── Calendar export (.ics) ──────────────────────────────────

    @Transactional(readOnly = true)
    public String buildAppointmentIcs(Long appointmentId, Long userId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (appointment.getPatient() == null
                || !appointment.getPatient().getId().equals(userId)) {
            throw new com.healthcare.aiassistant.exception.AppointmentOwnershipException(
                    "You do not have access to this appointment");
        }

        return icsService.buildAppointmentIcs(appointment);
    }

    // ── Available Slots ─────────────────────────────────────────

    public List<com.healthcare.aiassistant.payload.dto.SlotResponseDTO> getAvailableSlots(Long doctorId,
            LocalDate date) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        return availabilityService.getAvailableSlots(doctor, date);
    }

    // ── Queries ──────────────────────────────────────────────────
    // readOnly transactions keep the Hibernate session open while mapToDTO reads
    // the lazy doctor/patient associations (open-in-view is disabled), otherwise
    // mapping throws LazyInitializationException → 500.

    @Transactional(readOnly = true)
    public List<AppointmentDTO> getPatientAppointments(User patient) {
        return appointmentRepository.findByPatientOrderByAppointmentDateDesc(patient)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO> getDoctorAppointments(Doctor doctor) {
        return appointmentRepository.findByDoctorOrderByAppointmentDateDesc(doctor)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.healthcare.aiassistant.payload.dto.DoctorAppointmentDTO> getDoctorAppointmentsPaginated(
            Doctor doctor, org.springframework.data.domain.Pageable pageable) {
        return appointmentRepository.findByDoctorOrderByAppointmentDateDesc(doctor, pageable)
                .map(this::mapToDoctorDTO);
    }

    public AppointmentDTO updateStatus(Long id, AppointmentStatus status) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));
        appointment.setStatus(status);
        appointment = appointmentRepository.save(appointment);
        return mapToDTO(appointment);
    }

    @Transactional
    public com.healthcare.aiassistant.payload.dto.DoctorAppointmentDTO updateDoctorAppointmentStatus(Long appointmentId,
            Doctor doctor, AppointmentStatus newStatus, String cancelReason) {
        if (newStatus == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Unauthorized: Cannot modify another doctor's appointments.");
        }

        if (appointment.getStatus() == newStatus) {
            log.info("Duplicate update ignored for appointment {}", appointmentId);
            return mapToDoctorDTO(appointment);
        }

        if (appointment.getStatus() != AppointmentStatus.PENDING && newStatus == AppointmentStatus.CONFIRMED) {
            throw new com.healthcare.aiassistant.exception.InvalidAppointmentStatusException("Appointment has already been updated.");
        }

        // Handle cancellations
        if (newStatus == AppointmentStatus.CANCELLED) {
            appointment.setCancelReason(cancelReason);
            appointment.setCancelledBy("DOCTOR");
        }

        appointment.setStatus(newStatus);
        appointment = appointmentRepository.save(appointment);

        if (newStatus == AppointmentStatus.CANCELLED) {
            reminderService.cancelForAppointment(appointment.getId());
        }

        log.info("Doctor {} updated appointment {} to {}", doctor.getId(), appointmentId, newStatus);
        return mapToDoctorDTO(appointment);
    }

    // ── Internal Helpers ────────────────────────────────────────

    /**
     * Floors time to nearest 30-min boundary.
     * Rule: "All times are floored to nearest 30-min slot"
     * 10:17 → 10:00, 10:31 → 10:30, 16:59 → 16:30
     */
    private LocalDateTime normalizeToSlot(LocalDateTime time) {
        return time
                .withMinute(time.getMinute() < 30 ? 0 : 30)
                .withSecond(0)
                .withNano(0);
    }

    /**
     * Deep null-safe DTO mapping.
     * Never exposes raw entities. Logs warnings for missing data.
     */
    private AppointmentDTO mapToDTO(Appointment appointment) {
        AppointmentDTO dto = new AppointmentDTO();
        dto.setId(appointment.getId());
        dto.setAppointmentDate(appointment.getAppointmentDate());
        dto.setDurationMinutes(appointment.getDurationMinutes());
        dto.setStatus(appointment.getStatus().name());
        dto.setSymptomsSummary(appointment.getSymptomsSummary());

        // Deep null-safe doctor name
        String doctorName = Optional.ofNullable(appointment.getDoctor())
                .map(Doctor::getUser)
                .map(User::getFullName)
                .orElse("Unknown");
        if ("Unknown".equals(doctorName)) {
            log.warn("event=missing_doctor_name doctorId={}",
                    appointment.getDoctor() != null ? appointment.getDoctor().getId() : "null");
        }
        dto.setDoctorName(doctorName);

        // Deep null-safe specialization
        dto.setDoctorSpecialization(
                Optional.ofNullable(appointment.getDoctor())
                        .map(Doctor::getSpecialization)
                        .orElse("General"));

        // Deep null-safe patient name
        String patientName = Optional.ofNullable(appointment.getPatient())
                .map(User::getFullName)
                .orElse("Unknown");
        if ("Unknown".equals(patientName)) {
            log.warn("event=missing_patient_name appointmentId={}", appointment.getId());
        }
        dto.setPatientName(patientName);

        return dto;
    }

    private com.healthcare.aiassistant.payload.dto.DoctorAppointmentDTO mapToDoctorDTO(Appointment appointment) {
        com.healthcare.aiassistant.payload.dto.DoctorAppointmentDTO dto = new com.healthcare.aiassistant.payload.dto.DoctorAppointmentDTO();
        dto.setId(appointment.getId());
        dto.setAppointmentDate(appointment.getAppointmentDate());
        dto.setDurationMinutes(appointment.getDurationMinutes());
        dto.setStatus(appointment.getStatus().name());
        dto.setSymptomsSummary(appointment.getSymptomsSummary());

        String patientName = Optional.ofNullable(appointment.getPatient())
                .map(User::getFullName)
                .orElse("Unknown");
        dto.setPatientName(patientName);

        return dto;
    }
}
