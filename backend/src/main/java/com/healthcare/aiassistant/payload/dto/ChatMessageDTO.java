package com.healthcare.aiassistant.payload.dto;

import com.healthcare.aiassistant.model.ChatMessage;

import java.time.LocalDateTime;

/**
 * Safe response DTO for chat messages.
 *
 * <p>The {@code ChatMessage} entity holds a lazy {@code user} association; serializing the entity
 * directly would either trip a LazyInitializationException (open-in-view is off in prod — this is
 * what broke {@code GET /api/chat/history}) or leak the {@code User} entity including its password
 * hash. This DTO exposes only the fields the chat UI needs.
 */
public class ChatMessageDTO {
    private Long id;
    private String message;
    private Boolean isFromAi;
    private LocalDateTime timestamp;

    public ChatMessageDTO() {
    }

    public ChatMessageDTO(Long id, String message, Boolean isFromAi, LocalDateTime timestamp) {
        this.id = id;
        this.message = message;
        this.isFromAi = isFromAi;
        this.timestamp = timestamp;
    }

    /** Maps an entity to a DTO using only scalar fields — never touches the lazy {@code user}. */
    public static ChatMessageDTO from(ChatMessage m) {
        return new ChatMessageDTO(m.getId(), m.getMessage(), m.getIsFromAi(), m.getTimestamp());
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Boolean getIsFromAi() { return isFromAi; }
    public void setIsFromAi(Boolean isFromAi) { this.isFromAi = isFromAi; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
