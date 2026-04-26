package com.healthcare.aiassistant.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "booking")
public class BookingProperties {
    
    /**
     * Maximum number of days in the future a patient can book an appointment.
     */
    private int maxDays = 30;
    
    /**
     * Minimum notice time required before a slot can be booked (in minutes).
     */
    private int minNoticeMinutes = 30;

    public int getMaxDays() {
        return maxDays;
    }

    public void setMaxDays(int maxDays) {
        this.maxDays = maxDays;
    }

    public int getMinNoticeMinutes() {
        return minNoticeMinutes;
    }

    public void setMinNoticeMinutes(int minNoticeMinutes) {
        this.minNoticeMinutes = minNoticeMinutes;
    }
}
