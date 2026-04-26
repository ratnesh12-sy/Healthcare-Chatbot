package com.healthcare.aiassistant.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class RateLimiterService {

    private final ConcurrentHashMap<Long, Long> lastRequestTime = new ConcurrentHashMap<>();
    private static final long RATE_LIMIT_MS = 5000; // 5 seconds
    private static final long TTL_MS = 60000; // 1 minute

    public boolean isRateLimited(Long userId) {
        long now = System.currentTimeMillis();

        // Probabilistic cleanup to prevent memory leaks
        if (ThreadLocalRandom.current().nextInt(10) == 0) {
            lastRequestTime.entrySet().removeIf(e -> now - e.getValue() > TTL_MS);
        }

        Long lastTime = lastRequestTime.get(userId);
        if (lastTime != null && now - lastTime < RATE_LIMIT_MS) {
            return true; // Rate limited
        }

        lastRequestTime.put(userId, now);
        return false; // Not limited
    }
}
