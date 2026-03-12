# GEO SaaS - Deployment & Workflow Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  GeoDashboard.tsx - User submits scan request                   │
│  - Input: prompt, brand, competitors, engines                   │
│  - Polling: Every 2 seconds for job status                      │
│  - Display: GEO score, mentions, sentiment, engine results      │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express API)                        │
│  geo.controller.ts - Handle scan requests                       │
│  - POST /api/geo/scan - Create prompt & queue jobs              │
│  - GET /api/geo/results/:promptId - Get analysis results        │
│  - Services: EntityExtractor, CompetitorDetector, GEOCalculator │
└────────────────────────┬────────────────────────────────────────┘
                         │ BullMQ Queue
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WORKER (Playwright)                           │
│  runPrompt.ts - Process browser automation jobs                 │
│  - Query ChatGPT, Gemini, Claude                                │
│  - Capture responses (text + HTML)                              │
│  - Store in database                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ Database
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Neon)                         │
│  Tables: Run, Response, Citation, ResponseAnalysis             │
│  - Stores job status, responses, analysis results              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
1. USER SUBMITS SCAN
   ┌──────────────────────────────────────────┐
   │ GeoDashboard.tsx                         │
   │ - prompt: "best badminton racket"        │
   │ - brand: "Yonex"                         │
   │ - competitors: ["Li-Ning", "Victor"]     │
   │ - engines: ["ChatGPT", "Gemini", "Claude"]
   └──────────────────────────────────────────┘
                    │
                    ▼ POST /api/geo/scan
   ┌──────────────────────────────────────────┐
   │ geo.controller.ts - runAnalysis()        │
   │ 1. Create Prompt record                  │
   │ 2. Create Run records (1 per engine)     │
   │ 3. Queue jobs to BullMQ                  │
   └──────────────────────────────────────────┘
                    │
                    ▼ Return promptId
   ┌──────────────────────────────────────────┐
   │ Frontend: Start Polling                  │
   │ GET /api/geo/results/:promptId every 2s  │
   └──────────────────────────────────────────┘

2. WORKER PROCESSES JOBS
   ┌──────────────────────────────────────────┐
   │ Worker picks up job from queue           │
   │ For each engine (ChatGPT, Gemini, Claude)│
   │ 1. Launch Playwright browser             │
   │ 2. Query AI engine                       │
   │ 3. Capture response                      │
   │ 4. Store Response in database            │
   │ 5. Update Run status to COMPLETED        │
   └──────────────────────────────────────────┘

3. BACKEND PROCESSES RESULTS
   ┌──────────────────────────────────────────┐
   │ geo.controller.ts - getAnalysisResults() │
   │ 1. Get completed runs                    │
   │ 2. Extract brand mentions                │
   │ 3. Detect competitors                    │
   │ 4. Analyze sentiment                     │
   │ 5. Calculate GEO score                   │
   │ 6. Return results                        │
   └──────────────────────────────────────────┘
                    │
                    ▼ Return results
   ┌──────────────────────────────────────────┐
   │ Frontend: Display Results                │
   │ - GEO Score: 78                          │
   │ - Brand Mentions: 12                     │
   │ - Competitor Mentions: 6                 │
   │ - Sentiment: POSITIVE                    │
   │ - Engine Results: ChatGPT ✓ Gemini ✓ ... │
   └──────────────────────────────────────────┘
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All code changes applied
- [ ] TypeScript compilation successful
- [ ] No linting errors
- [ ] All tests passing
- [ ] Database migrations ready
- [ ] Environment variables configured

### Database Setup
```bash
# Create database
createdb geo_saas

# Run migrations
cd backend
npm run db:push

# Verify schema
psql -U postgres -d geo_saas -c "\dt"
```

### Backend Deployment
```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm run dev  # Development
# OR
npm start    # Production

# Verify health check
curl http://localhost:3001/health
```

### Worker Deployment
```bash
cd worker

# Install dependencies
npm install

# Build TypeScript
npm run build

# Login to AI engines (one-time setup)
npm run login:chatgpt
npm run login:gemini
npm run login:claude

# Start worker
npm run dev  # Development
# OR
npm start    # Production
```

### Frontend Deployment
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Start dev server
npm run dev

# OR deploy to production
npm run preview
```

### Docker Deployment
```bash
# Build all services
docker compose build

# Start all services
docker compose up -d

# Verify services
docker compose ps

# Check logs
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f frontend

# Stop services
docker compose down
```

---

## Post-Deployment Verification

### 1. Health Checks
```bash
# Backend health
curl http://localhost:3001/health

# Frontend accessible
curl http://localhost:5173

# Database connected
psql -U postgres -d geo_saas -c "SELECT COUNT(*) FROM \"User\";"

# Redis connected
redis-cli ping
```

### 2. Test End-to-End Workflow
```bash
# 1. Create user account
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 2. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Create project
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com","brandName":"Yonex","country":"US","language":"en"}'

# 4. Run GEO scan
curl -X POST http://localhost:3001/api/geo/scan \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"best badminton racket",
    "brand":"Yonex",
    "competitors":["Li-Ning","Victor"],
    "engines":["ChatGPT","Gemini","Claude"]
  }'

# 5. Poll for results
curl http://localhost:3001/api/geo/results/PROMPT_ID \
  -H "Authorization: Bearer TOKEN"
```

### 3. Monitor Logs
```bash
# Backend logs
tail -f backend/logs/app.log | grep "\[GEO\]"

# Worker logs
tail -f worker/logs/worker.log

# Database logs
tail -f postgres/logs/postgres.log

# Redis logs
tail -f redis/logs/redis.log
```

### 4. Database Verification
```bash
# Check runs
psql -U postgres -d geo_saas -c "SELECT id, status FROM \"Run\" LIMIT 5;"

# Check responses
psql -U postgres -d geo_saas -c "SELECT id, \"runId\" FROM \"Response\" LIMIT 5;"

# Check queue jobs
redis-cli LLEN run_prompt
redis-cli LRANGE run_prompt 0 -1
```

---

## Troubleshooting

### Issue: Brand mentions = 0
**Symptoms:** GEO score is 0, no mentions detected
**Diagnosis:**
```bash
# Check logs for extraction errors
tail -f backend/logs/app.log | grep "Found.*brand mentions"

# Verify brand name in response
psql -U postgres -d geo_saas -c "SELECT \"responseText\" FROM \"Response\" LIMIT 1;"
```
**Solution:**
1. Check brand name spelling
2. Verify response contains brand name
3. Enable debug logging in EntityExtractor
4. Test extraction with sample text

### Issue: Polling never completes
**Symptoms:** Frontend keeps polling, results never appear
**Diagnosis:**
```bash
# Check run status
psql -U postgres -d geo_saas -c "SELECT id, status FROM \"Run\" WHERE status != 'COMPLETED';"

# Check worker logs
tail -f worker/logs/worker.log | grep ERROR

# Check queue
redis-cli LLEN run_prompt
```
**Solution:**
1. Verify worker is running: `docker ps | grep worker`
2. Check worker logs for errors
3. Verify database connectivity
4. Restart worker if stuck

### Issue: GEO score too low
**Symptoms:** Score is 0-20 when expecting higher
**Diagnosis:**
```bash
# Check mention counts
psql -U postgres -d geo_saas -c "SELECT COUNT(*) FROM \"Citation\" WHERE \"mentionedBrand\" = true;"

# Check sentiment analysis
psql -U postgres -d geo_saas -c "SELECT sentiment, COUNT(*) FROM \"ResponseAnalysis\" GROUP BY sentiment;"
```
**Solution:**
1. Verify brand extraction is working
2. Check sentiment analysis logic
3. Review position calculation
4. Test with known good response

### Issue: Database connection error
**Symptoms:** "ECONNREFUSED" or "connection timeout"
**Diagnosis:**
```bash
# Check PostgreSQL status
docker ps | grep postgres

# Test connection
psql -U postgres -h localhost -d geo_saas -c "SELECT 1;"

# Check connection string
echo $DATABASE_URL
```
**Solution:**
1. Verify PostgreSQL is running
2. Check DATABASE_URL environment variable
3. Verify credentials
4. Check firewall/network access

---

## Performance Optimization

### Database Indexes
```sql
-- Already created in schema, verify:
SELECT * FROM pg_indexes WHERE tablename = 'Run';
SELECT * FROM pg_indexes WHERE tablename = 'Response';
```

### Query Optimization
```typescript
// Use batch queries instead of loops
const responses = await db.select()
  .from(responses)
  .where(inArray(responses.runId, runIds));

// Use connection pooling (already configured)
// Use prepared statements (Drizzle handles this)
```

### Caching Strategy
```typescript
// Cache brand variations
const brandVariations = new Map();

// Cache sentiment words
const positiveWords = new Set([...]);
const negativeWords = new Set([...]);
```

### Monitoring
```bash
# Monitor database connections
psql -U postgres -d geo_saas -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor Redis memory
redis-cli INFO memory

# Monitor queue depth
redis-cli LLEN run_prompt

# Monitor worker performance
docker stats geo-worker
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Stop services
docker compose down

# 2. Revert code changes
git checkout HEAD~1

# 3. Rebuild services
docker compose build

# 4. Restart services
docker compose up -d

# 5. Verify health
curl http://localhost:3001/health
```

---

## Maintenance Tasks

### Daily
- [ ] Check error logs
- [ ] Monitor queue depth
- [ ] Verify all services running

### Weekly
- [ ] Review performance metrics
- [ ] Check database size
- [ ] Backup database

### Monthly
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Optimize slow queries

---

## Support Contacts

- **Backend Issues:** Check `backend/logs/app.log`
- **Worker Issues:** Check `worker/logs/worker.log`
- **Database Issues:** Check PostgreSQL logs
- **Frontend Issues:** Check browser console

---

## Success Criteria

✅ All services running
✅ Health checks passing
✅ End-to-end workflow completes
✅ Results display correctly
✅ No errors in logs
✅ Performance acceptable
✅ Database consistent

**Deployment Status: READY** ✅
