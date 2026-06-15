package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.ChatMessage;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.dto.ChatMessageDTO;
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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.servlet.http.HttpServletResponse;

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
    public List<ChatMessageDTO> getHistory(@AuthenticationPrincipal UserDetails userDetails) {
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
        return ResponseEntity.ok(ChatMessageDTO.from(saved));
    }

    @PostMapping("/ai-chat")
    @PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR') or hasRole('ADMIN')")
    public ResponseEntity<?> aiChat(@AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChatRequest chatRequest) {
        User user = userRepository.findByUsername(userDetails.getUsername()).get();
        ChatMessage response = aiChatService.getAiResponse(user, chatRequest.getMessage());
        if (response != null) {
            return ResponseEntity.ok(ChatMessageDTO.from(response));
        } else {
            return ResponseEntity.badRequest().body("AI service is currently unavailable. Please check API Key configuration.");
        }
    }

    /**
     * Streaming variant of {@link #aiChat}. Returns Server-Sent Events so the
     * frontend can render the reply token-by-token. The blocking /ai-chat endpoint
     * above is kept as a fallback for clients/proxies that can't stream.
     */
    @PostMapping(value = "/ai-chat/stream", produces = "text/event-stream")
    @PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR') or hasRole('ADMIN')")
    public SseEmitter aiChatStream(@AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChatRequest chatRequest, HttpServletResponse httpResponse) {
        // Disable proxy buffering (Render/nginx + Vercel /api rewrite) so tokens flush live.
        httpResponse.setHeader("X-Accel-Buffering", "no");
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return aiChatService.streamAiResponse(user, chatRequest.getMessage());
    }
}
