# Workspace Sync Overview

Squirrel API Studio now includes a shared workspace synchronisation layer that enables the web app, desktop app, VS Code extension, and backend services to collaborate on the same data model.

## Protocol summary

* **Handshake** – `POST /v1/sync/handshake` registers a device and returns a short-lived session token and the latest `serverEpoch`.
* **Pull** – `POST /v1/sync/pull` retrieves delta changes and an optional snapshot for a scope (`workspace`, `project`, `collection`, etc.).
* **Push** – `POST /v1/sync/push` uploads a batch of local operations. The server assigns monotonically increasing `serverEpoch` values and returns acknowledgements.
* **Presence** – `GET /v1/sync/presence?workspaceId=…` exposes active device presence. Real-time updates flow through the `/sync/ws` WebSocket namespace.

HTTP requests require the existing JWT auth guards; WebSocket connections use the handshake session token. Pull and push payloads must now include the caller `workspaceId` and the short-lived `sessionToken` from the handshake so the gateway can enforce tenant isolation before processing sync operations.

## Data model

New database tables capture changes (`SyncChange`), vector clocks (`SyncState`), compressed snapshots (`SyncSnapshot`), devices, projects, and scoped secrets. Prisma schema updates and a migration are included under `squirrel/backend/prisma`.

## Shared libraries

* `@sdl/sync-core` – core types, Automerge adapter, vector clock helpers, conflict resolution utilities, and a minimal in-memory storage adapter.
* `@sdl/sync-client` – a transport-agnostic client with IndexedDB and file-backed durable storage adapters plus React hooks.

## Deterministic merge harness

Run `yarn test:sync` to execute the new `@sdl/sync-harness` workspace. The Vitest-based harness replays curated fixtures from
`docs/sync/cases/*.json` and fuzzes concurrent edits to ensure Automerge patches converge regardless of actor ordering. Adding a
fixture is as simple as dropping a JSON file that lists the initial document, the operations each actor performs, and the
expected merged state – the harness will surface any regression as a failing test.

## Conflict detection & remediation

Vector clocks from every push request are now mirrored into Redis with a one-hour TTL. When a client submits a clock that drifts
more than `SYNC_VECTOR_DIVERGENCE_THRESHOLD` from the last recorded state, the backend short-circuits the push, emits a
`sync.conflict` event over `/sync/ws`, and responds with a `VECTOR_CLOCK_DIVERGENCE` conflict so the UI can request a rebase.

Operators can force a workspace back to a clean snapshot with the following playbook:

1. Capture the latest snapshot from `SyncSnapshot` (`SELECT * FROM "SyncSnapshot" WHERE scope_id = … ORDER BY version DESC LIMIT 1`).
2. Notify online clients via the collaboration gateway (`sync.conflict`) so they stop pushing while the restore runs.
3. Re-seed the scope by writing the stored snapshot payload to the gateway (or re-importing via `SyncService.push`) and let
   Automerge replay the desired history.
4. Once the workspace is healthy, purge the Redis vector clock keys (`sync:vc:<scope>:*`) to prevent stale divergence warnings.

## Platform adapters

* **Web** – `WorkspaceSyncProvider` wires the client into the React tree and feeds status into the connectivity badge.
* **Desktop** – `createDesktopSyncClient` bootstraps a sync client backed by the user’s home directory.
* **VS Code** – `createExtensionSyncClient` stores state inside the extension’s global storage and surfaces status in the status bar.

See the source for concrete usage examples and extend the adapters as deeper integrations land.
