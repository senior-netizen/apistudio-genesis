# Observability Stack

## Tracing
- `ObservabilityService` bootstraps the OpenTelemetry Node SDK with auto-instrumentations for HTTP, Express, ioredis, and Prisma.
- OTLP exporters target `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/{traces,metrics}` when configured. Development fallback writes spans to console when `OTEL_CONSOLE_EXPORTER_ENABLED=true`.
- Service metadata uses `service.name = squirrel-api` for downstream correlation.

## Metrics
- Prometheus registry exposed at `GET /metrics` via `MetricsController`.
- Default Node process metrics plus custom histogram `http_server_duration_seconds` measuring request latency.
- `main.ts` wraps every request with timer instrumentation and attaches request IDs to facilitate trace/metric joins.

## Logging
- Winston transports:
  - Console pretty logs for local development.
  - Rotating JSON files (`logs/squirrel-api-YYYY-MM-DD.log`) for ingestion by log processors.
- Request IDs injected through middleware and available in log contexts for correlation.

## Correlation
- CSRF and request ID middleware set `x-request-id` header, allowing downstream services and frontends to propagate context.
- Redis Pub/Sub events (revocations, presence) can be traced via instrumentation thanks to the auto-instrumentation coverage.

Consult `docs/deployment.md` for exporter provisioning and Prometheus/Grafana docker profiles.
