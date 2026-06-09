package com.healthcare.aiassistant.payload.dto;

/**
 * Result of parsing AI/doctor advice into a reminder schedule.
 * The frontend shows {@code summary} for the patient to confirm/edit, then builds
 * a reminder from {@code everyMinutes} + {@code durationDays} + {@code category}.
 */
public class ParsedScheduleDTO {
    private boolean hasSchedule;
    private Integer everyMinutes;   // recurrence interval; null = one-time
    private Integer durationDays;   // how long to repeat; null = caller default
    private String category;        // medication | hydration | rest | follow_up | custom
    private String summary;         // human-readable, e.g. "Every 2 hours for 2 days"
    private String source;          // "ai" | "heuristic" | "none"

    public static ParsedScheduleDTO none() {
        ParsedScheduleDTO d = new ParsedScheduleDTO();
        d.hasSchedule = false;
        d.source = "none";
        return d;
    }

    public boolean isHasSchedule() { return hasSchedule; }
    public void setHasSchedule(boolean hasSchedule) { this.hasSchedule = hasSchedule; }

    public Integer getEveryMinutes() { return everyMinutes; }
    public void setEveryMinutes(Integer everyMinutes) { this.everyMinutes = everyMinutes; }

    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
