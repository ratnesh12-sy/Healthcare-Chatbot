package com.healthcare.aiassistant.config;

import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.ERequestStatus;
import com.healthcare.aiassistant.repository.DoctorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Local-dev only: marks the seeded demo doctors as APPROVED so the patient
 * "Book Appointment" doctor dropdown is populated.
 *
 * <p>In real environments approval comes from the admin verification flow (or the
 * Postgres demo-seed migration); neither runs under the H2 {@code local} profile,
 * so without this the doctor list would be empty locally.
 *
 * <p>Runs on {@link ApplicationReadyEvent} — guaranteed to fire after the
 * DevDataSeeder CommandLineRunner has created the doctors.
 */
@Component
@Profile("local")
public class LocalDoctorApprovalSeeder {

    private static final Logger log = LoggerFactory.getLogger(LocalDoctorApprovalSeeder.class);

    @Autowired
    private DoctorRepository doctorRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void approveSeededDoctors() {
        List<Doctor> doctors = doctorRepository.findAll();
        int approved = 0;
        for (Doctor d : doctors) {
            if (d.getVerificationStatus() != ERequestStatus.APPROVED) {
                d.setVerificationStatus(ERequestStatus.APPROVED);
                approved++;
            }
        }
        if (approved > 0) {
            doctorRepository.saveAll(doctors);
            log.info("LOCAL SEEDER: approved {} doctor(s) for local booking.", approved);
        }
    }
}
