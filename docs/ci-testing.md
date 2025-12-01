# Continuous Testing & Automation Playbook

Squirrel API Studio now documents how teams can uphold the same reliability benchmarks as incumbent API platforms.
The guidance below explains the available test suites, when to run them, and how to wire them into CI/CD pipelines.

## Test layers

| Layer | Command | When to run | Notes |
| --- | --- | --- | --- |
| Type safety | `yarn typecheck` | Every pull request | Validates TypeScript contracts across the monorepo. |
| Unit/component | `yarn test` | Every pull request | Executes workspace-level unit tests. |
| Turbo-orchestrated suites | `yarn test:all` | Nightly | Fan-out run across all workspaces to catch cross-package regressions. |
| Smoke regression | `yarn smoke:all` | Before releases & on default branch | Spins up backend + primary UIs and runs API smoke checks and CLI auth flows. |
| Performance spot-checks | `yarn perf:smoke` | Weekly or after schema changes | Runs the perf harness under `perf/...` filters to validate latency budgets. |
| Health probes | `yarn probe:health` | Post-deploy | Validates that the public gateway, websocket, and AI inference routes reply with 2xx responses. |

## Local workflows

1. Install dependencies with `yarn install` at the repo root.
2. Run `yarn lint && yarn typecheck` to fail fast on syntax/type issues.
3. Use `yarn test --filter <workspace>` during development to limit scope, then graduate to `yarn test:all` before requesting reviews.
4. For CLI-heavy changes, run `npm run build` under `squirrel-cli/` so that TypeScript-level errors surface immediately.
5. Launch the smoke harness with `yarn smoke:all` to validate cross-surface sign-in, workspace selection, and AI helpers.

## Example GitHub Actions pipeline

```yaml
name: ci
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn
      - run: yarn install --immutable
      - run: yarn lint
      - run: yarn typecheck
      - run: yarn test
  smoke:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn
      - run: yarn install --immutable
      - run: yarn smoke:all
```

The pipeline separates deterministic unit workloads from the longer-running smoke harness to keep feedback loops tight while still exercising the multi-surface experience before merges to `main`.

## Reporting & artifacts

- Configure `turbo run test -- --reporter=junit` inside CI to emit XML artifacts that downstream dashboards can parse.
- Forward smoke test artifacts (screenshots, CLI transcripts) to GitHub via `actions/upload-artifact` for debugging.
- Wire `yarn perf:smoke` to run on a cron schedule and push metrics to the observability stack described in `docs/observability.md`.

By codifying the execution cadence above, the project now has transparent guidance on automation maturity comparable to the public documentation from larger API platforms.
