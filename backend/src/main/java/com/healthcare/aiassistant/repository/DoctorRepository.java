package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    Optional<Doctor> findByUser(User user);
    Optional<Doctor> findByUser_Id(Long userId);

    /**
     * Repository-level safety: fetch only doctors with a specific verification status.
     * Use this instead of findAll() to prevent unverified doctors from leaking into public views.
     */
    @org.springframework.data.jpa.repository.Query("SELECT d FROM Doctor d JOIN FETCH d.user WHERE d.verificationStatus = :verificationStatus")
    List<Doctor> findByVerificationStatus(@org.springframework.data.repository.query.Param("verificationStatus") String verificationStatus);
}
