# PaaS Deployment Guide

These instructions describe how to deploy Squirrel API Studio to a generic Platform-as-a-Service (PaaS) provider such as Render, Fly.io, Railway, or Heroku. Each service runs in its own container, backed by managed PostgreSQL and Redis instances.

## Required Environment Variables

Set the following environment variables for each service. Secrets should be stored using your provider's secrets manager.

### Shared Values

| Variable | Description |
| --- | --- |
| `NODE_ENV` | Set to `production` in all services.
| `REDIS_URL` | Connection string to the managed Redis instance (e.g., `redis://default:<password>@<host>:6379`).
| `SQUIRREL_INTERNAL_KEY` | Shared secret used for service-to-service authentication.

### Gateway

| Variable | Description |
| --- | --- |
| `PORT` | Port exposed by the gateway (default `3080`). |
| `JWT_PUBLIC_KEY` | Public key used to verify access tokens. |
| `AUTH_SERVICE_URL` | Internal URL of the auth service. |
| `USER_SERVICE_URL` | Internal URL of the user service. |
| `WORKSPACE_SERVICE_URL` | Internal URL of the workspace service. |
| `API_RUNNER_SERVICE_URL` | Internal URL of the API runner service. |
| `AI_SERVICE_URL` | Internal URL of the AI service. |
| `BILLING_SERVICE_URL` | Internal URL of the billing service. |
| `NOTIFICATIONS_SERVICE_URL` | Internal URL of the notifications service. |
| `LOGS_SERVICE_URL` | Internal URL of the logs service. |
| `RATE_LIMIT_POINTS` | Requests allowed per window (default `1000`). |
| `RATE_LIMIT_DURATION` | Window duration in seconds (default `60`). |

### Auth Service

| Variable | Description |
| --- | --- |
| `PORT` | Port exposed by the auth service (default `3001`). |
| `JWT_PUBLIC_KEY` | Public key for token verification. |
| `JWT_PRIVATE_KEY` | Private key used to sign tokens. |
| `POSTGRES_URL` | Connection string to the auth database. |
| `ENABLE_OAUTH` | Toggle OAuth providers (`true`/`false`). |

### User Service

| Variable | Description |
| --- | --- |
| `PORT` | Port exposed by the user service (default `3002`). |
| `POSTGRES_URL` | Connection string to the user database. |
| `DEFAULT_USER_ROLE` | Default role assigned to new users (e.g., `free`). |

### Workspace Service

| Variable | Description |
| --- | --- |
| `PORT` | Port exposed by the workspace service (default `3003`). |
| `POSTGRES_URL` | Connection string to the workspace database. |

### API Runner Service

| Variable | Description |
| --- | --- |
| `PORT` | Port exposed by the API runner service (default `3004`). |
| `HTTP_TIMEOUT_MS` | Timeout in milliseconds for outbound API calls. |
| `HTTP_MAX_REDIRECTS` | Maximum redirects allowed for outbound requests. |

### AI Service

| Variable | Description |
| --- | --- |
| `PORT` | Port exposed by the AI service (default `3005`). |
| `OPENAI_API_KEY` | Provider key for the AI integration (store as a secret). |
| `EMBEDDINGS_MODEL` | Embeddings model identifier (e.g., `text-embedding-3-large`). |

### Billing Service

| Variable | Description |
| --- | --- |
| `PORT` | Port exposed by the billing service (default `3006`). |
| `POSTGRES_URL` | Connection string to the billing database. |
| `PAYNOW_INTEGRATION_ID` | Integration ID provided by Paynow. |
| `PAYNOW_INTEGRATION_KEY` | Integration key provided by Paynow. |
| `PAYNOW_RESULT_URL` | Result callback URL exposed by your deployment. |
| `PAYNOW_RETURN_URL` | Return URL that brings the customer back to the studio UI. |

### Notifications Service

| Variable | Description |
| --- | --- |
| `PORT` | Port exposed by the notifications service (default `3007`). |
| `REDIS_URL` | Redis connection string (inherited from shared values). |
| `FCM_SERVICE_ACCOUNT_KEY` | Firebase credentials (JSON or token). |
| `SMTP_URL` | SMTP connection string if email notifications are enabled. |

### Logs Service

| Variable | Description |
| --- | --- |
| `PORT` | Port exposed by the logs service (default `3008`). |
| `POSTGRES_URL` | Connection string to the logs database. |
| `S3_BUCKET` | Object storage bucket used for log archives. |

## Deploying to a PaaS

1. **Build and Push Images**
   - Build each service's Docker image using the provided Dockerfiles.
   - Tag using the shared convention (e.g., `squirrel-api/auth-service:v1`).
   - Push the images to a container registry accessible by your provider.

2. **Create Managed Services**
   - Provision a PostgreSQL database for each microservice or configure distinct schemas/databases on a shared instance.
   - Provision a Redis instance for caching, rate limiting, and message queues.

3. **Create Applications/Services**
   - For each microservice and the gateway, create a dedicated app on the PaaS platform.
   - Configure the container image, exposed port, health check endpoint (`/health`), and auto-restart policy.
   - Attach the required environment variables and secrets.

4. **Networking**
   - Expose the gateway publicly (HTTPS). Microservices can remain internal/private if the platform supports private networking.
   - When private networking is unavailable, restrict access to microservices using firewall rules or service-to-service authentication (`SQUIRREL_INTERNAL_KEY`).

5. **Frontend Configuration**
   - Update the frontend environment (e.g., `apps/web/.env`) so that `VITE_API_URL` and `VITE_WS_URL` point to the public gateway URL supplied by the PaaS.

## Generic Service Descriptor Template

The following templates illustrate how to describe a service on a generic PaaS. Adapt the syntax to match your provider (YAML, JSON, or UI forms).

### Application Service (Gateway Example)

```yaml
name: gateway
image: squirrel-api/gateway:v1
plan: standard
region: <your-region>
port: 3080
healthCheck:
  path: /health
  intervalSeconds: 30
env:
  NODE_ENV: production
  REDIS_URL: ${REDIS_URL}
  SQUIRREL_INTERNAL_KEY: ${SQUIRREL_INTERNAL_KEY}
  JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
  AUTH_SERVICE_URL: http://auth-service.internal:3001
  USER_SERVICE_URL: http://user-service.internal:3002
  WORKSPACE_SERVICE_URL: http://workspace-service.internal:3003
  API_RUNNER_SERVICE_URL: http://api-runner-service.internal:3004
  AI_SERVICE_URL: http://ai-service.internal:3005
  BILLING_SERVICE_URL: http://billing-service.internal:3006
  NOTIFICATIONS_SERVICE_URL: http://notifications-service.internal:3007
  LOGS_SERVICE_URL: http://logs-service.internal:3008
  RATE_LIMIT_POINTS: "1000"
  RATE_LIMIT_DURATION: "60"
scaling:
  minInstances: 1
  maxInstances: 5
```

### Background Service (Microservice Template)

```yaml
name: auth-service
image: squirrel-api/auth-service:v1
plan: starter
region: <your-region>
port: 3001
healthCheck:
  path: /health
  intervalSeconds: 30
env:
  NODE_ENV: production
  PORT: "3001"
  REDIS_URL: ${REDIS_URL}
  SQUIRREL_INTERNAL_KEY: ${SQUIRREL_INTERNAL_KEY}
  JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
  JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
  POSTGRES_URL: ${AUTH_POSTGRES_URL}
  ENABLE_OAUTH: "true"
```

### Managed Database (PostgreSQL)

```yaml
name: postgres
engine: postgresql
plan: standard
version: 15
storage: 20Gi
```

### Managed Cache (Redis)

```yaml
name: redis
engine: redis
plan: standard
version: 7
storage: 1Gi
```

Fill in provider-specific attributes (plans, regions, scaling policies) as needed.
