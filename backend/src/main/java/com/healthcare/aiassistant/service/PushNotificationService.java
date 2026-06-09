package com.healthcare.aiassistant.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.aiassistant.model.PushSubscription;
import com.healthcare.aiassistant.repository.PushSubscriptionRepository;
import com.healthcare.aiassistant.security.config.PushProperties;
import jakarta.annotation.PostConstruct;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sends Web Push notifications via VAPID using the open-source web-push library
 * (no paid service). Gracefully no-ops when VAPID keys are not configured, and
 * prunes subscriptions the push service reports as gone (404/410).
 */
@Service
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);

    private final PushProperties props;
    private final PushSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;

    private PushService pushService;

    public PushNotificationService(PushProperties props,
                                   PushSubscriptionRepository subscriptionRepository,
                                   ObjectMapper objectMapper) {
        this.props = props;
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void init() {
        if (!props.isConfigured()) {
            log.warn("PUSH: VAPID keys not configured — web push is disabled (in-app reminders still work).");
            return;
        }
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        try {
            this.pushService = new PushService(
                    props.getVapid().getPublicKey(),
                    props.getVapid().getPrivateKey(),
                    props.getVapid().getSubject());
            log.info("PUSH: web push enabled.");
        } catch (Exception e) {
            log.error("PUSH: failed to initialise PushService — web push disabled. {}", e.getMessage());
            this.pushService = null;
        }
    }

    public boolean isEnabled() {
        return pushService != null;
    }

    /** Sends a notification to all of a user's subscribed browsers. Best-effort. */
    public void sendToUser(Long userId, String title, String body, String url) {
        if (pushService == null) {
            return;
        }
        List<PushSubscription> subs = subscriptionRepository.findByUserId(userId);
        if (subs.isEmpty()) {
            return;
        }
        byte[] payload = buildPayload(title, body, url);
        for (PushSubscription sub : subs) {
            try {
                Notification notification = Notification.builder()
                        .endpoint(sub.getEndpoint())
                        .userPublicKey(sub.getP256dh())
                        .userAuth(sub.getAuth())
                        .payload(payload)
                        .build();
                HttpResponse response = pushService.send(notification);
                int code = response.getStatusLine().getStatusCode();
                if (code == 404 || code == 410) {
                    // Subscription is gone — remove it.
                    subscriptionRepository.delete(sub);
                    log.info("PUSH: pruned dead subscription id={}", sub.getId());
                } else if (code >= 400) {
                    log.warn("PUSH: send returned HTTP {} for subscription id={}", code, sub.getId());
                }
            } catch (Exception e) {
                log.warn("PUSH: send failed for subscription id={}: {}", sub.getId(), e.getMessage());
            }
        }
    }

    private byte[] buildPayload(String title, String body, String url) {
        Map<String, String> data = new LinkedHashMap<>();
        data.put("title", title != null ? title : "Reminder");
        data.put("body", body != null ? body : "");
        data.put("url", url != null ? url : "/dashboard");
        try {
            return objectMapper.writeValueAsBytes(data);
        } catch (Exception e) {
            // Fallback to a minimal, safe payload.
            return ("{\"title\":\"Reminder\",\"url\":\"/dashboard\"}").getBytes(StandardCharsets.UTF_8);
        }
    }
}
