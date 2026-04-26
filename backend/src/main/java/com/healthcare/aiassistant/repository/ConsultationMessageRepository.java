package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.ConsultationMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ConsultationMessageRepository extends JpaRepository<ConsultationMessage, Long> {
    
    Page<ConsultationMessage> findByAppointmentIdOrderBySequenceNumberAsc(Long appointmentId, Pageable pageable);
    
    List<ConsultationMessage> findTop10ByAppointmentIdOrderBySequenceNumberDesc(Long appointmentId);

    @Query("SELECT COALESCE(MAX(m.sequenceNumber), 0) FROM ConsultationMessage m WHERE m.appointment.id = :appointmentId")
    Long getMaxSequenceNumberByAppointmentId(@Param("appointmentId") Long appointmentId);
}
