package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.*;
import com.healthcare.aiassistant.payload.dto.ClinicalRecordDTO;
import com.healthcare.aiassistant.payload.dto.PrescriptionDTO;
import com.healthcare.aiassistant.payload.dto.PrescriptionItemDTO;
import com.healthcare.aiassistant.payload.request.PrescriptionRequest;
import com.healthcare.aiassistant.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Doctor notes & prescriptions for appointments (roadmap #7). Enforces that only the
 * appointment's doctor can write, and only its doctor or patient can read. Issuing a
 * prescription also auto-creates recurring medication reminders for the patient.
 */
@Service
public class ClinicalRecordService {

    private static final Pattern EVERY_HOURS = Pattern.compile("every\\s+(\\d+)\\s*hour");

    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private DoctorNoteRepository doctorNoteRepository;
    @Autowired private PrescriptionRepository prescriptionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private ReminderRepository reminderRepository;
    @Autowired private DoctorVerificationService verificationService;

    // ── Reads ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ClinicalRecordDTO getClinical(Long appointmentId, String requesterUsername) {
        Appointment appt = findAppointment(appointmentId);
        User requester = findUser(requesterUsername);

        boolean isPatient = appt.getPatient() != null && appt.getPatient().getId().equals(requester.getId());
        boolean isDoctor = appt.getDoctor() != null && appt.getDoctor().getUser() != null
                && appt.getDoctor().getUser().getId().equals(requester.getId());
        if (!isPatient && !isDoctor) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this appointment.");
        }

        ClinicalRecordDTO dto = new ClinicalRecordDTO();
        dto.setAppointmentId(appt.getId());
        dto.setDoctorName(doctorName(appt));
        dto.setPatientName(appt.getPatient() != null ? appt.getPatient().getFullName() : null);
        dto.setAppointmentDate(appt.getAppointmentDate());

        doctorNoteRepository.findByAppointmentId(appointmentId).ifPresent(n -> {
            dto.setNoteContent(n.getContent());
            dto.setNoteUpdatedAt(n.getUpdatedAt());
        });
        prescriptionRepository.findByAppointmentId(appointmentId)
                .ifPresent(p -> dto.setPrescription(toPrescriptionDTO(p)));
        return dto;
    }

    // ── Writes (doctor only) ─────────────────────────────────────

    @Transactional
    public ClinicalRecordDTO saveNote(Long appointmentId, String doctorUsername, String content) {
        Appointment appt = requireOwningDoctor(appointmentId, doctorUsername);

        DoctorNote note = doctorNoteRepository.findByAppointmentId(appointmentId)
                .orElseGet(() -> {
                    DoctorNote n = new DoctorNote();
                    n.setAppointment(appt);
                    return n;
                });
        note.setContent(content);
        note.setUpdatedAt(LocalDateTime.now());
        doctorNoteRepository.save(note);
        return getClinical(appointmentId, doctorUsername);
    }

    @Transactional
    public ClinicalRecordDTO savePrescription(Long appointmentId, String doctorUsername, PrescriptionRequest req) {
        Appointment appt = requireOwningDoctor(appointmentId, doctorUsername);

        Prescription prescription = prescriptionRepository.findByAppointmentId(appointmentId)
                .orElseGet(() -> {
                    Prescription p = new Prescription();
                    p.setAppointment(appt);
                    return p;
                });
        prescription.setGeneralInstructions(req.getGeneralInstructions());
        prescription.setIssuedAt(LocalDateTime.now());
        prescription.getItems().clear(); // orphanRemoval drops the old items
        if (req.getItems() != null) {
            for (PrescriptionRequest.Item i : req.getItems()) {
                if (i.getMedicationName() == null || i.getMedicationName().isBlank()) continue;
                PrescriptionItem item = new PrescriptionItem();
                item.setMedicationName(i.getMedicationName().trim());
                item.setDosage(i.getDosage());
                item.setFrequency(i.getFrequency());
                item.setDurationDays(i.getDurationDays());
                item.setInstructions(i.getInstructions());
                prescription.addItem(item);
            }
        }
        prescriptionRepository.save(prescription);

        regenerateMedicationReminders(appt, prescription);
        return getClinical(appointmentId, doctorUsername);
    }

    // ── Medication reminder tie-in ───────────────────────────────

    /** Replaces this appointment's auto-generated medication reminders with fresh ones. */
    private void regenerateMedicationReminders(Appointment appt, Prescription prescription) {
        // Remove previously auto-created medication reminders for this appointment.
        List<Reminder> existing = reminderRepository.findByAppointmentId(appt.getId());
        List<Reminder> oldMeds = existing.stream()
                .filter(r -> r.getCategory() == ReminderCategory.MEDICATION)
                .collect(Collectors.toList());
        if (!oldMeds.isEmpty()) {
            reminderRepository.deleteAll(oldMeds);
        }

        LocalDateTime now = LocalDateTime.now();
        for (PrescriptionItem item : prescription.getItems()) {
            Integer everyMinutes = everyMinutesFor(item.getFrequency());
            if (everyMinutes == null || everyMinutes <= 0) continue; // "as needed"/unknown → no reminder

            Reminder r = new Reminder();
            r.setUser(appt.getPatient());
            r.setAppointment(appt);
            r.setCategory(ReminderCategory.MEDICATION);
            r.setSource(ReminderSource.MANUAL);
            String dose = item.getDosage() != null && !item.getDosage().isBlank() ? " " + item.getDosage() : "";
            r.setText(truncate("Take " + item.getMedicationName() + dose, 200));
            r.setRemindAt(now.plusMinutes(everyMinutes));
            r.setEveryMinutes(everyMinutes);
            if (item.getDurationDays() != null && item.getDurationDays() > 0) {
                r.setRepeatUntil(now.plusDays(item.getDurationDays()));
            }
            reminderRepository.save(r);
        }
    }

    /** Maps a human frequency to a reminder interval in minutes; null = no reminder. */
    Integer everyMinutesFor(String frequency) {
        if (frequency == null) return null;
        String f = frequency.toLowerCase();
        if (f.contains("as needed") || f.contains("prn")) return null;
        if (f.contains("once") || f.contains("1 time") || f.equals("daily") || f.contains("once a day")) return 1440;
        if (f.contains("twice") || f.contains("2 time")) return 720;
        if (f.contains("thrice") || f.contains("three") || f.contains("3 time")) return 480;
        if (f.contains("four") || f.contains("4 time")) return 360;
        Matcher m = EVERY_HOURS.matcher(f);
        if (m.find()) {
            int hours = Integer.parseInt(m.group(1));
            return hours > 0 ? hours * 60 : null;
        }
        return null;
    }

    // ── Helpers ──────────────────────────────────────────────────

    private Appointment requireOwningDoctor(Long appointmentId, String doctorUsername) {
        Appointment appt = findAppointment(appointmentId);
        User user = findUser(doctorUsername);
        Doctor doctor = doctorRepository.findByUser(user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Doctor profile not found."));
        if (appt.getDoctor() == null || !appt.getDoctor().getId().equals(doctor.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This appointment is not assigned to you.");
        }
        verificationService.ensureDoctorVerified(doctor);
        return appt;
    }

    private Appointment findAppointment(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found."));
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
    }

    private String doctorName(Appointment appt) {
        if (appt.getDoctor() == null || appt.getDoctor().getUser() == null) return "Doctor";
        String name = appt.getDoctor().getUser().getFullName();
        return name != null ? name : appt.getDoctor().getUser().getUsername();
    }

    private PrescriptionDTO toPrescriptionDTO(Prescription p) {
        List<PrescriptionItemDTO> items = new ArrayList<>();
        for (PrescriptionItem i : p.getItems()) {
            items.add(new PrescriptionItemDTO(i.getMedicationName(), i.getDosage(), i.getFrequency(),
                    i.getDurationDays(), i.getInstructions()));
        }
        return new PrescriptionDTO(p.getGeneralInstructions(), p.getIssuedAt(), items);
    }

    private String truncate(String s, int max) {
        return s != null && s.length() > max ? s.substring(0, max) : s;
    }
}
