# Admin Security Center API Key & Token Issuing Architecture

This document captures the secure, audited flow for issuing API keys within the Admin Security Center. It is based on zero-trust principles and mirrors practices used by production SaaS platforms.

## Placement and Access Controls
- Token operations live under `/admin/security/api-keys` (or `/admin/security-center/tokens`) and are protected by MFA, device trust, optional JIT elevation, the policy engine, and optionally Root Mode.
- Only elevated admins should reach this surface; general admin areas must not offer token creation.

## Roles Allowed to Issue Keys
| Role | Workspace Keys | Organization Keys | System Keys |
| --- | --- | --- | --- |
| Member | No | No | No |
| Workspace Admin | Workspace-scoped | No | No |
| Org Owner | All child workspaces | Organization | No |
| Super Admin | Yes | Yes | Yes |
| Root Mode | Unlimited | Unlimited | System-wide |

System keys always require Root Mode and MFA.

## Key Types
- Workspace API Keys for workspace-scoped APIs (collections, requests, environments, secrets, collaboration).
- Organization Keys for billing automation, provisioning, and metadata.
- Internal Service Keys for microservices, event processors, and integrations (Root Mode only).

Scopes examples: `["requests:write", "collections:read"]`.

## Secure Generation Flow
1. Admin selects target (workspace/organization), scopes, expiry, description, and optional IP ranges.
2. Backend generates a prefix and secret:
   - `keyId = "api_" + randomPrefix(10)`
   - `secret = randomSecureBytes(32)`
   - `hash = bcrypt(secret)`
3. Store only the hashed secret; return `{ keyId, secret, expiresAt, scopes }` once.

## Audit Logging
Log every sensitive action with actor, org/workspace, IP/device fingerprint, scopes, and timestamp:
- `admin.api_key_created`
- `admin.api_key_deleted`
- `admin.api_key_scope_changed`
- `admin.api_key_used`
- `admin.api_key_denied`
- `root_mode.required_for_api_key`

## Policy Engine Rules
Examples:
- Deny `api_key:create` for org admins when scopes include `system:*`.
- Allow `api_key:create` for principals with the `root` role.
- Deny creation outside business hours or allowed IP ranges.

## UI Expectations
The Admin Security Center should expose “API Keys & Tokens” with:
- Create-key modal with scope and expiry selectors.
- Copy-secret panel showing the secret only once.
- Active tokens list with scopes, expiry, createdBy, lastUsedAt, region/residency warnings, and a root-mode badge for system keys.
- Revocation and rotation actions plus per-key audit history and policy warnings.

## Backward Compatibility
If `apiKeys.enabled` is false, hide the UI module and disable endpoints while keeping existing keys valid.
