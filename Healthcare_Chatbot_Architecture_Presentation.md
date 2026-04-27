---
title: "Healthcare Chatbot System - Technical Architecture & Presentation"
author: "Lead Software Architect"
date: "2026-04-27"
---

# Healthcare Chatbot System
## Comprehensive Technical Architecture & Demo Guide

---

### 1. 🔹 Project Overview

**What the system is:**
The Healthcare Chatbot System is a full-stack, real-time clinical platform designed to bridge the gap between patients and medical professionals. It serves as a unified digital clinic where patients can securely book appointments, and doctors can manage their schedules and conduct real-time messaging consultations.

**What problem it solves:**
Traditional healthcare scheduling and remote consultation platforms are often disjointed, leading to missed appointments, poor communication, and administrative bottlenecks. Our system consolidates these workflows, allowing for asynchronous triage and synchronous real-time chat, reducing waiting room times and optimizing doctor availability.

**Real-world relevance:**
Telemedicine is no longer a luxury; it's a fundamental expectation. By integrating AI-assisted symptom triage (via OpenAI/Groq), robust scheduling, and real-time communication, this application mirrors production-grade telemedicine platforms like Teladoc or Practo, ensuring high availability, security, and scalability.

---

### 2. 🔹 System Architecture

The application is built on a modern, decoupled client-server architecture:

*   **Frontend (Client Layer):** Next.js and React. Features a highly responsive, glassmorphism-inspired UI with Framer Motion animations. Deployed on modern edge infrastructure.
*   **Backend (Business Logic Layer):** Spring Boot (Java 17+). Acts as a RESTful API provider and WebSocket broker, heavily utilizing Spring Security for access control.
*   **Database (Data Layer):** PostgreSQL hosted on Neon (Serverless cloud database). Managed entirely via Flyway migrations for strict version control.

**Component Interaction & Request Flow:**
1.  **Authentication:** The user logs in via the Next.js frontend. Spring Security intercepts the request, validates the BCrypt password, and returns a stateless JWT.
2.  **Booking Flow:** A patient selects an approved doctor. The frontend queries the backend for the doctor's availability (handling race conditions and timezones). An appointment record is created in PostgreSQL.
3.  **Real-Time Chat:** At the time of the appointment, the frontend establishes a bi-directional WebSocket connection (`/ws/chat`). Messages are routed through Spring's STOMP broker, saved to the database, and broadcast to the receiving client instantly.

---

### 3. 🔹 Core Features

#### Authentication (JWT)
*   **What it does:** Stateless, token-based user authentication.
*   **Why it's important:** Prevents session hijacking and eliminates the need for sticky sessions on load balancers, making the backend horizontally scalable.
*   **Technical Implementation:** Implemented using `jjwt`. Passwords are hashed using BCrypt. The JWT token encodes the user's role and is passed as an `HttpOnly` cookie or Bearer token, which a Spring Security `OncePerRequestFilter` intercepts and parses.

#### Role-Based Access Control (RBAC)
*   **What it does:** Ensures that Patients, Doctors, and Admins can only access their respective APIs and UI views.
*   **Why it's important:** Prevents privilege escalation (e.g., a patient cannot approve a doctor's verification).
*   **Technical Implementation:** Spring Security `@PreAuthorize("hasRole('DOCTOR')")` annotations secure backend endpoints, while Next.js middleware and context providers handle client-side route protection.

#### Doctor Verification System
*   **What it does:** A rigorous onboarding flow where doctors upload their medical licenses for admin approval before they can accept bookings.
*   **Why it's important:** Ensures medical compliance and patient safety.
*   **Technical Implementation:** Uses `MultipartFile` handling to safely store documents on the disk. A state machine governs the status (`PENDING` → `APPROVED` / `REJECTED`).

#### Appointment Booking
*   **What it does:** A calendar-based scheduling system with conflict detection.
*   **Why it's important:** Eliminates double-booking and maps directly to a doctor's configurable working hours.
*   **Technical Implementation:** The database strictly enforces doctor availability limits. The backend handles timezone normalization to UTC, ensuring zero timing overlaps regardless of where the patient or doctor is physically located.

#### Real-Time Chat (WebSocket)
*   **What it does:** Live, bi-directional text communication during a consultation.
*   **Why it's important:** Crucial for immediate doctor-patient interaction without forcing page refreshes.
*   **Technical Implementation:** Built over Spring WebSocket and STOMP protocols. Uses a `ChannelInterceptor` to authenticate the initial WebSocket handshake using the JWT token, guaranteeing that only authorized participants can subscribe to a specific chat room.

#### Admin Dashboard
*   **What it does:** A central command center to monitor system metrics, verify doctors, and manage user roles.
*   **Why it's important:** Essential for platform operations and customer support.
*   **Technical Implementation:** Aggregates statistics via specific high-performance SQL queries and provides endpoints to mutate user roles safely, backed by an audit logging table.

---

### 4. 🔹 Database Design

The PostgreSQL database is fully normalized and managed via Flyway.

*   **`users`:** The central entity. Stores credentials, emails, and role mappings.
*   **`roles`:** Look-up table for RBAC (Admin, Doctor, Patient).
*   **`doctors`:** Extends the user. Stores clinical data, specialization, and the `verification_status`. Linked to `users` via a `OneToOne` relationship.
*   **`doctor_verifications`:** Tracks uploaded medical licenses and approval timestamps.
*   **`appointments`:** The junction table tying a Patient, a Doctor, and a Time Slot. Tracks statuses (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
*   **`consultation_messages`:** Stores the chat history. Includes `appointment_id`, sender type, timestamp, and payload.

**Why this structure:**
The strict separation between `users` and `doctors` allows the system to remain highly extensible. By utilizing foreign keys and standardizing on UTC timestamps, the relational integrity of appointments and messages is strictly preserved.

---

### 5. 🔹 Technical Deep Dive

*   **JWT & WebSockets:** Securing REST APIs with JWT is standard, but securing WebSockets is notoriously difficult because WebSockets do not support standard HTTP headers during the handshake. We solved this by implementing a `ChannelInterceptor` that extracts the JWT token from the STOMP `CONNECT` frame header, verifying the signature *before* the socket is fully established.
*   **JPA Entity Graphs:** To optimize database performance and prevent N+1 query problems (specifically `LazyInitializationException` when serializing `Doctor` entities), we utilized standard JPA `@Query("SELECT d FROM Doctor d JOIN FETCH d.user")`. This guarantees the JSON serializer always has the data it needs in a single, high-performance query.
*   **Flyway Migrations:** All schema changes (like adding the `verification_status` column in `V8`) are handled by Flyway. This guarantees that the production database perfectly mirrors the development database, eliminating "it works on my machine" bugs.

---

### 6. 🔹 Challenges & Solutions

1.  **Challenge:** *Hibernate Lazy Initialization Exceptions during API calls.*
    *   **Solution:** When the frontend requested the list of verified doctors, Spring Boot crashed because it tried to serialize the `User` object after the database session closed. We resolved this by explicitly modifying the Fetch Type to `EAGER` and enforcing `JOIN FETCH` at the repository layer, ensuring atomic data retrieval.
2.  **Challenge:** *Accidental Password Hash Leakage.*
    *   **Solution:** When returning the Doctor's linked User object, the hashed password was inadvertently included in the JSON response payload. We aggressively patched this by adding `@JsonIgnore` to the password field, ensuring it is entirely stripped at the serialization layer.
3.  **Challenge:** *State Synchronization in the UI.*
    *   **Solution:** Navigating between the admin approval process and the doctor list occasionally showed outdated data. We mitigated this by utilizing React's `useEffect` dependencies and forcing strict re-fetches upon successful mutation events.

---

### 7. 🔹 Security Considerations

*   **Password Hashing:** Passwords are never stored in plaintext. We utilize `BCryptPasswordEncoder` with a strength factor of 10.
*   **Data Validation:** All incoming payloads are sanitized using `jakarta.validation` (`@NotBlank`, `@Size`, `@Email`) to prevent malformed data from reaching the database.
*   **File Upload Safety:** The doctor verification endpoint explicitly restricts uploads to specific MIME types (`application/pdf`, `image/png`, `image/jpeg`) and enforces a strict 5MB size limit to prevent Denial of Service (DoS) via disk exhaustion.
*   **Data Leakage Prevention:** Sensitive fields (like passwords) are explicitly ignored via Jackson annotations (`@JsonIgnore`), preventing them from ever touching the network.

---

### 8. 🔹 Scalability & Production Readiness

The system is designed with horizontal scalability in mind:
*   **Stateless Backend:** Because we use JWTs instead of HTTP Sessions, we can deploy 10 instances of our Spring Boot application behind a load balancer without needing "sticky sessions".
*   **Future Improvements:**
    *   **Redis Integration:** We can introduce Redis as a STOMP broker relay to allow real-time chat messages to be broadcast seamlessly across multiple backend instances.
    *   **Cloud Object Storage:** Currently, medical licenses are saved to the local disk. For a true cloud-native deployment, we would migrate `MultipartFile` handling to an AWS S3 bucket.

---

### 9. 🔹 Demo Walkthrough Script

*(Speak confidently, interact with the screen as you talk)*

**[Step 1: Patient Experience]**
> "Hello everyone. First, let me show you the platform from a Patient's perspective. I am logging in as Ratnesh, a registered patient. Notice the modern, responsive dashboard. Over here in the 'Appointments' tab, I can see my upcoming schedules. Let's book a new consultation. I open the 'Select Doctor' dropdown—which is actively pulling a list of strictly *verified* doctors from our database. I’ll select Dr. Sharma, our Cardiologist, pick an available time slot tomorrow, and confirm. The system instantly registers the booking."

**[Step 2: Doctor Experience]**
> "Now, let’s switch gears. I’ll log out and log back in as Dr. Sharma. As a doctor, my dashboard is tailored to my clinical workflow. Immediately, I see the new appointment request from Ratnesh. I have the authority to Accept or Decline based on my schedule. I’ll go ahead and click 'Confirm'. You'll notice the status instantly updates."

**[Step 3: Real-Time Consultation]**
> "It's time for the appointment. Both the doctor and the patient navigate to the 'AI Chat' or 'Consultation' room. This isn't a static page; it's a live WebSocket connection. Watch as I type a message as Dr. Sharma: *'Hello Ratnesh, how is your chest pain?'* — and as I hit send, it appears instantaneously on the patient's screen without a page refresh. This bi-directional communication is secured entirely by our JWT STOMP interceptor."

**[Step 4: Admin Oversight]**
> "Finally, how do we manage trust? I’ll log in as the System Administrator. Here in the Admin Console, I can see overall platform metrics. If a new doctor signs up, they cannot receive patients until I review their medical license. I can view their uploaded PDF and click 'Approve'. Only then will they appear in the patient's booking dropdown. This guarantees a safe ecosystem."

---

### 10. 🔹 Conclusion

To summarize, the Healthcare Chatbot System is not just a scheduling app; it is a comprehensive, secure, and real-time clinical platform. 

By combining the highly responsive React architecture with the iron-clad security and performance of Spring Boot and PostgreSQL, we have built a system that actively solves real-world telemedicine bottlenecks. It is scalable, production-ready, and strictly enforces clinical security standards.

Thank you. I'm happy to take any questions regarding the architecture or implementation details.
