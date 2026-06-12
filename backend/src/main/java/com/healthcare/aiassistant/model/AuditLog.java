package com.healthcare.aiassistant.model;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nullable + SET NULL: when the acting admin is deleted, the audit row survives
    // with a null admin reference (the security trail is preserved).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_user_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private User adminUser;

    @Column(nullable = false, length = 100)
    private String actionType;

    private Long targetUserId;

    @Column(columnDefinition = "TEXT")
    private String details;

    private LocalDateTime timestamp = LocalDateTime.now();

    public AuditLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getAdminUser() { return adminUser; }
    public void setAdminUser(User adminUser) { this.adminUser = adminUser; }
    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
