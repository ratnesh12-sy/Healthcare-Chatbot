package com.healthcare.aiassistant.exception;

/**
 * Thrown when an invalid verification state transition is attempted.
 */
public class InvalidVerificationTransitionException extends RuntimeException {
    public InvalidVerificationTransitionException(String message) {
        super(message);
    }
}
