package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.HealthMetric;
import com.healthcare.aiassistant.model.HealthMetricType;
import com.healthcare.aiassistant.payload.dto.HealthMetricDTO;
import com.healthcare.aiassistant.payload.request.HealthMetricRequest;
import com.healthcare.aiassistant.repository.HealthMetricRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class HealthMetricService {

    @Autowired
    private HealthMetricRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private Clock clock;

    /** Full history, optionally filtered by type (most recent first). */
    public List<HealthMetricDTO> list(Long userId, String typeStr) {
        List<HealthMetric> metrics;
        if (typeStr != null && !typeStr.isBlank()) {
            metrics = repository.findByUserIdAndMetricTypeOrderByRecordedAtDesc(userId, parseType(typeStr));
        } else {
            metrics = repository.findByUserIdOrderByRecordedAtDesc(userId);
        }
        return metrics.stream().map(HealthMetricDTO::from).collect(Collectors.toList());
    }

    /** The most recent reading for each metric type (for the dashboard cards). */
    public List<HealthMetricDTO> latestPerType(Long userId) {
        List<HealthMetric> all = repository.findByUserIdOrderByRecordedAtDesc(userId);
        Map<HealthMetricType, HealthMetric> latest = new LinkedHashMap<>();
        for (HealthMetric m : all) {
            latest.putIfAbsent(m.getMetricType(), m); // first seen = most recent (list is desc)
        }
        return latest.values().stream().map(HealthMetricDTO::from).collect(Collectors.toList());
    }

    @Transactional
    public HealthMetricDTO create(Long userId, HealthMetricRequest req) {
        HealthMetricType type = parseType(req.getType());
        String value = req.getValue() == null ? "" : req.getValue().trim();
        if (value.isEmpty()) {
            throw new IllegalArgumentException("Value cannot be empty");
        }
        if (value.length() > 50) {
            throw new IllegalArgumentException("Value too long (max 50)");
        }
        HealthMetric m = new HealthMetric();
        m.setUser(userRepository.getReferenceById(userId));
        m.setMetricType(type);
        m.setMetricValue(value);
        m.setRecordedAt(LocalDateTime.now(clock));
        return HealthMetricDTO.from(repository.save(m));
    }

    /** Medication adherence summary built from MEDICATION_TAKEN events. */
    public Map<String, Object> adherence(Long userId) {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();

        long takenToday = repository.countByUserIdAndMetricTypeAndRecordedAtAfter(
                userId, HealthMetricType.MEDICATION_TAKEN, today.atStartOfDay());
        long takenLast7Days = repository.countByUserIdAndMetricTypeAndRecordedAtAfter(
                userId, HealthMetricType.MEDICATION_TAKEN, now.minusDays(7));

        List<HealthMetric> taken = repository.findByUserIdAndMetricTypeOrderByRecordedAtDesc(
                userId, HealthMetricType.MEDICATION_TAKEN);

        LocalDateTime lastTakenAt = taken.isEmpty() ? null : taken.get(0).getRecordedAt();

        // Current streak: consecutive days up to today with at least one dose.
        Set<LocalDate> days = taken.stream()
                .map(m -> m.getRecordedAt().toLocalDate())
                .collect(Collectors.toSet());
        int streak = 0;
        LocalDate cursor = today;
        while (days.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("takenToday", takenToday);
        result.put("takenLast7Days", takenLast7Days);
        result.put("streakDays", streak);
        result.put("lastTakenAt", lastTakenAt);
        result.put("recent", taken.stream().limit(10).map(HealthMetricDTO::from).collect(Collectors.toList()));
        return result;
    }

    private HealthMetricType parseType(String typeStr) {
        try {
            return HealthMetricType.valueOf(typeStr.trim().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid metric type: " + typeStr);
        }
    }
}
