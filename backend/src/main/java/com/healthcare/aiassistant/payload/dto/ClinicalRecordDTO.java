package com.healthcare.aiassistant.payload.dto;

import java.time.LocalDateTime;

/** Combined clinical record for an appointment — the doctor's note + the prescription. */
public class ClinicalRecordDTO {
    private Long appointmentId;
    private String doctorName;
    private String patientName;
    private LocalDateTime appointmentDate;
    private String noteContent;
    private LocalDateTime noteUpdatedAt;
    private PrescriptionDTO prescription; // null if none issued

    public ClinicalRecordDTO() {}

    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }
    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public LocalDateTime getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(LocalDateTime appointmentDate) { this.appointmentDate = appointmentDate; }
    public String getNoteContent() { return noteContent; }
    public void setNoteContent(String noteContent) { this.noteContent = noteContent; }
    public LocalDateTime getNoteUpdatedAt() { return noteUpdatedAt; }
    public void setNoteUpdatedAt(LocalDateTime noteUpdatedAt) { this.noteUpdatedAt = noteUpdatedAt; }
    public PrescriptionDTO getPrescription() { return prescription; }
    public void setPrescription(PrescriptionDTO prescription) { this.prescription = prescription; }
}
