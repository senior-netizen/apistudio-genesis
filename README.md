# Squirrel API Studio — Dev Setup Guide

This repo is a monorepo with a React web app and a NestJS API. This guide shows how to configure your environment, start both services, and verify connectivity without errors on macOS, Linux, or Windows.

---

## Overview

- Frontend (Vite + React): `apps/web`
- Backend (NestJS): `squirrel/backend`
- Shared config/env loader: `config`
- Billing (Paynow Zimbabwe): `/squirrel/backend/src/modules/billing`
- Infra (optional dev dependencies): `infra/docker-compose.yml`

---

## Prerequisites

- Node.js 20+ (recommended). 18+ may work, 22 is supported.
- Yarn 4 (this repo pins `yarn@4.10.3`).
- Docker Desktop (optional, used to run Postgres/Redis quickly).

Check versions:

```
node -v
yarn -v
docker --version
```

---

## Install

```
git clone <your-repo-url>
cd apistudio
yarn install
```

---

## Environment

The API reads `.env` from the repo root. The web app can use `apps/web/.env`.

1) Root env (already added in this repo as an example). Update values as needed:

```
.env
NODE_ENV=development
PORT=8081
DATABASE_URL=postgresql://squirrel:secret@localhost:5432/squirrel
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-strong-secret
REFRESH_SECRET=replace-with-strong-refresh-secret
COOKIE_SECRET=replace-with-cookie-secret
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_CONSOLE_EXPORTER_ENABLED=true
PROMETHEUS_ENABLED=true
APP_BASE_URL=http://localhost:5173
DEVICE_VERIFICATION_URL=http://localhost:5173/device
WEBHOOK_ALLOWLIST=
FEATURE_FLAGS=
```

2) Web env (already added to point at the Vite proxy):

```
apps/web/.env
VITE_API_URL=http://localhost:8081
VITE_WS_URL=ws://localhost:5173
```

---

## Start Dev Databases (optional but recommended)

Spin up Postgres and Redis with Docker:

```
docker compose -f infra/docker-compose.yml up -d postgres redis
```

Ports:

- Postgres: 5432
- Redis: 6379

You can also point `DATABASE_URL`/`REDIS_URL` to your own instances.

---

## Start the API

Build once, then run:

```
yarn workspace @squirrel/backend build
yarn workspace @squirrel/backend start
```

Hot‑reload mode (TypeScript watch + restart):

```
yarn workspace @squirrel/backend dev
```

Health checks:

- Base: http://localhost:8081/v1/health → 200 JSON

Notes:

- If you see Prisma/Redis connection messages, ensure Postgres/Redis are reachable.
- Env loader now reads `.env` from repo root even when running inside `apps/api-legacy`.

---

## Start the Web App

```
yarn workspace @sdl/web dev
```

Open http://localhost:5173

Proxy calls:

- Web dev server proxies `/v1` → `http://localhost:8081` (configured in `apps/web/vite.config.ts`).
- Check proxy health: http://localhost:5173/v1/health → 200 JSON

---

## Start Both Together

This repo includes a convenience script:

```
yarn dev:both
```

It runs the web and API dev servers in parallel.

---

## Authentication & CSRF

- Many API routes require authentication (Bearer access token).
- CSRF is enabled for unsafe methods. The frontend obtains a CSRF token from `/api/payments/security-context` (now a GET), then includes `x-csrf-token` on subsequent writes.
- In dev, unauthenticated beta routes return defaults in the UI (no noisy errors).

---

## Production / Docker

`infra/docker-compose.yml` provides Postgres, Redis, Meilisearch, and an Nginx‑served frontend image. It does not include the API container by default.

Typical options:

- Run the API on the host (port 8081) and publish the web image with a reverse proxy that forwards `/v1` to the host.
- Or add an API service to the compose file and configure Nginx to proxy `/api` to it.

---

## Scripts Reference

- `yarn dev:both` — Run web and API together (dev).
- `yarn workspace @sdl/web dev` — Run web (dev).
- `yarn workspace @sdl/web build` — Build web.
- `yarn workspace @squirrel/backend dev` — Run API with TS watch.
- `yarn workspace @squirrel/backend build` — Build API.
- `yarn workspace @squirrel/backend start` — Run compiled API.
- `yarn probe:health` — Probe `/api/health` directly and via web proxy.

---

## Operational playbooks

- [Continuous Testing & Automation](docs/ci-testing.md) — explains which `yarn test*` and smoke/perf suites to schedule in CI,
  plus a sample GitHub Actions workflow for fast feedback.
- [Workspace Operations Playbook](docs/operations-playbook.md) — documents workspace rollout, governance, incident response,
  and compliance duties so customer-facing teams have a repeatable runbook.

---

## Troubleshooting

- 404 at `http://localhost:8081/`
  - Expected previously; now redirects to `/api/health`.

- 500 at `/api/beta/flags/me`
  - Route requires auth; UI falls back to defaults. Not a connectivity issue.

- PrismaClientInitializationError: `Environment variable not found: DATABASE_URL`
  - Ensure `.env` exists at repo root and that `config/index.ts` is loading it (it does). Confirm Postgres is running and URL is correct.

- Redis connection refused
  - Start Redis: `docker compose -f infra/docker-compose.yml up -d redis`. Or set `REDIS_URL` to any reachable instance.

- Vite proxy not forwarding
  - Ensure the API listens on `PORT` that matches `apps/web/vite.config.ts` target (`http://localhost:8081`). If you change `PORT`, update the proxy target.

- Nest CLI `'schematics' binary path could not be found!`
- We do not use Nest CLI in dev. Use `yarn workspace @squirrel/backend dev` or `start`/`build` instead.

- Windows notes
  - Use PowerShell or CMD for the listed commands. If ports 4000/5173 are busy, stop conflicting processes or adjust `PORT` and the Vite proxy accordingly.

---

## Verifying Connectivity

1) Start Postgres/Redis (optional), then the API and Web.
2) Open:
  - http://localhost:8081/v1/health → 200
   - http://localhost:5173/api/health → 200 (proxied)
3) Interact with the app. Auth‑required routes may return 401/403 until you implement login or seed users.

---

## Project Structure (high level)

```
apps/
  api/           # NestJS API
  web/           # Vite + React app
config/          # Env loader and feature flags
infra/           # Docker compose for dev services
scripts/         # Dev helper scripts and health probe
```

---

## Support

If you run into issues following this guide, open an issue with:

- OS, Node, Yarn versions
- Logs from `yarn workspace @squirrel/backend start` and `yarn workspace @sdl/web dev`
- Output from `yarn probe:health`


### Docker Image Tagging

Production images for the gateway and each microservice follow the convention `squirrel-api/<service>:<version>`. Example tags:

- `squirrel-api/gateway:v1`
- `squirrel-api/auth-service:v1`
- `squirrel-api/user-service:v1`
- `squirrel-api/workspace-service:v1`
- `squirrel-api/api-runner-service:v1`
- `squirrel-api/ai-service:v1`
- `squirrel-api/billing-service:v1`
- `squirrel-api/notifications-service:v1`
- `squirrel-api/logs-service:v1`

Use semantic versioning or Git-based tags to distinguish releases before publishing images to your registry.
