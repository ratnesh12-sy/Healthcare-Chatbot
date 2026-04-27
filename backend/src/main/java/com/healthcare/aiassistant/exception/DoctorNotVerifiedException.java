package com.healthcare.aiassistant.exception;

/**
 * Thrown when a doctor attempts an action that requires APPROVED verification status.
 */
public class DoctorNotVerifiedException extends RuntimeException {
    public DoctorNotVerifiedException(String message) {
        super(message);
    }
}
