package com.healthcare.aiassistant.exception;

public class OutsideWorkingHoursException extends RuntimeException {
    public OutsideWorkingHoursException(String message) {
        super(message);
    }
}
