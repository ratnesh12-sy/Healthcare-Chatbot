package com.healthcare.aiassistant.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;

@Service
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    @Autowired
    private OpenAiProperties openAiProperties;

    @Autowired
    private SystemSettingRepository systemSettingRepository;

    @Autowired
    private ChatService chatService;

    @Autowired
    @Qualifier("aiExecutor")
    private Executor aiExecutor;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

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

    /**
     * Streaming counterpart of {@link #getAiResponse}. Returns an {@link SseEmitter}
     * immediately and pushes tokens to it as Groq generates them, then persists the
     * user message + full AI reply (same as the blocking path) once the stream ends.
     *
     * SSE events emitted:
     *   token  → {"c": "<delta>"}      one per generated chunk
     *   done   → {"id": <id>, "timestamp": "<iso>"}   stream finished, message saved
     *   error  → {"message": "<reason>"}              client should fall back / show error
     */
    public SseEmitter streamAiResponse(User user, String userMessage) {
        // Long timeout: generation can legitimately take a while; client/proxy can still abort.
        SseEmitter emitter = new SseEmitter(120_000L);

        aiExecutor.execute(() -> {
            String apiKey = systemSettingRepository.findBySettingKey("apiKey")
                    .map(s -> s.getSettingValue())
                    .orElse(openAiProperties.getApiKey());

            String aiModel = systemSettingRepository.findBySettingKey("aiModel")
                    .map(s -> s.getSettingValue())
                    .orElse(openAiProperties.getModel());

            String systemPrompt = systemSettingRepository.findBySettingKey("medicalDisclaimer")
                    .map(s -> s.getSettingValue())
                    .orElse("You are a professional healthcare assistant. Analyze symptoms and provide possible conditions, precautions, and doctor recommendations. Always advise consulting a real doctor.");

            List<OpenAiMessage> messages = new ArrayList<>();
            messages.add(new OpenAiMessage("system", systemPrompt));
            messages.add(new OpenAiMessage("user", userMessage));

            OpenAiRequest request = new OpenAiRequest(aiModel, messages);
            request.setStream(true);

            StringBuilder full = new StringBuilder();
            try {
                String body = objectMapper.writeValueAsString(request);
                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(openAiProperties.getApiUrl()))
                        .header("Authorization", "Bearer " + apiKey)
                        .header("Content-Type", "application/json")
                        .header("Accept", "text/event-stream")
                        .timeout(Duration.ofSeconds(90))
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build();

                HttpResponse<java.util.stream.Stream<String>> response =
                        httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofLines());

                if (response.statusCode() != 200) {
                    log.error("Groq streaming returned status {}", response.statusCode());
                    emitter.send(SseEmitter.event().name("error")
                            .data(Map.of("message", "AI service is currently unavailable."), MediaType.APPLICATION_JSON));
                    emitter.complete();
                    return;
                }

                // Parse OpenAI/Groq SSE lines: "data: {json}" ... terminated by "data: [DONE]".
                Iterator<String> lines = response.body().iterator();
                while (lines.hasNext()) {
                    String line = lines.next();
                    if (line == null || !line.startsWith("data:")) {
                        continue;
                    }
                    String payload = line.substring(5).trim();
                    if (payload.isEmpty()) {
                        continue;
                    }
                    if ("[DONE]".equals(payload)) {
                        break;
                    }
                    try {
                        JsonNode node = objectMapper.readTree(payload);
                        JsonNode delta = node.path("choices").path(0).path("delta").path("content");
                        if (!delta.isMissingNode() && !delta.isNull()) {
                            String token = delta.asText();
                            if (!token.isEmpty()) {
                                full.append(token);
                                emitter.send(SseEmitter.event().name("token")
                                        .data(Map.of("c", token), MediaType.APPLICATION_JSON));
                            }
                        }
                    } catch (Exception parseEx) {
                        // Skip malformed/keep-alive lines without killing the stream.
                        log.debug("Skipping unparseable stream line: {}", payload);
                    }
                }

                if (full.length() == 0) {
                    emitter.send(SseEmitter.event().name("error")
                            .data(Map.of("message", "AI service returned an empty response."), MediaType.APPLICATION_JSON));
                    emitter.complete();
                    return;
                }

                // Persist user message + full AI reply, mirroring the blocking path.
                chatService.saveMessage(user, userMessage, false);
                ChatMessage saved = chatService.saveMessage(user, full.toString(), true);

                emitter.send(SseEmitter.event().name("done")
                        .data(Map.of("id", saved.getId(), "timestamp", saved.getTimestamp().toString()),
                                MediaType.APPLICATION_JSON));
                emitter.complete();
            } catch (Exception e) {
                log.error("Error streaming Groq API", e);
                try {
                    emitter.send(SseEmitter.event().name("error")
                            .data(Map.of("message", "AI service is currently unavailable."), MediaType.APPLICATION_JSON));
                } catch (Exception ignored) {
                    // client already gone
                }
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }
}
