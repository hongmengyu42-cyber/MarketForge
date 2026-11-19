# MarketForge — Production Freelance Marketplace Platform

MarketForge is an enterprise-grade freelance marketplace platform featuring an autonomous smart escrow payment pipeline, double-entry GAAP financial ledger accounting, real-time notifications via WebSockets, dispute arbitration rooms, seller analytics, and administrative moderation.

---

## 🏗️ System Architecture

```
marketforge/
├── docker-compose.yml         # Production orchestration (MySQL 8.0, Backend, Frontend Nginx)
├── .env.example               # Production environment variable template
├── scripts/                   # Production automation scripts
│   ├── deploy.sh              # Containerized deployment and healthchecks
│   ├── backup-db.sh           # Automated MySQL dump with 14-day retention pruning
│   └── restore-db.sh          # Safe point-in-time database restoration
├── backend/                   # Spring Boot 3.3.5 (Java 17) REST API
│   ├── Dockerfile             # Multi-stage Eclipse Temurin 17 JRE container
│   ├── src/main/java/         # Controllers, Entities, Services, Security, Scheduler
│   ├── src/main/resources/    # application.yml, application-prod.yml
│   └── src/test/java/         # JUnit 5 & Mockito automated testing suite
└── frontend/                  # React 18 + TypeScript strict + Vite + Tailwind CSS
    ├── Dockerfile             # Multi-stage Node 20 + Nginx 1.27 Alpine container
    ├── nginx.conf             # Gzip compression, security headers & reverse proxy
    ├── vitest.config.ts       # Vitest + JSDOM test harness
    └── src/
        ├── api/               # Typed Axios REST API client
        ├── store/             # Zustand state management
        ├── layouts/           # Responsive navigation drawer & WebSocket notifications
        ├── pages/             # Code-split lazy loaded views
        └── test/              # Vitest store and utility test suites
```

---

## 🐳 Production Deployment (Docker Compose)

Deploy the complete multi-tier production stack with one command:

```bash
# 1. Copy and configure production secrets
cp .env.example .env

# 2. Deploy all services (MySQL 8.0, Spring Boot backend, Nginx frontend)
./scripts/deploy.sh
```

### Deployed Services:
- **Frontend SPA & Reverse Proxy**: `http://localhost` (Port 80)
- **Backend API & Actuator Health**: `http://localhost:8080/actuator/health` (Port 8080)
- **MySQL Database**: `localhost:3306` (Internal Docker network: `mysql:3306`)

---

## 🧪 Automated Testing Suites

### Frontend Tests (Vitest + JSDOM)
```bash
cd frontend
npx vitest run
```
- **22 Unit & Store Tests**: Tests global auth state, modal managers, price calculations, and relative date formatters.

### Backend Tests (JUnit 5 + Mockito)
```bash
cd backend
./mvnw test
```
- **7 Service & Security Tests**: Tests email verification gates, registration workflows, JWT token issuance, and wallet balance bounds.

---

## 📦 Local Development

### 1. Database (MySQL)
MarketForge connects to MySQL (port `3307` for XAMPP or `3306` for native MySQL):
- Host: `localhost`
- Database: `marketforge`
- User: `root` (no password by default)

### 2. Backend (Spring Boot)
```bash
cd backend
./mvnw clean package -DskipTests -q
java -jar target/marketforge-backend-1.0.0.jar
```
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI Specification: `http://localhost:8080/api-docs`

### 3. Frontend (Vite Dev Server)
```bash
cd frontend
npm run dev
```
- Dev App: `http://localhost:5173`

---

## 🔒 Security & Operational Hardening (Completed Audit)

1. **JWT Fail-Fast Validator**: Startup integrity check on secret entropy and production security.
2. **CORS Whitelist**: Strictly env-driven (`ALLOWED_ORIGINS`).
3. **Actuator Protection**: Metrics and health endpoints restricted to `ROLE_ADMIN`.
4. **Stripe Webhooks**: Cryptographic signature verification (`Stripe-Signature`).
5. **Magic Bytes File Upload**: Whitelists PNG, JPEG, WEBP, and PDF against MIME spoofing and path traversal.
6. **Code-Split Frontend**: Route lazy loading reduces initial payload by **54%** (from 850kB to 391kB).
7. **Automated Database Backups**: Gzipped daily dumps with 14-day automatic pruning via `./scripts/backup-db.sh`.
