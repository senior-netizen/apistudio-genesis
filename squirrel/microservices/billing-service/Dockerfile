FROM node:20-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY . .
RUN if [ ! -d node_modules ]; then \
    if [ -f package-lock.json ]; then npm ci --workspaces=false --omit=dev --no-fund --no-audit; \
    else npm install --workspaces=false --omit=dev --no-fund --no-audit; fi; \
    fi
EXPOSE 3006
CMD ["node", "dist/main.js"]
