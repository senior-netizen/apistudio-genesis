.PHONY: docker-up docker-down k8s-apply k8s-delete microservices-dev gateway-dev auth-dev user-dev workspace-dev billing-dev logs-dev org-dev api-runner-dev ai-dev notifications-dev frontend-dev start-all

DOCKER ?= docker
COMPOSE ?= $(DOCKER) compose
KUBECTL := kubectl
ifneq ("$(wildcard ./bin/kubectl)","")
KUBECTL := ./bin/kubectl
endif
YARN ?= yarn

# -------- Local (non-Docker) helpers --------
# Start all microservices + gateway + optional frontend in parallel.
start-all: microservices-dev gateway-dev frontend-dev

# Run the microservices concurrently (requires Postgres + Redis running).
microservices-dev:
	@$(MAKE) -j 0 auth-dev user-dev workspace-dev billing-dev logs-dev org-dev api-runner-dev ai-dev notifications-dev

auth-dev:
	$(YARN) workspace @squirrel/auth-service start:dev
user-dev:
	$(YARN) workspace @squirrel/user-service start:dev
workspace-dev:
	$(YARN) workspace @squirrel/workspace-service start:dev
billing-dev:
	$(YARN) workspace @squirrel/billing-service start:dev
logs-dev:
	$(YARN) workspace @squirrel/logs-service start:dev
org-dev:
	$(YARN) workspace @squirrel/organization-service start:dev
api-runner-dev:
	$(YARN) workspace @squirrel/api-runner-service start:dev
ai-dev:
	$(YARN) workspace @squirrel/ai-service start:dev
notifications-dev:
	$(YARN) workspace @squirrel/notifications-service start:dev

gateway-dev:
	$(YARN) workspace @squirrel/gateway start:dev

frontend-dev:
	$(YARN) workspace @sdl/squirrel-web dev

# Start the full stack locally using Docker Compose
docker-up:
	@DOCKER_BUILDKIT=${DOCKER_BUILDKIT-1} COMPOSE_DOCKER_CLI_BUILD=${COMPOSE_DOCKER_CLI_BUILD-1} $(COMPOSE) up --build || { \
		echo "BuildKit run failed, retrying with DOCKER_BUILDKIT=0 ..."; \
		DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 $(COMPOSE) up --build; }

# Same as docker-up but forces the classic builder (helps avoid BuildKit gRPC crashes on some hosts)
docker-up-no-buildkit:
	DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 $(COMPOSE) up --build

# Convenience alias for a common typo
doker-up: docker-up

# Stop and remove Docker Compose resources
docker-down:
	$(COMPOSE) down

# Apply all Kubernetes manifests in one command
k8s-apply:
	@command -v $(KUBECTL) >/dev/null || { echo "kubectl not found in PATH; install it or set KUBECTL=/path/to/kubectl"; exit 127; }
	$(KUBECTL) apply -k deploy/k8s

# Tear down all Kubernetes resources
k8s-delete:
	@command -v $(KUBECTL) >/dev/null || { echo "kubectl not found in PATH; install it or set KUBECTL=/path/to/kubectl"; exit 127; }
	$(KUBECTL) delete -k deploy/k8s
