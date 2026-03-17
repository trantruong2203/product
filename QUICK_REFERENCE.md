# Quick Reference Guide

## Security Features

### Rate Limiting
```bash
# Global: 100 requests/15min per IP
# Auth: 5 requests/15min per IP
# API: 30 requests/min per IP

# Test rate limiting
for i in {1..10}; do curl http://localhost:3001/api/auth/login; done
# Returns 429 after limit exceeded
```

### Account Lockout
```bash
# After 5 failed login attempts
# Account locked for 15 minutes
# Clears on successful login

# Test lockout
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}'
done
# Returns 429 after 5 attempts
```

### CSRF Protection
```bash
# All state-changing requests require CSRF token
# Token in response header: x-csrf-token
# Include in request header or body: csrfToken

# Example with token
curl -X POST http://localhost:3001/api/endpoint \
  -H "x-csrf-token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
```

### Input Validation
```bash
# Automatically sanitizes:
# - Removes angle brackets: < >
# - Removes quotes: " '
# - Validates email format
# - Validates URL format
# - Limits request size to 10MB

# Prevents XSS and injection attacks
```

### Secrets Management
```bash
# Required environment variables:
JWT_SECRET=your-secret-key-min-32-characters
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Server won't start without these
# Validated on startup
```

### Authentication
```bash
# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
# Returns: { token, user }

# Logout (invalidates token)
POST /api/auth/logout
Authorization: Bearer <token>

# Refresh token
POST /api/auth/refresh
Authorization: Bearer <token>
# Returns: { token }

# Get current user
GET /api/auth/me
Authorization: Bearer <token>
```

### Security Audit
```bash
# View security summary (last hour)
GET /api/audit/summary
Authorization: Bearer <token>

# View recent security events
GET /api/audit/events?limit=100
Authorization: Bearer <token>

# View user's own security events
GET /api/audit/my-events?limit=50
Authorization: Bearer <token>
```

---

## Monitoring Features

### Structured Logging
```typescript
import { logger } from './utils/logger.js';

// Info log
logger.info('User registered', `New user: ${email}`, {
  userId: user.id,
  email,
  ipAddress: getClientIp(req),
});

// Warning log
logger.warn('Login failed', 'Invalid password', {
  userId: user.id,
  email,
});

// Error log
logger.error('Database error', error, {
  operation: 'insert',
  table: 'users',
});
```

### Error Tracking (Sentry)
```typescript
import { captureException, setUserContext } from './utils/sentry.js';

// Set user context
setUserContext(user.id, user.email, user.name);

// Capture exception
try {
  await riskyOperation();
} catch (error) {
  captureException(error as Error, {
    operation: 'riskyOperation',
  });
}

// Clear user context on logout
clearUserContext();
```

### Prometheus Metrics
```bash
# Access metrics endpoint
curl http://localhost:3001/metrics

# Common queries (in Prometheus/Grafana)

# Request rate (requests per second)
rate(http_requests_total[5m])

# Error rate
rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Active users
auth_active_users

# Cache hit ratio
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# Failed login attempts (last hour)
increase(auth_login_attempts_total{status="failed"}[1h])

# Account lockouts (last hour)
increase(account_lockouts_total[1h])
```

### Health Checks
```bash
# Basic health check
curl http://localhost:3001/health
# Returns: { status: "ok", timestamp: "..." }

# Detailed health check (future)
curl http://localhost:3001/health/detailed
# Returns: { status, uptime, database, redis, memory }
```

---

## Environment Variables

### Required
```bash
JWT_SECRET=your-secret-key-min-32-characters
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://localhost:6379
```

### Optional
```bash
NODE_ENV=production          # development or production
PORT=3001                    # Server port
HTTPS=true                   # Enforce HTTPS in production
FRONTEND_URL=https://...     # Frontend URL for CORS
SENTRY_DSN=https://...       # Sentry error tracking
```

---

## Common Tasks

### Enable Error Tracking
```bash
# 1. Get Sentry DSN from https://sentry.io
# 2. Set environment variable
export SENTRY_DSN=https://key@sentry.io/project-id

# 3. Restart server
npm run dev

# 4. Errors will be captured automatically
```

### Monitor Metrics
```bash
# 1. Start Prometheus
docker run -d -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# 2. Start Grafana
docker run -d -p 3000:3000 grafana/grafana

# 3. Add Prometheus data source in Grafana
# 4. Create dashboards with metrics
```

### View Security Events
```bash
# Get security summary
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/audit/summary

# Get recent events
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/audit/events?limit=100

# Get user's events
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/audit/my-events
```

### Test Security Features
```bash
# Test rate limiting
for i in {1..10}; do curl http://localhost:3001/api/auth/login; done

# Test CSRF protection
curl -X POST http://localhost:3001/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
# Should return 403

# Test account lockout
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}'
done
# Should return 429 after 5 attempts

# Test input validation
curl -X POST http://localhost:3001/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"data": "<script>alert(1)</script>"}'
# Script tags will be removed
```

---

## Troubleshooting

### Server Won't Start
```bash
# Check secrets validation
# Error: "Secret validation failed"
# Solution: Set required environment variables
export JWT_SECRET=your-secret-key
export DATABASE_URL=postgresql://...
export REDIS_URL=redis://...
```

### High Error Rate
```bash
# 1. Check Sentry dashboard
# 2. Review error logs
# 3. Check database metrics
# 4. Review recent deployments
```

### Slow Requests
```bash
# 1. Check P95 latency in Prometheus
# 2. Review database query metrics
# 3. Check cache hit ratio
# 4. Review slow query logs
```

### Rate Limit Issues
```bash
# Check rate limit violations
curl http://localhost:3001/metrics | grep rate_limit_violations

# Adjust limits in security.ts if needed
# Global: 100 requests/15min
# Auth: 5 requests/15min
# API: 30 requests/min
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (requires auth)
- `POST /api/auth/refresh` - Refresh token (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Security Audit
- `GET /api/audit/summary` - Security summary (requires auth)
- `GET /api/audit/events` - Recent events (requires auth)
- `GET /api/audit/my-events` - User's events (requires auth)

### Monitoring
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

---

## Key Files

### Security
- `backend/src/middleware/security.ts` - Security headers & rate limiting
- `backend/src/middleware/accountLockout.ts` - Account lockout protection
- `backend/src/middleware/csrf.ts` - CSRF protection
- `backend/src/middleware/inputValidation.ts` - Input validation
- `backend/src/utils/secrets.ts` - Secrets management
- `backend/src/utils/securityAudit.ts` - Security audit logging

### Monitoring
- `backend/src/utils/logger.ts` - Structured logging
- `backend/src/utils/sentry.ts` - Error tracking
- `backend/src/utils/metrics.ts` - Prometheus metrics

### Documentation
- `SECURITY.md` - Security hardening guide
- `MONITORING.md` - Monitoring & observability guide
- `ROADMAP.md` - Production readiness roadmap
- `IMPLEMENTATION_SUMMARY.md` - Implementation summary

---

## Support

For issues or questions:
1. Check relevant documentation (SECURITY.md, MONITORING.md)
2. Review code comments in middleware files
3. Run security tests
4. Check logs and metrics
5. Contact team lead

---

**Last Updated:** 2026-03-16
**Status:** Phases 1 & 2 Complete
**Next:** Phase 3 - Testing & CI/CD
