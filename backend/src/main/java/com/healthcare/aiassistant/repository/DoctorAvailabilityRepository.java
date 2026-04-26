package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.DoctorAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorAvailabilityRepository extends JpaRepository<DoctorAvailability, Long> {
    List<DoctorAvailability> findByDoctorAndIsActiveTrueOrderByDayOfWeekAscStartTimeAsc(Doctor doctor);
    List<DoctorAvailability> findByDoctorAndDayOfWeekAndIsActiveTrueOrderByStartTimeAsc(Doctor doctor, Integer dayOfWeek);
}
