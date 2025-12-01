# Database Migration Scaffold

This directory will host PostgreSQL and Redis schema artifacts for the new platform modules. Upcoming migrations include:

- `001_init_core_tables.sql`: Projects, workspaces, API requests, and revision history.
- `002_collaboration_views.sql`: Comment threads, annotations, and user presence snapshots.
- `003_metrics_timeseries.sql`: Rollups for latency, uptime, and environment comparisons.
- `004_securevault_secrets.sql`: Encrypted secrets vault metadata keyed by workspace.

Each migration will be mirrored in TypeORM entity definitions under `apps/server/src/modules/**/entities` and referenced by the infrastructure-as-code pipelines.
