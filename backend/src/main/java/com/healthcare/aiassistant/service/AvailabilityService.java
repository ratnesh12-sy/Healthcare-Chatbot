package com.healthcare.aiassistant.service;


import com.healthcare.aiassistant.model.Appointment;
import com.healthcare.aiassistant.model.AppointmentStatus;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.DoctorAvailability;
import com.healthcare.aiassistant.model.DoctorAvailabilityException;
import com.healthcare.aiassistant.payload.dto.AvailabilityBlockDTO;
import com.healthcare.aiassistant.payload.dto.AvailabilityExceptionDTO;
import com.healthcare.aiassistant.payload.dto.SlotResponseDTO;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import com.healthcare.aiassistant.repository.DoctorAvailabilityExceptionRepository;
import com.healthcare.aiassistant.repository.DoctorAvailabilityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
public class AvailabilityService {

    private static final Logger log = LoggerFactory.getLogger(AvailabilityService.class);

    @Autowired
    private com.healthcare.aiassistant.config.BookingProperties bookingProperties;

    @Autowired
    private DoctorAvailabilityRepository availabilityRepository;

    @Autowired
    private DoctorAvailabilityExceptionRepository exceptionRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    // ── Schedule Management ──────────────────────────────────────────────────

    @Transactional
    public List<AvailabilityBlockDTO> saveWeeklySchedule(Doctor doctor, Integer dayOfWeek, List<AvailabilityBlockDTO> blocks) {
        if (dayOfWeek < 1 || dayOfWeek > 7) {
            throw new IllegalArgumentException("Invalid day of week. Must be between 1 and 7.");
        }

        // Validate overlaps in incoming blocks
        blocks.sort(Comparator.comparing(AvailabilityBlockDTO::getStartTime));
        for (int i = 1; i < blocks.size(); i++) {
            AvailabilityBlockDTO prev = blocks.get(i - 1);
            AvailabilityBlockDTO curr = blocks.get(i);
            if (!prev.getEndTime().isBefore(curr.getStartTime()) && !prev.getEndTime().equals(curr.getStartTime())) {
                throw new IllegalArgumentException("Overlapping availability blocks detected.");
            }
        }

        // Delete old schedule for this day
        List<DoctorAvailability> existing = availabilityRepository.findByDoctorAndDayOfWeekAndIsActiveTrueOrderByStartTimeAsc(doctor, dayOfWeek);
        existing.forEach(e -> e.setIsActive(false));
        availabilityRepository.saveAll(existing);

        // Save new
        List<DoctorAvailability> newEntities = new ArrayList<>();
        for (AvailabilityBlockDTO dto : blocks) {
            if (!dto.getEndTime().isAfter(dto.getStartTime())) {
                throw new IllegalArgumentException("End time must be after start time");
            }
            if (!List.of(10, 15, 20, 30, 45, 60).contains(dto.getSlotDuration())) {
                throw new IllegalArgumentException("Invalid slot duration");
            }

            DoctorAvailability entity = new DoctorAvailability();
            entity.setDoctor(doctor);
            entity.setDayOfWeek(dayOfWeek);
            entity.setStartTime(dto.getStartTime());
            entity.setEndTime(dto.getEndTime());
            entity.setSlotDuration(dto.getSlotDuration());
            entity.setIsActive(true);
            newEntities.add(entity);
        }

        availabilityRepository.saveAll(newEntities);
        log.info("Doctor {} updated weekly schedule for day {}", doctor.getId(), dayOfWeek);

        return newEntities.stream().map(this::mapToBlockDTO).collect(Collectors.toList());
    }

    public List<AvailabilityBlockDTO> getWeeklySchedule(Doctor doctor) {
        return availabilityRepository.findByDoctorAndIsActiveTrueOrderByDayOfWeekAscStartTimeAsc(doctor)
                .stream()
                .map(this::mapToBlockDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AvailabilityExceptionDTO saveException(Doctor doctor, AvailabilityExceptionDTO dto) {
        DoctorAvailabilityException exception = exceptionRepository.findByDoctorAndExceptionDate(doctor, dto.getExceptionDate())
                .orElse(new DoctorAvailabilityException());

        exception.setDoctor(doctor);
        exception.setExceptionDate(dto.getExceptionDate());
        exception.setIsAvailable(dto.getIsAvailable());
        if (Boolean.TRUE.equals(dto.getIsAvailable())) {
            if (dto.getStartTime() == null || dto.getEndTime() == null || !dto.getEndTime().isAfter(dto.getStartTime())) {
                throw new IllegalArgumentException("Partial availability requires valid start and end times.");
            }
            exception.setStartTime(dto.getStartTime());
            exception.setEndTime(dto.getEndTime());
        } else {
            exception.setStartTime(null);
            exception.setEndTime(null);
        }
        exception.setReason(dto.getReason());

        exception = exceptionRepository.save(exception);
        log.info("Doctor {} added exception for date {}", doctor.getId(), dto.getExceptionDate());

        return mapToExceptionDTO(exception);
    }

    public List<AvailabilityExceptionDTO> getExceptions(Doctor doctor) {
        return exceptionRepository.findByDoctorOrderByExceptionDateAsc(doctor)
                .stream()
                .map(this::mapToExceptionDTO)
                .collect(Collectors.toList());
    }

    // ── Slot Generation Engine ───────────────────────────────────────────────

    public List<SlotResponseDTO> getAvailableSlots(Doctor doctor, LocalDate date) {
        log.debug("Generating slots for Doctor {} on {}", doctor.getId(), date);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        // Rule 8: Apply booking window
        if (date.isBefore(now.toLocalDate()) || date.isAfter(now.toLocalDate().plusDays(bookingProperties.getMaxDays()))) {
            return new ArrayList<>(); // Outside booking window
        }

        int dayOfWeek = date.getDayOfWeek().getValue(); // 1=Mon, 7=Sun

        // 1. Fetch active availability blocks
        List<DoctorAvailability> blocks = availabilityRepository.findByDoctorAndDayOfWeekAndIsActiveTrueOrderByStartTimeAsc(doctor, dayOfWeek);

        // 2. Apply exception override (Absolute Priority)
        Optional<DoctorAvailabilityException> exceptionOpt = exceptionRepository.findByDoctorAndExceptionDate(doctor, date);
        if (exceptionOpt.isPresent()) {
            DoctorAvailabilityException exception = exceptionOpt.get();
            if (Boolean.FALSE.equals(exception.getIsAvailable())) {
                log.debug("Full day exception exists. Returning empty.");
                return new ArrayList<>(); // Full day off
            }
            // Partial day override. We create a pseudo-block based on exception times.
            // Assuming default slot duration of 30 if no blocks exist, else use the first block's duration
            int duration = blocks.isEmpty() ? 30 : blocks.get(0).getSlotDuration();
            blocks = new ArrayList<>();
            DoctorAvailability overrideBlock = new DoctorAvailability();
            overrideBlock.setStartTime(exception.getStartTime());
            overrideBlock.setEndTime(exception.getEndTime());
            overrideBlock.setSlotDuration(duration);
            blocks.add(overrideBlock);
            log.debug("Partial exception applied: {} to {}", exception.getStartTime(), exception.getEndTime());
        }

        // 3. Generate slots per block -> 4. Store in TreeSet
        TreeSet<LocalTime> generatedSlots = new TreeSet<>();
        for (DoctorAvailability block : blocks) {
            LocalTime current = block.getStartTime();
            while (!current.plusMinutes(block.getSlotDuration()).isAfter(block.getEndTime())) {
                generatedSlots.add(current);
                current = current.plusMinutes(block.getSlotDuration());
            }
        }

        if (generatedSlots.size() > 200) {
            throw new RuntimeException("SystemGuardException: Excessive slot generation detected");
        }

        // 5. Fetch booked appointments
        List<Appointment> booked = appointmentRepository.findByDoctorAndAppointmentDateBetweenAndStatusIn(
                doctor, 
                date.atStartOfDay(), 
                date.atTime(LocalTime.MAX), 
                List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED));

        // 6. Remove overlaps & 7. Remove past/notice slots
        LocalDateTime noticeThreshold = now.plusMinutes(bookingProperties.getMinNoticeMinutes());
        List<SlotResponseDTO> finalSlots = new ArrayList<>();

        for (LocalTime slotTime : generatedSlots) {
            LocalDateTime slotStartDateTime = date.atTime(slotTime);
            // Defaulting duration to 30 for the check, or we can look up the block duration
            // For simplicity, we assume duration corresponds to the distance to next slot or default
            int duration = blocks.isEmpty() ? 30 : blocks.get(0).getSlotDuration();
            LocalDateTime slotEndDateTime = slotStartDateTime.plusMinutes(duration);

            boolean isAvailable = true;
            String reason = null;

            // Past/Notice Rule
            if (slotStartDateTime.isBefore(noticeThreshold)) {
                isAvailable = false;
                reason = "Past or within notice period";
            }

            // Overlap check
            if (isAvailable) {
                for (Appointment appt : booked) {
                    LocalDateTime apptStart = appt.getAppointmentDate();
                    LocalDateTime apptEnd = apptStart.plusMinutes(appt.getDurationMinutes());

                    // Overlap mathematically: appt_start < slot_end && appt_end > slot_start
                    if (apptStart.isBefore(slotEndDateTime) && apptEnd.isAfter(slotStartDateTime)) {
                        isAvailable = false;
                        reason = "Booked";
                        break;
                    }
                }
            }

            // In final response, we can filter out past entirely, but for UI sake we might want to return only available ones
            // However, the prompt says "Return Object array ... future-proof for disabled slots"
            // For now, let's only return available ones to match typical flow, unless we want to show everything.
            // Let's only return valid future slots, but if it's booked, we can include it as available=false.
            if (slotStartDateTime.isAfter(noticeThreshold)) {
                finalSlots.add(new SlotResponseDTO(slotTime.format(DateTimeFormatter.ofPattern("HH:mm")), isAvailable, reason));
            }
        }

        log.debug("Final slots generated: {}", finalSlots.size());
        return finalSlots;
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    private AvailabilityBlockDTO mapToBlockDTO(DoctorAvailability entity) {
        AvailabilityBlockDTO dto = new AvailabilityBlockDTO();
        dto.setId(entity.getId());
        dto.setDayOfWeek(entity.getDayOfWeek());
        dto.setStartTime(entity.getStartTime());
        dto.setEndTime(entity.getEndTime());
        dto.setSlotDuration(entity.getSlotDuration());
        dto.setIsActive(entity.getIsActive());
        return dto;
    }

    private AvailabilityExceptionDTO mapToExceptionDTO(DoctorAvailabilityException entity) {
        AvailabilityExceptionDTO dto = new AvailabilityExceptionDTO();
        dto.setId(entity.getId());
        dto.setExceptionDate(entity.getExceptionDate());
        dto.setStartTime(entity.getStartTime());
        dto.setEndTime(entity.getEndTime());
        dto.setIsAvailable(entity.getIsAvailable());
        dto.setReason(entity.getReason());
        return dto;
    }
}
