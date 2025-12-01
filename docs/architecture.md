# Architecture Overview

## Runtime Layout
- **NestJS API (`squirrel/backend`)** orchestrates domain modules. The former implementation now lives under `apps/api-legacy` for archival purposes. Cross-cutting services include `AuthModule`, `SessionModule`, `RedisModule`, `AuditModule`, `ObservabilityModule`, and `RealtimeModule`.
- **Prisma** schema gains append-only models `Session` and `DeviceCode` plus an optional `passwordHash` column on `User` for password-based authentication.
- **Redis** is used for token revocation, prompt caching, and realtime Pub/Sub (`squirrel/backend/src/infra/redis`).
- **OpenTelemetry** Node SDK bootstraps tracing/metrics instrumentation (`squirrel/backend/src/infra/otel/opentelemetry.ts`).
- **Prometheus** metrics exposed via `/metrics` controller backed by `MetricsService`.
- **WebSocket Gateway** under `/ws` for presence broadcasts (`squirrel/backend/src/modules/realtime`).

## Request Flow
1. HTTP requests enter via Express, passing through security middleware (Helmet, compression, CSRF, request ID).
2. Validation pipe enforces DTO schemas (class-validator) globally.
3. Throttler guard enforces rate limits per endpoint.
4. Authenticated routes rely on access tokens (JWT) validated by `JwtStrategy` with Redis-backed revocation checks.
5. Session mutations are persisted via Prisma and mirrored to Redis for cross-instance invalidation.
6. Metrics middleware records latency histograms for Prometheus scraping.

## Feature Flags
Feature toggles read from environment using `config/index.ts` helper `isFeatureEnabled`. RBAC guards and realtime gateway consult this helper to avoid altering legacy behaviour unless the flag is enabled.

## Logging & Audit
- Structured JSON logs via Winston (console + rotating file).
- Business events recorded in `AuditLog` through `AuditService`. Endpoint `/admin/audit` requires `admin:audit:read` scope.

Refer to `docs/auth-flows.md` for authentication sequence diagrams and `docs/observability.md` for telemetry pipeline specifics.
