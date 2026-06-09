package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.Reminder;
import com.healthcare.aiassistant.model.ReminderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    List<Reminder> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Ownership-safe lookup — used for every mutation so a user can only touch their own. */
    Optional<Reminder> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    boolean existsByUserIdAndTextIgnoreCase(Long userId, String text);

    List<Reminder> findByAppointmentId(Long appointmentId);

    /** Due reminders for one user (in-app polling). */
    List<Reminder> findByUserIdAndStatusAndRemindAtLessThanEqualOrderByRemindAtAsc(
            Long userId, ReminderStatus status, LocalDateTime cutoff);

    /** Global due-scan (Phase 2 dispatcher). */
    List<Reminder> findByStatusAndRemindAtLessThanEqual(ReminderStatus status, LocalDateTime cutoff);
}
