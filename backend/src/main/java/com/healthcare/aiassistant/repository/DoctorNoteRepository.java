package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.DoctorNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DoctorNoteRepository extends JpaRepository<DoctorNote, Long> {
    Optional<DoctorNote> findByAppointmentId(Long appointmentId);
}
