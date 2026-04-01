package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.DoctorVerification;
import com.healthcare.aiassistant.model.ERequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorVerificationRepository extends JpaRepository<DoctorVerification, Long> {
    List<DoctorVerification> findByStatusOrderBySubmittedAtDesc(ERequestStatus status);
    List<DoctorVerification> findAllByOrderBySubmittedAtDesc();
}
