package com.healthcare.aiassistant.payload.dto;

/**
 * Aggregation DTO for the Doctor Profile page.
 * All fields come from existing User + Doctor entities.
 * totalAppointments and completedAppointments are derived at runtime via repository count queries.
 */
public class DoctorProfileDTO {
    private String fullName;
    private String username;
    private String email;
    private String specialization;
    private Integer experienceYears;
    private String licenseNumber;
    private String verificationStatus;
    private String bio;
    private Boolean isAvailable;
    private Long totalAppointments;       // Derived: countByDoctor()
    private Long completedAppointments;   // Derived: countByDoctorAndStatus(COMPLETED)

    public DoctorProfileDTO() {}

    // --- Getters & Setters ---

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public Integer getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public Boolean getIsAvailable() { return isAvailable; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }

    public Long getTotalAppointments() { return totalAppointments; }
    public void setTotalAppointments(Long totalAppointments) { this.totalAppointments = totalAppointments; }

    public Long getCompletedAppointments() { return completedAppointments; }
    public void setCompletedAppointments(Long completedAppointments) { this.completedAppointments = completedAppointments; }
}
