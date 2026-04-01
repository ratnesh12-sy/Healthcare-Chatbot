package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.AuditLog;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.AuditLogRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuditService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    public void logAction(String adminUsername, String actionType, Long targetUserId, String details) {
        Optional<User> adminOptional = userRepository.findByUsername(adminUsername);
        
        if (adminOptional.isPresent()) {
            AuditLog log = new AuditLog();
            log.setAdminUser(adminOptional.get());
            log.setActionType(actionType);
            log.setTargetUserId(targetUserId);
            log.setDetails(details);
            
            auditLogRepository.save(log);
        }
    }
}
