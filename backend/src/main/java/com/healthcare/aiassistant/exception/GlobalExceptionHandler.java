package com.healthcare.aiassistant.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<?> handleBadCredentialsException(BadCredentialsException ex) {
        // We purposely construct a generic failure message to prevent internal DB states 
        // / plaintext warnings from leaking directly to external HTTP payloads.
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("Invalid username or password");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    @ExceptionHandler(SlotAlreadyBookedException.class)
    public ResponseEntity<?> handleSlotAlreadyBooked(SlotAlreadyBookedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("status", "ERROR", "message", ex.getMessage()));
    }

    @ExceptionHandler(OutsideWorkingHoursException.class)
    public ResponseEntity<?> handleOutsideWorkingHours(OutsideWorkingHoursException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("status", "ERROR", "message", ex.getMessage()));
    }

    @ExceptionHandler(PastSlotException.class)
    public ResponseEntity<?> handlePastSlot(PastSlotException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("status", "ERROR", "message", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGenericException(Exception ex) {
        // Log full details internally, return generic message externally
        logger.error("Unhandled exception: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("status", "ERROR", "message", "An unexpected error occurred"));
    }
}
