package com.healthcare.aiassistant.security.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Web Push (VAPID) configuration, bound from {@code app.push.*}.
 * If the VAPID keys are blank, push is treated as disabled.
 */
@Configuration
@ConfigurationProperties(prefix = "app.push")
public class PushProperties {

    private final Vapid vapid = new Vapid();
    /** Shared secret required by the cron-triggered /dispatch endpoint. */
    private String dispatchSecret = "";
    /** Quiet-hours window (HH:mm, server local time). Blank disables quiet hours. */
    private String quietStart = "";
    private String quietEnd = "";

    public boolean isConfigured() {
        return vapid.publicKey != null && !vapid.publicKey.isBlank()
                && vapid.privateKey != null && !vapid.privateKey.isBlank();
    }

    public Vapid getVapid() { return vapid; }

    public String getDispatchSecret() { return dispatchSecret; }
    public void setDispatchSecret(String dispatchSecret) { this.dispatchSecret = dispatchSecret; }

    public String getQuietStart() { return quietStart; }
    public void setQuietStart(String quietStart) { this.quietStart = quietStart; }

    public String getQuietEnd() { return quietEnd; }
    public void setQuietEnd(String quietEnd) { this.quietEnd = quietEnd; }

    public static class Vapid {
        private String publicKey = "";
        private String privateKey = "";
        private String subject = "mailto:noreply@healthcare-chatbot.app";

        public String getPublicKey() { return publicKey; }
        public void setPublicKey(String publicKey) { this.publicKey = publicKey; }

        public String getPrivateKey() { return privateKey; }
        public void setPrivateKey(String privateKey) { this.privateKey = privateKey; }

        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
    }
}
