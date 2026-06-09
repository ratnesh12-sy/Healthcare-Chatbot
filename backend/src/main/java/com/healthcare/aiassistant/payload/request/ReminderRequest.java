package com.healthcare.aiassistant.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * Create / update payload for reminders. Only {@code text} is required;
 * everything else is optional so a plain checklist reminder still works.
 */
public class ReminderRequest {

    @NotBlank
    @Size(max = 120)
    private String text;

    private String source;        // "ai" | "manual"
    private String category;      // medication | hydration | rest | follow_up | appointment | custom
    @Size(max = 40)
    private String customLabel;

    // Optional schedule
    private LocalDateTime remindAt;
    private Integer everyMinutes;
    private LocalDateTime repeatUntil;
    private String timezone;

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCustomLabel() { return customLabel; }
    public void setCustomLabel(String customLabel) { this.customLabel = customLabel; }

    public LocalDateTime getRemindAt() { return remindAt; }
    public void setRemindAt(LocalDateTime remindAt) { this.remindAt = remindAt; }

    public Integer getEveryMinutes() { return everyMinutes; }
    public void setEveryMinutes(Integer everyMinutes) { this.everyMinutes = everyMinutes; }

    public LocalDateTime getRepeatUntil() { return repeatUntil; }
    public void setRepeatUntil(LocalDateTime repeatUntil) { this.repeatUntil = repeatUntil; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
}
