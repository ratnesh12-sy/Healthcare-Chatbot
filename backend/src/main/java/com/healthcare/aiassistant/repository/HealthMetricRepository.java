package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.HealthMetric;
import com.healthcare.aiassistant.model.HealthMetricType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface HealthMetricRepository extends JpaRepository<HealthMetric, Long> {
    List<HealthMetric> findByUserId(Long userId);
    List<HealthMetric> findByUserIdOrderByRecordedAtDesc(Long userId);
    List<HealthMetric> findByUserIdAndMetricTypeOrderByRecordedAtDesc(Long userId, HealthMetricType metricType);
    long countByUserIdAndMetricTypeAndRecordedAtAfter(Long userId, HealthMetricType metricType, LocalDateTime after);
}
