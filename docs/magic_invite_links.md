# Magic Invite Links Design Notes

This document captures the high-level requirements and safety constraints for implementing Magic Invite Links within the Squirrel API Studio monorepo. It mirrors the product brief and will guide implementation across backend, frontend, and client surfaces while protecting existing invite and authentication flows.

## Goals
- Generate secure, one-time tokens that add users to a workspace without requiring email delivery.
- Enforce server-side expiration (default 48h) and prevent brute-force usage.
- Emit audit logs and security events for creation, redemption, expiration, and suspicious usage.
- Keep existing email invite, SSO, RBAC, and region routing behavior intact when magic invites are disabled.

## Core Requirements
- Table `magic_invite_links` with unique tokens, inviter/workspace linkage, role assignment, creation/expiration/usage timestamps, and optional metadata.
- Creation endpoint: `POST /api/workspaces/:workspaceId/invites/magic`
  - Requires `canInviteMembers`, blocks banned roles, and caps invited role to inviter role level.
  - Returns join URL, expiry, and selected role; logs `invite.magic_link_created`.
- Acceptance endpoint: `POST /api/invites/magic/accept`
  - Validates token existence, expiry, and single use.
  - Provisions or resumes user session, adds them to the workspace with invited role, marks token used.
  - Emits real-time `workspace.member_joined` and audit/security events (including unknown IP usage and repeated invalid attempts).
- Real-time reflection: notify web, mobile, and VS Code clients to append the new member and display a "<name> joined the workspace" toast.

## Security & Compatibility
- Tokens must provide at least 256-bit entropy and are single-use with default 48h expiry.
- Region routing must ensure invites are redeemed only within the workspace region.
- Config flag `magicInvites.enabled = false` restores traditional invite flows with no behavior change.

These notes are intended to anchor the upcoming implementation while ensuring no destructive changes to current onboarding paths.
