# Customer Support Management System — Project Plan

## Architecture Overview

```
[Customer Email]
      |
      v
[Gmail/IMAP Poller] ← Spring Boot Scheduler (every 1 min)
      |
      v
[Ticket Service] → PostgreSQL DB (H2 for local dev)
      |
      v
[AI Categorization] ← Claude API
      |
      v
[AI Auto-Response] ← Claude API + Knowledge Base
      |
      v
[React Dashboard] ← REST API ← Spring Boot
      |
      v
[Human Agent] (if ticket unresolved > threshold)
```

---

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Backend      | Spring Boot 3.x (Java 17)         |
| Frontend     | React 18 + Vite + Tailwind CSS    |
| Database     | H2 (dev) / PostgreSQL (prod)      |
| AI           | Claude API (Anthropic)            |
| Email        | JavaMail / Gmail IMAP + SMTP      |
| Auth         | Spring Security + JWT             |
| Build        | Maven Wrapper (no install needed) |

---

## Project Structure

```
customer-support-system/
├── backend/                    <- Spring Boot
│   ├── src/main/java/com/support/
│   │   ├── controller/         <- REST endpoints
│   │   ├── service/            <- Business logic
│   │   ├── model/              <- JPA entities
│   │   ├── repository/         <- Spring Data JPA
│   │   ├── config/             <- Security, Mail, AI config
│   │   └── scheduler/          <- Email poller
│   └── src/main/resources/
│       ├── application.properties
│       └── data.sql            <- Seed knowledge base
└── frontend/                   <- React + Vite
    ├── src/
    │   ├── pages/              <- Dashboard, Tickets, Login
    │   ├── components/         <- TicketCard, KnowledgeBase
    │   ├── api/                <- Axios API calls
    │   └── store/              <- Zustand state
    └── package.json
```

---

## Database Schema

### tickets
| Column       | Type      | Notes                               |
|--------------|-----------|-------------------------------------|
| id           | BIGINT PK |                                     |
| subject      | TEXT      |                                     |
| body         | TEXT      |                                     |
| from_email   | VARCHAR   |                                     |
| status       | ENUM      | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| category     | VARCHAR   | Billing, Technical, General, etc.   |
| priority     | ENUM      | LOW, MEDIUM, HIGH, URGENT           |
| ai_response  | TEXT      | Draft AI response                   |
| ai_sent      | BOOLEAN   |                                     |
| created_at   | TIMESTAMP |                                     |
| updated_at   | TIMESTAMP |                                     |
| resolved_at  | TIMESTAMP |                                     |
| assigned_to  | VARCHAR   | Agent email                         |

### knowledge_base
| Column     | Type      | Notes                |
|------------|-----------|----------------------|
| id         | BIGINT PK |                      |
| title      | VARCHAR   |                      |
| content    | TEXT      | The answer/knowledge |
| category   | VARCHAR   |                      |
| created_at | TIMESTAMP |                      |

### users (agents)
| Column   | Type      | Notes         |
|----------|-----------|---------------|
| id       | BIGINT PK |               |
| email    | VARCHAR   |               |
| password | VARCHAR   | BCrypt hashed |
| role     | ENUM      | ADMIN, AGENT  |
| name     | VARCHAR   |               |

---

## API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/logout

### Tickets
- GET   /api/tickets              <- list with filters (status, category)
- GET   /api/tickets/{id}
- PATCH /api/tickets/{id}/status
- PATCH /api/tickets/{id}/assign
- POST  /api/tickets/{id}/reply   <- human sends reply email

### Knowledge Base
- GET    /api/knowledge
- POST   /api/knowledge
- PUT    /api/knowledge/{id}
- DELETE /api/knowledge/{id}

### Dashboard
- GET /api/dashboard/stats        <- counts by status/category

---

## Build Phases (Step by Step)

### Phase 1 — Backend Foundation
- Step 1: Generate Spring Boot project with Maven Wrapper (curl from start.spring.io)
- Step 2: Create JPA entities (Ticket, KnowledgeBase, User) + H2 DB
- Step 3: Build Ticket CRUD REST API (controller + service + repository)
- Step 4: Add JWT auth + agent login endpoint

### Phase 2 — Email Integration
- Step 5: Gmail IMAP poller (Spring Scheduler) -> creates tickets automatically
- Step 6: SMTP reply sender (send email back to customer)

### Phase 3 — AI Features
- Step 7: Claude API -> auto-categorize and prioritize each new ticket
- Step 8: Claude API -> auto-respond using knowledge base articles

### Phase 4 — Frontend
- Step 9:  Scaffold React + Vite + Tailwind CSS
- Step 10: Login page + JWT token handling
- Step 11: Ticket dashboard (list, filter, detail + reply)
- Step 12: Knowledge base management page (CRUD)

### Phase 5 — Polish
- Step 13: Dashboard stats (open/closed/AI-resolved counts)
- Step 14: Auto-email notification when AI responds to a ticket

---

## Prerequisites (What you need before we start)

- [ ] Gmail account for support (e.g. support@gmail.com)
- [ ] Gmail App Password: Gmail Settings -> Security -> 2FA -> App Passwords
- [ ] Anthropic API key: console.anthropic.com -> API Keys
- [ ] Java 17 installed (already confirmed)
- [ ] Node.js installed (already confirmed)

## Key Concepts Explained

| Concept             | What it does                                                  |
|---------------------|---------------------------------------------------------------|
| Spring Data JPA     | Write interfaces only — Spring auto-generates SQL queries     |
| @Scheduled          | Runs a method on a timer (e.g. poll email every 60 seconds)   |
| JavaMailSender      | Spring's built-in email send/receive library                  |
| JWT                 | Token the browser stores after login, sent with every request |
| Claude API          | HTTP call to Anthropic with a prompt, returns AI text         |
| React Query         | Fetches + caches backend data, auto-refreshes                 |
| Zustand             | Tiny global store for auth state in React                     |
| Maven Wrapper       | mvnw.cmd script — runs Maven without installing it globally   |
