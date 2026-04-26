package com.healthcare.aiassistant.payload.dto;

import java.time.LocalDateTime;

public class DoctorAppointmentDTO {
    private Long id;
    private String patientName;
    private LocalDateTime appointmentDate;
    private Integer durationMinutes;
    private String status;
    private String symptomsSummary;

    public DoctorAppointmentDTO() {}

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public LocalDateTime getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(LocalDateTime appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSymptomsSummary() {
        return symptomsSummary;
    }

    public void setSymptomsSummary(String symptomsSummary) {
        this.symptomsSummary = symptomsSummary;
    }
}
