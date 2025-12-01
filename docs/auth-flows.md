# Authentication & Session Flows

## Login (Web / Desktop)
1. Client posts credentials to `POST /auth/login` with optional `clientType` and `scope`.
2. `AuthService.login` validates password (bcrypt) against `User.passwordHash` and issues:
   - Access token (10 min) signed with `JWT_SECRET`.
   - Refresh token (30 days) signed with `REFRESH_SECRET`.
   - Session persisted in Prisma + Redis revocation cache (`SessionService`).
3. Refresh token delivered as httpOnly SameSite=Strict cookie. CSRF token emitted via header + cookie for frontend frameworks.

## Refresh
- `POST /auth/refresh` requires refresh JWT (cookie or body). Guard validates token signature + revocation.
- Session rotation produces new `jti`, updates `Session` record, revokes previous token ID via Redis.

## Logout / Revocation
- `POST /auth/token/revoke` marks the session revoked and propagates the `jti` through Redis Pub/Sub.
- `POST /auth/token/sync` allows downstream services to proactively revoke known token IDs.

## Device Authorization (CLI)
1. CLI requests `POST /auth/device/code` receiving `{ device_code, user_code, verification_uri, interval }`.
2. User logs into the web app, visits verification UI, and calls `POST /auth/device/verify` to approve the code.
3. CLI polls `POST /auth/device/token` with the device code until approval. On success, tokens + session are issued for `clientType=cli`.

## Session Management
- `GET /session` lists active sessions for the authenticated user.
- `DELETE /session/:id` revokes a specific session.

## Refresh Storage Strategies
- Web/extension clients keep refresh tokens in httpOnly cookies. Access tokens stay in memory and auto-refresh via axios interceptors (see packages/auth-client usage notes).
- CLI and Tauri clients persist refresh tokens in secure OS keychain/secure storage (example flows documented in respective app directories).

## Security Enhancements
- CSRF enforced for cookie-authenticated routes (`main.ts`).
- Rate limiting using `@nestjs/throttler` on login, device endpoints, and token sync.
- Audit trail recorded for login, refresh, and device approvals in `AuditLog`.
