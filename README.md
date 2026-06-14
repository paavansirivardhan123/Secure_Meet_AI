# SecureMeet

Private, invite-only video/audio meeting platform.

**Stack:** Spring Boot 3 · Next.js 14 · OpenVidu 2.30 · PostgreSQL 15 · JWT · STOMP/WebSocket

---

## Features

- **Invite-only access** — admin generates tokens, no public sign-up
- **Video + audio** — WebRTC via OpenVidu, multi-participant grid
- **Screen sharing** — one click, native browser API
- **In-meeting chat** — persisted per session, live via WebSocket
- **Raise hand** — real-time signal broadcast to all participants
- **Report & remove** — report a participant → kicked instantly → admin notified live
- **Admin panel** — manage users, view sessions, see reports in real time
- **Email invites** — optional SMTP, sends branded HTML invite email
- **Rate limiting** — Bucket4j on login (10 req / 5 per minute per IP)
- **Nginx reverse proxy** — TLS termination, WebSocket upgrade, security headers
- **Docker** — full production compose with health checks

---

## Project Structure

```
securemeet/
├── backend/                  Spring Boot 3
│   ├── src/main/java/com/securemeet/
│   │   ├── config/           SecurityConfig, WebSocketConfig, OpenViduConfig, GlobalExceptionHandler
│   │   ├── controller/       AuthController, MeetingController, ChatController, AdminController
│   │   ├── dto/              AuthDto, MeetingDto, ChatDto
│   │   ├── entity/           User, MeetingSession, Report, InviteToken, ChatMessage
│   │   ├── repository/       5 JPA repositories
│   │   ├── security/         JwtUtil, JwtAuthFilter, RateLimitFilter
│   │   └── service/          AuthService, MeetingService, ChatService, AdminService, EmailService
│   └── Dockerfile
│
├── frontend/                 Next.js 14 (App Router)
│   ├── app/
│   │   ├── login/            Sign-in page
│   │   ├── register/         Invite-token registration
│   │   ├── dashboard/        Create / join sessions
│   │   ├── room/             Meeting room (video grid, chat, screen share, raise hand)
│   │   └── admin/            Admin panel
│   ├── lib/                  axios client, WebSocket hook
│   ├── store/                Zustand auth store
│   └── Dockerfile
│
└── docker/
    ├── docker-compose.yml          Local dev (OpenVidu + Postgres only)
    ├── docker-compose.prod.yml     Full production stack
    ├── nginx.conf                  Reverse proxy config
    └── gen-certs.sh                Self-signed cert generator
```

---

## Quick Start (Local Dev)

### Prerequisites
- Java 17, Maven
- Node.js 20
- Docker + Docker Compose

### 1. Start infrastructure

```bash
cd docker
docker compose up -d
```

Starts PostgreSQL on `:5432` and OpenVidu on `:4443`.

### 2. Backend

```bash 
cd backend
./mvnw spring-boot:run
# → http://localhost:8080
```

On first run, creates default admin:
- **Email:** `admin@securemeet.com`
- **Password:** `Admin@1234`
> Change this immediately in production.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

---

## Production Deployment

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — set all secrets, domain, SMTP credentials
```

### 2. Generate TLS certificate

```bash
# Self-signed (dev/staging):
cd docker && bash gen-certs.sh

# Production: replace docker/certs/cert.pem and key.pem
# with certs from Let's Encrypt / your CA
```

### 3. Deploy

```bash
cd docker
docker compose -f docker-compose.prod.yml --env-file ../.env up -d --build
```

Services exposed:
- `:80` → redirects to HTTPS
- `:443` → Nginx (routes to frontend + backend)
- `:4443` → OpenVidu (WebRTC)

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Get JWT token |
| POST | `/api/auth/register` | — | Register with invite token |
| GET | `/api/auth/me` | JWT | Current user info |
| POST | `/api/sessions/create` | JWT | Create meeting + get OV token |
| POST | `/api/sessions/join/:id` | JWT | Join session + get OV token |
| POST | `/api/sessions/report` | JWT | Report user (kicks + notifies admin) |
| POST | `/api/sessions/end/:id` | JWT | End session |
| GET | `/api/sessions/active` | JWT | List active sessions |
| POST | `/api/chat/send` | JWT | Send chat message |
| GET | `/api/chat/history/:id` | JWT | Get message history |
| POST | `/api/chat/signal` | JWT | Raise/lower hand, reactions |
| POST | `/api/admin/invite` | ADMIN | Create invite token |
| POST | `/api/admin/invite/email` | ADMIN | Create invite + send email |
| GET | `/api/admin/users` | ADMIN | List all users |
| PUT | `/api/admin/users/:id/deactivate` | ADMIN | Suspend user |
| PUT | `/api/admin/users/:id/activate` | ADMIN | Restore user |
| GET | `/api/admin/reports` | ADMIN | All pending reports |
| GET | `/actuator/health` | — | Docker health check |

## WebSocket Topics (STOMP)

| Topic | Who subscribes | Payload | Purpose |
|-------|---------------|---------|---------|
| `/topic/session/:id/chat` | All in session | `MessageResponse` | Live chat messages |
| `/topic/session/:id/signals` | All in session | `SignalEvent` | Raise/lower hand, reactions |
| `/topic/session/:id/kick` | All in session | `KickNotification` | User removal |
| `/topic/session/:id/ended` | All in session | `String` | Session closed |
| `/topic/admin/reports` | Admin panel | `ReportNotification` | New report alert |

---

## Production Checklist

- [ ] Change default admin password after first login
- [ ] Set strong `JWT_SECRET` (min 32 chars, random)
- [ ] Set strong `OPENVIDU_SECRET`
- [ ] Set strong `DB_PASSWORD`
- [ ] Replace self-signed certs with CA-signed certs
- [ ] Set `DOMAIN` and `FRONTEND_URL` to your actual domain
- [ ] Configure SMTP for invite emails
- [ ] Set `spring.jpa.hibernate.ddl-auto=validate` in production
- [ ] Enable PostgreSQL backups
- [ ] Review Nginx `client_max_body_size` and rate limits
