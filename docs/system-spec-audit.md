# Squirrel API Studio Spec Alignment Audit

## Observed Coverage
- **Admin tokens and Root Mode controls**: `SecurityCenterService` implements workspace/org/system API key issuance with hashed secrets, audit logging, and Root Mode gating via configuration flags for privileged operations. Workspace admin checks precede mutations and system-key creation enforces elevated roles. 【F:squirrel/backend/src/modules/security-center/security-center.service.ts†L38-L124】
- **Data governance**: Retention logic and legal-hold awareness are validated through tests that block deletion under active legal hold and apply retention sweeps with workspace/org policies. 【F:packages/retention/tests/retention.test.ts†L166-L220】
- **Admin Security Center expectations**: Documentation spells out API key placement, Root Mode/MFA/device-trust requirements, and emergency rotation endpoints for audited rotations and rollbacks. 【F:docs/admin-security-api-keys.md†L1-L72】【F:docs/admin-security-api-keys.md†L90-L114】

## Gaps Against System Specification
- **Region health display and routing status**: No UI currently consumes the region health API, leaving observability missing in the dashboards even though backend coverage now exists. 【F:squirrel/backend/src/modules/health/region-health.controller.ts†L1-L32】
- **Multi-tenant global search UI**: Backend search now includes users/workspaces/api keys/audit logs with RBAC-aware scoping, but there is no federated UI wired to the enriched endpoint. 【F:squirrel/backend/src/modules/search/search.service.ts†L1-L87】【F:squirrel/backend/src/modules/search/search.controller.ts†L1-L16】

## Recommendations
- Add an admin “Region Health” panel that surfaces the new `/v1/regions/health` endpoint alongside routing status and residency compliance metadata.
- Wire the global search UI to the expanded backend endpoint and ensure federation across users, workspaces, API keys, and audit events respects role and workspace scoping.
