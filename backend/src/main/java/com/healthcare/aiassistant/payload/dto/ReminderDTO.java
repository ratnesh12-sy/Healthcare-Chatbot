package com.healthcare.aiassistant.payload.dto;

import com.healthcare.aiassistant.model.Reminder;

import java.time.LocalDateTime;

/**
 * Output shape for reminders. Field names mirror the frontend `Reminder` type
 * so the existing UI keeps working unchanged. LocalDateTime fields serialize
 * as ISO-8601 strings (Spring Boot default), which the frontend parses with
 * `new Date(...)`.
 */
public class ReminderDTO {
    private String id;
    private String text;
    private boolean isCompleted;
    private String source;       // "ai" | "manual"
    private String type;         // "one-time" | "recurring" (derived from everyMinutes)
    private String category;     // lower-case, e.g. "medication"
    private String customLabel;
    private String status;       // lower-case, e.g. "active"
    private LocalDateTime remindAt;
    private Integer everyMinutes;
    private LocalDateTime repeatUntil;
    private LocalDateTime snoozeUntil;
    private String appointmentId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ReminderDTO from(Reminder r) {
        ReminderDTO dto = new ReminderDTO();
        dto.id = String.valueOf(r.getId());
        dto.text = r.getText();
        dto.isCompleted = r.isCompleted();
        dto.source = r.getSource().name().toLowerCase();
        dto.type = r.getEveryMinutes() != null ? "recurring" : "one-time";
        dto.category = r.getCategory().name().toLowerCase();
        dto.customLabel = r.getCustomLabel();
        dto.status = r.getStatus().name().toLowerCase();
        dto.remindAt = r.getRemindAt();
        dto.everyMinutes = r.getEveryMinutes();
        dto.repeatUntil = r.getRepeatUntil();
        dto.snoozeUntil = r.getSnoozeUntil();
        dto.appointmentId = r.getAppointment() != null ? String.valueOf(r.getAppointment().getId()) : null;
        dto.createdAt = r.getCreatedAt();
        dto.updatedAt = r.getUpdatedAt();
        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public boolean getIsCompleted() { return isCompleted; }
    public void setIsCompleted(boolean isCompleted) { this.isCompleted = isCompleted; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCustomLabel() { return customLabel; }
    public void setCustomLabel(String customLabel) { this.customLabel = customLabel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getRemindAt() { return remindAt; }
    public void setRemindAt(LocalDateTime remindAt) { this.remindAt = remindAt; }

    public Integer getEveryMinutes() { return everyMinutes; }
    public void setEveryMinutes(Integer everyMinutes) { this.everyMinutes = everyMinutes; }

    public LocalDateTime getRepeatUntil() { return repeatUntil; }
    public void setRepeatUntil(LocalDateTime repeatUntil) { this.repeatUntil = repeatUntil; }

    public LocalDateTime getSnoozeUntil() { return snoozeUntil; }
    public void setSnoozeUntil(LocalDateTime snoozeUntil) { this.snoozeUntil = snoozeUntil; }

    public String getAppointmentId() { return appointmentId; }
    public void setAppointmentId(String appointmentId) { this.appointmentId = appointmentId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
