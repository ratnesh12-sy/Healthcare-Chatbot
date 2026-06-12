package com.healthcare.aiassistant.service;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link EmailService}. Calling send() directly on a plain instance runs
 * synchronously (no Spring @Async proxy), so we can assert on the outcome.
 */
class EmailServiceTest {

    @Test
    void send_whenConfigured_buildsAndSendsMessage() {
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailService svc = new EmailService();
        ReflectionTestUtils.setField(svc, "mailSender", sender);
        ReflectionTestUtils.setField(svc, "from", "from@test.com");

        svc.send("patient@test.com", "Welcome", "Hello there");

        assertTrue(svc.isConfigured());
        ArgumentCaptor<SimpleMailMessage> cap = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(cap.capture());
        SimpleMailMessage m = cap.getValue();
        assertEquals("patient@test.com", m.getTo()[0]);
        assertEquals("Welcome", m.getSubject());
        assertEquals("Hello there", m.getText());
        assertEquals("from@test.com", m.getFrom());
    }

    @Test
    void send_whenNotConfigured_noOps() {
        EmailService svc = new EmailService(); // mailSender stays null (SMTP not configured)
        assertFalse(svc.isConfigured());
        assertDoesNotThrow(() -> svc.send("to@test.com", "S", "B"));
    }

    @Test
    void send_swallowsSenderFailure() {
        JavaMailSender sender = mock(JavaMailSender.class);
        doThrow(new MailSendException("smtp down")).when(sender).send(any(SimpleMailMessage.class));
        EmailService svc = new EmailService();
        ReflectionTestUtils.setField(svc, "mailSender", sender);
        ReflectionTestUtils.setField(svc, "from", "from@test.com");

        // A mail failure must never propagate into the triggering action (booking, signup, ...).
        assertDoesNotThrow(() -> svc.send("to@test.com", "S", "B"));
    }

    @Test
    void send_blankRecipient_doesNotSend() {
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailService svc = new EmailService();
        ReflectionTestUtils.setField(svc, "mailSender", sender);
        svc.send("  ", "S", "B");
        verifyNoInteractions(sender);
    }
}
