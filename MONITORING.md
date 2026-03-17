# Monitoring & Observability Guide

## Overview

This document describes the monitoring and observability infrastructure for GEO SaaS, including structured logging, error tracking, and Prometheus metrics.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GEO SaaS Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  Structured      │  │  Sentry Error    │  │ Prometheus │ │
│  │  Logging         │  │  Tracking        │  │ Metrics    │ │
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬──────┘ │
│           │                     │                  │         │
└───────────┼─────────────────────┼──────────────────┼─────────┘
            │                     │                  │
            ▼                     ▼                  ▼
    ┌──────────────┐      ┌──────────────┐   ┌──────────────┐
    │  Console     │      │  Sentry      │   │  Prometheus  │
    │  (Dev/Prod)  │      │  Dashboard   │   │  /metrics    │
    └──────────────┘      └──────────────┘   └──────────────┘
            │                     │                  │
            └─────────────────────┼──────────────────┘
                                  │
                          ┌───────▼────────┐
                          │  Grafana       │
                          │  Dashboards    │
                          └────────────────┘
```

## 1. Structured Logging

### Overview

All application logs are structured with consistent format for easy parsing and analysis.

### Log Format

**Development (Human-Readable):**
```
[2026-03-16T12:45:00.327Z] INFO | User logged in | {"userId":"123","email":"user@example.com","ipAddress":"192.168.1.1"}
```

**Production (JSON):**
```json
{
  "timestamp": "2026-03-16T12:45:00.327Z",
  "level": "info",
  "action": "User logged in",
  "message": "User login successful: user@example.com",
  "context": {
    "userId": "123",
    "email": "user@example.com",
    "ipAddress": "192.168.1.1"
  }
}
```

### Log Levels

- **debug**: Detailed diagnostic information (development only)
- **info**: General informational messages
- **warn**: Warning messages for potentially problematic situations
- **error**: Error messages with stack traces

### Usage

```typescript
import { logger } from './utils/logger.js';

// Info log
logger.info('User registered', `New user created: ${user.email}`, {
  userId: user.id,
  email: user.email,
  ipAddress: getClientIp(req),
});

// Warning log
logger.warn('Login failed', 'Invalid password', {
  userId: user.id,
  email,
  ipAddress: getClientIp(req),
});

// Error log
logger.error('Database error', error, {
  operation: 'insert',
  table: 'users',
});
```

### Log Aggregation

In production, logs should be aggregated using:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **CloudWatch** (AWS)
- **Stackdriver** (Google Cloud)

## 2. Error Tracking (Sentry)

### Overview

Sentry automatically captures and reports errors with full context.

### Configuration

**Environment Variables:**
```bash
SENTRY_DSN=https://key@sentry.io/project-id
```

### Features

- Automatic error capture
- Stack trace collection
- User context tracking
- Release tracking
- Performance monitoring
- Alert rules

### Usage

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
    userId: user.id,
  });
}

// Clear user context on logout
clearUserContext();
```

### Sentry Dashboard

Access at: `https://sentry.io/organizations/your-org/`

**Key Metrics:**
- Error rate
- Affected users
- Release health
- Performance metrics

### Alert Configuration

Set up alerts for:
- New errors
- Error spike (> 10% increase)
- Critical errors
- Performance degradation

## 3. Prometheus Metrics

### Overview

Prometheus metrics provide real-time monitoring of application performance and health.

### Metrics Endpoint

```
GET /metrics
```

Returns Prometheus-format metrics for scraping.

### Metric Types

#### HTTP Metrics
```
http_request_duration_seconds - Request latency histogram
http_requests_total - Total requests counter
http_request_errors_total - Error counter
```

#### Authentication Metrics
```
auth_login_attempts_total - Login attempts (success/failed/locked)
auth_token_refresh_total - Token refresh counter
auth_active_users - Current active users gauge
```

#### Database Metrics
```
db_query_duration_seconds - Query latency histogram
db_query_errors_total - Query error counter
db_connection_pool_size - Pool size gauge
db_connection_pool_available - Available connections gauge
```

#### Cache Metrics
```
cache_hits_total - Cache hit counter
cache_misses_total - Cache miss counter
cache_size_bytes - Cache size gauge
```

#### Job Queue Metrics
```
job_queue_depth - Jobs in queue gauge
job_processing_duration_seconds - Job processing time histogram
job_errors_total - Job error counter
```

#### Security Metrics
```
security_events_total - Security events counter
rate_limit_violations_total - Rate limit violations counter
csrf_violations_total - CSRF violations counter
account_lockouts_total - Account lockouts counter
```

#### System Metrics
```
process_uptime_seconds - Process uptime gauge
process_memory_usage_bytes - Memory usage gauge
process_cpu_usage_percent - CPU usage gauge
```

### Prometheus Configuration

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'geo-saas-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### Querying Metrics

**PromQL Examples:**

```promql
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

# Job queue depth
job_queue_depth

# Failed login attempts (last hour)
increase(auth_login_attempts_total{status="failed"}[1h])
```

## 4. Grafana Dashboards

### Overview

Grafana visualizes Prometheus metrics in real-time dashboards.

### Dashboard Setup

1. Add Prometheus data source
2. Create dashboards with panels
3. Set up alerts
4. Share dashboards

### Recommended Dashboards

#### 1. System Health Dashboard
- Request rate
- Error rate
- Latency (p50, p95, p99)
- Active users
- System resources

#### 2. Authentication Dashboard
- Login attempts (success/failed/locked)
- Token refresh rate
- Active users
- Failed login trends

#### 3. Database Dashboard
- Query latency
- Query errors
- Connection pool usage
- Slow queries

#### 4. Security Dashboard
- Security events by type
- Rate limit violations
- CSRF violations
- Account lockouts
- Failed login attempts

#### 5. Job Queue Dashboard
- Queue depth
- Processing time
- Error rate
- Throughput

### Alert Rules

**High Error Rate:**
```yaml
alert: HighErrorRate
expr: rate(http_request_errors_total[5m]) > 0.05
for: 5m
annotations:
  summary: "High error rate detected"
```

**High Latency:**
```yaml
alert: HighLatency
expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
for: 5m
annotations:
  summary: "High request latency detected"
```

**Database Connection Pool Exhausted:**
```yaml
alert: DBPoolExhausted
expr: db_connection_pool_available == 0
for: 1m
annotations:
  summary: "Database connection pool exhausted"
```

## 5. Health Checks

### Endpoints

**Basic Health Check:**
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-16T12:45:00.327Z"
}
```

**Detailed Health Check (Future):**
```
GET /health/detailed
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-16T12:45:00.327Z",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "latency": 5
  },
  "redis": {
    "status": "connected",
    "latency": 2
  },
  "memory": {
    "heapUsed": 52428800,
    "heapTotal": 104857600
  }
}
```

## 6. Monitoring Best Practices

### Key Metrics to Monitor

1. **Availability**
   - Uptime percentage
   - Error rate
   - Health check status

2. **Performance**
   - Request latency (p50, p95, p99)
   - Throughput (requests/sec)
   - Database query time

3. **Reliability**
   - Error rate by endpoint
   - Failed job rate
   - Database connection errors

4. **Security**
   - Failed login attempts
   - Account lockouts
   - CSRF violations
   - Rate limit violations

5. **Resource Usage**
   - CPU usage
   - Memory usage
   - Database connections
   - Cache hit ratio

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 1% | > 5% |
| Latency (p95) | > 500ms | > 2s |
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 80% | > 95% |
| DB Connections | > 80% | > 95% |
| Failed Logins (1h) | > 10 | > 50 |
| Account Lockouts (1h) | > 5 | > 20 |

### On-Call Runbook

When alerted:

1. **Check Dashboard**
   - Go to relevant Grafana dashboard
   - Identify affected service/endpoint

2. **Review Logs**
   - Check structured logs for errors
   - Look for patterns or correlations

3. **Check Sentry**
   - Review error details
   - Check affected users

4. **Investigate Root Cause**
   - Database performance?
   - External API issues?
   - Resource exhaustion?
   - Code bug?

5. **Take Action**
   - Scale resources if needed
   - Deploy fix if available
   - Rollback if necessary

6. **Post-Incident**
   - Document incident
   - Create follow-up tasks
   - Update runbooks

## 7. Setup Instructions

### Local Development

1. **Start Prometheus:**
```bash
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

2. **Start Grafana:**
```bash
docker run -d \
  -p 3000:3000 \
  grafana/grafana
```

3. **Access Dashboards:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

### Production

1. **Deploy Prometheus**
   - Use managed service (Datadog, New Relic)
   - Or self-host with high availability

2. **Deploy Grafana**
   - Use managed service
   - Or self-host with backup

3. **Configure Alerts**
   - Set up alert channels (Slack, PagerDuty)
   - Configure escalation policies

4. **Set Up Log Aggregation**
   - ELK Stack or managed service
   - Configure log retention

## 8. Troubleshooting

### Metrics Not Appearing

1. Check `/metrics` endpoint returns data
2. Verify Prometheus scrape config
3. Check Prometheus targets page
4. Review Prometheus logs

### High Memory Usage

1. Check process_memory_usage_bytes
2. Review cache_size_bytes
3. Check for memory leaks
4. Restart service if needed

### High Error Rate

1. Check error logs in Sentry
2. Review http_request_errors_total
3. Check database metrics
4. Review recent deployments

### Slow Queries

1. Check db_query_duration_seconds
2. Review slow query logs
3. Check database indexes
4. Consider query optimization

## 9. Related Documentation

- [SECURITY.md](./SECURITY.md) - Security hardening
- [ROADMAP.md](./ROADMAP.md) - Production readiness roadmap
- [CLAUDE.md](./CLAUDE.md) - Project overview

---

**Last Updated:** 2026-03-16
**Status:** Phase 2 In Progress - Observability Implemented
**Next:** Grafana Dashboards & Health Checks
