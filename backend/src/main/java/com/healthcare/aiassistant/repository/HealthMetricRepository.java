package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.HealthMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HealthMetricRepository extends JpaRepository<HealthMetric, Long> {
    List<HealthMetric> findByUserId(Long userId);
    List<HealthMetric> findByUserIdOrderByRecordedAtDesc(Long userId);
}
