FROM node:20-alpine AS base

# Allow builds to work behind proxies. Compose automatically forwards HTTP(S)_PROXY/no_proxy
# to build args, so just declare and export them.
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY HTTPS_PROXY=$HTTPS_PROXY NO_PROXY=$NO_PROXY \
    http_proxy=$HTTP_PROXY https_proxy=$HTTPS_PROXY no_proxy=$NO_PROXY
ENV NPM_CONFIG_REGISTRY=http://registry.npmjs.org \
    YARN_NPM_REGISTRY_SERVER=http://registry.npmjs.org \
    NPM_CONFIG_STRICT_SSL=false \
    YARN_UNSAFE_HTTP_WHITELIST=registry.npmjs.org \
    COREPACK_ENABLE_DOWNLOADS=0

FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
# Strip host proxy config; container uses env vars instead
RUN sed -i '/^httpProxy:/d;/^httpsProxy:/d' .yarnrc.yml
COPY .yarn ./.yarn
COPY squirrel/microservices/support-service/package.json ./squirrel/microservices/support-service/
RUN node ./.yarn/releases/yarn-4.10.3.cjs workspaces focus @squirrel/support-service --production

FROM base AS builder
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
RUN sed -i '/^httpProxy:/d;/^httpsProxy:/d' .yarnrc.yml
COPY .yarn ./.yarn
COPY squirrel/microservices/support-service ./squirrel/microservices/support-service
RUN node ./.yarn/releases/yarn-4.10.3.cjs workspaces focus @squirrel/support-service
RUN cd squirrel/microservices/support-service && node /app/.yarn/releases/yarn-4.10.3.cjs build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/squirrel/microservices/support-service/dist ./squirrel/microservices/support-service/dist
COPY --from=builder /app/squirrel/microservices/support-service/package.json ./squirrel/microservices/support-service/
WORKDIR /app/squirrel/microservices/support-service
EXPOSE 3004
CMD ["node", "dist/main.js"]
