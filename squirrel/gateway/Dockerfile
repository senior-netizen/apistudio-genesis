FROM node:20-alpine AS builder
WORKDIR /usr/src/app
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
RUN npm run build || yarn build

FROM node:20-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE 3080
CMD ["node", "dist/main.js"]
