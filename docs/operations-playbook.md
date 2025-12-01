# Workspace Operations Playbook

This playbook documents the day-2 operations guidance that customers expect from polished API platforms: how to roll out new
workspaces, share them safely, and react to incidents.

## Workspace rollout checklist

1. **Provision** – Create a workspace via the admin UI or API and tag it with an owner contact.
2. **Handoff** – Use `squirrel team invite` to add founders, then `squirrel env list` to confirm staging/prod environments exist.
3. **Configure secrets** – Run `squirrel env set <key> <value>` for each environment, mirroring infrastructure secrets in a
   single place.
4. **Enable observability** – Follow `docs/observability.md` to configure OTLP exporters and correlate workspace IDs in traces.
5. **Lock down auth** – Configure organization-level SSO in the backend and require `OWNER` role for billing changes.

## Sharing & governance

| Scenario | Command / Action | Notes |
| --- | --- | --- |
| Audit members | `squirrel team list --include-invites` | Export to CSV for quarterly reviews. |
| Rotate roles | `squirrel team role <memberId> <role>` | Downgrade contractors to `VIEWER` before handoff. |
| Remove access | `squirrel team remove <memberId>` | Immediately revokes tokens and WebSocket sessions. |
| Pause invitations | `squirrel team remove <inviteId> --invite` | Ensures stale invites cannot be replayed. |

Governance events are logged in the auditing pipeline described in `docs/architecture.md` so security teams can consume them
downstream.

## Release promotion workflow

1. Ship changes into the **staging** environment of a workspace.
2. Run `yarn smoke:all` locally or in CI to validate sign-in, workspace switching, and CLI workflows.
3. Trigger backend migrations via `docs/migrations/README.md`, ensuring `turbo run migrate` completes.
4. Promote the environment by copying staging variables to production with `squirrel env show --json > prod.json` and applying
them via infrastructure tooling.
5. Announce the release in the shared Slack channel and attach links to Grafana dashboards.

## Incident response

- **Detection** – Alerts from Prometheus (latency, error budget burn) page the on-call engineer.
- **Triage** – Use `squirrel logs recent --limit 200` and the `observability.md` runbooks to correlate trace IDs between web and
  backend requests.
- **Containment** – Freeze deployments by pausing GitHub Actions, revoke suspicious sessions with `squirrel team remove` or
  backend admin endpoints, and enable feature flags documented under `docs/architecture/feature-flags.md`.
- **Recovery** – Deploy fixes via the CI pipeline, re-run `yarn probe:health`, and post-mortem the event.

## Compliance & backups

- Perform weekly exports of workspace settings, teams, and collections via the CLI.
- Store encrypted backups of PostgreSQL + Redis snapshots, tagged with workspace IDs for selective restores.
- Document retention policies in the shared Notion page and link back to this playbook for engineers onboarding to ops work.

By shipping an explicit operations playbook, the repo now matches the maturity of incumbent API platforms that ship with customer-facing runbooks.
