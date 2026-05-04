# StudySpot — README

StudySpot is a fullstack IoT app for students to find study spaces that suit them according to live environment and occupancy data.

## Table of contents
- Folder and File Structure
- Setup Instructions
  - Prerequisites
  - Installation
  - Configuration
- Running the project
- Third‑party software & frameworks
- Code documentation
- Troubleshooting
- Useful commands

---

## Folder and File Structure
Root
- `package.json` — repo metadata and top-level scripts.
- `README.md` — this file.

Backend (backend/)
- `backend/package.json` — backend npm scripts (start, test, migrate).
- `backend/prisma/` — Prisma schema, migrations and seed utilities.
- `backend/prisma/schema.prisma` — DB models and relations.
- `backend/prisma/seed.ts` — seed script (dev fixtures: buildings, rooms, users, readings).
- `backend/prisma/migrations/` — migration history.
- `backend/src/app.ts` — Express app bootstrap and server start.
- `backend/src/prisma.ts` — Prisma client instantiation/export.
- `backend/src/config/` — env loading and typed config (DB, JWT, external APIs).
- `backend/src/middleware/` — auth, validation, error handlers.
- `backend/src/controllers/` — request handlers (Account, Room, Sensor).
- `backend/src/routes/` — route wiring for API endpoints.
- `backend/src/services/` — business logic and DB access (AccountService, RoomService, SensorService).
- `backend/src/scripts/` — one‑off utilities (telemetry sync).
- `backend/src/tests/` — unit and integration tests + test setup.
- `backend/src/generated/prisma/` — generated Prisma client/types.

Frontend (frontend/)
- `frontend/package.json` — frontend npm scripts (dev, build, test).
- `frontend/vite.config.js` — Vite dev / build configuration and proxy rules.
- `frontend/index.html` — app HTML template.
- `frontend/public/` — static assets served as-is.
- `frontend/src/main.jsx` — React entrypoint (mount + providers).
- `frontend/src/App.jsx` — top-level layout and theme.
- `frontend/src/routes.jsx` — route → page mapping.
- `frontend/src/index.css`, `frontend/src/App.css` — global and app styles.
- `frontend/src/components/` — reusable UI components (Header, Footer, RoomCard, charts).
- `frontend/src/hooks/useSensorData.tsx` — hook for live telemetry subscription.
- `frontend/src/pages/` — route pages (Home, Room, Login, SignUp, About).
- `frontend/src/tests/` — frontend tests and utilities.
- `frontend/src/types/` — TS declarations and shared types.

Notes
- Consult per folder readme for implementation details

---

## Setup Instructions

Prerequisites
- Node.js 20+ and npm (or pnpm).
- PostgreSQL 12+ (local or remote) with a DB for StudySpot.
- ThingsBoard account or API endpoint for real telemetry ingestion.

Installation
1. Clone repository and open project root:
   ```bash
   git clone <repo-url>
   cd studyspot_group2/Website
   ```
2. Install backend deps:
   ```bash
   cd backend
   npm install
   ```
3. Install frontend deps:
   ```bash
   cd ../frontend
   npm install
   ```

Configuration
- Create `backend/.env` (example):
  ```env
  DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/studyspot"
  JWT_SECRET="replace-with-a-long-random-string"
  THINGSBOARD_URL="https://thingsboard.example.com"   
  THINGSBOARD_EMAIL=""                                
  THINGSBOARD_PASSWORD=""                        
  SENSOR_SYNC_INTERVAL_MS=60000     // how often it will ping for thingsboard for telemetry
  REAL_ROOM_DEVICE_ID=""            // the id of the real room within our database since we currently only have one     
  ```
---

## Running the project

1. Run DB migrations (backend):
   ```bash
   cd backend
   npx prisma migrate dev
   ```
2. Seed dev data:
   ```bash
   npx tsx prisma/seed.ts
   ```
   Seed creates sample buildings, rooms and a default test user:
   - Email: `testuser@cardiff.ac.uk`
   - Password: `password`

3. Start backend (default port 3000):
   ```bash
   cd backend
   npx tsx src/app.ts
   ```
4. Start frontend (Vite, default port 5173):
   ```bash
   cd frontend
   npm run dev
   ```
5. Open: http://localhost:5173

Scripts & tools
- Backend migration: `npx prisma migrate dev`
- Seed: `npx tsx prisma/seed.ts`
- Backend tests: `cd backend && npm test`
- Frontend dev: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`

Expected behavior
- App UI loads at 5173 and lists buildings/rooms.
- Room pages show latest sensor telemetry and occupancy (mocked if ThingsBoard not configured).
- Telemetry sync script fetches latest readings periodically; rooms update accordingly.

---

## Third‑party software & frameworks 

Note: exact versions for frontend are in frontend/package.json; for backend check backend/package.json.

Frontend libraries 
- axios — ^1.13.6 — Promise-based HTTP client for API calls. Docs: https://axios-http.com/ — used for REST requests to backend and telemetry endpoints.
- react — ^19.2.0 — UI library. Docs: https://reactjs.org/ — main framework for frontend components.
- react-dom — ^19.2.0 — React DOM renderer. Docs: https://reactjs.org/ — mounts the app in the browser.
- react-router-dom — ^7.13.1 — Client routing. Docs: https://reactrouter.com/ — manages page routes (Home, Room, Login, etc.).
- react-select — ^5.10.2 — Accessible select components. Docs: https://react-select.com/ — used for dropdowns/filters.
- recharts — ^3.8.1 — Charting library. Docs: https://recharts.org/ — used for occupancy/metrics charts.
- vite — ^7.3.1 — Dev server & bundler. Docs: https://vitejs.dev/ — dev/build tooling and proxying to backend.
- @vitejs/plugin-react — ^5.1.1 — Vite plugin for React fast refresh and JSX support. Docs: https://github.com/vitejs/vite/tree/main/packages/plugin-react

Frontend dev tools (devDependencies)
- eslint / @eslint/js / eslint-plugin-react-hooks / eslint-plugin-react-refresh — linting and code quality. Docs: https://eslint.org/
- @types/react / @types/react-dom — Type definitions for TypeScript-aware editors (if used).

Backend / infra (core components used by the project)
- Node.js — v20+ recommended — runtime for backend and frontend tooling. Docs: https://nodejs.org/
- PostgreSQL — v12+ recommended — relational DB storing users, buildings, rooms, readings. Docs: https://www.postgresql.org/
- Prisma — v5 (backend) — ORM, schema and migrations. Docs: https://www.prisma.io/ — schema.prisma, migrations/, prisma client generation.
- Express — v4 (backend) — HTTP server framework. Docs: https://expressjs.com/ — request routing, middleware, controllers.
- ThingsBoard — optional external IoT platform — telemetry ingestion and device management. Docs: https://thingsboard.io/ — used when real IoT telemetry is configured.
- Vitest / Jest — test runners used by backend/frontend tests (see package.json entries in backend/frontend). Docs: https://vitest.dev/, https://jestjs.io/

Other helpers & tooling
- npx tsx — run TypeScript scripts (seed, scripts) without a build step. Docs: https://github.com/whitecolor/tsx
- Prisma Migrate — schema migrations: npx prisma migrate dev. Docs: https://www.prisma.io/docs/
- Vite proxy — forwards API calls in dev to backend (config in vite.config.js).

How each third‑party component is used
- HTTP/REST: axios (frontend) calls Express API (backend) which uses Prisma to access PostgreSQL.
- Realtime / telemetry: optional ThingsBoard integration or mock telemetry via backend scripts; frontend subscribes via hook (useSensorData) to display live charts (Recharts).
- Dev workflow: Vite runs frontend dev server; backend run via npx tsx src/app.ts; migrations + seed handled by Prisma CLI.

Where to find exact versions
- Frontend: frontend/package.json (provided).
- Backend: backend/package.json and backend/prisma/schema.prisma.

---

## Code documentation
- Tests: see `backend/src/tests/` and `frontend/src/tests/` for examples of expected behavior and integration flows.
- Generated Prisma types: `backend/src/generated/prisma/` — use for typed DB access.

---

## Troubleshooting

DB connection errors
- Symptom: backend crashes with DB connection error.
- Fix: verify `DATABASE_URL` in `backend/.env`, ensure Postgres running and accessible.

Port conflicts
- Symptom: dev servers fail to start.
- Fix: change ports (backend: src/app.ts or env; frontend: Vite config).

Prisma/seed issues
- Symptom: seed fails due to missing tables.
- Fix: run `npx prisma migrate dev` before seeding.

ThingsBoard integration failures
- Symptom: telemetry missing when configured.
- Fix: verify `THINGSBOARD_*` env vars and that the ThingsBoard endpoint accepts tokens; fallback to mock telemetry if unavailable.

Tests failing locally
- Symptom: unit/integration tests fail.
- Fix: ensure test DB is configured, run tests with proper setup script (`src/tests/test.setup.ts` for DB fixtures).

---

## Useful commands (quick)
- Backend install: `cd backend && npm install`
- Frontend install: `cd frontend && npm install`
- Migrate: `cd backend && npx prisma migrate dev`
- Seed: `cd backend && npx tsx prisma/seed.ts`
- Start backend: `cd backend && npx tsx src/app.ts`
- Start frontend: `cd frontend && npm run dev`
- Run backend tests: `cd backend && npm test`
- Build frontend: `cd frontend && npm run build`

---

## Notes
- Vite proxies `/api` and `/users` to `http://localhost:3000` for local dev.
- Keep `seed.ts` idempotent so repeated runs do not duplicate data.
- For production: set strong `JWT_SECRET`, secure DB credentials, and configure TLS for external APIs.
