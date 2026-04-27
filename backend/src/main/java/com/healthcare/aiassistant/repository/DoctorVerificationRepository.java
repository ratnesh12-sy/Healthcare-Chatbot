package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.DoctorVerification;
import com.healthcare.aiassistant.model.ERequestStatus;
import com.healthcare.aiassistant.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorVerificationRepository extends JpaRepository<DoctorVerification, Long> {
    List<DoctorVerification> findByStatusOrderBySubmittedAtDesc(ERequestStatus status);
    List<DoctorVerification> findAllByOrderBySubmittedAtDesc();

    /**
     * Single active verification per doctor.
     * Used to enforce the one-record-per-doctor strategy.
     */
    Optional<DoctorVerification> findByDoctor(User doctor);
}
