package com.healthcare.aiassistant.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for deployment health checks.
 */
@RestController
public class HealthCheckController {

    /**
     * Simple health check endpoint for Render.
     * Returns "OK" to signify that the service is up and running.
     *
     * @return String "OK"
     */
    @GetMapping("/health")
    public String healthCheck() {
        return "OK";
    }
}
