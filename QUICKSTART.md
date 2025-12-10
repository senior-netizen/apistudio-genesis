# Quick Start Guide - Squirrel API Studio

Get up and running in under 5 minutes.

## Prerequisites

- Docker & Docker Compose installed
- Git

## 1. Clone & Start

```bash
git clone <repository-url>
cd apistudio-genesis

# Start all services
docker compose up -d

# Wait ~30 seconds, then access: http://localhost:8080
```

## 2. First Login

1. Go to http://localhost:8080
2. Sign up with email/password
3. Create workspace

## 3. Create Your First Request

1. Click "+ New Collection" → Name: "GitHub API"
2. Click "+ New Request" → Name: "Get User"
3. Set: `GET https://api.github.com/users/octocat`
4. Click "Send" ✅

## 4. Key Features

### GraphQL
- Switch to "GraphQL" tab
- Click "Introspect Schema"
- Write queries with autocomplete

### Documentation
- Collection menu → "Documentation"
- Click "Generate" → Export OpenAPI spec

### Mock Servers
- "Mock Servers" → Create server
- Add routes: `GET /users/:id → {"id":"123"}`
- Use: `http://localhost:8080/mock/{mockId}/users/123`

### Monitoring
- "Monitoring" → Create monitor
- Schedule: `*/5 * * * *` (every 5 min)
- Configure Slack/Email alerts

## Troubleshooting

```bash
# Check logs
docker compose logs backend

# Reset database
docker compose exec backend npx prisma migrate reset

# Restart all
docker compose restart
```

## Next Steps

- Read full docs: `docs/README.md`
- VS Code extension: Search "Squirrel API" in marketplace
- CLI: `npm install -g @squirrel/cli`
