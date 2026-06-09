package com.healthcare.aiassistant.payload.dto;

import com.healthcare.aiassistant.model.HealthMetric;

import java.time.LocalDateTime;

public class HealthMetricDTO {
    private Long id;
    private String type;   // enum name, e.g. "HEART_RATE"
    private String value;
    private LocalDateTime recordedAt;

    public static HealthMetricDTO from(HealthMetric m) {
        HealthMetricDTO dto = new HealthMetricDTO();
        dto.id = m.getId();
        dto.type = m.getMetricType().name();
        dto.value = m.getMetricValue();
        dto.recordedAt = m.getRecordedAt();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }
}
