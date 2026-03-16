# Security Hardening Implementation

## Overview

This document outlines the security hardening measures implemented in the GEO SaaS backend to protect against common vulnerabilities and attacks.

## Implemented Security Features

### 1. Security Headers (Helmet.js)

**File:** `backend/src/middleware/security.ts`

Implements comprehensive HTTP security headers:
- **Content Security Policy (CSP)**: Restricts resource loading to prevent XSS attacks
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Strict-Transport-Security**: Enforces HTTPS
- **X-XSS-Protection**: Enables browser XSS protection

**Usage:**
```typescript
app.use(securityHeaders);
```

### 2. Rate Limiting

**File:** `backend/src/middleware/security.ts`

Three-tier rate limiting strategy:

#### Global Limiter
- 100 requests per 15 minutes per IP
- Applies to all endpoints except `/health`

#### Auth Limiter
- 5 requests per 15 minutes per IP
- Applied to `/api/auth/login` and `/api/auth/register`
- Prevents brute force attacks

#### API Limiter
- 30 requests per minute per IP
- Applied to general API endpoints

**Usage:**
```typescript
router.post('/login', authLimiter, authController.login);
```

### 3. HTTPS Enforcement

**File:** `backend/src/middleware/security.ts`

In production, automatically redirects HTTP to HTTPS:
```typescript
app.use(httpsRedirect);
```

### 4. Account Lockout Protection

**File:** `backend/src/middleware/accountLockout.ts`

Prevents brute force attacks by locking accounts after failed login attempts:
- **Max Attempts:** 5 failed attempts
- **Lockout Duration:** 15 minutes
- **Attempt Window:** 15 minutes

**Features:**
- Tracks failed login attempts per email
- Automatically locks account after threshold
- Clears attempts on successful login
- Returns 429 (Too Many Requests) when locked

**Usage:**
```typescript
router.post('/login', checkAccountLockout, authController.login);
```

### 5. CSRF Protection

**File:** `backend/src/middleware/csrf.ts`

Prevents Cross-Site Request Forgery attacks:
- Generates unique CSRF tokens per session
- Validates tokens on state-changing requests (POST, PUT, DELETE)
- Uses constant-time comparison to prevent timing attacks
- Tokens expire after 24 hours

**Token Flow:**
1. Client receives CSRF token in response header (`x-csrf-token`)
2. Client includes token in request header (`x-csrf-token`) or body (`csrfToken`)
3. Server validates token before processing request

**Usage:**
```typescript
app.use(attachCsrfToken);
app.post('/api/endpoint', csrfProtection, controller.handler);
```

### 6. Input Validation & Sanitization

**File:** `backend/src/middleware/inputValidation.ts`

Prevents injection attacks:
- Removes angle brackets and quotes from string inputs
- Validates email format
- Validates URL format
- Enforces request size limits (10MB default)

**Features:**
- Sanitizes request body and query parameters
- Validates content-length header
- Returns 413 (Payload Too Large) for oversized requests

**Usage:**
```typescript
app.use(validateRequestSize('10mb'));
app.use(validateInput);
```

### 7. Secrets Management

**File:** `backend/src/utils/secrets.ts`

Secure handling of sensitive configuration:
- Validates required secrets on startup
- Prevents server start if secrets missing
- Masks secrets in logs
- Provides secret rotation capability

**Required Secrets:**
- `JWT_SECRET` - JWT signing key (min 32 chars)
- `DATABASE_URL` - Database connection string
- `REDIS_URL` - Redis connection string

**Optional Secrets:**
- `RECAPTCHA_API_KEY` - CAPTCHA service key
- `SENTRY_DSN` - Error tracking service

**Usage:**
```typescript
const secretValidation = validateSecrets();
if (!secretValidation.valid) {
  console.error('Secret validation failed');
  process.exit(1);
}
```

### 8. Enhanced Authentication

**File:** `backend/src/middleware/authenticate.ts`

Improved JWT authentication:
- Token blacklisting for logout
- Token refresh capability
- Optional authentication for public endpoints
- Validates token expiration

**Features:**
- `authenticate`: Required authentication
- `optionalAuth`: Optional authentication
- `generateToken`: Create new JWT
- `blacklistToken`: Revoke token on logout

**Usage:**
```typescript
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', authenticate, authController.refreshToken);
```

### 9. Security Audit Logging

**File:** `backend/src/utils/securityAudit.ts`

Comprehensive security event tracking:
- Logs all authentication events
- Tracks failed login attempts
- Records CSRF violations
- Monitors rate limit violations
- Tracks unauthorized access attempts

**Event Types:**
- `LOGIN_SUCCESS` - Successful login
- `LOGIN_FAILED` - Failed login attempt
- `LOGIN_LOCKED` - Account locked
- `LOGOUT` - User logout
- `TOKEN_REFRESH` - Token refreshed
- `CSRF_VIOLATION` - CSRF token invalid
- `RATE_LIMIT_EXCEEDED` - Rate limit hit
- `INJECTION_ATTEMPT` - Injection detected
- `UNAUTHORIZED_ACCESS` - Access denied

**Severity Levels:**
- `LOW` - Normal operations
- `MEDIUM` - Suspicious activity
- `HIGH` - Security concern
- `CRITICAL` - Immediate action required

**Usage:**
```typescript
logSecurityEvent({
  type: 'LOGIN_SUCCESS',
  userId: user.id,
  email: user.email,
  ipAddress: getClientIp(req),
  severity: 'LOW',
});
```

### 10. Security Audit Endpoints

**File:** `backend/src/routes/audit.routes.ts`

Admin endpoints for security monitoring:
- `GET /api/audit/summary` - Security summary (last hour)
- `GET /api/audit/events` - Recent security events
- `GET /api/audit/my-events` - User's own security events

**Response Example:**
```json
{
  "success": true,
  "data": {
    "totalEvents": 1250,
    "eventsLastHour": 45,
    "criticalEvents": 0,
    "highEvents": 2,
    "failedLogins": 5,
    "lockedAccounts": 1,
    "csrfViolations": 0,
    "rateLimitExceeded": 3
  }
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Authentication
JWT_SECRET=your-secret-key-min-32-characters

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Cache
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=production
PORT=3001
HTTPS=true

# Frontend
FRONTEND_URL=https://yourdomain.com
```

### Development vs Production

**Development (.env.local):**
```bash
NODE_ENV=development
HTTPS=false
JWT_SECRET=dev-secret-key-for-testing-only
```

**Production (.env):**
```bash
NODE_ENV=production
HTTPS=true
JWT_SECRET=<strong-random-key>
```

## Security Best Practices

### 1. JWT Secret Management
- Generate strong random secret (min 32 characters)
- Store in environment variables, never in code
- Rotate periodically in production
- Use different secrets for dev/staging/production

### 2. Password Security
- Passwords hashed with bcrypt (12 rounds)
- Never log passwords
- Enforce strong password requirements
- Implement password reset with email verification

### 3. HTTPS Enforcement
- Always use HTTPS in production
- Set `HTTPS=true` environment variable
- Redirect HTTP to HTTPS
- Use valid SSL certificates

### 4. Rate Limiting
- Adjust limits based on your traffic patterns
- Monitor for DDoS attacks
- Implement IP whitelisting for trusted services
- Use Redis for distributed rate limiting

### 5. CSRF Protection
- Always include CSRF token in state-changing requests
- Validate token on server side
- Regenerate token after login
- Use SameSite cookie attribute

### 6. Input Validation
- Validate all user inputs
- Use parameterized queries (Drizzle ORM)
- Sanitize output for XSS prevention
- Implement file upload restrictions

### 7. Audit Logging
- Log all security events
- Monitor for suspicious patterns
- Set up alerts for critical events
- Retain logs for compliance

### 8. Dependency Management
- Keep dependencies updated
- Use `npm audit` to check for vulnerabilities
- Review security advisories regularly
- Use lock files (package-lock.json)

## Testing Security

### Manual Testing

```bash
# Test rate limiting
for i in {1..10}; do curl http://localhost:3001/api/auth/login; done

# Test CSRF protection
curl -X POST http://localhost:3001/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
# Should return 403 without CSRF token

# Test account lockout
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}'
done
# Should return 429 after 5 attempts
```

### Automated Testing

```bash
# Run security tests
npm test -- --grep "security"

# Check for vulnerabilities
npm audit

# Run OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3001
```

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Failed Login Attempts**
   - Alert if > 10 in 1 hour
   - Alert if > 50 in 24 hours

2. **Account Lockouts**
   - Alert if > 5 in 1 hour
   - Investigate patterns

3. **CSRF Violations**
   - Alert if > 0 (should be rare)
   - Investigate immediately

4. **Rate Limit Violations**
   - Alert if > 100 in 1 hour
   - Check for DDoS patterns

5. **Unauthorized Access**
   - Alert immediately
   - Review access logs

### Setting Up Alerts

```typescript
// Example: Alert on critical events
const summary = getSecuritySummary();
if (summary.criticalEvents > 0) {
  sendAlert('Critical security event detected', summary);
}
```

## Compliance

### OWASP Top 10 Coverage

- ✅ A01:2021 - Broken Access Control (Authentication, CSRF)
- ✅ A02:2021 - Cryptographic Failures (HTTPS, JWT)
- ✅ A03:2021 - Injection (Input validation, parameterized queries)
- ✅ A04:2021 - Insecure Design (Rate limiting, account lockout)
- ✅ A05:2021 - Security Misconfiguration (Secrets management)
- ✅ A06:2021 - Vulnerable Components (Dependency updates)
- ✅ A07:2021 - Authentication Failures (Account lockout, rate limiting)
- ✅ A08:2021 - Software & Data Integrity (JWT validation)
- ✅ A09:2021 - Logging & Monitoring (Security audit logging)
- ✅ A10:2021 - SSRF (Input validation)

## Next Steps

1. **Week 2:** Implement observability (structured logging, error tracking, monitoring)
2. **Week 3:** Add testing & CI/CD (unit tests, integration tests, security scanning)
3. **Week 4:** Improve documentation (API docs, deployment guide, runbooks)
4. **Week 5:** Frontend security (error boundaries, secure token storage, WCAG compliance)
5. **Week 6:** Performance & scaling (caching, CDN, auto-scaling, backups)

## Support & Questions

For security issues or questions:
1. Check this documentation
2. Review code comments in middleware files
3. Run security tests
4. Contact security team

---

**Last Updated:** 2026-03-16
**Status:** Phase 1 Complete - Security Hardening Implemented
