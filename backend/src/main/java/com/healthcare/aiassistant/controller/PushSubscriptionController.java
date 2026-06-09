package com.healthcare.aiassistant.controller;

import com.healthcare.aiassistant.model.PushSubscription;
import com.healthcare.aiassistant.payload.request.PushSubscriptionRequest;
import com.healthcare.aiassistant.payload.response.MessageResponse;
import com.healthcare.aiassistant.repository.PushSubscriptionRepository;
import com.healthcare.aiassistant.repository.UserRepository;
import com.healthcare.aiassistant.security.config.PushProperties;
import com.healthcare.aiassistant.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/push")
@PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR') or hasRole('ADMIN')")
public class PushSubscriptionController {

    @Autowired
    private PushSubscriptionRepository subscriptionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PushProperties pushProperties;

    /** The VAPID public key the browser needs to subscribe. Empty string if push is disabled. */
    @GetMapping("/public-key")
    public ResponseEntity<?> publicKey() {
        return ResponseEntity.ok(Map.of(
                "publicKey", pushProperties.getVapid().getPublicKey(),
                "enabled", pushProperties.isConfigured()));
    }

    @PostMapping("/subscribe")
    @Transactional
    public ResponseEntity<?> subscribe(@AuthenticationPrincipal UserDetailsImpl user,
                                       @RequestBody PushSubscriptionRequest req) {
        if (user == null) return unauthorized();
        if (req.getEndpoint() == null || req.getKeys() == null
                || req.getKeys().getP256dh() == null || req.getKeys().getAuth() == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid subscription"));
        }
        // Upsert by endpoint, (re)bind it to the current user.
        PushSubscription sub = subscriptionRepository.findByEndpoint(req.getEndpoint())
                .orElseGet(PushSubscription::new);
        sub.setUser(userRepository.getReferenceById(user.getId()));
        sub.setEndpoint(req.getEndpoint());
        sub.setP256dh(req.getKeys().getP256dh());
        sub.setAuth(req.getKeys().getAuth());
        subscriptionRepository.save(sub);
        return ResponseEntity.ok(new MessageResponse("Subscribed"));
    }

    @DeleteMapping("/unsubscribe")
    @Transactional
    public ResponseEntity<?> unsubscribe(@AuthenticationPrincipal UserDetailsImpl user,
                                         @RequestBody PushSubscriptionRequest req) {
        if (user == null) return unauthorized();
        if (req.getEndpoint() != null) {
            subscriptionRepository.findByEndpoint(req.getEndpoint())
                    .ifPresent(subscriptionRepository::delete);
        }
        return ResponseEntity.ok(new MessageResponse("Unsubscribed"));
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
    }
}
