package com.healthcare.aiassistant.payload.dto;

import java.time.LocalDateTime;
import java.util.List;

public class PrescriptionDTO {
    private String generalInstructions;
    private LocalDateTime issuedAt;
    private List<PrescriptionItemDTO> items;

    public PrescriptionDTO() {}

    public PrescriptionDTO(String generalInstructions, LocalDateTime issuedAt, List<PrescriptionItemDTO> items) {
        this.generalInstructions = generalInstructions;
        this.issuedAt = issuedAt;
        this.items = items;
    }

    public String getGeneralInstructions() { return generalInstructions; }
    public void setGeneralInstructions(String generalInstructions) { this.generalInstructions = generalInstructions; }
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }
    public List<PrescriptionItemDTO> getItems() { return items; }
    public void setItems(List<PrescriptionItemDTO> items) { this.items = items; }
}
