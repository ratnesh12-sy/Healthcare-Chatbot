package com.healthcare.aiassistant.security;

import com.healthcare.aiassistant.service.SettingsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * When maintenance mode is enabled (admin setting), non-admin API requests get a 503 with a
 * JSON body the frontend can detect. Auth and public endpoints are exempt so admins can still
 * log in and operate the console, and so the frontend can read the maintenance flag.
 */
public class MaintenanceModeFilter extends OncePerRequestFilter {

    private final SettingsService settingsService;

    public MaintenanceModeFilter(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getServletPath();
        boolean isApi = path.startsWith("/api/");
        boolean exempt = path.startsWith("/api/auth/") || path.startsWith("/api/public/");

        if (isApi && !exempt && settingsService.getBoolean(SettingsService.MAINTENANCE_MODE) && !isAdmin()) {
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"The platform is under maintenance. Please try again later.\",\"maintenance\":true}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated()
                && auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
