# HealthCare AI Assistant — Complete Technical Presentation

---

## 1. Project Overview

### What is it?
The **HealthCare AI Assistant** is a full-stack clinical platform that connects patients with verified doctors through AI-powered consultations, appointment booking, and real-time chat — all under a unified, role-based dashboard.

### What problem does it solve?
In traditional healthcare, patients face long waiting queues, lack of quick medical advice, and fragmented communication with doctors. This system provides:
- **Instant AI-powered medical guidance** (via Groq LLM)
- **Seamless appointment booking** with conflict-free slot management
- **Real-time consultation chat** between patient and doctor (WebSocket-based)
- **Admin oversight** with doctor identity verification and audit logging

### Real-World Relevance
Post-COVID, telemedicine platforms saw 38x growth. This system mirrors production-grade platforms like Practo, Zocdoc, and Amwell — but built from scratch with modern security practices, state machine verification, and AI integration.

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────┐     HTTPS / WSS      ┌─────────────────────────┐
│    Next.js 14        │◄────────────────────►│   Spring Boot 3.5       │
│    (React Frontend)  │   JWT in HttpOnly    │   (REST + WebSocket)    │
│                      │   Cookie             │                         │
│  - Patient Dashboard │                      │  - AuthController       │
│  - Doctor Dashboard  │                      │  - AppointmentService   │
│  - Admin Console     │                      │  - ConsultationChat     │
│  - AI Chat           │                      │  - VerificationService  │
│  - Booking Calendar  │                      │  - AiHybridService      │
└─────────────────────┘                       └────────┬────────────────┘
                                                       │
                                              ┌────────▼────────────────┐
                                              │   PostgreSQL (Neon)     │
                                              │   Flyway Migrations     │
                                              │   10 versioned schemas  │
                                              └────────┬────────────────┘
                                                       │
                                              ┌────────▼────────────────┐
                                              │   Groq LLM API          │
                                              │   (llama-3.3-70b)       │
                                              │   AI Chat + Suggestions │
                                              └─────────────────────────┘
```

### Request Flow Example: Patient Journey

```
Login → JWT issued → Cookie set → /dashboard loads
  → Patient clicks "Book Appointment"
    → GET /doctors/all (verified only)
    → GET /appointments/slots?doctorId=5&date=2026-04-28
    → POST /appointments/book { doctorId, date, symptoms }
    → DB constraint prevents double-booking
    → Appointment created with status=PENDING
  → Doctor logs in → sees PENDING in dashboard
    → Confirms → status=CONFIRMED
  → Real-time chat opens via WebSocket (/ws-chat STOMP)
    → Messages persisted to DB before broadcast
    → AI assistant can be triggered in-chat
```

---

## 3. Core Features — Detailed Breakdown

### 3.1 Authentication (JWT + HttpOnly Cookies)

**What it does:** Handles user login, registration, and session management using JSON Web Tokens.

**Why it matters:** Healthcare data is sensitive (HIPAA-relevant). Storing JWT in HttpOnly cookies prevents XSS attacks from stealing tokens — unlike localStorage.

**How it's implemented:**
- **JwtUtils.java** generates tokens using HMAC-SHA256 with a Base64-encoded secret
- Token contains: `subject` (username), `issuedAt`, `expiration` (24h TTL)
- **AuthTokenFilter** intercepts every request, extracts JWT from cookies, validates signature, and sets `SecurityContext`
- Login response sets the JWT via `Set-Cookie: jwt=<token>; HttpOnly; Secure; SameSite=None; Path=/`
- `/api/auth/me` endpoint validates the session and returns user details + roles + verification status
- BCrypt (cost factor 10) is used for all password hashing

**Key code:** `JwtUtils.java` → `generateJwtToken()`, `validateJwtToken()`, `getUserNameFromJwtToken()`

---

### 3.2 Role-Based Access Control (RBAC)

**What it does:** Restricts API endpoints and UI routes based on user role (PATIENT, DOCTOR, ADMIN).

**Why it matters:** A patient should never access admin functions. A doctor should not see another doctor's appointments.

**How it's implemented:**
- Three roles stored in `roles` table: `ROLE_PATIENT`, `ROLE_DOCTOR`, `ROLE_ADMIN`
- **Backend enforcement** via Spring Security's `@PreAuthorize`:
  - `/api/admin/**` → `hasRole('ADMIN')`
  - `/api/doctor/**` → `hasRole('DOCTOR')`
  - All other authenticated routes → `authenticated()`
- **Frontend enforcement** via `AuthContext`:
  - Sidebar dynamically filters menu items based on `user.roles[0]`
  - Admin users at `/dashboard` are auto-redirected to `/admin`
  - Doctor-specific routes check `ROLE_DOCTOR` before rendering
- **Ownership guards** in service layer: e.g., a patient can only cancel their own appointments

---

### 3.3 Doctor Verification System

**What it does:** New doctors must upload identity documents (license, certificates). An admin reviews and approves/rejects them before they can practice on the platform.

**Why it matters:** In real healthcare, unverified practitioners are a legal and safety risk. This implements a trust layer.

**How it's implemented:**
- **State Machine** (`VerificationStateMachine.java`):
  ```
  NOT_SUBMITTED → PENDING → APPROVED
                          → REJECTED → PENDING (re-submission allowed)
  ```
- **File upload** with 4-layer validation in `DoctorVerificationService`:
  1. Size check (max 5MB)
  2. MIME type whitelist (PDF, JPG, PNG)
  3. Extension whitelist (defense-in-depth)
  4. Stream corruption check
- Files stored at: `uploads/doctor-verifications/{doctorId}/verification_{timestamp}_{uuid}.{ext}`
- **Path traversal protection**: File paths are normalized and verified to stay within `BASE_UPLOAD_DIR`
- **Admin preview** uses authenticated blob-fetch (Axios + `responseType: 'blob'`), not `window.open()`, to avoid CORS/cookie issues
- **Guard method** `ensureDoctorVerified()` blocks unverified doctors from dashboard, appointments, and chat
- **Audit logging**: Every approve/reject action is logged with admin username, timestamp, and before/after status

---

### 3.4 Appointment Booking

**What it does:** Patients browse verified doctors, view available 30-minute slots, and book appointments with conflict prevention.

**Why it matters:** Double-booking is a critical failure in healthcare scheduling. This system prevents it at the database level.

**How it's implemented:**
- **Slot normalization**: All times are floored to nearest 30-min boundary (`10:17 → 10:00`, `10:31 → 10:30`)
- **Working hours enforcement**: 09:00 – 17:00 only
- **Future cap**: Maximum 3 months ahead
- **DB-level conflict prevention**: Unique constraint on `(doctor_id, appointment_date)` — if two patients try to book the same slot simultaneously, `DataIntegrityViolationException` is caught and converted to `SlotAlreadyBookedException`
- **Status lifecycle**: `PENDING → CONFIRMED → COMPLETED` or `PENDING → CANCELLED`
- **Cancellation** includes `cancelReason` and `cancelledBy` (PATIENT or DOCTOR) for audit trail
- **AvailabilityService** computes open slots by subtracting booked appointments from the doctor's weekly schedule + exceptions

---

### 3.5 Real-Time Chat (WebSocket / STOMP)

**What it does:** Once an appointment is confirmed, patient and doctor can chat in real-time. An AI assistant can be triggered mid-conversation for medical suggestions.

**Why it matters:** Real-time communication is essential for telehealth. The AI co-pilot assists patients while waiting for doctor responses.

**How it's implemented:**
- **Protocol**: STOMP over WebSocket via SockJS fallback
- **Endpoint**: `/ws-chat` → client connects using SockJS + StompJS
- **Authentication**: `StompAuthInterceptor` extracts JWT from STOMP CONNECT headers and sets the security principal
- **Message flow**:
  1. Client sends to `/app/chat/{appointmentId}`
  2. Server validates authorization (is this user part of this appointment?)
  3. Message is **persisted to DB first** (strict persistence constraint)
  4. Sequence number assigned (`getMaxSequenceNumber + 1`) for ordering
  5. Then broadcast to `/topic/appointment/{appointmentId}`
- **AI Integration**: If patient sends with `aiMode=MANUAL`, `AiHybridService` is triggered:
  - Runs `@Async` on a dedicated thread pool (`aiExecutor`)
  - Rate-limited per user
  - Idempotency-checked to prevent duplicate AI responses
  - Calls Groq LLM API with conversation context
  - AI response saved as `SenderType.AI_ASSISTANT` and broadcast to the same topic
- **Message history**: REST endpoint `GET /api/consultation/{appointmentId}/messages` with pagination

---

### 3.6 Admin Dashboard

**What it does:** Provides a command center for platform administrators to manage users, verify doctors, view audit logs, and monitor system health.

**Why it matters:** Centralized administration is critical for platform governance and compliance.

**How it's implemented:**
- **Command Center**: Shows aggregate stats (total users, doctors, appointments, AI queries)
- **User Management**: List all users with role badges, search/filter capabilities
- **Doctor Verification Queue**: Filter by status (PENDING/APPROVED/REJECTED), view uploaded documents, approve/reject with one click
- **Audit Logs**: Every admin action (verification decisions, status changes) is logged with timestamps
- **Layout**: Separate `/admin` layout with dark sidebar, role-gated via `useEffect` redirect
- **Security**: All `/api/admin/**` endpoints require `ROLE_ADMIN`; frontend layout checks `isAdmin` before rendering

---

## 4. Database Design

### Entity-Relationship Diagram

```
┌─────────┐     1:1     ┌──────────┐     1:N     ┌───────────────┐
│  users  │────────────►│ doctors  │────────────►│ appointments  │
│         │             │          │             │               │
│ id (PK) │             │ id (PK)  │             │ id (PK)       │
│ username│             │ user_id  │◄────FK──────│ doctor_id     │
│ password│             │ special. │             │ patient_id ───┤──► users.id
│ email   │             │ license  │             │ appt_date     │
│ role_id │──FK──►roles │ verif_   │             │ status        │
│ full_   │             │   status │             │ symptoms      │
│   name  │             └──────────┘             └───────┬───────┘
└────┬────┘                                              │ 1:N
     │ 1:N                                      ┌────────▼────────┐
     │                                          │ consultation_   │
     ├──────────────────────────────────────────►│   messages      │
     │                                          │ appointment_id  │
     │ 1:N       ┌────────────────────┐         │ sender_id       │
     └──────────►│ doctor_             │         │ sender_type     │
                 │   verifications     │         │ content         │
                 │ doctor_id → users   │         │ sequence_number │
                 │ license_number      │         └─────────────────┘
                 │ status (PENDING/    │
                 │   APPROVED/REJECTED)│
                 │ document_path       │
                 └────────────────────┘

Other tables: roles, chat_messages (AI chat), health_metrics,
              audit_logs, system_settings, doctor_availability,
              doctor_availability_exceptions
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Unique constraint on `(doctor_id, appointment_date)` | Prevents double-booking at DB level — race-condition proof |
| `sequence_number` on consultation messages | Guarantees message ordering even with async WebSocket delivery |
| `verification_status` on both `doctors` and `doctor_verifications` | Denormalized for fast guard checks; single source of truth is `doctor_verifications` |
| Flyway versioned migrations (V1–V10) | Safe, repeatable schema evolution; works with CI/CD pipelines |
| `SenderType` enum (PATIENT, DOCTOR, AI_ASSISTANT) | Distinguishes human vs AI messages in consultation chat |

---

## 5. Technical Deep Dive

### 5.1 JWT Authentication Flow

```
Client                          Server
  │                                │
  │  POST /api/auth/signin        │
  │  { username, password }        │
  │───────────────────────────────►│
  │                                │  1. Load UserDetails from DB
  │                                │  2. BCrypt.matches(password, hash)
  │                                │  3. Generate JWT (HS256, 24h expiry)
  │                                │  4. Set-Cookie: jwt=<token>; HttpOnly
  │  200 OK + Set-Cookie           │
  │◄───────────────────────────────│
  │                                │
  │  GET /api/auth/me              │
  │  Cookie: jwt=<token>           │
  │───────────────────────────────►│
  │                                │  1. AuthTokenFilter extracts cookie
  │                                │  2. Jwts.parserBuilder().validate()
  │                                │  3. Load user, set SecurityContext
  │  200 { user, roles, status }   │
  │◄───────────────────────────────│
```

### 5.2 WebSocket Chat — Connection Lifecycle

```
1. Client connects: new SockJS('/ws-chat')
2. STOMP CONNECT frame sent with JWT in headers
3. StompAuthInterceptor validates JWT → sets Principal
4. Client subscribes to /topic/appointment/{id}
5. Client sends message to /app/chat/{id}
6. Server:
   a. Validates user owns this appointment
   b. Saves message to DB (sequence_number assigned)
   c. Broadcasts to /topic/appointment/{id}
7. If AI mode enabled:
   a. @Async thread picks up request
   b. Calls Groq API with conversation context
   c. Saves AI response to DB
   d. Broadcasts AI message to same topic
```

### 5.3 File Upload Security — 4-Layer Defense

| Layer | Check | Why |
|-------|-------|-----|
| 1. Size | `document.getSize() > 5MB` | Prevent disk exhaustion |
| 2. MIME Type | Whitelist: `application/pdf, image/jpeg, image/png` | Block executable uploads |
| 3. Extension | Whitelist: `.pdf, .jpg, .jpeg, .png` | Defense-in-depth (MIME can be spoofed) |
| 4. Stream | `document.getInputStream() != null` | Detect corrupted files |

Files stored with sanitized names: `verification_{timestamp}_{uuid}.{ext}` — no user-supplied characters in filenames. Path traversal blocked by normalizing and verifying paths stay within `BASE_UPLOAD_DIR`.

### 5.4 Flyway Migrations — Production Evolution

| Version | Purpose |
|---------|---------|
| V1 | Initial schema: users, doctors, appointments, roles, audit_logs |
| V2 | User profile fields (avatar, phone, DOB) |
| V3 | Appointment hardening (unique constraints, cancel fields) |
| V4 | Doctor dashboard enhancements |
| V5 | Doctor availability + weekly schedule system |
| V6 | Consultation messages for real-time chat |
| V7 | Demo seed data (pre-populated doctors, patients, appointments) |
| V8 | Doctor profile fields (license, verification_status) |
| V9 | Fix demo passwords (BCrypt re-hash) |
| V10 | Verification document path column |

Each migration is idempotent and versioned. Flyway tracks applied versions in `flyway_schema_history` table — prevents re-running or skipping migrations in production.

---

## 6. Challenges & Solutions

### Challenge 1: Onboarding Race Condition
**Problem:** If profile creation succeeds but file upload fails, the doctor gets stuck — `profileComplete=true` but no verification record exists. They can't go back to onboarding.
**Solution:** Made onboarding state-aware: if `profileComplete=true` but `verificationStatus=null`, show file upload only (not full form). Added a dashboard recovery banner that redirects back to onboarding.

### Challenge 2: Hibernate LazyInitializationException
**Problem:** Dashboard crashed because `appointment.getPatient().getFullName()` triggered lazy-loading of the User entity outside the Hibernate session (since `spring.jpa.open-in-view=false`).
**Solution:** Added `@Transactional(readOnly = true)` to the dashboard endpoint to keep the session open. Also added `findByUser_Id(Long)` to DoctorRepository to avoid proxy-based lookups in AuthController.

### Challenge 3: Speech Recognition Word Duplication
**Problem:** The browser's SpeechRecognition API auto-restarts for continuous listening, but `onresult` fires with cumulative transcripts — causing words to duplicate in the input field.
**Solution:** Tracked `committedTextRef` (finalized text) and used a replacement strategy: `preListenInput + committed + interim` instead of appending. Each restart resets only the interim buffer.

### Challenge 4: Cross-Origin Document Preview (Vercel ↔ Render)
**Problem:** Admin clicking "View Document" used `window.open()` which opens a new browser request. JWT cookies weren't sent due to `SameSite` restrictions across different domains.
**Solution:** Replaced with authenticated Axios blob-fetch (`responseType: 'blob'`), created a local `URL.createObjectURL()`, and opened that. Cleanup via `URL.revokeObjectURL()` after 5 seconds.

### Challenge 5: Appointment Data Shape Mismatch
**Problem:** Patient endpoint returns a plain array, but doctor endpoint returns a Spring `Page` object `{ content: [...], totalPages: ... }`. Frontend called `.forEach()` on the Page object → `TypeError`.
**Solution:** Added `Array.isArray()` check: if not an array, extract `raw.content`. Defensive parsing on all API responses.

---

## 7. Security Considerations

| Area | Implementation |
|------|----------------|
| **Password Storage** | BCrypt with cost factor 10 — never stored in plaintext |
| **Token Security** | JWT in HttpOnly + Secure + SameSite=None cookies — immune to XSS |
| **Session Management** | Stateless (no server-side sessions); `SessionCreationPolicy.STATELESS` |
| **API Protection** | Spring Security filter chain with path-based and annotation-based auth |
| **RBAC Enforcement** | `@PreAuthorize` on every controller method; frontend route guards |
| **File Upload** | 4-layer validation (size, MIME, extension, stream); sanitized filenames |
| **Path Traversal** | Normalized paths verified against `BASE_UPLOAD_DIR` |
| **Security Headers** | HSTS (1 year), X-Frame-Options DENY, X-Content-Type-Options, X-XSS-Protection |
| **Ownership Guards** | Service-layer checks: patients can only cancel their own appointments |
| **Audit Trail** | All admin actions logged with timestamp, actor, and target |
| **Rate Limiting** | AI API calls rate-limited per user to prevent abuse |

---

## 8. Scalability & Production Readiness

### Current State
- Deployed on **Vercel** (frontend) + **Render** (backend) + **Neon** (managed PostgreSQL)
- Stateless backend — horizontally scalable behind a load balancer
- Flyway ensures database consistency across deployments

### Improvements for Scale

| Improvement | Benefit |
|-------------|---------|
| **Redis** for session/cache | Token blacklisting, rate limiting, caching doctor availability |
| **AWS S3** for file storage | Replace ephemeral `/uploads` with persistent cloud storage |
| **RabbitMQ / Kafka** for WebSocket | Replace SimpleBroker for multi-instance chat |
| **CDN** (CloudFront) | Serve frontend assets globally with edge caching |
| **Load Balancer** | Distribute traffic across multiple Spring Boot instances |
| **Prometheus + Grafana** | Real-time monitoring of API latency, error rates |
| **ClamAV** | Virus scanning on uploaded documents before storage |
| **Docker + Kubernetes** | Containerized deployment with auto-scaling |

---

## 9. Demo Walkthrough Script

> *Use this as your spoken script during the demo. Each step should take ~30 seconds.*

---

**Step 1 — Patient Registration & Login**
> "Let me start by showing the patient experience. I'll register a new patient account — notice the form validation and password strength requirements. After registration, I'm redirected to the login page. I enter my credentials, and the system authenticates via JWT. The token is stored in an HttpOnly cookie — you won't find it in localStorage, which protects against XSS attacks."

**Step 2 — Patient Dashboard**
> "This is the patient dashboard. You can see health metric cards, quick actions for AI Chat and Book Appointment, and a reminders section. The interface dynamically adapts based on the user's role — a doctor logging in would see a completely different dashboard."

**Step 3 — AI Chat**
> "Let me open the AI Chat. I'll type a symptom — say, 'I have a persistent headache and dizziness.' The system sends this to our AI backend which uses the Groq LLM API with the Llama 3.3 70B model. Notice the medical disclaimer that auto-fades after 15 seconds. The AI provides structured advice with a clear note that this is not a substitute for professional medical consultation."

**Step 4 — Booking an Appointment**
> "Now I'll book an appointment with a verified doctor. I select Dr. Sharma — notice only verified doctors appear in this list. I pick a date from the calendar, and the system shows me available 30-minute slots. These slots are computed by subtracting existing bookings from the doctor's weekly schedule. I select 10:30 AM and describe my symptoms. The appointment is booked with a PENDING status."

**Step 5 — Switch to Doctor Account**
> "Let me log out and switch to the doctor's account. Notice the sidebar changes — I now see Dashboard, Appointments, and Profile. The doctor dashboard shows Today's Appointments, Pending Requests, and a 'Next Up' card with patient details. I'll confirm the pending appointment — the status changes from PENDING to CONFIRMED."

**Step 6 — Real-Time Chat**
> "Now let me demonstrate the real-time consultation chat. I'll open two browser windows — one as the patient, one as the doctor. Both connect via WebSocket. When I type as the patient, the message appears instantly on the doctor's screen. Messages are persisted to the database before broadcasting — so even if someone disconnects, the history is preserved."

**Step 7 — Switch to Admin**
> "Finally, let me show the admin console. The admin sees a Command Center with platform-wide statistics. In the Doctor Verification queue, I can see pending requests with uploaded documents. I click View Details — the document is fetched securely via an authenticated blob request. I can approve or reject the doctor — this triggers a state machine transition and is logged in the audit trail."

**Step 8 — Verification Guard Demo**
> "Here's something important — if I log in as an unverified doctor, the dashboard shows a 'Verification In Progress' screen instead of crashing. The doctor is gracefully blocked from accessing appointments or chat until an admin approves their credentials. This is a critical safety feature for healthcare platforms."

---

## 10. Conclusion

### System Strengths
- **Production-grade security**: JWT + HttpOnly cookies, BCrypt, RBAC, 4-layer file validation, path traversal protection
- **Real-time capable**: STOMP WebSocket chat with persistence-first guarantee
- **AI-integrated**: Groq LLM for intelligent medical suggestions with rate limiting and idempotency
- **State machine verification**: Formal state transitions prevent invalid doctor status changes
- **Conflict-proof booking**: DB-level unique constraints prevent race conditions in appointment scheduling
- **10 versioned migrations**: Professional database evolution with Flyway
- **Defensive coding**: Null-safe DTO mapping, graceful error handling, structured audit logging

### Industry Relevance
This system demonstrates the core architecture of platforms like **Practo**, **Zocdoc**, and **Teladoc**. It addresses real healthcare IT challenges: identity verification, HIPAA-adjacent security, real-time communication, and AI-assisted diagnostics. The technology stack (Next.js + Spring Boot + PostgreSQL + WebSocket) is the same stack used by enterprise healthcare companies in production today.

---

*Built with Next.js 14, Spring Boot 3.5, PostgreSQL (Neon), WebSocket (STOMP/SockJS), Groq LLM API, and Flyway. Deployed on Vercel + Render.*
