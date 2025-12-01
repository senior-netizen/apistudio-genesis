# Deployment Overview

This directory contains deployment-ready configuration templates for Squirrel API Studio. Two primary approaches are covered:

- **Platform-as-a-Service (PaaS)** deployment, with one container per service and managed databases/caches.
- **Kubernetes** deployment for a self-managed cluster with explicit manifests for every microservice and infrastructure dependency.

Both approaches assume the backend architecture consists of the public gateway, dedicated microservices, PostgreSQL, and Redis.

## Directory Structure

- `paas/` – generic guidance and templates for deploying each container to a PaaS provider (Render, Fly.io, Railway, etc.).
- `k8s/` – Kubernetes manifests for the gateway, microservices, stateful dependencies, ingress, and autoscaling policies.
  - Apply everything at once with `kubectl apply -k deploy/k8s`.

## Deployment Sequence

Regardless of the target platform, provision dependencies in the following order:

1. **PostgreSQL** – create the database instance and per-service schemas.
2. **Redis** – provision a cache/queue instance reachable by the services.
3. **Application Secrets** – supply JWT keys, internal service keys, and third-party API tokens.
4. **Microservices** – deploy auth, user, workspace, api-runner, ai, billing, notifications, and logs services.
5. **Gateway** – deploy the gateway once dependent services are reachable.
6. **Frontend** – configure the frontend application to talk to the gateway URL.

After deployment, verify `/health` endpoints on each service and confirm that the gateway can reach its downstream services via their internal URLs.

## Paynow & Billing

Paynow is the default monetization path. Populate `PAYNOW_*` variables (integration ID, key, return URLs) for every service that depends on billing. The manifests no longer ship Stripe containers; instead they expect a single Paynow credential set shared by the API and billing microservice. If you bring an additional payment provider, extend the manifests accordingly.

## Image Tagging Convention

Docker image tags referenced throughout the manifests follow the convention: `squirrel-api/<service>:<version>`. For example:

- `squirrel-api/gateway:v1`
- `squirrel-api/auth-service:v1`
- `squirrel-api/api-runner-service:v1`

Update tags as you publish new versions of each service.
