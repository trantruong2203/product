# Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Git

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/geo-saas.git
cd geo-saas
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Worker
cd ../worker
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure Environment Variables

#### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/geo_saas

# Cache
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-min-32-characters-long

# Server
NODE_ENV=production
PORT=3001
HTTPS=true

# Frontend
FRONTEND_URL=https://yourdomain.com

# Error Tracking (Optional)
SENTRY_DSN=https://key@sentry.io/project-id
```

#### Worker (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/geo_saas

# Cache
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=production

# Optional
RECAPTCHA_API_KEY=your-recaptcha-key
```

#### Frontend (.env)

```bash
VITE_API_URL=https://api.yourdomain.com
```

## Local Development

### 1. Start Services

```bash
# Start PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=geo_saas \
  -p 5432:5432 \
  postgres:15

# Start Redis
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7

# Start Prometheus (optional)
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Start Grafana (optional)
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

### 2. Initialize Database

```bash
cd backend
npm run db:push
```

### 3. Start Services

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Worker
cd worker
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

### 4. Access Applications

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

## Docker Deployment

### 1. Build Images

```bash
docker compose build
```

### 2. Start Services

```bash
docker compose up -d
```

### 3. Initialize Database

```bash
docker compose exec backend npm run db:push
```

### 4. View Logs

```bash
docker compose logs -f
```

## Production Deployment

### 1. Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database backups enabled
- [ ] SSL certificates installed
- [ ] Monitoring configured (Prometheus, Grafana)
- [ ] Error tracking configured (Sentry)
- [ ] Log aggregation configured
- [ ] CDN configured
- [ ] Load balancer configured

### 2. Database Migration

```bash
# Backup existing database
pg_dump $DATABASE_URL > backup.sql

# Run migrations
npm run db:migrate
```

### 3. Deploy Backend

```bash
# Build
npm run build

# Start service
npm start

# Verify health
curl https://api.yourdomain.com/health
```

### 4. Deploy Worker

```bash
# Build
npm run build

# Start service
npm start
```

### 5. Deploy Frontend

```bash
# Build
npm run build

# Deploy to CDN/hosting
# Example: AWS S3 + CloudFront
aws s3 sync dist/ s3://your-bucket/
```

### 6. Verify Deployment

```bash
# Check API health
curl https://api.yourdomain.com/health

# Check metrics
curl https://api.yourdomain.com/metrics

# Check API docs
curl https://api.yourdomain.com/api-docs

# Run smoke tests
npm run test:smoke
```

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace geo-saas
```

### 2. Create Secrets

```bash
kubectl create secret generic geo-saas-secrets \
  --from-literal=jwt-secret=your-secret-key \
  --from-literal=database-url=postgresql://... \
  --from-literal=redis-url=redis://... \
  -n geo-saas
```

### 3. Deploy Services

```bash
# Backend
kubectl apply -f kubernetes/backend-deployment.yaml -n geo-saas

# Worker
kubectl apply -f kubernetes/worker-deployment.yaml -n geo-saas

# Frontend
kubectl apply -f kubernetes/frontend-deployment.yaml -n geo-saas

# Services
kubectl apply -f kubernetes/services.yaml -n geo-saas

# Ingress
kubectl apply -f kubernetes/ingress.yaml -n geo-saas
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n geo-saas

# Check services
kubectl get svc -n geo-saas

# Check ingress
kubectl get ingress -n geo-saas

# View logs
kubectl logs -f deployment/backend -n geo-saas
```

## Monitoring & Observability

### 1. Prometheus Setup

```bash
# Access Prometheus
http://localhost:9090

# Query metrics
rate(http_requests_total[5m])
histogram_quantile(0.95, http_request_duration_seconds_bucket)
```

### 2. Grafana Setup

```bash
# Access Grafana
http://localhost:3000 (admin/admin)

# Add Prometheus data source
# Create dashboards from templates
```

### 3. Sentry Setup

```bash
# Configure SENTRY_DSN
export SENTRY_DSN=https://key@sentry.io/project-id

# Access Sentry dashboard
https://sentry.io/organizations/your-org/
```

## Backup & Recovery

### 1. Database Backup

```bash
# Full backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz

# Automated daily backup
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/backup-$(date +\%Y\%m\%d).sql.gz
```

### 2. Database Recovery

```bash
# Restore from backup
psql $DATABASE_URL < backup-20260316.sql

# Restore from compressed backup
gunzip -c backup-20260316.sql.gz | psql $DATABASE_URL
```

### 3. Redis Backup

```bash
# Manual backup
redis-cli BGSAVE

# Automated backup
# Configure in redis.conf: save 900 1
```

## Scaling

### 1. Horizontal Scaling

```bash
# Scale backend replicas
kubectl scale deployment backend --replicas=3 -n geo-saas

# Scale worker replicas
kubectl scale deployment worker --replicas=5 -n geo-saas
```

### 2. Auto-Scaling

```bash
# Create HPA
kubectl apply -f kubernetes/hpa.yaml -n geo-saas

# Monitor scaling
kubectl get hpa -n geo-saas -w
```

### 3. Load Balancing

```bash
# Configure load balancer
# Update ingress.yaml with load balancer settings
# Configure sticky sessions if needed
```

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
SELECT count(*) FROM pg_stat_activity;

# Increase pool size if needed
# Update backend/src/db/index.ts: max: 30
```

### Redis Connection Issues

```bash
# Test connection
redis-cli ping

# Check memory usage
redis-cli INFO memory

# Clear cache if needed
redis-cli FLUSHALL
```

### High Memory Usage

```bash
# Check process memory
ps aux | grep node

# Check heap usage
node --expose-gc app.js

# Enable garbage collection
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### High CPU Usage

```bash
# Profile CPU usage
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Check slow queries
# Enable query logging in PostgreSQL
```

## Rollback Procedure

### 1. Identify Issue

```bash
# Check logs
kubectl logs -f deployment/backend -n geo-saas

# Check metrics
curl https://api.yourdomain.com/metrics
```

### 2. Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/backend -n geo-saas

# Rollback to previous version
kubectl rollout undo deployment/backend -n geo-saas

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n geo-saas
```

### 3. Verify Rollback

```bash
# Check deployment status
kubectl rollout status deployment/backend -n geo-saas

# Verify health
curl https://api.yourdomain.com/health
```

## Security Checklist

- [ ] JWT_SECRET is strong (min 32 characters)
- [ ] HTTPS is enforced
- [ ] Database credentials are secure
- [ ] Redis is password-protected
- [ ] Firewall rules are configured
- [ ] SSL certificates are valid
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Secrets are not in version control
- [ ] Regular security audits scheduled

## Support & Troubleshooting

For issues or questions:
1. Check logs: `docker compose logs -f`
2. Review documentation: See MONITORING.md, SECURITY.md
3. Check health endpoint: `curl http://localhost:3001/health`
4. Review metrics: `curl http://localhost:3001/metrics`
5. Contact support team

---

**Last Updated:** 2026-03-16
**Version:** 1.0.0
**Status:** Production Ready
