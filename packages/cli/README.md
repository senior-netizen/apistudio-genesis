# Squirrel API Studio CLI

The Squirrel API Studio CLI delivers the full power of Squirrel API Studio in a terminal-native experience. It lets you authenticate, manage environments, send requests, run collections, spin up mocks, generate documentation, and collaborate through the Rodent Inc. cloud — all with elegant output and AI assistance.

## Installation

```bash
# Run instantly
npx squirrel

# Or install globally
npm install -g squirrel-cli
squirrel --help
```

## Highlights

- 🔐 **Secure authentication** with AES-256 encrypted credential vault
- 🌍 **Environment orchestration** with environment variables, headers, and quick switching
- 📡 **Request runner** supporting REST, GraphQL, and JSON payloads with pretty output
- 🧪 **Testing harness** with retry logic, expectations, and AI-generated optimisation tips
- 📚 **Documentation generation** to OpenAPI or Postman formats
- 🤖 **AI assistant** for suggestions, docs, and error remediation via OpenAI
- 🧪 **Mock servers** for rapid prototyping using Express
- ☁️ **Workspace sync** for team collaboration
- 🧭 **Status diagnostics** to audit configuration, history, and active environments at a glance

## Quick Start

1. **Authenticate**
   ```bash
   squirrel login --email me@example.com --token sk_live_123
   squirrel whoami
   ```

2. **Configure environments**
   ```bash
   squirrel env add staging --url https://staging.api.squirrel.dev --var TOKEN={{TOKEN}}
   squirrel env use staging
   ```

3. **Send requests**
   ```bash
   squirrel get /users --pretty
   squirrel post /auth/login --data '{"email":"{{EMAIL}}","password":"{{PASS}}"}' --save onboarding.collection
   ```

4. **Run collections & tests**
   ```bash
   squirrel run onboarding.collection --table
   squirrel test onboarding.collection --repeat 3 --concurrency 5 --ai
   ```

5. **Generate docs & share**
   ```bash
   squirrel docs generate --format openapi --output openapi.json
   squirrel sync push
   ```

## Command Overview

| Command | Description |
| ------- | ----------- |
| `squirrel login` | Authenticate and store tokens securely |
| `squirrel env list` | Manage environments with URLs, headers, and variables |
| `squirrel get/post/put/patch/delete` | Send requests with JSON payloads, headers, and exports |
| `squirrel run` | Execute saved collections with expectations and AI insights |
| `squirrel test` | Run stress tests on endpoints or collections (supports `--concurrency`) |
| `squirrel mock` | Launch a local mock server for rapid prototyping |
| `squirrel docs generate` | Emit OpenAPI or Postman documentation |
| `squirrel sync` | Push, pull, or diff workspace state |
| `squirrel status` | Inspect configuration, authentication, environments, and request history |
| `squirrel history list` / `squirrel history clear` | Inspect or clear recent request history snapshots |
| `squirrel ai` | Store OpenAI keys, generate docs, fix errors, or suggest improvements |

## Global Flags

All commands accept a consistent set of global flags to tune the CLI experience:

| Flag | Effect |
| ---- | ------ |
| `--verbose` | Enable debug-level logging for deep troubleshooting |
| `--quiet` | Suppress informational output, showing only warnings and errors |
| `--silent` | Only surface errors, ideal for scripting |
| `--no-banner` | Skip the startup gradient banner |

## Configuration & Storage

- Configuration lives under `~/.squirrel/config/config.json`. Override with `SQUIRREL_HOME`.
- Secrets are encrypted in `~/.squirrel/secrets/vault.json` using AES-256-GCM. Override key via `SQUIRREL_VAULT_SECRET`.
- Cache entries are stored under `~/.squirrel/cache/cache.json` for offline resilience.

## AI Integration

Set `OPENAI_API_KEY` or run `squirrel ai store-key <key>` to enable the AI assistant. You can customise the model and endpoint with `SQUIRREL_AI_MODEL` and `SQUIRREL_OPENAI_URL` environment variables.

## Development

```bash
cd packages/cli
yarn install
yarn build
node dist/index.js --help
```

Built with Node.js 20+, TypeScript, Commander.js, and tsup.
