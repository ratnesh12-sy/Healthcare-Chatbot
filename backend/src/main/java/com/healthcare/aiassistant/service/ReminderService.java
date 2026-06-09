package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.*;
import com.healthcare.aiassistant.payload.dto.ReminderDTO;
import com.healthcare.aiassistant.payload.request.ReminderRequest;
import com.healthcare.aiassistant.repository.ReminderRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReminderService {

    private static final int MAX_REMINDERS = 50;
    private static final int MAX_LENGTH = 120;

    @Autowired
    private ReminderRepository reminderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private Clock clock;

    // ── Queries ──────────────────────────────────────────────────

    public List<ReminderDTO> list(Long userId) {
        return reminderRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(ReminderDTO::from).collect(Collectors.toList());
    }

    /** Reminders that are due now (ACTIVE + remindAt <= now, not snoozed) — for in-app notifications. */
    public List<ReminderDTO> due(Long userId) {
        LocalDateTime now = LocalDateTime.now(clock);
        return reminderRepository
                .findByUserIdAndStatusAndRemindAtLessThanEqualOrderByRemindAtAsc(
                        userId, ReminderStatus.ACTIVE, now)
                .stream()
                .filter(r -> r.getSnoozeUntil() == null || !r.getSnoozeUntil().isAfter(now))
                .map(ReminderDTO::from).collect(Collectors.toList());
    }

    /** Snoozes a due reminder for the given number of minutes (default 30). */
    @Transactional
    public ReminderDTO snooze(Long userId, Long id, Integer minutes) {
        Reminder r = ownedOrThrow(userId, id);
        int mins = (minutes == null || minutes <= 0) ? 30 : minutes;
        r.setSnoozeUntil(LocalDateTime.now(clock).plusMinutes(mins));
        return ReminderDTO.from(reminderRepository.save(r));
    }

    // ── Mutations ────────────────────────────────────────────────

    @Transactional
    public ReminderDTO create(Long userId, ReminderRequest req) {
        String text = normalize(req.getText());

        if (reminderRepository.countByUserId(userId) >= MAX_REMINDERS) {
            throw new IllegalStateException("Storage limit reached");
        }
        if (reminderRepository.existsByUserIdAndTextIgnoreCase(userId, text)) {
            throw new IllegalStateException("Reminder already exists");
        }

        Reminder r = new Reminder();
        r.setUser(userRepository.getReferenceById(userId));
        r.setText(text);
        r.setSource(ReminderSource.fromString(req.getSource()));
        r.setCategory(ReminderCategory.fromString(req.getCategory()));
        r.setCustomLabel(trimOrNull(req.getCustomLabel()));
        applySchedule(r, req);

        return ReminderDTO.from(reminderRepository.save(r));
    }

    @Transactional
    public ReminderDTO update(Long userId, Long id, ReminderRequest req) {
        Reminder r = ownedOrThrow(userId, id);
        r.setText(normalize(req.getText()));
        if (req.getCategory() != null) {
            r.setCategory(ReminderCategory.fromString(req.getCategory()));
        }
        if (req.getCustomLabel() != null) {
            r.setCustomLabel(trimOrNull(req.getCustomLabel()));
        }
        applySchedule(r, req);
        return ReminderDTO.from(reminderRepository.save(r));
    }

    @Transactional
    public ReminderDTO toggle(Long userId, Long id) {
        Reminder r = ownedOrThrow(userId, id);
        boolean nowCompleted = !r.isCompleted();
        r.setCompleted(nowCompleted);
        // Keep lifecycle in sync so a completed reminder stops firing.
        if (nowCompleted) {
            r.setStatus(ReminderStatus.DONE);
        } else if (r.getStatus() == ReminderStatus.DONE) {
            r.setStatus(ReminderStatus.ACTIVE);
        }
        return ReminderDTO.from(reminderRepository.save(r));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Reminder r = ownedOrThrow(userId, id);
        reminderRepository.delete(r);
    }

    // ── Appointment integration (system-generated, bypasses user limits) ──

    /**
     * Creates the two standard appointment reminders: T-24h and 08:00 morning-of.
     * Skips a reminder if its fire time is already in the past.
     */
    @Transactional
    public void createForAppointment(Appointment appointment) {
        if (appointment == null || appointment.getAppointmentDate() == null
                || appointment.getPatient() == null) {
            return;
        }
        LocalDateTime when = appointment.getAppointmentDate();
        LocalDateTime now = LocalDateTime.now(clock);
        String label = doctorLabel(appointment);

        LocalDateTime dayBefore = when.minusDays(1);
        if (dayBefore.isAfter(now)) {
            saveAppointmentReminder(appointment,
                    "Appointment tomorrow with " + label, dayBefore);
        }

        LocalDateTime morningOf = when.toLocalDate().atTime(8, 0);
        if (morningOf.isAfter(now) && morningOf.isBefore(when)) {
            saveAppointmentReminder(appointment,
                    "Appointment today with " + label, morningOf);
        }
    }

    /** Cancels any outstanding reminders tied to an appointment that was cancelled. */
    @Transactional
    public void cancelForAppointment(Long appointmentId) {
        List<Reminder> linked = reminderRepository.findByAppointmentId(appointmentId);
        for (Reminder r : linked) {
            if (r.getStatus() == ReminderStatus.ACTIVE) {
                r.setStatus(ReminderStatus.CANCELLED);
            }
        }
        reminderRepository.saveAll(linked);
    }

    // ── Helpers ──────────────────────────────────────────────────

    private void saveAppointmentReminder(Appointment appointment, String text, LocalDateTime remindAt) {
        Reminder r = new Reminder();
        r.setUser(appointment.getPatient());
        r.setText(truncate(text, MAX_LENGTH));
        r.setSource(ReminderSource.MANUAL);
        r.setCategory(ReminderCategory.APPOINTMENT);
        r.setAppointment(appointment);
        r.setRemindAt(remindAt);
        reminderRepository.save(r);
    }

    private void applySchedule(Reminder r, ReminderRequest req) {
        r.setRemindAt(req.getRemindAt());
        r.setEveryMinutes(req.getEveryMinutes());
        r.setRepeatUntil(req.getRepeatUntil());
        if (req.getTimezone() != null) {
            r.setTimezone(trimOrNull(req.getTimezone()));
        }
    }

    private Reminder ownedOrThrow(Long userId, Long id) {
        return reminderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new AccessDeniedException("Reminder not found"));
    }

    private String normalize(String text) {
        if (text == null) {
            throw new IllegalArgumentException("Reminder text cannot be empty");
        }
        String trimmed = text.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Reminder text cannot be empty");
        }
        if (trimmed.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Exceeded maximum length of " + MAX_LENGTH + " characters");
        }
        return trimmed;
    }

    private String trimOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    private String doctorLabel(Appointment appointment) {
        if (appointment.getDoctor() != null
                && appointment.getDoctor().getUser() != null
                && appointment.getDoctor().getUser().getFullName() != null
                && !appointment.getDoctor().getUser().getFullName().isBlank()) {
            String name = appointment.getDoctor().getUser().getFullName().trim();
            // Some names already include the "Dr." honorific — avoid "Dr. Dr.".
            return name.regionMatches(true, 0, "Dr", 0, 2) ? name : "Dr. " + name;
        }
        return "your doctor";
    }
}
