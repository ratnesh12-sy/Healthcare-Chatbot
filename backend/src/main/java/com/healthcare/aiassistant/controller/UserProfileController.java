package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.payload.dto.UserProfileDTO;
import com.healthcare.aiassistant.payload.response.MessageResponse;
import com.healthcare.aiassistant.security.services.UserDetailsImpl;
import com.healthcare.aiassistant.service.UserProfileService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/profile")
@PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR') or hasRole('ADMIN')")
public class UserProfileController {

    private static final Logger logger = LoggerFactory.getLogger(UserProfileController.class);

    @Autowired
    private UserProfileService userProfileService;

    @GetMapping
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401)
                    .body(new MessageResponse("Unauthorized"));
        }

        try {
            UserProfileDTO profile = userProfileService.getProfile(userDetails.getUsername());
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            logger.error("Failed to fetch profile for user: {}", userDetails.getUsername(), e);
            return ResponseEntity.internalServerError()
                    .body(new MessageResponse("Failed to load profile"));
        }
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody UserProfileDTO dto) {
        if (userDetails == null) {
            return ResponseEntity.status(401)
                    .body(new MessageResponse("Unauthorized"));
        }

        try {
            UserProfileDTO updated = userProfileService.saveOrUpdateProfile(
                    userDetails.getUsername(), dto);
            return ResponseEntity.ok(updated);
        } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
            logger.warn("Concurrent profile update detected for user: {}", userDetails.getUsername());
            return ResponseEntity.status(409)
                    .body(new MessageResponse("Profile was modified by another session. Please refresh and try again."));
        } catch (Exception e) {
            logger.error("Failed to update profile for user: {}", userDetails.getUsername(), e);
            return ResponseEntity.internalServerError()
                    .body(new MessageResponse("Failed to save profile"));
        }
    }
}
