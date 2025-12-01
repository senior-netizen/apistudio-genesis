# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

# Respect outbound proxies during dependency install
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY HTTPS_PROXY=$HTTPS_PROXY NO_PROXY=$NO_PROXY \
    http_proxy=$HTTP_PROXY https_proxy=$HTTPS_PROXY no_proxy=$NO_PROXY

# Use repo root context (set in docker-compose) so we can reuse workspace tooling
COPY package.json yarn.lock ./
COPY .yarn ./.yarn
COPY . .

ENV COREPACK_ENABLE_DOWNLOADS=0
RUN printf "nodeLinker: node-modules\n" > .yarnrc.yml

# Install dependencies (skip build scripts to avoid long installs)
# Allow network fetches; proxy vars are already exported above.
RUN YARN_ENABLE_IMMUTABLE_INSTALLS=false node /app/.yarn/releases/yarn-4.10.3.cjs install --mode=skip-build

WORKDIR /app/apps/web
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN node /app/.yarn/releases/yarn-4.10.3.cjs build

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/apps/web/dist ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
