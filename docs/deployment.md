# Deployment Notes

## Environment
- Populate `.env` based on `.env.example` and ensure secrets are injected via your secrets manager in production.
- Recommended to run PostgreSQL with connection pooling (pgBouncer). Prisma connection string already compatible.
- Redis must support Pub/Sub for token revocation fan-out.

## Observability Stack
- Configure OTLP collectors (e.g., OpenTelemetry Collector) reachable at `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Enable Prometheus scraping of `/metrics`. Grafana dashboards can consume the exported histogram for latency SLOs.

## Security
- TLS termination should happen upstream (e.g., reverse proxy or ingress). CSRF cookies marked `secure`, so ensure HTTPS in production.
- Rotate `JWT_SECRET`, `REFRESH_SECRET`, and `COOKIE_SECRET` regularly; sessions will invalidate automatically when revocation cache is flushed.

## Scaling
- Run multiple API replicas: Redis handles revocation synchronization and presence Pub/Sub.
- Session table indexes support `listActiveSessions` queries; run Prisma migrations to add new models/columns before deploying the new build.
- Use `turbo run build:all` to produce deterministic builds across workspaces.

## CI/CD Hooks
- Add pipeline steps to run `yarn lint:all`, `yarn test:all`, and `yarn build:all` prior to deployment.
- Optional: integrate `perf/` k6 scripts (see `yarn perf:smoke`) into performance regression gates once added.
