package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.Appointment;
import com.healthcare.aiassistant.model.AppointmentStatus;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientOrderByAppointmentDateDesc(User patient);
    List<Appointment> findByDoctorOrderByAppointmentDateDesc(Doctor doctor);
    org.springframework.data.domain.Page<Appointment> findByDoctorOrderByAppointmentDateDesc(Doctor doctor, org.springframework.data.domain.Pageable pageable);

    List<Appointment> findByDoctorAndAppointmentDateBetweenAndStatusIn(
            Doctor doctor, LocalDateTime start, LocalDateTime end,
            Collection<AppointmentStatus> statuses);

    // Dashboard count queries — avoid loading all appointments into memory
    long countByDoctorAndAppointmentDateBetween(Doctor doctor, LocalDateTime start, LocalDateTime end);
    List<Appointment> findByDoctorAndAppointmentDateBetweenOrderByAppointmentDateAsc(
            Doctor doctor, LocalDateTime start, LocalDateTime end);

    // Derived count queries for Doctor Profile (no schema change — uses existing columns)
    long countByDoctor(Doctor doctor);
    long countByDoctorAndStatus(Doctor doctor, AppointmentStatus status);

    Optional<Appointment> findByPatientIdAndSymptomsSummaryStartingWith(
            Long patientId, String symptomsPrefix);
}
