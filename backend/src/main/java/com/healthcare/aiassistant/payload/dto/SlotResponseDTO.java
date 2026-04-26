package com.healthcare.aiassistant.payload.dto;

public class SlotResponseDTO {
    private String time;
    private boolean available;
    private String reason;

    public SlotResponseDTO() {}

    public SlotResponseDTO(String time, boolean available) {
        this.time = time;
        this.available = available;
    }

    public SlotResponseDTO(String time, boolean available, String reason) {
        this.time = time;
        this.available = available;
        this.reason = reason;
    }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
