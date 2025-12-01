# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json yarn.lock .yarn .yarnrc.yml ./
COPY squirrel/frontend/package.json squirrel/frontend/
RUN yarn install --immutable

COPY . .
RUN yarn workspace @sdl/squirrel-web build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html
COPY --from=base /app/squirrel/frontend/dist ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
