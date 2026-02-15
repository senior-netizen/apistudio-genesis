# Sync Conflict Recovery Drill (Sprint E2.2)

This runbook validates deterministic conflict operations (`accept`, `decline`, `rebase`) and operator recovery in staging.

## Preconditions

- Staging workspace with at least two active clients.
- Backend and websocket sync services healthy.
- Access to application logs and analytics events.

## Drill steps

1. Trigger a controlled divergence by editing the same request from two clients while forcing one client offline.
2. Bring second client online and confirm `sync.conflict` appears in UI.
3. Execute each path:
   - **Accept Server** (client discards queued local changes and pulls server state)
   - **Rebase** (client keeps local intent but refreshes from server)
   - **Keep Local** (client declines auto-merge and leaves local queue)
4. Confirm conflict action is persisted client-side (`squirrel.sync.conflict.resolutions`) and not repeatedly re-prompted.
5. Confirm conflict metrics increase in telemetry stream and/or analytics event store.
6. Run operator restore playbook if divergence remains (snapshot replay and vector-clock key purge).

## Evidence to capture

- Screenshot(s) of conflict action UI.
- Logs proving each action path executed.
- Analytics events or metrics counters before/after drill.
- Final state parity check between both clients.

## Exit criteria

- All three actions are executable and deterministic.
- No data loss after server-accept and rebase flows.
- Operator can recover workspace to healthy state within target window.
