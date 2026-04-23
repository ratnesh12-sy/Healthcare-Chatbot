package com.healthcare.aiassistant.payload.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class AppointmentRequest {
    @NotNull(message = "Doctor ID is required")
    private Long doctorId;

    @NotNull(message = "Appointment date is required")
    @Future(message = "Appointment date must be in the future")
    private LocalDateTime appointmentDate;

    private String symptomsSummary;

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

    public LocalDateTime getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(LocalDateTime appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public String getSymptomsSummary() {
        return symptomsSummary;
    }

    public void setSymptomsSummary(String symptomsSummary) {
        this.symptomsSummary = symptomsSummary;
    }
}
