package com.healthcare.aiassistant.payload.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalTime;

/**
 * Represents a single time slot with availability status.
 * Uses LocalTime for type-safe sorting (immune to string format changes).
 */
public class SlotDTO {

    @JsonFormat(pattern = "HH:mm")
    private LocalTime slot;

    private boolean available;

    public SlotDTO() {
    }

    public SlotDTO(LocalTime slot, boolean available) {
        this.slot = slot;
        this.available = available;
    }

    public LocalTime getSlot() {
        return slot;
    }

    public void setSlot(LocalTime slot) {
        this.slot = slot;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }
}
