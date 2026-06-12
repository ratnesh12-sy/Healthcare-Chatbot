package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.payload.dto.ClinicalRecordDTO;
import com.healthcare.aiassistant.payload.request.NoteRequest;
import com.healthcare.aiassistant.payload.request.PrescriptionRequest;
import com.healthcare.aiassistant.service.ClinicalRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Doctor notes & prescriptions. Reads are for the appointment's doctor OR patient;
 * writes are doctor-only (ownership + verification enforced in the service).
 */
@RestController
public class ClinicalController {

    @Autowired
    private ClinicalRecordService clinicalRecordService;

    /** Read the note + prescription for an appointment (doctor or patient). */
    @GetMapping("/api/appointments/{appointmentId}/clinical")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClinicalRecordDTO> getClinical(@PathVariable Long appointmentId,
                                                         @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(clinicalRecordService.getClinical(appointmentId, userDetails.getUsername()));
    }

    /** Create/update the clinical note (doctor only). */
    @PutMapping("/api/doctor/appointments/{appointmentId}/note")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ClinicalRecordDTO> saveNote(@PathVariable Long appointmentId,
                                                      @RequestBody NoteRequest req,
                                                      @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(clinicalRecordService.saveNote(appointmentId, userDetails.getUsername(), req.getContent()));
    }

    /** Create/replace the prescription + items (doctor only); auto-creates medication reminders. */
    @PutMapping("/api/doctor/appointments/{appointmentId}/prescription")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ClinicalRecordDTO> savePrescription(@PathVariable Long appointmentId,
                                                              @RequestBody PrescriptionRequest req,
                                                              @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(clinicalRecordService.savePrescription(appointmentId, userDetails.getUsername(), req));
    }
}
