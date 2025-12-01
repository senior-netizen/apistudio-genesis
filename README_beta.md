# Squirrel API Studio – Beta Access Guide

This document outlines how to operate the beta access stack that complements the existing production experience.

## Backend
- Run Prisma migrations to provision beta tables and enums:
  ```bash
  yarn prisma migrate deploy
  ```
- The NestJS `BetaModule` exposes user-facing endpoints under `/beta/*` and administrator endpoints under `/beta/admin/*`.
- Rate limits for feedback and invite redemption are provided by `BetaRateLimitMiddleware` and can be tuned via the following environment variables:
  - `FEEDBACK_RATE_LIMIT_PER_USER` (default `10`)
  - `FEEDBACK_RATE_LIMIT_PER_IP` (default `30`)
  - `REDEEM_RATE_LIMIT_WINDOW_SEC` (default `30`)
- Toggle cohort-wide features from the `BetaConfig` record (ID `1`) via `/beta/admin/config`. All beta testers honour the `BETA_FORCE_SANDBOX` override when set to `true`.

## Frontend
- The React app wraps routing with `BetaFlagsProvider`, which fetches `/beta/flags/me` and exposes feature toggles through hooks.
- Beta UI surfaces include invite management, feedback triage, analytics dashboards, and the floating `FeedbackWidget` for testers.
- Experimental surfaces (UI v2, payments sandbox banner, etc.) respond automatically to the resolved beta flags.

## Payments Sandbox
- When `paymentsSandbox` is enabled, checkout flows create synthetic references and deterministic outcomes. Transactions are marked with `metadata.isBetaTransaction` for safe reconciliation.

## Feedback Operations
- Testers can file feedback via the widget or `POST /beta/feedback`. Admins manage status updates through the admin console or `/beta/admin/feedback` endpoints.

## Analytics & Retention
- Weekly cleanup archives aged beta events and feedback beyond the retention window (`BETA_RETENTION_DAYS`, default `90`).
- Analytics endpoints summarise tester adoption, engagement, and feedback distribution for dashboards in the admin UI.

## Privacy Considerations
- Beta events redact email addresses before persistence.
- Feedback submissions strip HTML tags and sensitive tokens to avoid leaking secrets in logs.

