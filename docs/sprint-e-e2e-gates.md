# Sprint E E2E Gates

This checklist operationalizes Sprint E release gates for conflict resolution, AI/cloud-sync controls, analytics pipeline, and hosted hardening.

## Gate commands

```bash
# 1) Sync conflict resolution operations
cd packages/sync-client && npm run typecheck
cd apps/web && npx eslint src/components/LiveSessionPanel.tsx
cd apps/web && npx vitest run src/components/conflictResolutionStore.test.ts

# 2) VS Code AI + cloud-sync production controls
cd squirrel-api-vscode && npx vitest run src/ai/squirrelAI.spec.ts src/services/cloudSync.spec.ts
cd squirrel-api-vscode && npm run compile

# 3) Analytics pipeline quality endpoints
cd squirrel/backend && npx eslint src/modules/analytics/analytics.controller.ts src/modules/analytics/analytics.service.ts
cd squirrel/backend && npm test -- --runInBand src/modules/analytics/analytics.service.spec.ts

# 4) Hosted bootstrap hardening
bash -n scripts/hosted-bootstrap.sh
```

## Pass criteria

- Conflict notifications expose deterministic actions (`accept`, `decline`, `rebase`) in web UI and invoke sync-client resolution logic.
- VS Code AI falls back deterministically when remote is unavailable and can be configured to disable fallback.
- Cloud sync validates required config and retries transient errors.
- Analytics pipeline endpoint returns data quality, retention, and error-bucket summaries.
- Hosted bootstrap enforces tenant guardrail variables and emits rate-limit tfvars.

## Recovery drill

- Execute `docs/sync/conflict-recovery-drill.md` in staging and attach captured evidence to the release checklist.


## E2.3 rollout matrix

Validate these controls before promotion:

- AI rollback: set `@squirrel.vscode.ai.remoteEnabled=false` and verify local fallback path remains functional.
- AI canary: set `@squirrel.vscode.ai.remoteRolloutPercentage=0` (off) then `100` (full) and verify telemetry events appear.
- Cloud sync dry run: set `@squirrel.vscode.cloudSync.dryRun=true` and verify no network writes occur.
- Cloud sync circuit breaker: force repeated failures and verify cooldown skip logs trigger.
