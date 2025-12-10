FROM node:18-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
COPY .yarnrc.yml ./
COPY .yarn ./.yarn
COPY .yarn/releases/yarn-4.10.3.cjs ./.yarn/releases/yarn-4.10.3.cjs
COPY . .
RUN corepack enable \
    && if [ -f yarn.lock ]; then \
        corepack prepare "$(node -p 'require("./package.json").packageManager || "yarn@4.10.3"')" --activate && \
        yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \
    else npm install; fi

FROM deps AS builder
WORKDIR /app/squirrel/microservices/collaboration-service
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app/squirrel/microservices/collaboration-service
ENV NODE_ENV=production
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/squirrel/microservices/collaboration-service/package.json ./package.json
COPY --from=builder /app/squirrel/microservices/collaboration-service/dist ./dist
CMD ["node", "dist/main.js"]
