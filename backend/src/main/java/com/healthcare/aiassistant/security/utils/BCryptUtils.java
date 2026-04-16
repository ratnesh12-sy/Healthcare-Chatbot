package com.healthcare.aiassistant.security.utils;

public class BCryptUtils {
    
    private BCryptUtils() {
        // Prevent instantiation
    }

    /**
     * Validates if the provided string strictly conforms to standard BCrypt formats.
     * Supports $2a$, $2b$, and $2y$ prefixes.
     */
    public static boolean isValidBCryptHash(String password) {
        return password != null && !password.isBlank() && password.matches("^\\$2[aby]\\$.*");
    }
}
