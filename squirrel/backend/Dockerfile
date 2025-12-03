# syntax=docker/dockerfile:1

FROM node:20-slim AS deps
WORKDIR /app

# Respect outbound proxies during dependency install
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY HTTPS_PROXY=$HTTPS_PROXY NO_PROXY=$NO_PROXY \
    http_proxy=$HTTP_PROXY https_proxy=$HTTPS_PROXY no_proxy=$NO_PROXY
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org \
    YARN_NPM_REGISTRY_SERVER=https://registry.npmjs.org \
    NPM_CONFIG_STRICT_SSL=false

# Ensure openssl and certs are present (Debian base)
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install only what backend needs using workspace focus to shrink install
COPY package.json yarn.lock ./
COPY .yarn ./.yarn
COPY turbo.json tsconfig.json tsconfig.base.json ./
COPY .yarnrc.yml ./
# Drop host-specific proxy settings; container should fetch registry directly
RUN sed -i '/^httpProxy:/d;/^httpsProxy:/d' .yarnrc.yml
COPY apps ./apps
COPY packages ./packages
COPY libs ./libs
COPY squirrel/backend ./squirrel/backend

ENV COREPACK_ENABLE_DOWNLOADS=0

# Install dependencies (skip build scripts to reduce install time)
# Allow network fetches; proxy vars are already exported above.
RUN YARN_ENABLE_IMMUTABLE_INSTALLS=false node /app/.yarn/releases/yarn-4.10.3.cjs install --mode=skip-build

FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Carry proxy config into builder stage for any outbound calls
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY HTTPS_PROXY=$HTTPS_PROXY NO_PROXY=$NO_PROXY \
    http_proxy=$HTTP_PROXY https_proxy=$HTTPS_PROXY no_proxy=$NO_PROXY
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org \
    YARN_NPM_REGISTRY_SERVER=https://registry.npmjs.org \
    NPM_CONFIG_STRICT_SSL=false
COPY --from=deps /app/ ./

ENV COREPACK_ENABLE_DOWNLOADS=0

# Build backend workspace deps (build scripts were skipped during install)
RUN node /app/.yarn/releases/yarn-4.10.3.cjs workspaces foreach -R --topological-dev --include @squirrel/backend run build

WORKDIR /app/squirrel/backend
RUN node /app/.yarn/releases/yarn-4.10.3.cjs prisma:generate
RUN node /app/.yarn/releases/yarn-4.10.3.cjs build

FROM node:20-slim AS runner
WORKDIR /app
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY HTTPS_PROXY=$HTTPS_PROXY NO_PROXY=$NO_PROXY \
    http_proxy=$HTTP_PROXY https_proxy=$HTTPS_PROXY no_proxy=$NO_PROXY
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org \
    YARN_NPM_REGISTRY_SERVER=https://registry.npmjs.org \
    NPM_CONFIG_STRICT_SSL=false
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/squirrel/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/squirrel/backend ./squirrel/backend
COPY --from=builder /app/.yarn ./ ./.yarn
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=builder /app/squirrel/backend/package.json ./package.json
COPY --from=builder /app/squirrel/backend/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=8081
EXPOSE 8081

CMD ["node", "dist/main.js"]
