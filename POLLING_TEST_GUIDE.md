# GEO Polling - Testing Guide

## Fixes Applied

✅ Fixed useEffect dependency array (removed `pollingInterval` from deps)
✅ Added immediate first poll call (no 2-second delay)
✅ Added comprehensive console logging with [GEO] prefix
✅ Added backend logging for debugging
✅ Removed `status` field from successful responses

## Testing Steps

### 1. Restart Services

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

### 2. Open Browser DevTools

1. Open http://localhost:5173
2. Press F12 to open DevTools
3. Go to **Console** tab
4. Go to **Network** tab

### 3. Run GEO Scan

1. Fill in form:
   - Prompt: "best badminton racket"
   - Brand: "Yonex"
   - Competitors: "Li-Ning, Victor"
   - Engines: ChatGPT, Gemini, Claude

2. Click "Run GEO Analysis"

### 4. Monitor Console Logs

You should see:

```
[GEO] Starting polling for promptId: <uuid>
[GEO] Polling for results: <uuid>
[GEO] Poll response: {success: true, data: {...}}
[GEO] Still processing, will poll again in 2s
[GEO] Polling for results: <uuid>
[GEO] Poll response: {success: true, data: {...}}
[GEO] Results received, stopping polling
```

### 5. Monitor Network Tab

You should see:

1. **POST /api/geo/scan** - Initial scan request
   - Response: `{success: true, data: {promptId, runs}}`

2. **GET /api/geo/results/:promptId** - First poll (immediate)
   - Response: `{success: true, data: {status: 'NO_COMPLETED_RUNS', ...}}`

3. **GET /api/geo/results/:promptId** - Subsequent polls (every 2s)
   - Response: `{success: true, data: {engineResults, geoScore, ...}}`

### 6. Verify Results Display

After 2-3 seconds, you should see:
- ✅ GEO Score gauge (0-100)
- ✅ Brand Mentions count
- ✅ Competitor Mentions count
- ✅ Sentiment (POSITIVE/NEUTRAL/NEGATIVE)
- ✅ Engine Results (ChatGPT, Gemini, Claude with success status)

## Troubleshooting

### Issue: Polling doesn't start

**Check:**
1. Console shows `[GEO] Starting polling for promptId`?
2. Network tab shows GET requests to `/api/geo/results`?

**Fix:**
- Restart frontend: `npm run dev`
- Clear browser cache: Ctrl+Shift+Delete

### Issue: Polling stops but no results

**Check:**
1. Backend logs show `[GEO] Found X completed runs`?
2. Network response shows `engineResults` array?

**Fix:**
- Check worker logs for errors
- Verify database has Response records
- Check backend logs for processResults errors

### Issue: Results show but incomplete

**Check:**
1. `geoScore` is 0?
2. `brandMentions` is 0?

**Fix:**
- Check if brand extraction is working
- Verify sentiment analysis ran
- Check worker logs for parsing errors

## Expected Behavior

| Step | Expected | Actual |
|------|----------|--------|
| Click "Run GEO Analysis" | Form disables, loading shows | ✓ |
| Immediate poll | Console shows `[GEO] Starting polling` | ✓ |
| First poll response | Shows `NO_COMPLETED_RUNS` | ✓ |
| Subsequent polls | Every 2 seconds | ✓ |
| Job completes | Results display within 5-10s | ✓ |
| Polling stops | No more GET requests | ✓ |

## Success Criteria

- ✅ Polling starts immediately (no 2-second delay)
- ✅ Console logs show [GEO] prefix
- ✅ Network tab shows GET requests every 2 seconds
- ✅ Results display after job completion
- ✅ No infinite loops or memory leaks
- ✅ Polling stops when results received

## Backend Logs to Check

```bash
# Terminal 2 (Backend)
# Should see:
[GEO] Found X completed runs for promptId: <uuid>
[GEO] Processing results for brand: Yonex, competitors: Li-Ning, Victor
[GEO] Found X brand mentions, Y competitor mentions
[GEO] Final GEO Score: Z
[GEO] Returning results for promptId: <uuid>
```

## If Still Not Working

1. **Check database:**
   ```bash
   psql -U postgres -d geo_saas -c "SELECT id, status FROM \"Run\" ORDER BY \"createdAt\" DESC LIMIT 5;"
   ```

2. **Check responses:**
   ```bash
   psql -U postgres -d geo_saas -c "SELECT id, \"runId\", LENGTH(\"responseText\") FROM \"Response\" ORDER BY \"createdAt\" DESC LIMIT 5;"
   ```

3. **Check worker logs:**
   ```bash
   docker logs geo-worker 2>&1 | tail -50
   ```

4. **Restart all services:**
   ```bash
   docker compose down
   docker compose up -d
   ```
