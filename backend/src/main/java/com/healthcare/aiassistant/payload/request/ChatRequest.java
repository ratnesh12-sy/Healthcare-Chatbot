package com.healthcare.aiassistant.payload.request;

public class ChatRequest {
    private String message;
    private Boolean isFromAi = false;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Boolean getIsFromAi() {
        return isFromAi;
    }

    public void setIsFromAi(Boolean isFromAi) {
        this.isFromAi = isFromAi;
    }
}
