package com.healthcare.aiassistant.payload.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public class AvailabilityExceptionDTO {
    private Long id;
    private LocalDate exceptionDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Boolean isAvailable;
    private String reason;

    public AvailabilityExceptionDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getExceptionDate() { return exceptionDate; }
    public void setExceptionDate(LocalDate exceptionDate) { this.exceptionDate = exceptionDate; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public Boolean getIsAvailable() { return isAvailable; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
