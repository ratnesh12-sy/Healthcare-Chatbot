package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.ChatMessage;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.dto.ChatMessageDTO;
import com.healthcare.aiassistant.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatService {
    @Autowired
    private ChatMessageRepository chatMessageRepository;

    public ChatMessage saveMessage(User user, String message, boolean isFromAi) {
        ChatMessage chatMessage = new ChatMessage(user, message, isFromAi);
        return chatMessageRepository.save(chatMessage);
    }

    /**
     * Returns the user's chat history as DTOs. Mapping happens inside the (read-only)
     * transaction and only reads scalar fields, so the lazy {@code user} association is
     * never serialized — avoids the LazyInitializationException that returned 500 with
     * open-in-view off, and never leaks the User/password hash.
     */
    @Transactional(readOnly = true)
    public List<ChatMessageDTO> getChatHistory(User user) {
        return chatMessageRepository.findByUserOrderByTimestampAsc(user).stream()
                .map(ChatMessageDTO::from)
                .collect(Collectors.toList());
    }
}
