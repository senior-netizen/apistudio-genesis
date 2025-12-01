# Squirrel API Studio – Docker Dev Environment

This repository now ships with a full Docker Compose stack that bootstraps the
API gateway, microservices, legacy backend, and required infrastructure for
local development. The configuration is additive and does not replace any
existing tooling—you can continue to run services directly with Node if you
prefer.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose plugin](https://docs.docker.com/compose/install/) v2+

> **Note:** The included secrets and keys are for local development only. Update
them before deploying anywhere else.

## Quick start

From the repository root run:

```sh
docker compose up --build
# or, if you are using the legacy v1 plugin:
docker-compose up --build
```

This command will:

- Build the NestJS services (gateway, microservices, legacy backend)
- Start PostgreSQL (`postgres`) with the required databases
- Start Redis (`redis`)
- Launch the API gateway on http://localhost:4000
- Optionally expose the same gateway through Nginx on http://localhost/

Logs stream to the terminal. You can stop the stack with `Ctrl+C` or:

```sh
docker compose down
```

To remove volumes (Postgres/Redis data), add `-v` to the down command.

## Service map & ports

| Service                | Container name (default) | Internal port | Host port | Notes |
| ---------------------- | ------------------------ | ------------- | --------- | ----- |
| `postgres`             | `apistudio-postgres-1`    | 5432          | 5432      | Databases for each microservice are pre-created. |
| `redis`                | `apistudio-redis-1`       | 6379          | 6379      | No auth in dev; add `REDIS_PASSWORD` later if needed. |
| `auth-service`         | `apistudio-auth-service-1`| 3001          | —         | Provides auth endpoints consumed by the gateway. |
| `user-service`         | `apistudio-user-service-1`| 3002          | —         | User profile microservice. |
| `workspace-service`    | `apistudio-workspace-service-1`| 3003     | —         | Workspace management microservice. |
| `api-runner-service`   | `apistudio-api-runner-service-1`| 3004    | —         | Internal runner service (no direct host access). |
| `ai-service`           | `apistudio-ai-service-1`  | 3005          | —         | AI helper service; configure `OPENAI_API_KEY` if available. |
| `billing-service`      | `apistudio-billing-service-1`| 3006      | —         | Paynow-backed billing service; wire `PAYNOW_*` secrets. |
| `notifications-service`| `apistudio-notifications-service-1`| 3007| —         | Handles email/push notifications. |
| `logs-service`         | `apistudio-logs-service-1`| 3008          | —         | Stores request logs. |
| `gateway`              | `apistudio-gateway-1`     | 3080          | 4000      | Primary entry point for clients. |
| `legacy-backend`       | `apistudio-legacy-backend-1`| 8081       | —         | Original monolith kept for compatibility. |
| `nginx`                | `apistudio-nginx-1`       | 80            | 80        | Optional reverse proxy that forwards to the gateway. |

> Tip: use `docker compose ps` to inspect exact container names on your machine.

## Environment variables

Each service consumes the `.env.example` in its directory. Docker Compose uses
these files directly for local runs so everything works out-of-the-box. If you
need to override values, copy the example file to `.env` in the same directory
and adjust it—Docker Compose will prefer the concrete `.env` file if present.

Key connection strings (already wired in the examples):

- PostgreSQL: `postgresql://user:password@postgres:5432/<database>`
- Redis: `redis://redis:6379`

The Postgres container runs an initialization script located at
`docker/initdb/01-create-databases.sql` that provisions databases for each
service, including the legacy backend.

## Working with logs

Show logs for all services:

```sh
docker compose logs -f
```

Tail logs for a single service (for example, the gateway):

```sh
docker compose logs -f gateway
```

## Updating containers

After changing code, rebuild the affected service(s):

```sh
docker compose up --build <service-name>
```

Compose will rebuild the image before starting the container. Omit the service
name to rebuild everything.

## Shutting everything down

```sh
docker compose down
```

To stop the stack but keep containers available for restart:

```sh
docker compose stop
```

Resume later with:

```sh
docker compose start
```

## Troubleshooting

- **Ports already in use:** Adjust the `ports` section in `docker-compose.yml`.
- **Database migrations:** Run Prisma or TypeORM migrations from within the
  respective container using `docker compose exec <service> <command>`.
- **Environment overrides:** Copy the relevant `.env.example` to `.env` and
  customize as needed; restart the containers afterwards.

Enjoy building with Squirrel API Studio!
