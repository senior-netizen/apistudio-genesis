# Contributing to Squirrel API Studio

## Prerequisites
- Node.js 22+
- Yarn 4 (managed via the repository `.yarn/releases`)
- PostgreSQL + Redis locally for integration tests

## Workspace Commands
- `yarn dev:all` – Run dev servers in parallel via Turborepo.
- `yarn lint:all` – Execute eslint across workspaces.
- `yarn test:all` – Run unit/integration tests per workspace.
- `yarn build:all` – Produce build artifacts for apps and packages.
- `yarn perf:smoke` – Execute k6 smoke tests (see `perf/` directory once populated).
- `yarn docs:build` – Generate docs site builds (Docusaurus/Mintlify pipeline to be configured).

## Coding Standards
- TypeScript strict mode enforced; avoid `any` unless justified.
- DTOs must use `class-validator` for all external inputs.
- Wrap new functionality behind feature flags when behaviour could impact existing users.
- Use `AuditService` for user-impacting mutations to maintain compliance trail.

## Pull Requests
1. Branch from `main` and keep commits scoped.
2. Run `yarn lint:all` and `yarn test:all` before submitting.
3. Include updates to docs under `docs/` when new capabilities or flows are added.
4. Provide schema migrations for Prisma changes (new tables/columns only).

Happy hacking!
