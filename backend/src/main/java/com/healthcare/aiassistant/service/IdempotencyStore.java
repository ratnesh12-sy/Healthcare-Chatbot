package com.healthcare.aiassistant.service;

public interface IdempotencyStore {
    boolean tryLock(Long userId);
    void release(Long userId);
}
