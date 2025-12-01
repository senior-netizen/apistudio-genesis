# Squirrel API Studio — Codex Bootstrap Prompt

This document captures a single-shot, copy-ready instruction block that can be provided to advanced code generation systems (such as OpenAI Codex) to scaffold the full Squirrel API Studio platform on top of the existing repository. The prompt is designed to enforce production-grade quality standards, ensure feature completeness, and keep parity with our current architecture direction.

---

You are an expert full-stack engineer. Generate a complete, production-grade **SaaS API tooling platform** called **Squirrel API Studio** that surpasses Postman/Apidog/SwaggerHub. Deliver a **running monorepo** with frontend, backend, CLI, and infra. Include seed data, tests, and docs. Make everything actually work end-to-end.

## 0) Tech Stack & Project Shape

* **Package manager:** pnpm workspaces (monorepo)
* **Monorepo layout:**

  ```
  /apps
    /web                # React frontend (Vite + TS + Tailwind)
    /api                # NestJS backend (TS) + Prisma (PostgreSQL)
    /cli                # Node CLI (TypeScript, Commander)
  /packages
    /ui                 # Shared UI components (React + Tailwind)
    /sdk                # Auto-generated TypeScript SDK for the API
    /eslint-config      # shared lint rules
    /tsconfig           # shared ts configs
  /infra
    docker-compose.yml  # Postgres, Redis, MinIO (or local), Mailhog
    nginx.conf          # reverse proxy
  ```
* **Backend:** NestJS, Prisma ORM, PostgreSQL, Redis (cache, queues), WebSockets, Zod validation, Passport (JWT & OAuth), BullMQ workers, OpenAPI spec generation, S3-compatible storage (MinIO).
* **Frontend:** React 18, Vite, TypeScript, Tailwind, shadcn/ui, React Router v6, Zustand (or Redux Toolkit) for client state, React Query for server state, Monaco editor for code/json, Recharts for analytics, reactflow for visual test flows, msw for mocks.
* **Auth:** Email/password + OAuth (Google & GitHub). JWT access/refresh, 2FA (TOTP), role-based access control (RBAC) with orgs/teams.
* **Realtime:** WebSockets for collaborative editing and live request sessions.
* **Testing:** Vitest + Playwright (web), Jest (api), supertest (api), smoke tests in CLI.
* **CI:** GitHub Actions workflow (lint → test → build → typecheck).
* **Docs:** /README.md for root, plus /apps/*/README.md with run scripts & screenshots.

## 1) Core Features (Must be working)

### Workspaces, Projects & Collections

* Multi-tenant orgs/teams with roles (Owner, Admin, Editor, Viewer).
* Create/read/update/delete **Projects**. Inside a project:

  * **Collections** (folders) of API requests.
  * **Requests**: REST, GraphQL, gRPC, WebSocket, and raw TCP/UDP test (stub OK).
  * Environments & variables (global, workspace, project, local) with secrets.
  * Pre-request & test scripts (Node sandbox, limited APIs: crypto, date, env vars).
  * Import/Export: Postman Collections, OpenAPI (3.0/3.1), Swagger 2, AsyncAPI (store and render).
* **Collaboration:** Real-time presence cursors, conflict-free request edits (simple server-side CRDT or last-write-wins with patching), activity timeline.

### Request Builder & Runner

* Tabs: Params, Headers, Body (raw, form-data, x-www-form-urlencoded), Auth (Basic, Bearer, OAuth2 flows), Scripts, Tests.
* Send requests with history, save responses (body, headers, status, time, size).
* Binary & image preview, JSON formatter, cURL copy, code snippet generator (fetch/axios/node/python/go).
* WebSocket tester (connect, send, receive, auto-reconnect) and GraphQL explorer.
* gRPC: load .proto, pick method, send request (ok to mock the channel but show working echo example via backend).
* **Rate-limit & retry** utilities in runner; SSL options & proxy support (inherit OS/ENV proxy).

### Mock Servers & Contract Testing

* Mock server per project (deterministic & dynamic with templates).
* Contract testing service: validate responses against OpenAPI schemas, produce human-readable reports. Gate CI with fail on schema drift.

### Test Flows (Visual)

* **React Flow** canvas to compose test pipelines (nodes: HTTP Request, Delay, Assert, Branch, Loop, Extract Var, gRPC Call, WS Send/Wait).
* Run runner with visual progress, logs, and artifacts; export/import flows (JSON).
* Schedule monitors (cron) to run flows on server, store results, and alert on failures.

### API Catalog & Governance

* Central catalog of services (OpenAPI/AsyncAPI), versions, owners, lifecycles.
* Governance rules: naming, auth presence, error models; lints during import/CI.
* **Portal mode:** generate hosted documentation per project with try-it widgets.

### Analytics & Observability

* Per-request metrics: latency, status code distribution, success rate, data transferred.
* Per-flow metrics and historical trends.
* Lightweight proxy option in backend to capture live metrics when enabled.

### Security Tools

* Secrets management UI (never print raw; encrypt at rest).
* Basic security scans: check TLS, token exposure in URLs, sensitive headers.
* Environment diff & secret rotation helpers.

### AI Assistant (local first, API-agnostic)

* Prompt box with “Generate request,” “Write tests,” “Explain response,” “Create flow,” “Fix schema.”
* Implement using a provider interface; ship a **mock AI provider** by default and a simple local rule-based assistant so the buttons work without external keys.

### User Management, Billing-Ready Hooks

* Email verification, password reset, 2FA, sessions page, audit log.
* Add Paynow checkout placeholders + billing page UI (mocked tiers: Free/Pro/Team).

### CLI (Squirrel)

* Installable via `pnpm -w build && pnpm -w --filter @squirrel/cli pack`.
* Commands:

  * `squirrel login`
  * `squirrel push` (push local collections/flows to cloud)
  * `squirrel run collection <id>` / `squirrel run flow <id>`
  * `squirrel mock start` / `stop`
  * `squirrel lint openapi ./spec.yaml`
  * `squirrel monitor create --flow <id> --cron "*/5 * * * *"`
  * `squirrel env pull|push`
* Non-zero exit on failed tests; JSON & JUnit reporters; supports `--proxy`, `--env`, `--timeout`, `--bail`.

## 2) Auth, RBAC, and Security

* Org membership + invites; project-level permissions enforced on API.
* JWT auth with refresh tokens, HTTP-only cookies in web.
* 2FA TOTP enroll/verify.
* OWASP best practices: input validation (Zod pipes), helmet, CORS config, rate limiting.
* Secrets encrypted with a server-side key; .env.example provided.
* Audit log entries for sign-in, token refresh, org changes, project changes.

## 3) Database & Prisma Models (minimum)

* User, Session, TwoFactorSecret, Organization, Team, Membership (role enum), Project, Collection, Request, Environment, Variable, Secret, Flow, FlowRun, Monitor, MockRoute, APISpec, Activity, AuditLog.
* Include Prisma migrations + seed script that creates:

  * An org with demo users, a project “Sample Petstore”, environments (dev/staging/prod), a few requests, one flow, one monitor, a mock server route, and an OpenAPI spec.

## 4) API Endpoints (illustrative)

* `/auth/*`: login/register/logout/refresh/2fa
* `/orgs/*`, `/projects/*`, `/collections/*`, `/requests/*`
* `/environments/*`, `/variables/*`, `/secrets/*`
* `/flows/*`, `/runs/*`, `/monitors/*`
* `/mock/*` (project-scoped)
* `/catalog/*`, `/specs/*`
* `/analytics/*`
* `/ai/*` (mock provider)
* WebSocket namespace: `ws://.../realtime?projectId=...` (presence + live logs)

All endpoints must be implemented with DTOs, validation, and e2e tests for a representative subset.

## 5) Frontend Pages & UX

* **Auth:** Login, Register, 2FA, Forgot/Reset password.
* **Dashboard:** Workspaces, recent activity.
* **Project:** Sidebar (collections, envs, flows, monitors), Request Builder main area, Response viewer, Console logs.
* **Flows:** Visual builder with node palette; run panel.
* **Catalog:** Specs browser + doc portal preview.
* **Analytics:** Charts for requests/flows.
* **Settings:** Org, Team, Billing (mock), API keys, Personal tokens, Sessions, Audit log.
* **AI Assistant panel** dockable on the right; action buttons integrated into Request Builder & Flows.

Make the UI clean and keyboard-friendly. Persist local UI state. Add toasts for actions. Dark/light theme toggle.

## 6) DX, Quality, and Scripts

* Root scripts: `pnpm i`, `pnpm dev` (concurrently runs api + web), `pnpm test`, `pnpm lint`, `pnpm build`.
* Web `.env` example (VITE_*) and API `.env` example.
* Swagger UI auto at `/api/docs`. Export OpenAPI to `/packages/sdk` and generate a TS SDK.
* Precommit hooks (lint-staged + prettier).
* Error boundaries and suspense loaders.
* Seed command: `pnpm -w seed` runs prisma seed and creates demo org/project.

## 7) Infra & Local Run

* `docker-compose.yml` with services:

  * postgres:15
  * redis:7
  * minio (S3-compat) + console
  * mailhog
  * api (build args/env wired)
  * web
  * nginx proxy (serving web on http://localhost:8081 and api at /api)
* Healthchecks and depends_on.
* Provide `make up` / `make down` targets (optional).

## 8) Tests & Examples

* API: unit + e2e (Jest + supertest) for auth, projects, requests, flows run, mock routes.
* Web: Vitest component tests for RequestBuilder, Flow canvas nodes; Playwright smoke test that logs in, creates a project, sends a request to httpbin.org, asserts 200, saves history, and runs a simple flow.
* CLI: run a sample flow and exit(1) on failed assert; snapshot of JUnit output.

## 9) Seed Demo Content

* “Sample Petstore” project with:

  * GET /pets, POST /pets, WS echo, GraphQL sample.
  * Flow: GET → Assert 200 → Extract id → POST with var → Delay → GET by id.
  * Monitor every 5 minutes (disabled by default).
  * Mock route `/pets` with dynamic responses.

## 10) Documentation

* Root README: quickstart, architecture diagram, workspace layout.
* Web README: commands, env vars, screenshots.
* API README: prisma schema, migrations, queues, cron workers.
* CLI README: command help, examples, CI usage.

## 11) Acceptance Criteria (don’t skip)

* `pnpm i && pnpm dev` brings up a working system locally (or `docker compose up`).
* Can register → verify email (via Mailhog) → login → enable 2FA → create org → invite user.
* Create project, collection, request; send REST request; see response + analytics update.
* Import an OpenAPI file; catalog shows it; portal view renders; contract checks run.
* Create a mock route and hit it from the Request Builder successfully.
* Build a flow on the canvas → run it → see logs and artifacts → export/import flow JSON.
* Start a monitor (cron) → result stored; CLI can `run flow <id>` and exit correctly.
* AI assistant buttons produce usable outputs via mock provider.
* CLI `squirrel lint openapi` returns rule violations for a bad spec.
* All tests pass locally; CI workflow succeeds.

## 12) Coding Style

* Strict TypeScript everywhere. No `any` unless unavoidable (justify).
* Exhaustive error handling with typed results.
* Accessibility: proper labels, focus traps on modals, keyboard nav.

Generate all files, with complete implementations (no TODOs), ready to run.

---

If you need to infer details, choose sensible defaults that satisfy the Acceptance Criteria. Output the full repo file tree and the contents of all key files inline.
