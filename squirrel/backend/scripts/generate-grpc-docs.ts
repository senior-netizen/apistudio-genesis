import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const docsDir = join(__dirname, '..', 'docs');
const target = join(docsDir, 'grpc.md');

const content = `# Squirrel API Studio gRPC Guide

## Services
- AuthService (squirrel.auth.v1)
  - Register, Login, Refresh, Profile
- WorkspacesService (squirrel.workspaces.v1)
  - List, Create, Get
- RequestsService (squirrel.requests.v1)
  - Create, Update, Get, Run, History, StreamRun (bi-di streaming)

## Metadata / Auth
- Send JWT as \`Authorization: Bearer <token>\` in gRPC metadata.
- Founder/admin tokens retain their elevated roles; role is resolved using the same JWT strategy as REST.

## Endpoints
- Host/port: \`${process.env.GRPC_BIND_ADDR ?? '0.0.0.0'}:${process.env.GRPC_PORT ?? '50051'}\`
- TLS: provide GRPC_TLS_CERT_PATH / GRPC_TLS_KEY_PATH / optional GRPC_TLS_CA_PATH. If missing, the server runs insecure for local dev only.

## Example calls (Node.js)
\`\`\`ts
import { credentials, Metadata } from '@grpc/grpc-js';
import { loadPackageDefinition } from '@grpc/proto-loader';
import { resolve } from 'path';
const def = loadPackageDefinition(require('@grpc/proto-loader').loadSync(resolve(__dirname, '../proto/auth.proto')));
const client = (def as any).squirrel.auth.v1.AuthService('localhost:50051', credentials.createInsecure());
const md = new Metadata(); md.set('authorization', 'Bearer <access-token>');
client.profile({}, md, (err, res) => console.log(err, res));
\`\`\`

## Streaming (RequestsService.StreamRun)
- Open a bi-directional stream, send either:
  - \`{ requestId: "<existing>" }\` to queue a saved request, or
  - \`{ method, url, headers, body }\` to execute ad-hoc. The server responds with phases: RUNNING -> COMPLETED/FAILED.
- To cancel, send \`{ cancel: true }\`.

## Regenerating stubs
\`yarn --cwd squirrel/backend proto:generate\`

## Rate limiting
- Reuses REST limits (window/max) and enforces per user via gRPC interceptor backed by Redis; falls back to in-memory counters if Redis is disabled.
`;

if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

writeFileSync(target, content);
console.log(`Generated ${target}`);
