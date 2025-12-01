# Squirrel API Studio — Platform Architecture Scaffold

This document explains how the new feature pillars map to the monorepo layout and how each surface integrates with the existing React client.

## Monorepo Layout

```
apps/
  cli/              # `squirrel` command line client scaffolding
  server/           # NestJS application hosting API, WebSocket and background services
src/                # Existing React client (apps/web)
docs/               # Architecture, migrations and AI prompt templates
```

Shared code will gradually be extracted into a forthcoming `packages/shared` workspace that can be consumed by the server, CLI, and web client.

## Feature Pillars & Modules

| Pillar | Module | Responsibility | Key Integrations |
| --- | --- | --- | --- |
| Squirrel Copilot | `apps/server/src/modules/ai` & `src/modules/copilot` | Natural language workflows that power request generation, documentation, optimization, and explanations. | Web client consumes `/api/ai/*` endpoints over HTTP + WebSockets for streaming. CLI will reuse the same services for prompt-driven automation. |
| Squirrel Sync | `apps/server/src/modules/sync` & `src/modules/sync` | Multi-user collaboration, live editing, comments, and Git-backed version control for API collections. | WebSockets via `apps/server/src/websocket`, PostgreSQL revision log, optional Git integrations surfaced in CLI. |
| Squirrel Cloud | `apps/server/src/modules/cloud` & `src/modules/cloud` | Cloud hub for projects, team access, and sharing. | Workspace selector toggles between local IndexedDB state and cloud-hosted collections via signed URLs. |
| Squirrel Watchtower | `apps/server/src/modules/watchtower` & `src/modules/watchtower` | Automated monitoring, scheduled tests, CI/CD hooks, and notifications. | Background workers + CRON jobs emit metrics consumed by dashboard widgets. CLI triggers ad-hoc runs. |
| Squirrel SecureVault | `apps/server/src/modules/securevault` & `src/modules/securevault` | Security tooling, OAuth/PCKE helpers, encrypted secrets management. | Local encrypted vault (IndexedDB) mirrors cloud KMS storage. Token tooling integrated across UI and CLI. |
| Squirrel Forge | `apps/server/src/modules/forge` & `src/modules/forge` | Visual API designer, mocking, and schema previews. | Shared schema definitions exported to OpenAPI/Postman. Mock servers can be run from CLI or within Electron/Tauri runtime. |
| Squirrel Metrics | `apps/server/src/modules/metrics` & `src/modules/metrics` | Real-time analytics, comparisons, and data retention. | Redis stores rolling metrics, PostgreSQL warehouses historical data. UI charts built with Tailwind + Shadcn components. |
| Extensibility & Performance | `apps/server/src/modules/plugins` & `src/modules/platform` | Plugin APIs, lazy loading, offline-first caches. | Plugin SDK shared between CLI and UI; offline mode uses IndexedDB + JSON snapshots. |

## Backend Foundations

- **NestJS Modules:** Each pillar is represented by an isolated module with its own controllers, services, DTOs, and entities. Real implementations will connect to PostgreSQL, Redis, and background workers. The current scaffold returns placeholder payloads so the frontend can be wired incrementally.
- **Configuration:** `apps/server/src/config/configuration.ts` centralizes environment-driven settings for the AI provider, data stores, and auth.
- **WebSockets:** A `websocket` directory (to be populated next) will host gateway definitions for Copilot streaming and collaboration cursors.
- **Migrations:** SQL and Prisma/TypeORM migrations will live in `docs/migrations/` until the database layer is fully implemented.

## Frontend & Desktop Integration

- The existing React app will be organized into feature-focused modules under `src/modules`. Each module will expose pages, panels, hooks, and stores that consume the backend contracts documented above.
- Light/dark mode persistence, onboarding, and shared UI primitives will live in a `src/modules/platform` workspace.
- Tauri configuration will reference the same build artifacts produced by Vite; offline caches rely on IndexedDB fallbacks.

## CLI & SDK

- `apps/cli` introduces the `squirrel` binary. Commands are scaffolded for cloud sync, testing, and mock servers, with future work to invoke server APIs directly.
- Plugin SDK entry points will live beside CLI commands to allow extension authors to register new capabilities programmatically.

This scaffold intentionally keeps implementations light while providing clear seams for the upcoming development sprints.
