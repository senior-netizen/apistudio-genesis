# Squirrel API Studio - Scale Readiness

## Statelessness rules

- API nodes must treat in-process state as ephemeral. Sync sessions and presence signals persist through Redis-backed state so API nodes remain stateless across deployments (`squirrel/backend/src/sync/sync.service.ts`, `apps/api/src/sync/service.ts`).
- Avoid writing to local disk; rely on Postgres/Prisma for durable storage and Redis for coordination/locking.
- Derive per-request context (request ID, correlation ID, tenant headers) through `RequestContextMiddleware` so work can be rerouted between instances.

## Multi-tenant model

- Core entities: `user`, `org`, `workspace`, `project`, `request`, `environment` (and derived scopes like `collection`, `secret`, `variable`).
- Isolation rules:
  - Every request should carry `x-org-id` / `x-workspace-id` headers when acting on tenant data.
  - Sync APIs enforce workspace membership; session and presence artifacts are distributed via Redis so tenants stay isolated across pods.
  - Rate-limit keys combine IP with org/workspace IDs to protect noisy neighbours.

## Logging, metrics, and tracing

- Shared logger: `@squirrel/observability` exports `createLogger` with correlation-aware mixins; Nest backend uses `AppLogger` wrapper.
- Correlation: `RequestContextMiddleware` issues/propagates `x-request-id` and `x-correlation-id`; middleware adds tenant hints (`x-org-id`, `x-workspace-id`, `x-actor-id`).
- HTTP logging: `RequestLoggingMiddleware` (Pino) captures structured fields plus tenant context and ignores noisy health/docs routes.
- Metrics & tracing: keep existing OTEL setup; log/meter names should include service name and tenant dimensions sparingly to avoid cardinality blow-ups.

## Rate limiting and quotas

- Pluggable hook: `@squirrel/observability` `createRateLimitMiddleware` wraps providers; backend uses Redis-backed provider in `RedisRateLimitMiddleware` (applied globally).
- Limits are keyed by IP + tenant identifiers and expose `x-rate-limit-*` headers; middleware now applies workspace-aware plan multipliers for throttling (FREE/TEAM/BUSINESS/ENTERPRISE).
- Guards like `RateLimitGuard` remain available for route-level overrides.

## State audit & migration targets

- `apps/api/src/sync/service.ts`: Redis-backed session and change coordination is used when `REDIS_URL` is configured, with in-memory fallback reserved for local development.
- `squirrel/backend/src/sync/sync.service.ts`: sessions and presence are persisted in Redis with TTL, and presence broadcasts fan out through Redis pub/sub for cross-pod visibility.
- Vector clocks and divergence data already use Redis; maintain short TTLs and consider sharding keys by workspace to reduce hot spots.
- File uploads and Prisma-backed records remain on Postgres; composite pull index `(scope_type, scope_id, server_epoch)` is required and now verified at service startup to catch stale environments.

## Sync partitioning plan (P1.4 follow-through)

- Trigger condition: begin partition rollout once `sync_change` exceeds ~50M rows or sustained pull latency (p95) crosses 200ms despite healthy index usage.
- Partition key: hash partition by `scope_id` to spread hot tenants while preserving point-lookups used by sync pull/push.
- Initial shape: 16 partitions for `sync_change` and `sync_state`, expandable to 32/64 when write amplification grows.
- Lifecycle:
  - Keep active partitions online for recent epochs.
  - Archive cold partitions/epochs to warehouse storage (Parquet/S3 or equivalent) before pruning.
  - Re-run `ANALYZE` after partition maintenance and monitor query plans for index regressions.

## Operational reminders

- Prefer feature flags/config to control rate limits and TTLs; defaults should be safe for multi-tenant bursts.
- When adding new data paths, ensure queries have covering indexes and add TODOs for archival/partitioning at >100M row scales.
