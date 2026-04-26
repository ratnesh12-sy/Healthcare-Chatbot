package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.DoctorAvailabilityException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorAvailabilityExceptionRepository extends JpaRepository<DoctorAvailabilityException, Long> {
    List<DoctorAvailabilityException> findByDoctorOrderByExceptionDateAsc(Doctor doctor);
    Optional<DoctorAvailabilityException> findByDoctorAndExceptionDate(Doctor doctor, LocalDate exceptionDate);
}
