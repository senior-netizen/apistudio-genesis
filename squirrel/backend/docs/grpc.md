# Squirrel API Studio gRPC Guide

## Services
- AuthService (squirrel.auth.v1) — Register, Login, Refresh, Profile
- WorkspacesService (squirrel.workspaces.v1) — List, Create, Get
- RequestsService (squirrel.requests.v1) — Create, Update, Get, Run, History, StreamRun (bi-di streaming)

## Metadata / Auth
- Send JWT as `Authorization: Bearer <token>` in gRPC metadata.
- Founder/admin tokens retain their elevated roles; role is resolved using the same JWT strategy as REST.

## Endpoints
- Host/port: `0.0.0.0:50051` by default (`GRPC_BIND_ADDR` / `GRPC_PORT` override).
- TLS: set `GRPC_TLS_CERT_PATH` / `GRPC_TLS_KEY_PATH` / optional `GRPC_TLS_CA_PATH`. If missing, the server runs insecure for local dev only.

## Example (Node.js)
```ts
import { credentials, Metadata } from '@grpc/grpc-js';
import { loadPackageDefinition } from '@grpc/proto-loader';
import { loadSync } from '@grpc/proto-loader';
import { resolve } from 'path';
const def = loadPackageDefinition(loadSync(resolve(__dirname, '../proto/auth.proto')));
const client = (def as any).squirrel.auth.v1.AuthService('localhost:50051', credentials.createInsecure());
const md = new Metadata(); md.set('authorization', 'Bearer <access-token>');
client.profile({}, md, (err: any, res: any) => console.log(err, res));
```

## Streaming (RequestsService.StreamRun)
- Open a bi-directional stream and send either:
  - `{ requestId: "<existing>" }` to queue a saved request, or
  - `{ method, url, headers, body }` to execute ad-hoc. The server responds with phases: RUNNING -> COMPLETED/FAILED.
- To cancel, send `{ cancel: true }`.

## Regenerating stubs
- `yarn --cwd squirrel/backend proto:generate`

## Rate limiting
- Reuses REST limits (window/max) and enforces per user via gRPC interceptor backed by Redis; falls back to in-memory counters if Redis is disabled.
