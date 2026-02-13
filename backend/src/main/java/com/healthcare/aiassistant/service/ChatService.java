package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.ChatMessage;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatService {
    @Autowired
    private ChatMessageRepository chatMessageRepository;

    public ChatMessage saveMessage(User user, String message, boolean isFromAi) {
        ChatMessage chatMessage = new ChatMessage(user, message, isFromAi);
        return chatMessageRepository.save(chatMessage);
    }

    public List<ChatMessage> getChatHistory(User user) {
        return chatMessageRepository.findByUserOrderByTimestampAsc(user);
    }
}
