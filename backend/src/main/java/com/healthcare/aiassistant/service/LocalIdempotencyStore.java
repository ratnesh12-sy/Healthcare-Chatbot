package com.healthcare.aiassistant.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class LocalIdempotencyStore implements IdempotencyStore {

    private final ConcurrentHashMap<Long, Long> activeAiJobs = new ConcurrentHashMap<>();

    @Override
    public boolean tryLock(Long userId) {
        // Probabilistic cleanup to prevent memory leaks and deadlocks
        if (ThreadLocalRandom.current().nextInt(10) == 0) {
            long now = System.currentTimeMillis();
            activeAiJobs.entrySet().removeIf(e -> now - e.getValue() > 10_000);
        }

        long startTime = System.currentTimeMillis();
        Long previous = activeAiJobs.putIfAbsent(userId, startTime);
        return previous == null;
    }

    @Override
    public void release(Long userId) {
        // We actually want a safe release passing the start time, 
        // but for simplicity of the interface, we'll implement the strict release in the AiService directly 
        // using the ConcurrentHashMap's computeIfPresent if we need to check the startTime.
        // However, we can just remove it here for basic release.
        activeAiJobs.remove(userId);
    }
    
    // Additional method for safe release
    public void safeRelease(Long userId, Long expectedStartTime) {
        activeAiJobs.computeIfPresent(userId, (k, v) -> v.equals(expectedStartTime) ? null : v);
    }
}
