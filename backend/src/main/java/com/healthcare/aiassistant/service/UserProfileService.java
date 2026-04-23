package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.Gender;
import com.healthcare.aiassistant.model.User;
import com.healthcare.aiassistant.model.UserProfile;
import com.healthcare.aiassistant.payload.dto.UserProfileDTO;
import com.healthcare.aiassistant.repository.UserProfileRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.security.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserProfileService {

    private static final Logger logger = LoggerFactory.getLogger(UserProfileService.class);

    @Autowired
    private UserProfileRepository userProfileRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditService auditService;

    /**
     * Fetches the profile for a given user. If no UserProfile exists yet,
     * returns a DTO populated with the User's basic fields and null medical data.
     */
    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<UserProfile> profileOpt = userProfileRepository.findByUser(user);

        // Log profile view using deterministic sampling
        logProfileView(user);

        return profileOpt.map(profile -> mapToDTO(user, profile))
                .orElseGet(() -> mapToDTO(user, null));
    }

    /**
     * Creates or updates the profile for the given user (UPSERT).
     * Uses safe partial updates: null DTO fields are ignored.
     */
    @Transactional
    public UserProfileDTO saveOrUpdateProfile(String username, UserProfileDTO dto) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // --- Update User-level fields (safe partial) ---
        if (dto.getFullName() != null) {
            user.setFullName(InputSanitizer.sanitize(dto.getFullName()));
        }
        if (dto.getPhoneNumber() != null) {
            user.setPhoneNumber(InputSanitizer.sanitize(dto.getPhoneNumber()));
        }
        if (dto.getDateOfBirth() != null) {
            user.setDateOfBirth(dto.getDateOfBirth());
        }
        userRepository.save(user);

        // --- Upsert UserProfile ---
        UserProfile profile = userProfileRepository.findByUser(user)
                .orElseGet(() -> {
                    UserProfile newProfile = new UserProfile();
                    newProfile.setUser(user);
                    return newProfile;
                });

        applyPartialUpdates(profile, dto);
        profile.setProfileCompleted(calculateCompletion(user, profile));
        userProfileRepository.save(profile);

        // Audit log (metadata only, no sensitive values)
        auditService.logAction(username, "USER_PROFILE_UPDATED", user.getId(),
                "Profile updated by user");

        logger.info("Profile updated for user: {}", username);

        return mapToDTO(user, profile);
    }

    // --- Private Helpers ---

    private void applyPartialUpdates(UserProfile profile, UserProfileDTO dto) {
        if (dto.getGender() != null) {
            profile.setGender(dto.getGender());
        }
        if (dto.getBloodGroup() != null) {
            profile.setBloodGroup(InputSanitizer.sanitize(dto.getBloodGroup()));
        }
        if (dto.getAllergies() != null) {
            profile.setAllergies(InputSanitizer.sanitize(dto.getAllergies()));
        }
        if (dto.getChronicDiseases() != null) {
            profile.setChronicDiseases(InputSanitizer.sanitize(dto.getChronicDiseases()));
        }
        if (dto.getCurrentMedications() != null) {
            profile.setCurrentMedications(InputSanitizer.sanitize(dto.getCurrentMedications()));
        }
        if (dto.getEmergencyContactName() != null) {
            profile.setEmergencyContactName(InputSanitizer.sanitize(dto.getEmergencyContactName()));
        }
        if (dto.getEmergencyContactPhone() != null) {
            profile.setEmergencyContactPhone(InputSanitizer.sanitize(dto.getEmergencyContactPhone()));
        }
    }

    private boolean calculateCompletion(User user, UserProfile profile) {
        int filled = 0;
        int total = 10;

        if (hasValue(user.getFullName())) filled++;
        if (hasValue(user.getPhoneNumber())) filled++;
        if (user.getDateOfBirth() != null) filled++;
        if (profile.getGender() != null) filled++;
        if (hasValue(profile.getBloodGroup())) filled++;
        if (hasValue(profile.getAllergies())) filled++;
        if (hasValue(profile.getChronicDiseases())) filled++;
        if (hasValue(profile.getCurrentMedications())) filled++;
        if (hasValue(profile.getEmergencyContactName())) filled++;
        if (hasValue(profile.getEmergencyContactPhone())) filled++;

        return filled == total;
    }

    private boolean hasValue(String s) {
        return s != null && !s.isBlank();
    }

    /**
     * Maps User + UserProfile entities into a safe DTO.
     * Profile can be null (new user with no medical data yet).
     */
    private UserProfileDTO mapToDTO(User user, UserProfile profile) {
        UserProfileDTO dto = new UserProfileDTO();

        // User-level fields
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setUsername(user.getUsername());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setDateOfBirth(user.getDateOfBirth());

        // Medical fields (null-safe)
        if (profile != null) {
            dto.setGender(profile.getGender());
            dto.setBloodGroup(profile.getBloodGroup());
            dto.setAllergies(profile.getAllergies());
            dto.setChronicDiseases(profile.getChronicDiseases());
            dto.setCurrentMedications(profile.getCurrentMedications());
            dto.setEmergencyContactName(profile.getEmergencyContactName());
            dto.setEmergencyContactPhone(profile.getEmergencyContactPhone());
            dto.setProfileCompleted(profile.getProfileCompleted());
        } else {
            dto.setProfileCompleted(false);
        }

        return dto;
    }

    /**
     * Deterministic sampling for profile view logging.
     * Logs approximately 1 in 10 views to prevent audit log explosion.
     */
    private void logProfileView(User user) {
        long hash = Math.abs((user.getId() + System.currentTimeMillis() / 60000) % 10);
        if (hash == 0) {
            auditService.logAction(user.getUsername(), "USER_PROFILE_VIEWED", user.getId(),
                    "Profile viewed (sampled)");
        }
    }
}
