package com.healthcare.aiassistant.payload.openai;

import java.util.List;

public class OpenAiResponse {
    private List<Choice> choices;

    public static class Choice {
        private OpenAiMessage message;

        public OpenAiMessage getMessage() {
            return message;
        }

        public void setMessage(OpenAiMessage message) {
            this.message = message;
        }
    }

    public List<Choice> getChoices() {
        return choices;
    }

    public void setChoices(List<Choice> choices) {
        this.choices = choices;
    }
}
