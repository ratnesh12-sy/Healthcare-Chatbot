package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.Appointment;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientOrderByAppointmentDateDesc(User patient);
    List<Appointment> findByDoctorOrderByAppointmentDateDesc(Doctor doctor);
}
