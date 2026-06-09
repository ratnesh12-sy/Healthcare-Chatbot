package com.healthcare.aiassistant.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class HealthMetricRequest {

    @NotBlank
    private String type;   // HEART_RATE | BLOOD_PRESSURE | CALORIES | SLEEP_HOURS

    @NotBlank
    @Size(max = 50)
    private String value;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
