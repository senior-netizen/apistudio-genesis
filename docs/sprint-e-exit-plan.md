# Sprint E Exit Plan

This plan converts the remaining gaps into release-gating work with explicit exit criteria.

## Objective
Reach a release-candidate baseline by closing repo-wide build blockers, hardening Sprint C/D features, and completing operations-grade validation.

## Track 1 — Build & Typecheck Baseline (Release Gate)

### E1.1 VS Code extension compile baseline
**Goal:** `npm run compile` passes in `squirrel-api-vscode`.

**Tasks**
- Fix existing TS rootDir/test fixture mismatch for `auth.spec.ts` imports.
- Resolve missing `ws` typing and strict callback parameter typing in `ApiPanel.ts`.
- Fix existing `authManager.ts` discriminated-union typing regressions.
- Ensure `graphql-request` module typings resolve in extension package build graph.

**Exit criteria**
- `npm run compile` exits 0 in `squirrel-api-vscode`.

### E1.2 CLI compile baseline
**Goal:** `npm run build` passes in `squirrel-cli`.

**Tasks**
- Resolve workspace dependency for `@squirrel/cache` (package graph/path mapping).
- Verify no command build regressions from `--json` output integration.

**Exit criteria**
- `npm run build` exits 0 in `squirrel-cli`.

### E1.3 Web app typecheck baseline
**Goal:** `npm run typecheck` passes in `apps/web`.

**Tasks**
- Clear pre-existing AuthUser/AppState typing drifts.
- Fix test matcher typings and store/request slice promise typing errors.
- Normalize cross-package import extension settings.

**Exit criteria**
- `npm run typecheck` exits 0 in `apps/web`.

---

## Track 2 — Sprint C/D Feature Hardening

### E2.1 CLI JSON contract stability
**Goal:** guarantee schema-stable `--json` output.

**Tasks**
- Add contract tests for `workspace`/`team` JSON payloads.
- Version output shape (`schemaVersion`) for automation compatibility.
- Add non-zero exit + JSON error envelope standards.

**Exit criteria**
- Contract tests pass and docs include JSON schema examples.

### E2.2 Sync conflict workflow completion
**Goal:** move from conflict notification to deterministic conflict operations.

**Tasks**
- Add accept/decline/rebase user actions in UI.
- Replace fallback `divergence: 1` emission with server-provided divergence metadata everywhere possible.
- Add conflict metrics and staged recovery drill.

**Exit criteria**
- E2E scenario tests pass for conflict resolution actions.
- Recovery drill runbook validated once in staging.

### E2.3 VS Code AI + cloud sync production controls
**Goal:** complete operationalization of new extension capabilities.

**Tasks**
- Add integration tests for remote AI happy/failure/fallback behavior.
- Add cloud sync soak + retry behavior tests.
- Add rollout and rollback flags/telemetry dashboards.

**Exit criteria**
- Test matrix passes; rollback procedures documented.

---

## Track 3 — Backend/Platform Completion

### E3.1 Repo-sync OAuth completion
**Goal:** full provider exchange lifecycle beyond queued callback.

**Tasks**
- Implement and validate the `repo-sync-oauth-exchange` worker path end-to-end.
- Persist tokens securely with rotation/expiry handling.
- Add provider abstraction for additional providers after GitHub baseline.

**Exit criteria**
- E2E OAuth connect/callback/exchange/refresh flow passes.

### E3.2 Analytics pipeline completion
**Goal:** move from endpoint-level metrics to production monitoring pipeline readiness.

**Tasks**
- Add data quality checks, retention/rollup verification, and load/failure reports.
- Validate operational dashboards and on-call runbook updates.

**Exit criteria**
- Pipeline validation checklist complete with staging evidence attached.

### E3.3 Hosted SaaS operational hardening
**Goal:** finalize operator-grade deployment and resilience controls.

**Tasks**
- Validate tenant guardrails/rate limits across protected routes.
- Verify SLO dashboards + alert routes.
- Execute DR test and record RTO/RPO evidence.

**Exit criteria**
- Hosted readiness checklist signed off by platform + security owners.

---

## Suggested sequencing
1. **Week 1:** E1.1, E1.2, E1.3 (restore green baseline)
2. **Week 2:** E2.1, E2.2
3. **Week 3:** E2.3, E3.1
4. **Week 4:** E3.2, E3.3 + release-candidate signoff

## Release-candidate gate
All of the following must be true:
- Build/typecheck green for extension, CLI, and web.
- Contract/integration/E2E tests for Sprint C/D features green.
- Hosted + analytics + DR evidence attached in release checklist.
