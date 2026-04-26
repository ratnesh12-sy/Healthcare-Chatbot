package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.ChatMessage;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.request.ChatRequest;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.service.AiChatService;
import com.healthcare.aiassistant.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    @Autowired
    private ChatService chatService;

    @Autowired
    private AiChatService aiChatService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/history")
    @PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR') or hasRole('ADMIN')")
    public List<ChatMessage> getHistory(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return chatService.getChatHistory(user);
    }

    @PostMapping("/save")
    @PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR') or hasRole('ADMIN')")
    public ResponseEntity<?> saveMessage(@AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChatRequest chatRequest) {
        User user = userRepository.findByUsername(userDetails.getUsername()).get();
        ChatMessage saved = chatService.saveMessage(user, chatRequest.getMessage(), chatRequest.getIsFromAi());
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/ai-chat")
    @PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR') or hasRole('ADMIN')")
    public ResponseEntity<?> aiChat(@AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChatRequest chatRequest) {
        User user = userRepository.findByUsername(userDetails.getUsername()).get();
        ChatMessage response = aiChatService.getAiResponse(user, chatRequest.getMessage());
        if (response != null) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body("AI service is currently unavailable. Please check API Key configuration.");
        }
    }
}
