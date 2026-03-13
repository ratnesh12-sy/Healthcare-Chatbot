package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.ChatMessage;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.openai.OpenAiMessage;
import com.healthcare.aiassistant.payload.openai.OpenAiRequest;
import com.healthcare.aiassistant.payload.openai.OpenAiResponse;
import com.healthcare.aiassistant.security.config.OpenAiProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class AiChatService {

    @Autowired
    private OpenAiProperties openAiProperties;

    @Autowired
    private ChatService chatService;

    private final RestTemplate restTemplate = new RestTemplate();

    public ChatMessage getAiResponse(User user, String userMessage) {
        // 1. Prepare Request
        List<OpenAiMessage> messages = new ArrayList<>();
        messages.add(new OpenAiMessage("system",
                "You are a professional healthcare assistant. Analyze symptoms and provide possible conditions, precautions, and doctor recommendations. Always advise consulting a real doctor."));
        messages.add(new OpenAiMessage("user", userMessage));

        OpenAiRequest request = new OpenAiRequest(openAiProperties.getModel(), messages);

        // 2. Prepare Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiProperties.getApiKey());

        HttpEntity<OpenAiRequest> entity = new HttpEntity<>(request, headers);

        try {
            // 3. Call OpenAI API
            OpenAiResponse response = restTemplate.postForObject(openAiProperties.getApiUrl(), entity, OpenAiResponse.class);

            if (response != null && response.getChoices() != null && !response.getChoices().isEmpty()) {
                String aiResponseText = response.getChoices().get(0).getMessage().getContent();

                // 4. Save User Message
                chatService.saveMessage(user, userMessage, false);

                // 5. Save AI Response and return
                return chatService.saveMessage(user, aiResponseText, true);
            }
        } catch (Exception e) {
            System.err.println("Error calling OpenAI API: " + e.getMessage());
        }

        return null;
    }
}
