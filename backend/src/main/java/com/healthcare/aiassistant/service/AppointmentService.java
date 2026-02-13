package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.Appointment;
import com.healthcare.aiassistant.model.Doctor;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.model.AppointmentStatus;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppointmentService {
    @Autowired
    private AppointmentRepository appointmentRepository;

    public Appointment bookAppointment(Appointment appointment) {
        return appointmentRepository.save(appointment);
    }

    public List<Appointment> getPatientAppointments(User patient) {
        return appointmentRepository.findByPatientOrderByAppointmentDateDesc(patient);
    }

    public List<Appointment> getDoctorAppointments(Doctor doctor) {
        return appointmentRepository.findByDoctorOrderByAppointmentDateDesc(doctor);
    }

    public Appointment updateStatus(Long id, AppointmentStatus status) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));
        appointment.setStatus(status);
        return appointmentRepository.save(appointment);
    }
}
