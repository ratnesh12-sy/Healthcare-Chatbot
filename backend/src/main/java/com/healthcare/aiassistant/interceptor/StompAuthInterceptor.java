package com.healthcare.aiassistant.interceptor;

import com.healthcare.aiassistant.model.Appointment;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.AppointmentRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.security.jwt.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import com.healthcare.aiassistant.security.services.UserDetailsImpl;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            List<String> authorization = accessor.getNativeHeader("Authorization");
            if (authorization != null && !authorization.isEmpty()) {
                String token = authorization.get(0).substring(7);
                if (jwtUtils.validateJwtToken(token)) {
                    String username = jwtUtils.getUserNameFromJwtToken(token);
                    User user = userRepository.findByEmail(username).orElseThrow(() -> new AccessDeniedException("User not found"));
                    UserDetailsImpl userDetails = UserDetailsImpl.build(user);
                    accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, userDetails.getAuthorities()));
                } else {
                    throw new AccessDeniedException("Invalid JWT token");
                }
            } else {
                 throw new AccessDeniedException("Authorization header is missing");
            }
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            User user = (User) ((UsernamePasswordAuthenticationToken) accessor.getUser()).getPrincipal();

            if (destination != null && destination.startsWith("/topic/appointment/")) {
                Long appointmentId = extractAppointmentId(destination);
                if (!isUserPartOfAppointment(user, appointmentId)) {
                    throw new AccessDeniedException("Unauthorized subscription to appointment topic");
                }
            } else if (destination != null && destination.startsWith("/user/queue/ai-responses")) {
                // Only PATIENT can subscribe to AI responses (Doctor shouldn't see AI responses per plan)
                boolean isPatient = user.getRole().getName().name().equals("ROLE_PATIENT");
                if (!isPatient) {
                    throw new AccessDeniedException("Only patients can subscribe to AI responses");
                }
            }
        }

        return message;
    }

    private Long extractAppointmentId(String destination) {
        try {
            String[] parts = destination.split("/");
            return Long.parseLong(parts[parts.length - 1]);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isUserPartOfAppointment(User user, Long appointmentId) {
        if (appointmentId == null) return false;
        Optional<Appointment> appointmentOpt = appointmentRepository.findById(appointmentId);
        if (appointmentOpt.isEmpty()) return false;
        Appointment appointment = appointmentOpt.get();

        boolean isPatient = appointment.getPatient().getId().equals(user.getId());
        boolean isDoctor = appointment.getDoctor().getUser().getId().equals(user.getId());

        return isPatient || isDoctor;
    }
}
