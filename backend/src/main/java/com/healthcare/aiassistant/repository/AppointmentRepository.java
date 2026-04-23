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

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientOrderByAppointmentDateDesc(User patient);
    List<Appointment> findByDoctorOrderByAppointmentDateDesc(Doctor doctor);

    List<Appointment> findByDoctorAndAppointmentDateBetweenAndStatusIn(
            Doctor doctor, LocalDateTime start, LocalDateTime end,
            Collection<AppointmentStatus> statuses);
}
