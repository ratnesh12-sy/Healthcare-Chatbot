package com.healthcare.aiassistant.payload.request;

import java.time.LocalDateTime;

public class AppointmentRequest {
    private Long doctorId;
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
