package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.Appointment;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

/**
 * Builds an iCalendar (.ics) file for an appointment so the patient's own
 * calendar app (Google/Apple/Outlook) handles the reminder — free, no infra.
 *
 * Times are emitted as floating local time (no trailing Z), matching how the
 * app already presents appointment times in a single clinic timezone.
 */
@Service
public class IcsService {

    private static final DateTimeFormatter ICS_LOCAL =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final String CRLF = "\r\n";

    public String buildAppointmentIcs(Appointment appt) {
        LocalDateTime start = appt.getAppointmentDate();
        int duration = appt.getDurationMinutes() != null ? appt.getDurationMinutes() : 30;
        LocalDateTime end = start.plusMinutes(duration);

        String fullName = Optional.ofNullable(appt.getDoctor())
                .map(Doctor::getUser).map(User::getFullName)
                .filter(s -> !s.isBlank()).map(String::trim).orElse(null);
        // Avoid "Dr. Dr." when the stored name already includes the honorific.
        String displayDoctor = fullName == null ? "your doctor"
                : (fullName.regionMatches(true, 0, "Dr", 0, 2) ? fullName : "Dr. " + fullName);
        String specialization = Optional.ofNullable(appt.getDoctor())
                .map(Doctor::getSpecialization).orElse("General");

        String summary = escape("Appointment with " + displayDoctor);
        String description = escape("Healthcare AI Assistant appointment — " + specialization
                + ". Status: " + appt.getStatus().name() + ".");

        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR").append(CRLF);
        sb.append("VERSION:2.0").append(CRLF);
        sb.append("PRODID:-//Healthcare AI Assistant//Appointments//EN").append(CRLF);
        sb.append("CALSCALE:GREGORIAN").append(CRLF);
        sb.append("METHOD:PUBLISH").append(CRLF);
        sb.append("BEGIN:VEVENT").append(CRLF);
        sb.append("UID:appointment-").append(appt.getId()).append("@healthcare-chatbot").append(CRLF);
        sb.append("DTSTAMP:").append(ICS_LOCAL.format(start)).append(CRLF);
        sb.append("DTSTART:").append(ICS_LOCAL.format(start)).append(CRLF);
        sb.append("DTEND:").append(ICS_LOCAL.format(end)).append(CRLF);
        sb.append("SUMMARY:").append(summary).append(CRLF);
        sb.append("DESCRIPTION:").append(description).append(CRLF);
        sb.append("STATUS:CONFIRMED").append(CRLF);
        // Alarm 1 day before
        sb.append("BEGIN:VALARM").append(CRLF);
        sb.append("TRIGGER:-P1D").append(CRLF);
        sb.append("ACTION:DISPLAY").append(CRLF);
        sb.append("DESCRIPTION:Appointment tomorrow with ").append(escape(displayDoctor)).append(CRLF);
        sb.append("END:VALARM").append(CRLF);
        // Alarm 2 hours before
        sb.append("BEGIN:VALARM").append(CRLF);
        sb.append("TRIGGER:-PT2H").append(CRLF);
        sb.append("ACTION:DISPLAY").append(CRLF);
        sb.append("DESCRIPTION:Appointment soon with ").append(escape(displayDoctor)).append(CRLF);
        sb.append("END:VALARM").append(CRLF);
        sb.append("END:VEVENT").append(CRLF);
        sb.append("END:VCALENDAR").append(CRLF);
        return sb.toString();
    }

    /** Escapes the characters that are special in iCalendar text values. */
    private String escape(String value) {
        if (value == null) return "";
        return value
                .replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\n", "\\n");
    }
}
