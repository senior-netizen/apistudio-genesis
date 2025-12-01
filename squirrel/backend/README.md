# Squirrel Backend – Local Testing Guide

This guide shows how to set up, run, and test the Squirrel API Studio backend locally, including database/Redis, environment variables, scripts, and a few smoke checks you can use to verify key flows.

## Quick Start (TL;DR)

- Requirements: Node 18+ (or 20+), Yarn 4, PostgreSQL 14+, Redis 6+
- From repo root: `yarn install`
- DB: create a local Postgres database and set `DATABASE_URL`
- Backend env (PowerShell example):
  - `$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/squirrel'`
  - `$env:JWT_SECRET = 'dev-only-secret-change-me'`
  - `$env:ENCRYPTION_KEY_BASE64 = 'pQe4sO0b0n2O1WwGkLZr7h1jV5n6u8y0QhP3q6t9w2A='` (must decode to 32 bytes)
  - `$env:REDIS_DISABLED = 'true'` (optional, makes rate limiting a no‑op in dev)
  - `$env:OWNER_EMAIL = 'founder@example.com'`
  - `$env:OWNER_PASSWORD = 'founder-dev-password'` (auto-provisions founder login)
- Build: `cd squirrel/backend && yarn build`
- Run API: `yarn start`
- Swagger (dev only): http://localhost:8081/docs
- Tests: `yarn test` (unit), `yarn test:e2e` (end‑to‑end)

## Prerequisites

- Node.js 18+ or 20+ with Corepack (Yarn 4). Verify with `node -v` and `yarn -v`.
- PostgreSQL 14+ running locally or accessible via TCP.
- Redis 6+ (optional for development – you can set `REDIS_DISABLED=true` to skip Redis for rate limiting and device flow storage; production should use Redis).

## Environment Configuration

Configuration is validated by Zod in `src/config/env.validation.ts`. Sensible defaults are provided for development; production enforces stricter checks.

Minimum variables for local testing (PowerShell):

```
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/squirrel'
$env:JWT_SECRET = 'dev-only-secret-change-me'
# 32 bytes base64; generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
$env:ENCRYPTION_KEY_BASE64 = 'pQe4sO0b0n2O1WwGkLZr7h1jV5n6u8y0QhP3q6t9w2A='
# Optional in dev: disable Redis-backed features (rate limit becomes permissive)
$env:REDIS_DISABLED = 'true'
# If using Redis instead, set
# $env:REDIS_URL = 'redis://localhost:6379'
# Optional CORS origins (comma-separated); in prod, this must be set.
$env:CORS_ORIGINS = 'http://localhost:5173,http://localhost:3000'
# Founder credentials – change these before deploying!
$env:OWNER_EMAIL = 'founder@example.com'
$env:OWNER_PASSWORD = 'founder-dev-password'
```

Notes:
- Production will refuse to boot if `JWT_SECRET` or `ENCRYPTION_KEY_BASE64` are left at defaults, or if `CORS_ORIGINS` is empty.
- Cookies are `httpOnly`, `secure`, and `sameSite: 'lax'`. When testing via curl/Postman, you may need to capture/forward the `refresh_token` cookie manually.

## Install Dependencies

From the monorepo root:

```
yarn install
```

This installs all workspace dependencies and runs backend `postinstall` (`prisma generate`).

## Database Setup (PostgreSQL)

- Ensure your `DATABASE_URL` points to a writable database.
- Apply migrations and generate the Prisma client:

```
cd squirrel/backend
# Ensure Prisma client is up-to-date
yarn prisma:generate
# Apply migrations to your target database
yarn prisma:migrate
```

If you have a seed script, run it:

```
yarn seed
```

## Running the Backend

- Build TypeScript:

```
cd squirrel/backend
yarn build
```

- Start HTTP API service:

```
yarn start
# or for dev with hot-reload (requires Nest CLI):
yarn start:dev
```

- Start background worker (for queued request execution):

```
yarn start:worker
```

Default port is `8081`. Override by setting `PORT`.

Swagger UI is available at `/docs` in non‑production environments.

## Testing

### Unit Tests

```
cd squirrel/backend
yarn test
```

Runs Jest unit tests in-band. You can filter by test name:

```
yarn test -t "my test name"
```

### Smoke Tests

```
yarn test:smoke
```

Executes tests tagged with “smoke” (if present) and succeeds if none exist.

### End-to-End Tests

```
cd squirrel/backend
# Make sure DATABASE_URL is set and migrations applied
yarn prisma:migrate
# Optionally disable Redis for test runs
$env:REDIS_DISABLED = 'true'
yarn test:e2e
```

E2E tests usually bootstrap the Nest app in-memory with Supertest. If any test expects a running instance, start the server separately on the configured `PORT`.

## Manual Smoke Checks (curl)

- Health (if exposed via module):

```
curl -i http://localhost:8081/health
```

- Variables CRUD (JWT bearer token or cookie required):

```
curl -s -X GET http://localhost:8081/v1/workspaces/<workspaceId>/variables \
  -H 'Authorization: Bearer <access-token>'
```

- Register/login flow:

```
# Register
curl -s -X POST http://localhost:8081/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"Aa!23456","displayName":"Me","workspaceName":"My WS"}'

# Login
curl -s -X POST http://localhost:8081/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"Aa!23456"}' -i
```

The login response sets a `refresh_token` cookie and returns `{accessToken, refreshToken}`. Use the bearer token for authorized endpoints:

```
ACCESS=... # from login response
curl -s http://localhost:8081/v1/auth/me -H "Authorization: Bearer $ACCESS"
```

## Variable Management API contract

Variables power the request runner and are consumed directly by the web client. To preserve frontend/backward compatibility, the
response DTOs live in [`src/modules/variables/dto/variable-response.dto.ts`](./src/modules/variables/dto/variable-response.dto.ts)
and are annotated with “DO NOT BREAK – public API contract”.

### Response envelope

```
GET /v1/workspaces/:workspaceId/variables
{
  "global": [
    { "id": "var_123", "key": "API_KEY", "value": "...", "scope": "global", "enabled": true }
  ],
  "environments": [
    {
      "environmentId": "env_123",
      "environmentName": "Staging",
      "variables": [
        { "id": "var_456", "key": "BASE_URL", "value": "https://staging", "scope": "environment", "enabled": true }
      ]
    }
  ]
}
```

- `scope` is either `global` or `environment` and is required by the UI when grouping records.
- `enabled` defaults to `true`; “local” variables remain client-only.
- Future metadata (descriptions, secrets) should be added to the shared DTO file so both backend and frontend stay in sync.

Create/update/delete endpoints now return the same sanitized `VariableResponseDto`, guaranteeing that callers never see raw
Prisma records.

## Redis & Rate Limiting

- In development you can set `REDIS_DISABLED=true` to run without Redis (rate limiting becomes permissive; device code features use in-memory no-ops).
- In production, set `REDIS_URL` and ensure Redis is reachable; rate-limiting and device authorization flow rely on it.

## Founder Account Provisioning

- When the API boots it ensures an account exists whose email matches `OWNER_EMAIL`. If it’s missing, a user plus a “Founder HQ” workspace are created automatically.
- On every boot the provisioner also checks whether the stored password hash matches `OWNER_PASSWORD`; if not, it rotates the hash so you can reset the password by editing `.env`.
- Use these credentials to log into the frontend and access founder-only routes (control center, admin tools, etc.).
- Always change the defaults (`OWNER_EMAIL` and `OWNER_PASSWORD`) before deploying beyond local development.

## Worker SSRF Protections

The run worker only allows `http/https` URLs and blocks localhost, private, and link-local IP ranges. Maximum response size defaults to 1MB and timeout to 5s. Tune via:

```
$env:WORKER_MAX_RESPONSE_BYTES = '1048576'
$env:WORKER_FETCH_TIMEOUT_MS = '5000'
```

## CORS & Swagger

- CORS must be explicitly configured in production: set `CORS_ORIGINS` to a comma-separated list.
- Swagger `/docs` is served only when `NODE_ENV !== 'production'`.

## Troubleshooting

- “ENCRYPTION_KEY_BASE64 must decode to 32 bytes”: generate a new key and ensure it’s base64 of exactly 32 bytes.
- “CORS_ORIGINS must be set in production”: set `CORS_ORIGINS` (comma separated) or switch `NODE_ENV` to `development` for local runs.
- Jest/E2E DB errors: confirm `DATABASE_URL` points to a test DB and run `yarn prisma:migrate`.
- Redis connection errors: either start Redis locally or use `REDIS_DISABLED=true` during local testing.
- Founder login fails: confirm the backend `.env` has the intended `OWNER_EMAIL`/`OWNER_PASSWORD`, restart the API so the provisioner re-runs, and use those credentials against `POST /v1/auth/login`.

## Useful Scripts (from backend package.json)

- `yarn build` – compile TS to `dist/`
- `yarn start` – run compiled server (`dist/main.js`)
- `yarn start:dev` – run dev server with watch (Nest CLI)
- `yarn start:worker` – run background worker (`dist/workers/run.worker.js`)
- `yarn test` / `yarn test:e2e` / `yarn test:smoke` – run tests
- `yarn prisma:generate` / `yarn prisma:migrate` – Prisma tasks
- `yarn seed` – optional data seeding

---

If you’d like, I can add a `.env.example` file with the variables above, plus a small PowerShell/Unix script to bootstrap a local Postgres and Redis via Docker for one‑command setup.
