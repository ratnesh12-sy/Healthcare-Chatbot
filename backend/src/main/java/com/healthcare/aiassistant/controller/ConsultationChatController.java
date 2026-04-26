package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.*;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import com.healthcare.aiassistant.repository.ConsultationMessageRepository;
import com.healthcare.aiassistant.service.AiHybridService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.security.Principal;

@RestController
public class ConsultationChatController {

    @Autowired
    private ConsultationMessageRepository consultationMessageRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AiHybridService aiHybridService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // REST endpoint to load history
    @GetMapping("/api/consultation/{appointmentId}/messages")
    public Page<ConsultationMessage> getMessages(@PathVariable Long appointmentId, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        return consultationMessageRepository.findByAppointmentIdOrderBySequenceNumberAsc(appointmentId, PageRequest.of(page, size));
    }

    // STOMP WebSocket endpoint
    @MessageMapping("/chat/{appointmentId}")
    public void processMessage(@DestinationVariable Long appointmentId, @Payload ConsultationMessagePayload payload, Principal principal) {
        User user = (User) ((UsernamePasswordAuthenticationToken) principal).getPrincipal();
        Appointment appointment = appointmentRepository.findById(appointmentId).orElseThrow(() -> new RuntimeException("Appointment not found"));
        
        // Ensure user is authorized
        if (!appointment.getPatient().getId().equals(user.getId()) && !appointment.getDoctor().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        SenderType senderType = appointment.getPatient().getId().equals(user.getId()) ? SenderType.PATIENT : SenderType.DOCTOR;

        // 1. Strict Persistence Constraint (Save to DB before broadcasting)
        ConsultationMessage msg = new ConsultationMessage(appointment, user, senderType, payload.getContent());
        Long nextSeq = consultationMessageRepository.getMaxSequenceNumberByAppointmentId(appointmentId) + 1;
        msg.setSequenceNumber(nextSeq);
        ConsultationMessage savedMsg = consultationMessageRepository.save(msg);

        // 2. Broadcast via WebSocket
        messagingTemplate.convertAndSend("/topic/appointment/" + appointmentId, savedMsg);

        // 3. Trigger AI if requested by Patient
        if (senderType == SenderType.PATIENT && payload.getAiMode() == AiMode.MANUAL) {
            aiHybridService.generateAndSendAiResponse(appointmentId, user.getId(), payload.getContent());
        }
    }

    public static class ConsultationMessagePayload {
        private String content;
        private AiMode aiMode = AiMode.DISABLED;

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }

        public AiMode getAiMode() {
            return aiMode;
        }

        public void setAiMode(AiMode aiMode) {
            this.aiMode = aiMode;
        }
    }
}
