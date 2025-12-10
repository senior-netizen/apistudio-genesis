# Deployment Guide - Production Setup

## Simple Deployment (Recommended for Getting Started)

### Docker Compose Profiles

Use profiles to run only what you need:

```bash
# Minimal setup (core features only)
docker compose --profile minimal up -d

# Standard setup (most features)
docker compose --profile standard up -d

# Full setup (all microservices)
docker compose --profile full up -d
```

### Profile Breakdown

**Minimal** (3 services):
- gateway (Nginx)
- backend (Main API)
- postgres (Database)

**Standard** (6 services):
- Minimal +
- redis (Caching)
- frontend (Web UI)
- backend-worker (Background jobs)

**Full** (11 services):
- Standard +
- All microservices (auth, billing, AI, etc.)

## Production Configuration

### 1. Environment Variables

Create `.env.production`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@db-host:5432/squirrel

# Security
JWT_SECRET=<generate-random-string-64-chars>
SESSION_SECRET=<generate-random-string-64-chars>

# CORS
ALLOWED_ORIGINS=https://yourdomain.com

# Email (for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 2. SSL/HTTPS Setup

Update `config/nginx/gateway.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... rest of config
}
```

Mount certificates:

```yaml
# docker-compose.yml
services:
  gateway:
    volumes:
      - ./certs:/etc/nginx/ssl:ro
```

### 3. Database Scaling

**Use managed PostgreSQL** (recommended):
- AWS RDS
- Google Cloud SQL
- DigitalOcean Managed Database

Update `DATABASE_URL` in `.env`

**Or scale with replicas:**

```yaml
services:
  postgres:
    deploy:
      replicas: 3
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

### 4. Redis Clustering

For high availability:

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes
    deploy:
      replicas: 3
```

## Simplified Single-Server Deployment

For small teams, use minimal profile:

```bash
# 1. Clone & configure
git clone <repo>
cd apistudio-genesis
cp .env.example .env
nano .env  # Edit configuration

# 2. Start minimal profile
docker compose --profile minimal up -d

# 3. Apply migrations
docker compose exec backend npx prisma migrate deploy

# 4. Access
# http://your-server-ip:8080
```

**Pros:**
- Simple to manage
- Low resource usage (~1GB RAM)
- All core features work

**Cons:**
- No background jobs (monitoring, alerts)
- No AI features
- No billing

## Kubernetes Deployment

For large scale:

```bash
# Deploy to k8s
kubectl apply -f k8s/

# Services will auto-scale based on load
```

See `k8s/README.md` for details.

## Monitoring

### Health Checks

```bash
# Check all services
curl http://localhost:8080/v1/health

# Check specific service
docker compose ps
docker compose logs backend
```

### Prometheus Metrics

Exposed at `/metrics` endpoint.

### Logs

```bash
# View logs
docker compose logs -f backend

# Export logs
docker compose logs > logs.txt
```

## Backup & Recovery

### Database Backup

```bash
# Backup
docker compose exec postgres pg_dump squirrel > backup-$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql squirrel < backup.sql
```

### Automated Backups

Add to cron:

```bash
0 2 * * * cd /path/to/app && docker compose exec postgres pg_dump squirrel > /backups/db-$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### High Memory Usage

Reduce microservices:

```bash
docker compose --profile minimal up -d
```

### Slow Performance

1. Enable Redis caching
2. Scale database
3. Add load balancer

### Service Crashes

Check logs:

```bash
docker compose logs <service-name>
docker compose restart <service-name>
```

## Cost Optimization

### Small Team (< 10 users)

**Minimal deployment:**
- 1 VPS (2 CPU, 4GB RAM): $20/month
- Managed Postgres: $15/month
- **Total: ~$35/month**

### Medium Team (< 100 users)

**Standard deployment:**
- 1 VPS (4 CPU, 8GB RAM): $40/month
- Managed Postgres: $25/month
- Redis: $10/month
- **Total: ~$75/month**

### Large Team (> 100 users)

**Full deployment with k8s:**
- 3 nodes (4 CPU, 16GB RAM): $120/month
- Managed Postgres (HA): $100/month
- Redis cluster: $30/month
- Load balancer: $10/month
- **Total: ~$260/month**

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/HTTPS
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable database encryption
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] API rate limiting
- [ ] Security headers (helmet.js)
- [ ] Audit logging enabled

## Support

- Documentation: `/docs`
- GitHub Issues: Report bugs
- Discord: Community support
- Email: support@squirrel-api.com
