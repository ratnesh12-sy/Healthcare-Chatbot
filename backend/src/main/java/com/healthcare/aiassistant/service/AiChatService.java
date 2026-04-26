package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.ChatMessage;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.payload.openai.OpenAiMessage;
import com.healthcare.aiassistant.payload.openai.OpenAiRequest;
import com.healthcare.aiassistant.repository.SystemSettingRepository;
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
    private SystemSettingRepository systemSettingRepository;

    @Autowired
    private ChatService chatService;

    private final RestTemplate restTemplate = new RestTemplate();

    public ChatMessage getAiResponse(User user, String userMessage) {
        // Fetch dynamic settings from Database gracefully
        String apiKey = systemSettingRepository.findBySettingKey("apiKey")
                .map(s -> s.getSettingValue())
                .orElse(openAiProperties.getApiKey());
                
        String aiModel = systemSettingRepository.findBySettingKey("aiModel")
                .map(s -> s.getSettingValue())
                .orElse(openAiProperties.getModel());
                
        String systemPrompt = systemSettingRepository.findBySettingKey("medicalDisclaimer")
                .map(s -> s.getSettingValue())
                .orElse("You are a professional healthcare assistant. Analyze symptoms and provide possible conditions, precautions, and doctor recommendations. Always advise consulting a real doctor.");

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
