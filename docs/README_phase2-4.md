# Squirrel API Studio — Global Expansion (Phase 2–4)

This document captures the scaffolding delivered for the advanced roadmap. The
implementation focuses on type-safe NestJS modules, Prisma schema extensions,
and React screens required to unlock the upcoming product increments.

## Backend Enhancements

### AI 2.0 Suite
- `AiDiffService`, `RepoSyncService`, `AiCoDevService`, and `PredictiveErrorService`
  extend the existing AI module with diff summarisation, repository sync
  scaffolding, co-developer insights, and predictive anomaly scoring.
- `POST /api/ai/diff`, `POST /api/ai/co-dev/analyze`, `POST /api/ai/repo-sync`,
  and `POST /api/ai/predict-errors` endpoints expose the new capabilities.

### Collaboration & Teams
- Collaboration gateway broadcasts `SESSION_JOIN`, `REQUEST_RUN`, and
  `COMMENT_ADDED` events.
- New `TeamsModule` introduces CRUD endpoints, a reusable `TeamGuard`, and DTOs
  for workspace level role enforcement.

### Marketplace & Credits
- Marketplace service now supports subscriptions, usage metering, and review
  analytics.
- CLI gains `squirrel sdk`, `squirrel plugin`, and `squirrel credits` commands
  for developer workflows.

### Prisma Models
New tables include `PredictiveModel`, `UsageLog`, `EdgeMetric`,
`HubSubscription`, `HubReview`, `CreditsTransaction`, `AffiliateCode`, `Team`,
`TeamMember`, and `AuditReport`. Existing `HubApi` records receive a `metrics`
field for aggregated stats.

## Frontend Expansions
- Components for AI insights (`AIAdvisorPanel`, `DiffViewer`,
  `ErrorPredictorWidget`), collaboration (`LiveSessionPanel`, `CommentSidebar`),
  notifications, plugins, and credits workflows.
- Pages for Hub exploration/publishing, team management, affiliate tracking, and
  credit wallet management.

## Getting Started
1. Run `yarn install` at the repository root.
2. Generate Prisma artifacts: `yarn prisma generate --schema squirrel/backend/prisma/schema.prisma`.
3. Launch services with `yarn nx serve api` and `yarn nx serve web`.
4. Optional: invoke new CLI helpers, e.g. `yarn workspace @sdl/cli squirrel sdk generate`.

## Next Steps
- Wire OAuth 2.0 flows for repo sync providers.
- Connect AfricaEdge telemetry into `EdgeMetric` ingestion.
- Replace placeholder analytics with production monitoring pipelines.
- Track delivery of billing/compliance, sync conflict resolution, and hosted SaaS packaging workstreams via
  [`docs/gap-closure.md`](./gap-closure.md) to ensure the platform reaches parity with incumbent hosted offerings.
