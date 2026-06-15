package com.healthcare.aiassistant.payload.openai;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

public class OpenAiRequest {
    private String model;
    private List<OpenAiMessage> messages;

    // Only serialized when explicitly set to true (streaming requests). Left null
    // for the normal blocking path so that request body is byte-for-byte unchanged.
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean stream;

    public OpenAiRequest() {
    }

    public OpenAiRequest(String model, List<OpenAiMessage> messages) {
        this.model = model;
        this.messages = messages;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public List<OpenAiMessage> getMessages() {
        return messages;
    }

    public void setMessages(List<OpenAiMessage> messages) {
        this.messages = messages;
    }

    public Boolean getStream() {
        return stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }
}
