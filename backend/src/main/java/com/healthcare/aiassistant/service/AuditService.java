package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.AuditLog;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.dto.AuditLogDTO;
import com.healthcare.aiassistant.repository.AuditLogRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AuditService {

    /** Upper bound on logs returned to the viewer, keeping the payload bounded on free tiers. */
    public static final int RECENT_LIMIT = 500;

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

    /**
     * Returns the most recent audit logs (newest first, capped at {@link #RECENT_LIMIT}) as DTOs.
     * Read-only transactional so the lazy {@code adminUser} resolves; target usernames are
     * resolved in a single batch lookup. Targets that no longer exist (e.g. deleted users)
     * leave {@code targetUsername} null.
     */
    @Transactional(readOnly = true)
    public List<AuditLogDTO> getRecentLogs() {
        List<AuditLog> logs = auditLogRepository.findRecentWithAdmin(PageRequest.of(0, RECENT_LIMIT));

        List<Long> targetIds = logs.stream()
                .map(AuditLog::getTargetUserId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, String> targetUsernames = new HashMap<>();
        if (!targetIds.isEmpty()) {
            userRepository.findAllById(targetIds)
                    .forEach(u -> targetUsernames.put(u.getId(), u.getUsername()));
        }

        return logs.stream()
                .map(log -> {
                    User admin = log.getAdminUser();
                    return new AuditLogDTO(
                            log.getId(),
                            admin != null ? admin.getUsername() : null,
                            admin != null ? admin.getFullName() : null,
                            log.getActionType(),
                            log.getTargetUserId(),
                            log.getTargetUserId() != null ? targetUsernames.get(log.getTargetUserId()) : null,
                            log.getDetails(),
                            log.getTimestamp()
                    );
                })
                .collect(Collectors.toList());
    }
}
