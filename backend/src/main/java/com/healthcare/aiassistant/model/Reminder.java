package com.healthcare.aiassistant.model;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDateTime;

@Entity
@Table(name = "reminders")
public class Reminder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @Column(nullable = false, length = 120)
    private String text;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReminderCategory category = ReminderCategory.CUSTOM;

    @Column(name = "custom_label", length = 40)
    private String customLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ReminderSource source = ReminderSource.MANUAL;

    @Column(name = "is_completed", nullable = false)
    private boolean completed = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private ReminderStatus status = ReminderStatus.ACTIVE;

    /** Next time this reminder should fire. Null = no schedule (plain checklist item). */
    @Column(name = "remind_at")
    private LocalDateTime remindAt;

    /** Recurrence interval in minutes. Null = one-time. */
    @Column(name = "every_minutes")
    private Integer everyMinutes;

    /** Stop recurring once remindAt passes this. */
    @Column(name = "repeat_until")
    private LocalDateTime repeatUntil;

    @Column(name = "last_notified_at")
    private LocalDateTime lastNotifiedAt;

    /** When set and in the future, the reminder is snoozed and won't fire until then. */
    @Column(name = "snooze_until")
    private LocalDateTime snoozeUntil;

    @Column(length = 40)
    private String timezone;

    /** Set when this reminder was auto-generated for an appointment. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Appointment appointment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Reminder() {}

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public ReminderCategory getCategory() { return category; }
    public void setCategory(ReminderCategory category) { this.category = category; }

    public String getCustomLabel() { return customLabel; }
    public void setCustomLabel(String customLabel) { this.customLabel = customLabel; }

    public ReminderSource getSource() { return source; }
    public void setSource(ReminderSource source) { this.source = source; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public ReminderStatus getStatus() { return status; }
    public void setStatus(ReminderStatus status) { this.status = status; }

    public LocalDateTime getRemindAt() { return remindAt; }
    public void setRemindAt(LocalDateTime remindAt) { this.remindAt = remindAt; }

    public Integer getEveryMinutes() { return everyMinutes; }
    public void setEveryMinutes(Integer everyMinutes) { this.everyMinutes = everyMinutes; }

    public LocalDateTime getRepeatUntil() { return repeatUntil; }
    public void setRepeatUntil(LocalDateTime repeatUntil) { this.repeatUntil = repeatUntil; }

    public LocalDateTime getLastNotifiedAt() { return lastNotifiedAt; }
    public void setLastNotifiedAt(LocalDateTime lastNotifiedAt) { this.lastNotifiedAt = lastNotifiedAt; }

    public LocalDateTime getSnoozeUntil() { return snoozeUntil; }
    public void setSnoozeUntil(LocalDateTime snoozeUntil) { this.snoozeUntil = snoozeUntil; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public Appointment getAppointment() { return appointment; }
    public void setAppointment(Appointment appointment) { this.appointment = appointment; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
