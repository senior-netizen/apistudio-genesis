# Squirrel CLI

The Squirrel CLI brings the power of Squirrel API Studio to your terminal. Authenticate once, switch workspaces, manage environments, execute requests, collaborate on collections, and tap into AI helpers – all from a fast and friendly command-line experience.

## Installation

```bash
# Clone the repository and install dependencies
cd squirrel-cli
npm install

# Build the TypeScript sources
npm run build

# Run the CLI locally
node bin/squirrel.js --help

# Install globally (from the project root)
npm install -g .
```

Once published, the CLI will be available as `@squirrel/api-cli` and can be installed globally with:

```bash
npm install -g @squirrel/api-cli
```

## Configuration

Configuration is stored in `~/.squirrel/config.json`. The file tracks:

- Gateway base URL (defaults to `http://localhost:8081`, matching the web app and VS Code extension)
- Access token
- Active workspace and environment IDs
- Optional telemetry flag
- Named profiles (e.g., `default`, `staging`, `prod`)

Use `squirrel config profile list` to view profiles and `squirrel config profile use <name>` to switch between them.

The CLI mirrors the CSRF handling used by the VS Code and web clients: it fetches a token from `/auth/csrf` before login or other unsafe requests, retries on `403` when needed, and persists the latest token in your active profile.

## Quick Start

1. Authenticate and inspect your account:

    ```bash
    squirrel login
    squirrel whoami
    ```

2. Discover workspaces and environments:

    ```bash
    squirrel workspace list
    squirrel workspace use <workspace-id>
    squirrel env list
    squirrel env use <environment-name>
    ```

3. Run a saved request or an ad-hoc call:

    ```bash
    squirrel request run <request-id>
    squirrel request run --url https://httpbin.org/get --method GET
    ```

4. Collaborate with collections:

    ```bash
    squirrel collections list
    squirrel collections pull
    squirrel collections push
    ```

5. Get AI help:

    ```bash
    squirrel ai compose "Create a POST request to /api/users with a JSON body"
    squirrel ai advise --request <request-id>
    ```

6. Review billing and usage:

    ```bash
    squirrel billing me
    squirrel billing usage
    ```

7. Investigate logs:

    ```bash
    squirrel logs recent --limit 50
    squirrel logs request <request-id>
    ```

8. Manage workspace collaborators:

    ```bash
    squirrel team list --include-invites
    squirrel team invite teammate@example.com --role admin
    squirrel team role <member-id> viewer
    squirrel team remove <invite-id> --invite
    ```

## Command Overview

Run `squirrel --help` for the top-level summary, or append `--help` to any command:

- `squirrel login`, `squirrel logout`, `squirrel whoami`
- `squirrel workspace list`, `squirrel workspace use <id>`
- `squirrel env list`, `squirrel env use <name-or-id>`, `squirrel env set <key> <value>`, `squirrel env show`
- `squirrel request run [request-id]` with flags for ad-hoc requests
- `squirrel collections list|pull|push`
- `squirrel ai advise`, `squirrel ai compose`
- `squirrel billing me`, `squirrel billing usage`
- `squirrel logs recent`, `squirrel logs request <request-id>`
- `squirrel config profile list|use|create`
- `squirrel team list|invite|role|remove`

## Team administration

Founders and workspace owners can now run governance workflows without leaving the terminal:

- `squirrel team list --include-invites` surfaces active members as well as pending invitations, making it simple to audit who currently has access.
- `squirrel team invite <email> --role <role>` sends a role-scoped invitation to a collaborator. Supported roles mirror the backend RBAC model: `OWNER`, `ADMIN`, `EDITOR`, and `VIEWER`.
- `squirrel team role <memberId> <role>` promotes or demotes existing members without revoking their access.
- `squirrel team remove <id>` ejects a member, while `--invite` toggles to cancel pending invitations.

All commands respect the currently selected workspace (via `squirrel workspace use <id>`), or you can pass `--workspace <id>` to operate on another tenant. This fills one of the CLI roadmap gaps around team governance, enabling end-to-end account management from automation scripts or terminals.


## JSON output contract (`--json`)

Automation-oriented commands expose a versioned JSON envelope so scripts can parse output safely across releases.

### Envelope

```json
{
  "schemaVersion": "2026-02-14",
  "ok": true,
  "data": {}
}
```

On failures, commands return a structured error envelope and set a non-zero process exit code:

```json
{
  "schemaVersion": "2026-02-14",
  "ok": false,
  "error": {
    "code": "workspace_required",
    "message": "No workspace specified.",
    "details": "optional diagnostic details"
  }
}
```

### Examples

```bash
# Success shape
squirrel workspace list --json

# Error shape + exit code 1 when workspace is not resolved
squirrel team remove member_123 --json
```

## Extensibility

The CLI is organized by feature domain (`src/commands`, `src/api`, `src/utils`) making it straightforward to extend. Future roadmap ideas include:

- Team administration commands for founders and admins
- Marketplace integrations (`squirrel marketplace list`)
- Workspace scaffolding helpers
- Request testing suites and CI integrations

Contributions are welcome! Please follow the repository linting and TypeScript conventions.
