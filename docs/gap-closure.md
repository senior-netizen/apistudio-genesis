# Gap Closure Initiatives

This document tracks the concrete engineering workstreams required to match the turnkey experience of hosted API platforms. It
expands the "Gaps to close" and "Next steps" called out during the platform audit and assigns milestones for billing/compliance,
sync conflict resolution, and managed hosting.

## 1. Production Billing & Compliance

**Objective:** Replace mocked billing flows with auditable, multi-currency payments that pass enterprise compliance reviews.

### Paynow-first monetization stack
- Model Paynow billing tiers so Free, Pro, and Team plans map to concrete Ecocash/ZIPIT checkout amounts.
- Replace mocked gateways with the production `PaynowService`, wiring upgrade flows, marketplace purchases, and credits straight
  into Paynow references.
- Persist Paynow transaction references on `HubSubscription`, `BillingInvoice`, and `CreditsTransaction` rows for full ledger
  visibility.

> **Implementation:** `BillingService` now exclusively orchestrates Paynow payments, applies localized pricing, and stores
> Paynow references for upgrades, credits, and marketplace keys.

### Credits settlement & invoicing
- Normalize credit purchases/redemptions through the Paynow ledger to ensure CLI/API usage translates into billable units.
- Emit nightly settlement jobs that reconcile Paynow transaction totals against internal usage logs and raise PagerDuty alerts on
  mismatches > 1%.
- Ship downloadable VAT-compliant invoices by extending the existing `AuditReport` export job.

### Compliance guardrails
- Tag Paynow transaction metadata with `workspaceId` and `orgId` so audit trails tie back to governance events.
- Add SOC2-ready logging by mirroring billing events into the `AuditReport` table and retaining for 400 days.
- Update `docs/operations-playbook.md` with quarterly access review steps once the billing console is live.

## 2. Hardened Sync Conflict Resolution

**Objective:** Graduate Automerge-powered workspace sync from prototype to production-grade collaboration.

### Deterministic merge testing
- Build a fuzzing harness in `libs/sync/` that replays concurrent edits, ensuring Automerge patches converge across clients and
  the gateway.
- Capture conflicting edits as fixtures inside `docs/sync/cases/` so regressions are reproducible in CI.
- Expand CI with `yarn test:sync` to run the harness on every pull request.

> **Implementation:** The `@sdl/sync-harness` workspace plus the `docs/sync/cases/*` fixtures now power `yarn test:sync` so
> every pull request replays curated conflicts and deterministic fuzzing.

### Presence & delta reconciliation
- Persist per-session vector clocks in Redis to detect late writers and request a server-side rebase when divergence exceeds the
  configured threshold.
- Emit `SYNC_CONFLICT` events over the collaboration gateway so the UI can prompt the user to accept/decline merges.
- Document operator playbooks for forcing a workspace snapshot restore when CRDT recovery fails.

> **Implementation:** `SyncService` mirrors vector clocks into Redis, short-circuits divergent pushes, and emits `sync.conflict`
> payloads through `SyncGateway`. The new recovery steps live in `docs/sync/README.md`.

## 3. Hosted Infrastructure & SaaS Packaging

**Objective:** Offer a reference managed deployment so customers are not required to self-host every component.

### Managed control plane
- Publish Terraform modules that provision the public gateway, core microservices, and managed PostgreSQL/Redis in a single GCP/AWS
  project.
- Bundle Grafana, Loki, and Tempo dashboards with default SLOs and alert policies so customers inherit mature observability.
- Ship a "one command" bootstrap script (`scripts/hosted-bootstrap.sh`) that pulls secrets from 1Password/Vault and applies the
  Terraform stack.

> **Implementation:** `deploy/terraform/hosted` defines the reference stack and `scripts/hosted-bootstrap.sh` renders
> `terraform.tfvars`, optionally fetches secrets via 1Password, and applies the Terraform plan end-to-end.

### Multi-tenant hardening
- Ensure every REST/GraphQL request includes `workspaceId` + `orgId` claims validated by the gateway before hitting downstream
  services.
- Add per-tenant rate limits to the gateway (aligning with Postman/Insomnia cloud throttles) and expose them via `/metrics`.
- Document escalation paths for noisy neighbors, including temporary throttles and auto-scaling policies.

## 4. Delivery Cadence & Ownership

| Track | Milestone | Owner(s) | Target | Notes |
| --- | --- | --- | --- | --- |
| Billing & Compliance | Paynow checkout + invoice exports | Billing pod | Sprint 12 | Requires updated Prisma migrations. |
| Billing & Compliance | Credits settlement CRON + alerts | FinOps pod | Sprint 13 | Depends on Paynow ledger ingestion. |
| Sync | Automerge fuzz harness + CI job | Collaboration pod | Sprint 11 | Add fixtures to `docs/sync/cases/`. |
| Sync | Presence vector clocks + conflict UX | Collaboration pod | Sprint 12 | UI changes tracked in `apps/web` backlog. |
| Hosted | Terraform + bootstrap script | Platform pod | Sprint 11 | Start with GCP reference, extend to AWS. |
| Hosted | Multi-tenant guardrails & rate limits | Platform pod | Sprint 12 | Requires gateway + Redis updates. |

## 5. Alignment With Next Steps
- **Monetization stack:** The billing track enumerates the Paynow wiring, credit settlement, and invoicing artifacts needed for GA
  commerce flows.
- **AI module graduation:** Once billing funds inference providers, promote AI services by allocating dedicated budgets and
  migrating from mock adapters to managed inference endpoints.
- **Hosted infrastructure:** The hosted track covers Terraform, bootstrap scripts, and tenant guardrails so customers can consume
  Squirrel API Studio as a managed SaaS offering.

By linking each gap to concrete milestones, the engineering backlog now contains actionable steps that close parity gaps with
Postman/Insomnia-style cloud offerings.
