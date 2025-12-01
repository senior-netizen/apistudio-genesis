# Getting Started (Local Development)

This guide is the hands-on checklist for running Squirrel API Studio locally without 404/CORS surprises. For a deeper map of the repo and diagrams, see `docs/ARCHITECTURE.md`.

## Prerequisites
- Node.js 20+ with Corepack enabled (`corepack enable`).
- Yarn 4.10.3 (pinned via `.yarnrc.yml`).
- Postgres and Redis (use Docker helpers if you do not have local installs).
- Optional: Docker Desktop to run infra services quickly.

## Install dependencies
```bash
corepack enable
yarn install
```

## Configure environment
1. Copy the sample env:
   ```bash
   cp .env.example .env
   ```
2. Key values for a smooth dev run:
   - `PORT=8081` so the Vite proxy hits the right backend port.
   - `CORS_ORIGINS=http://localhost:5173` to allow credentialed browser calls.
   - Strong `JWT_SECRET` / `COOKIE_SECRET` / `ENCRYPTION_KEY_BASE64` values.
   - `DATABASE_URL` and `REDIS_URL` pointing to reachable services.

## Start services (in order)
1. **Datastores** — Optional but recommended Docker helper:
   ```bash
   docker compose -f infra/docker-compose.yml up -d postgres redis
   ```
2. **Backend API** — NestJS server with versioned `/v1` routes:
   ```bash
   yarn workspace @squirrel/backend dev
   ```
3. **Web client** — Vite dev server with API/WebSocket proxies:
   ```bash
   yarn workspace @sdl/web dev
   ```
4. Optional: run the VS Code extension or desktop shell after the backend is healthy.

## Verify before opening the UI
- Backend health: `curl http://localhost:8081/v1/health`
- Proxy health via Vite: `curl http://localhost:5173/v1/health`
- CSRF token (for cookie flows): `curl -i http://localhost:8081/auth/csrf`
- Check browser network tab for `Set-Cookie: XSRF-TOKEN` when hitting `/auth/csrf`.

## Tips to avoid 404/CORS
- Always prefix API calls with `/v1`; the backend enables URI versioning.
- Keep `VITE_API_URL` aligned with the backend origin (no trailing slash).
- Include the Vite origin in `CORS_ORIGINS` when running the browser UI.
- For POST/PUT/PATCH/DELETE with cookies, send `x-csrf-token` matching `XSRF-TOKEN`.

## Running without Docker
- Use local Postgres/Redis and point `DATABASE_URL`/`REDIS_URL` accordingly.
- Keep the same `PORT` and proxy settings; only the database hosts change.

## Smoke checks
- [ ] Backend console shows `Squirrel backend listening on http://localhost:8081/v1`.
- [ ] `/v1/health` returns `{ status: "ok" }`.
- [ ] `XSRF-TOKEN` cookie is issued after hitting `/auth/csrf`.
- [ ] WebSocket connects to `/ws` without CORS errors in browser dev tools.

## Troubleshooting
- **404 on health check**: Confirm backend `PORT` is 8081 and you are hitting `/v1/health` (not `/health`).
- **CORS blocked**: Add `http://localhost:5173` to `CORS_ORIGINS` and restart backend.
- **CSRF 403**: Call `/auth/csrf` first, then include `x-csrf-token` header with the cookie value.
- **Database errors**: Verify Postgres is running and credentials in `DATABASE_URL` are valid.
- **Proxy mismatch**: Ensure the Vite dev server is running; it forwards `/v1`, `/auth`, `/api`, and `/ws` to the backend.
