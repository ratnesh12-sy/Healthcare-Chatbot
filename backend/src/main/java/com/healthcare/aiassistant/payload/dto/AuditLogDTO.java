package com.healthcare.aiassistant.payload.dto;

import java.time.LocalDateTime;

/**
 * Safe response DTO for the admin audit-log viewer.
 *
 * <p>The {@code AuditLog} entity holds a lazy {@code adminUser} association; serializing the
 * entity directly would either trip a LazyInitializationException (open-in-view is off in prod)
 * or leak the admin {@code User} entity including its password hash. This DTO exposes only the
 * fields the viewer needs.
 */
public class AuditLogDTO {
    private Long id;
    private String adminUsername;
    private String adminFullName;
    private String actionType;
    private Long targetUserId;
    private String targetUsername;
    private String details;
    private LocalDateTime timestamp;

    public AuditLogDTO() {
    }

    public AuditLogDTO(Long id, String adminUsername, String adminFullName, String actionType,
                       Long targetUserId, String targetUsername, String details, LocalDateTime timestamp) {
        this.id = id;
        this.adminUsername = adminUsername;
        this.adminFullName = adminFullName;
        this.actionType = actionType;
        this.targetUserId = targetUserId;
        this.targetUsername = targetUsername;
        this.details = details;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAdminUsername() { return adminUsername; }
    public void setAdminUsername(String adminUsername) { this.adminUsername = adminUsername; }

    public String getAdminFullName() { return adminFullName; }
    public void setAdminFullName(String adminFullName) { this.adminFullName = adminFullName; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }

    public String getTargetUsername() { return targetUsername; }
    public void setTargetUsername(String targetUsername) { this.targetUsername = targetUsername; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
