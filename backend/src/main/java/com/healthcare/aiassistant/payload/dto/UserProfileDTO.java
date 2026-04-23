package com.healthcare.aiassistant.payload.dto;

import com.healthcare.aiassistant.model.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public class UserProfileDTO {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phoneNumber;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private Gender gender;
    private String bloodGroup;
    private String allergies;
    private String chronicDiseases;
    private String currentMedications;
    private String emergencyContactName;
    private String emergencyContactPhone;

    // Read-only fields (populated by backend, ignored on input)
    private String email;
    private String username;
    private Boolean profileCompleted;

    public UserProfileDTO() {}

    // --- Getters and Setters ---

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public Gender getGender() { return gender; }
    public void setGender(Gender gender) { this.gender = gender; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }

    public String getChronicDiseases() { return chronicDiseases; }
    public void setChronicDiseases(String chronicDiseases) { this.chronicDiseases = chronicDiseases; }

    public String getCurrentMedications() { return currentMedications; }
    public void setCurrentMedications(String currentMedications) { this.currentMedications = currentMedications; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Boolean getProfileCompleted() { return profileCompleted; }
    public void setProfileCompleted(Boolean profileCompleted) { this.profileCompleted = profileCompleted; }
}
