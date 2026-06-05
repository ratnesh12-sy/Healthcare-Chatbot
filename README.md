# HealthCare AI Assistant 🏥

A full-stack, AI-powered healthcare platform combining an intelligent symptom chatbot, real-time consultation messaging, appointment booking, and role-based dashboards for patients, doctors, and administrators.

**Live demo:** [healthcare-chatbot-1.vercel.app](https://healthcare-chatbot-1.vercel.app)

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment variables](#environment-variables)
  - [Run with Docker Compose](#run-with-docker-compose)
  - [Run manually](#run-manually)
- [Project structure](#project-structure)
- [User roles](#user-roles)
- [API documentation](#api-documentation)
- [Deployment](#deployment)
- [Known gaps & roadmap](#known-gaps--roadmap)
- [Contributing](#contributing)

---

## Features

| Feature | Description |
|---|---|
| **AI chatbot** | Real-time symptom checker powered by Groq (LLaMA 3.3 70B), streamed over WebSocket/STOMP |
| **Appointment booking** | Calendar-based slot picker with idempotent booking and availability rules |
| **Doctor verification** | Admin-managed onboarding workflow: PENDING → APPROVED / REJECTED / INFO_REQUESTED |
| **Role-based dashboards** | Separate UIs for patients, doctors, and admins |
| **Consultation chat** | Persistent post-appointment messaging between patient and doctor |
| **Doctor availability** | Doctors set weekly rules and date-specific exceptions |
| **Profile management** | Full profile editing for both patients and doctors |
| **OCR document upload** | Tesseract.js client-side OCR for medical document scanning |
| **Admin panel** | User management, doctor verification queue, and platform settings |
| **Responsive design** | Mobile-first UI with Framer Motion animations |

---

## Tech stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js (App Router) | 14.1.0 | React framework, SSR |
| React + TypeScript | 18.x / 5.x | UI components |
| Tailwind CSS | 3.3.x | Styling |
| Framer Motion | 11.x | Animations |
| Lucide React | 0.323 | Icons |
| Axios | 1.6.7 | HTTP client |
| STOMP.js + SockJS | 7.3 / 1.6 | WebSocket real-time chat |
| Tesseract.js | 7.0 | Client-side OCR |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Spring Boot (Java 17) | 3.5.14 | REST API + WebSocket server |
| Spring Security + JWT | jjwt 0.11.5 | Authentication & authorisation |
| Spring Data JPA / Hibernate | — | ORM |
| Flyway | — | Database migrations |
| SpringDoc OpenAPI | 2.3.0 | Swagger UI / API docs |
| OkHttp | 4.12.0 | HTTP client for Groq API calls |

### Infrastructure & services

| Service | Role |
|---|---|
| **PostgreSQL 15+** (Neon Cloud) | Primary database, SSL required |
| **Groq API** (LLaMA 3.3 70B) | AI chat completions |
| **Supabase Storage** | Doctor verification document uploads |
| **Vercel** | Frontend deployment |
| **Render** | Backend deployment (Docker) |
| **Docker + Docker Compose** | Local development orchestration |

---

## Architecture

```
Browser / Mobile
       │ HTTPS
       ▼
  Vercel (Next.js 14)
       │ REST + WebSocket
       ▼
  Render (Spring Boot, port 8081)
   ├── JDBC/SSL ──► Neon PostgreSQL 15+
   ├── REST ──────► Groq API  (LLaMA 3.3 70B)
   └── REST ──────► Supabase Storage
```

**Authentication strategy:** Hybrid — HTTP-only cookies for all REST API calls; a short-lived (30 s) `localStorage` token exclusively for the WebSocket STOMP `CONNECT` frame, auto-cleaned after connection.

**Real-time chat:** STOMP over SockJS. Messages are sent to `/app/chat.send` and broadcast back on `/topic/user.{userId}`. WebSocket connections are authenticated via `StompAuthInterceptor`.

---

## Getting started

### Prerequisites

- **Java 17+** and **Maven 3.9+**
- **Node.js 18+** and **npm**
- **Docker + Docker Compose** (recommended for local dev)
- A **PostgreSQL** database (local, Docker, or [Neon](https://neon.tech) cloud)
- A **Groq API key** — free tier available at [console.groq.com](https://console.groq.com)
- *(Optional)* A **Supabase** project with a storage bucket for doctor verification documents

### Environment variables

#### Backend (set as OS environment variables or in `application.properties`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | JDBC connection string, e.g. `jdbc:postgresql://<host>/<db>?sslmode=require` |
| `DB_USER` | ✅ | Database username |
| `DB_PASS` | ✅ | Database password |
| `JWT_SECRET` | ✅ (prod) | Base64-encoded 256-bit secret for signing JWTs |
| `GROQ_API_KEY` | ✅ | Groq API key (`gsk_...`) |
| `SUPABASE_URL` | ⬜ | Supabase project URL (for doctor doc uploads) |
| `SUPABASE_SECRET_KEY` | ⬜ | Supabase service-role key |
| `SUPABASE_BUCKET` | ⬜ | Storage bucket name (default: `doctor-verifications`) |
| `ALLOWED_ORIGINS` | ⬜ | Comma-separated CORS origins (default: `http://localhost:3000`) |
| `COOKIE_SECURE` | ⬜ | Set `true` in production for cross-origin cookies |
| `COOKIE_DOMAIN` | ⬜ | Cookie domain (usually leave empty) |

#### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8081/api
```

> **Note:** The `/api` suffix is required — the Axios client uses this as the base URL directly.

### Run with Docker Compose

The included `docker-compose.yml` spins up PostgreSQL, the Spring Boot backend, and the Next.js frontend together.

```bash
git clone https://github.com/ratnesh12-sy/Healthcare-Chatbot.git
cd Healthcare-Chatbot

# Set your Groq API key (required for the AI chatbot)
export GROQ_API_KEY=gsk_your_key_here      # Linux / macOS
# $env:GROQ_API_KEY="gsk_your_key_here"    # PowerShell

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8081
- Swagger UI: http://localhost:8081/swagger-ui.html

### Run manually

#### Backend

```bash
cd backend
mvn clean install -DskipTests
mvn spring-boot:run
```

Flyway will automatically run all 11 migrations on first start.

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Project structure

```
Healthcare-Chatbot/
├── backend/                    # Spring Boot API
│   └── src/main/java/com/healthcare/aiassistant/
│       ├── controller/         # 13 REST controllers
│       ├── service/            # Business logic (13 services)
│       ├── model/              # JPA entities (20 models)
│       ├── repository/         # Spring Data repos (13 repos)
│       ├── security/           # JWT + Spring Security config
│       ├── interceptor/        # STOMP WebSocket auth
│       ├── exception/          # Custom exceptions + global handler
│       ├── payload/            # DTOs (request, response, openai)
│       ├── config/             # App configuration + seeders
│       └── util/               # Data utilities
│
├── frontend/                   # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── dashboard/      # Patient dashboard, chat, appointments, profile
│       │   ├── doctor/         # Doctor portal & onboarding
│       │   ├── admin/          # Admin panel (users, doctors, settings)
│       │   ├── login/          # Login page
│       │   └── signup/         # Registration page
│       ├── components/         # Shared UI components
│       │   ├── booking/        # Calendar picker, time slots, booking panel
│       │   ├── chat/           # Chat window + error boundary
│       │   └── dashboard/      # Doctor & patient dashboards
│       ├── context/            # AuthContext, ChatContext
│       └── lib/                # API client, services, utilities
│
├── docker-compose.yml          # Local dev orchestration
├── render.yaml                 # Render.com IaC deployment config
└── docs/                       # Project documentation
```

---

## User roles

| Role | Access |
|---|---|
| **Patient** | Dashboard, AI chatbot, appointment booking, profile |
| **Doctor** | Doctor dashboard, availability management, consultation chat, profile — requires admin approval |
| **Admin** | All of the above + user management, doctor verification queue, platform settings, audit logs |

### Demo credentials (development seed data)

When running locally, `DevDataSeeder.java` creates demo users on first startup. Check the seeder for current credentials:

```
backend/src/main/java/com/healthcare/aiassistant/config/DevDataSeeder.java
```

---

## API documentation

Swagger UI is available when the backend is running:

```
http://localhost:8081/swagger-ui.html
```

Key endpoint groups:

| Prefix | Description |
|---|---|
| `/api/auth` | Sign up, sign in, sign out, current user |
| `/api/appointments` | Book, list, cancel appointments |
| `/api/availability` | Doctor slot availability |
| `/api/doctors` | Doctor listing and profiles |
| `/api/admin` | Admin-only user and settings management |
| `/api/verify` | Doctor verification workflow |
| `/api/profile` | User profile management |
| `/ws` | WebSocket endpoint (STOMP/SockJS) |

---

## Deployment

### Backend → Render

The [`render.yaml`](render.yaml) at the project root configures automatic deploys. On push to `main`:

1. Render builds the Docker image using `backend/Dockerfile` (multi-stage: Maven build → slim JRE runtime).
2. Sets the environment variables defined in the Render dashboard.
3. Runs the JAR; Flyway migrations execute automatically on startup.
4. Health check endpoint: `/health`

**Required Render environment variables:** `DATABASE_URL`, `DB_USER`, `DB_PASS`, `JWT_SECRET`, `GROQ_API_KEY`.

**Pre-configured in `render.yaml`:** `SERVER_PORT=8081`, `app_cookie_secure=true`, `app_cors_allowedOrigins` (set to Vercel URL).

### Frontend → Vercel

Connect the repository to Vercel with the root directory set to `frontend/`, and add:

```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

> **Note:** Include the `/api` suffix in the URL.

Vercel auto-deploys on every push to `main`.

### CORS & cookies

Cross-origin cookies are configured with `Secure=true; SameSite=None` in production. Ensure `ALLOWED_ORIGINS` on the backend matches your Vercel deployment URL exactly. Without `COOKIE_SECURE=true`, all authenticated POST requests will return 401 in cross-origin setups.

---

## Known gaps & roadmap

| Item | Status |
|---|---|
| Automated tests (JUnit + Cypress) | 🔴 Not yet implemented |
| CI/CD pipeline (GitHub Actions) | 🔴 Not yet implemented |
| Server-side email notifications | 🟡 Schema ready, not wired |
| Health metrics UI | 🟡 Backend ready, no frontend page |
| Audit log viewer (admin) | 🟡 Backend ready, no frontend page |
| Two-factor authentication | 🟡 Schema ready, not implemented |

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Follow the existing Spring Boot controller → service → repository pattern for backend changes.
3. For frontend, add new pages under `src/app/` and shared components under `src/components/`.
4. Open a pull request with a clear description of the change.
