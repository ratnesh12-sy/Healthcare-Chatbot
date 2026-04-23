package com.healthcare.aiassistant.payload.dto;

import java.time.LocalDateTime;

/**
 * Flattened, safe response DTO for appointments.
 * Prevents entity leakage, lazy loading crashes, and PII exposure.
 */
public class AppointmentDTO {
    private Long id;
    private String doctorName;
    private String doctorSpecialization;
    private String patientName;
    private LocalDateTime appointmentDate;
    private Integer durationMinutes;
    private String status;
    private String symptomsSummary;

    public AppointmentDTO() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public String getDoctorSpecialization() {
        return doctorSpecialization;
    }

    public void setDoctorSpecialization(String doctorSpecialization) {
        this.doctorSpecialization = doctorSpecialization;
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
