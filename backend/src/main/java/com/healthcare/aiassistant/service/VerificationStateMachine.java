package com.healthcare.aiassistant.service;

import com.healthcare.aiassistant.model.ERequestStatus;
import org.springframework.stereotype.Component;

/**
 * Centralized state machine governing all doctor verification transitions.
 * Prevents invalid state changes (e.g., approving twice, reverting approved → pending).
 *
 * Allowed transitions:
 *   null (NOT_SUBMITTED) → PENDING
 *   PENDING              → APPROVED, REJECTED
 *   REJECTED             → PENDING
 *   APPROVED             → (terminal — no transitions)
 */
@Component
public class VerificationStateMachine {

    /**
     * Checks whether a transition from oldStatus to newStatus is valid.
     *
     * @param oldStatus the current status (null means NOT_SUBMITTED)
     * @param newStatus the desired new status
     * @return true if the transition is allowed
     */
    public boolean isValidTransition(ERequestStatus oldStatus, ERequestStatus newStatus) {
        if (newStatus == null) {
            return false;
        }

        // null = NOT_SUBMITTED → only PENDING is allowed
        if (oldStatus == null) {
            return newStatus == ERequestStatus.PENDING;
        }

        switch (oldStatus) {
            case PENDING:
                return newStatus == ERequestStatus.APPROVED || newStatus == ERequestStatus.REJECTED;
            case REJECTED:
                return newStatus == ERequestStatus.PENDING;
            case APPROVED:
                return false; // Terminal state — no transitions allowed
            default:
                return false;
        }
    }

    /**
     * Returns a human-readable label for a nullable status.
     * Treats null as "NOT_SUBMITTED".
     */
    public String getStatusLabel(ERequestStatus status) {
        return status != null ? status.name() : "NOT_SUBMITTED";
    }
}
