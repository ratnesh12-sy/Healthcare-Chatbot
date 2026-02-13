package com.healthcare.aiassistant.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(columnDefinition = "TEXT")
    private String message;

    private Boolean isFromAi = false;

    private LocalDateTime timestamp = LocalDateTime.now();

    public ChatMessage() {
    }

    public ChatMessage(User user, String message, Boolean isFromAi) {
        this.user = user;
        this.message = message;
        this.isFromAi = isFromAi;
    }

    public ChatMessage(Long id, User user, String message, Boolean isFromAi, LocalDateTime timestamp) {
        this.id = id;
        this.user = user;
        this.message = message;
        this.isFromAi = isFromAi;
        this.timestamp = timestamp;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Boolean getIsFromAi() {
        return isFromAi;
    }

    public void setIsFromAi(Boolean isFromAi) {
        this.isFromAi = isFromAi;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
