package com.healthcare.aiassistant.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.aiassistant.payload.dto.ParsedScheduleDTO;
import com.healthcare.aiassistant.payload.openai.OpenAiMessage;
import com.healthcare.aiassistant.payload.openai.OpenAiRequest;
import com.healthcare.aiassistant.payload.openai.OpenAiResponse;
import com.healthcare.aiassistant.repository.SystemSettingRepository;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Turns AI/doctor advice into a reminder schedule. Tries Groq first (structured
 * JSON), and falls back to a deterministic regex parser when Groq is unavailable
 * or returns nothing usable — so the feature works (and is testable) without a key.
 */
@Service
public class ReminderScheduleParser {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduleParser.class);

    private static final String SYSTEM_PROMPT =
            "You convert medical/care advice into a reminder schedule. " +
            "Respond with ONLY a compact JSON object — no prose, no code fences. " +
            "Schema: {\"hasSchedule\":boolean, \"everyMinutes\":integer|null, " +
            "\"durationDays\":integer|null, " +
            "\"category\":\"medication|hydration|rest|follow_up|custom\", \"summary\":string}. " +
            "everyMinutes is the minutes between reminders (twice a day=720, every 6 hours=360, " +
            "once a day=1440). durationDays is how many days to keep reminding. " +
            "If there is no actionable recurring schedule, return {\"hasSchedule\":false}.";

    @Autowired
    private OpenAiProperties openAiProperties;

    @Autowired
    private SystemSettingRepository systemSettingRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();

    public ParsedScheduleDTO parse(String advice) {
        if (advice == null || advice.isBlank()) {
            return ParsedScheduleDTO.none();
        }
        ParsedScheduleDTO ai = tryGroq(advice);
        if (ai != null && ai.isHasSchedule()) {
            return ai;
        }
        return heuristic(advice);
    }

    // ── Groq path ────────────────────────────────────────────────

    private ParsedScheduleDTO tryGroq(String advice) {
        try {
            String apiKey = systemSettingRepository.findBySettingKey("apiKey")
                    .map(s -> s.getSettingValue()).orElse(openAiProperties.getApiKey());
            if (apiKey == null || apiKey.isBlank() || apiKey.equals("MISSING_GROQ_API_KEY")
                    || apiKey.startsWith("local-dev")) {
                return null; // not configured — use fallback
            }
            String model = systemSettingRepository.findBySettingKey("aiModel")
                    .map(s -> s.getSettingValue()).orElse(openAiProperties.getModel());

            List<OpenAiMessage> messages = new ArrayList<>();
            messages.add(new OpenAiMessage("system", SYSTEM_PROMPT));
            messages.add(new OpenAiMessage("user", advice));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);
            HttpEntity<OpenAiRequest> entity = new HttpEntity<>(new OpenAiRequest(model, messages), headers);

            OpenAiResponse response = restTemplate.postForObject(
                    openAiProperties.getApiUrl(), entity, OpenAiResponse.class);
            if (response == null || response.getChoices() == null || response.getChoices().isEmpty()) {
                return null;
            }
            String content = response.getChoices().get(0).getMessage().getContent();
            return parseJson(content);
        } catch (Exception e) {
            log.warn("Schedule parse via Groq failed, using fallback: {}", e.getMessage());
            return null;
        }
    }

    private ParsedScheduleDTO parseJson(String content) {
        if (content == null) return null;
        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start < 0 || end <= start) return null;
        try {
            JsonNode node = objectMapper.readTree(content.substring(start, end + 1));
            if (!node.path("hasSchedule").asBoolean(false)) {
                return null;
            }
            ParsedScheduleDTO dto = new ParsedScheduleDTO();
            dto.setHasSchedule(true);
            dto.setEveryMinutes(node.hasNonNull("everyMinutes") ? node.get("everyMinutes").asInt() : null);
            dto.setDurationDays(node.hasNonNull("durationDays") ? node.get("durationDays").asInt() : null);
            dto.setCategory(normalizeCategory(node.path("category").asText("custom")));
            dto.setSummary(node.path("summary").asText(""));
            dto.setSource("ai");
            if (dto.getEveryMinutes() != null && dto.getEveryMinutes() <= 0) dto.setEveryMinutes(null);
            if (dto.getSummary() == null || dto.getSummary().isBlank()) {
                dto.setSummary(buildSummary(dto.getEveryMinutes(), dto.getDurationDays()));
            }
            return dto;
        } catch (Exception e) {
            return null;
        }
    }

    // ── Regex fallback ───────────────────────────────────────────

    private static final Pattern EVERY_N_UNIT =
            Pattern.compile("every\\s+(\\d+)\\s*(?:-\\s*\\d+\\s*)?(hour|hr|minute|min|day)s?");
    private static final Pattern FOR_DURATION =
            Pattern.compile("for\\s+(\\d+)\\s*(day|week)s?");

    private ParsedScheduleDTO heuristic(String advice) {
        String text = advice.toLowerCase();
        Integer everyMinutes = detectInterval(text);
        if (everyMinutes == null) {
            return ParsedScheduleDTO.none();
        }
        Integer durationDays = detectDuration(text);

        ParsedScheduleDTO dto = new ParsedScheduleDTO();
        dto.setHasSchedule(true);
        dto.setEveryMinutes(everyMinutes);
        dto.setDurationDays(durationDays);
        dto.setCategory(detectCategory(text));
        dto.setSummary(buildSummary(everyMinutes, durationDays));
        dto.setSource("heuristic");
        return dto;
    }

    private Integer detectInterval(String text) {
        if (text.contains("every other day")) return 2880;
        Matcher m = EVERY_N_UNIT.matcher(text);
        if (m.find()) {
            int n = Integer.parseInt(m.group(1));
            String unit = m.group(2);
            if (unit.startsWith("hour") || unit.equals("hr")) return n * 60;
            if (unit.startsWith("min")) return n;
            if (unit.startsWith("day")) return n * 1440;
        }
        if (text.contains("four times a day") || text.contains("4 times a day")) return 360;
        if (text.contains("three times a day") || text.contains("thrice") || text.contains("3 times a day")) return 480;
        if (text.contains("twice a day") || text.contains("twice daily") || text.contains("two times a day") || text.contains("2 times a day")) return 720;
        if (text.contains("once a day") || text.contains("once daily") || text.contains("every day")
                || text.contains("each day") || text.matches(".*\\bdaily\\b.*")) return 1440;
        return null;
    }

    private Integer detectDuration(String text) {
        Matcher m = FOR_DURATION.matcher(text);
        if (m.find()) {
            int n = Integer.parseInt(m.group(1));
            return m.group(2).startsWith("week") ? n * 7 : n;
        }
        if (text.contains("for a week")) return 7;
        if (text.contains("for a day")) return 1;
        return null;
    }

    private String detectCategory(String text) {
        if (text.matches(".*\\b(water|fluids?|hydrate|hydration|drink)\\b.*")) return "hydration";
        if (text.matches(".*\\b(medication|medicine|tablet|pill|dose|mg|capsule|antibiotic)\\b.*")) return "medication";
        if (text.matches(".*\\b(rest|sleep|nap|relax)\\b.*")) return "rest";
        if (text.matches(".*\\b(follow[\\s-]?up|appointment|see a doctor|review)\\b.*")) return "follow_up";
        return "custom";
    }

    // ── Shared helpers ───────────────────────────────────────────

    private String normalizeCategory(String c) {
        if (c == null) return "custom";
        String v = c.trim().toLowerCase().replace('-', '_');
        switch (v) {
            case "medication": case "hydration": case "rest": case "follow_up": case "custom":
                return v;
            default:
                return "custom";
        }
    }

    private String buildSummary(Integer everyMinutes, Integer durationDays) {
        StringBuilder sb = new StringBuilder();
        sb.append(humanizeInterval(everyMinutes));
        if (durationDays != null && durationDays > 0) {
            sb.append(" for ").append(durationDays).append(durationDays == 1 ? " day" : " days");
        }
        return sb.toString();
    }

    private String humanizeInterval(Integer everyMinutes) {
        if (everyMinutes == null) return "One-time";
        if (everyMinutes == 1440) return "Once a day";
        if (everyMinutes == 720) return "Twice a day";
        if (everyMinutes == 2880) return "Every other day";
        if (everyMinutes % 1440 == 0) return "Every " + (everyMinutes / 1440) + " days";
        if (everyMinutes % 60 == 0) return "Every " + (everyMinutes / 60) + " hours";
        return "Every " + everyMinutes + " minutes";
    }
}
