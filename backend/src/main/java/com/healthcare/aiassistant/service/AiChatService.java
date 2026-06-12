package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.ChatMessage;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.openai.OpenAiMessage;
import com.healthcare.aiassistant.payload.openai.OpenAiRequest;
import com.healthcare.aiassistant.payload.openai.OpenAiResponse;
import com.healthcare.aiassistant.security.config.OpenAiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    @Autowired
    private OpenAiProperties openAiProperties;

    @Autowired
    private SettingsService settingsService;

    @Autowired
    private ChatService chatService;

    private final RestTemplate restTemplate = new RestTemplate();

    public ChatMessage getAiResponse(User user, String userMessage) {
        // Global AI kill-switch (admin setting).
        if (!settingsService.getBoolean(SettingsService.AI_ENABLED)) {
            chatService.saveMessage(user, userMessage, false);
            return chatService.saveMessage(user,
                    "The AI assistant is currently unavailable. Please try again later or contact your provider.", true);
        }

        // Dynamic settings (cached). API key stays env-only — never stored in the DB.
        String apiKey = openAiProperties.getApiKey();
        String aiModel = settingsService.getString(SettingsService.AI_MODEL);
        String systemPrompt = settingsService.getString(SettingsService.AI_SYSTEM_PROMPT);

        // 1. Prepare Request
        List<OpenAiMessage> messages = new ArrayList<>();
        messages.add(new OpenAiMessage("system", systemPrompt));
        messages.add(new OpenAiMessage("user", userMessage));

        OpenAiRequest request = new OpenAiRequest(aiModel, messages);

        // 2. Prepare Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

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
            log.error("Error calling Groq API", e);
        }

        return null;
    }
}
