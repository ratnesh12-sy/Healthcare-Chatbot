package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.Reminder;
import com.healthcare.aiassistant.model.ReminderStatus;
import com.healthcare.aiassistant.repository.ReminderRepository;
import com.healthcare.aiassistant.security.config.PushProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Scans for due reminders and pushes notifications. Triggered by the cron-hit
 * /dispatch endpoint (and reusable by a scheduler). Honors snooze and quiet hours,
 * then advances recurring reminders / clears one-time ones so they don't refire.
 */
@Service
public class ReminderDispatchService {

    private static final Logger log = LoggerFactory.getLogger(ReminderDispatchService.class);
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final ReminderRepository reminderRepository;
    private final PushNotificationService pushNotificationService;
    private final PushProperties pushProperties;
    private final Clock clock;

    public ReminderDispatchService(ReminderRepository reminderRepository,
                                   PushNotificationService pushNotificationService,
                                   PushProperties pushProperties,
                                   Clock clock) {
        this.reminderRepository = reminderRepository;
        this.pushNotificationService = pushNotificationService;
        this.pushProperties = pushProperties;
        this.clock = clock;
    }

    @Transactional
    public int dispatchDue() {
        LocalDateTime now = LocalDateTime.now(clock);
        if (isQuietNow(now.toLocalTime())) {
            log.debug("PUSH: within quiet hours — skipping dispatch.");
            return 0;
        }

        List<Reminder> due = reminderRepository
                .findByStatusAndRemindAtLessThanEqual(ReminderStatus.ACTIVE, now);
        int sent = 0;
        for (Reminder r : due) {
            if (r.getSnoozeUntil() != null && r.getSnoozeUntil().isAfter(now)) {
                continue; // snoozed
            }
            pushNotificationService.sendToUser(
                    r.getUser().getId(), "Health reminder", r.getText(), "/dashboard");
            r.setLastNotifiedAt(now);
            r.setSnoozeUntil(null);
            advance(r, now);
            sent++;
        }
        reminderRepository.saveAll(due);
        if (sent > 0) {
            log.info("PUSH: dispatched {} reminder(s).", sent);
        }
        return sent;
    }

    /** Moves a recurring reminder to its next occurrence, or clears a one-time one. */
    private void advance(Reminder r, LocalDateTime now) {
        if (r.getEveryMinutes() != null && r.getEveryMinutes() > 0) {
            LocalDateTime next = r.getRemindAt() != null ? r.getRemindAt() : now;
            while (!next.isAfter(now)) {
                next = next.plusMinutes(r.getEveryMinutes());
            }
            if (r.getRepeatUntil() != null && next.isAfter(r.getRepeatUntil())) {
                r.setStatus(ReminderStatus.EXPIRED);
                r.setRemindAt(null);
            } else {
                r.setRemindAt(next);
            }
        } else {
            // One-time scheduled reminder: stop it from firing again, keep it as a task.
            r.setRemindAt(null);
        }
    }

    private boolean isQuietNow(LocalTime now) {
        String startStr = pushProperties.getQuietStart();
        String endStr = pushProperties.getQuietEnd();
        if (startStr == null || startStr.isBlank() || endStr == null || endStr.isBlank()) {
            return false;
        }
        try {
            LocalTime start = LocalTime.parse(startStr.trim(), HH_MM);
            LocalTime end = LocalTime.parse(endStr.trim(), HH_MM);
            if (start.equals(end)) {
                return false;
            }
            if (start.isBefore(end)) {
                return !now.isBefore(start) && now.isBefore(end);
            }
            // Overnight window (e.g. 22:00–07:00)
            return !now.isBefore(start) || now.isBefore(end);
        } catch (Exception e) {
            log.warn("PUSH: invalid quiet-hours config '{}'-'{}': {}", startStr, endStr, e.getMessage());
            return false;
        }
    }
}
