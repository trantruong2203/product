# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GEO SaaS is a 3-tier application for tracking AI search visibility across ChatGPT, Gemini, and Claude. The architecture consists of:

- **Frontend**: React 18 + TypeScript + Vite (port 5173/80)
- **Backend**: Express API + Drizzle ORM + Neon PostgreSQL (port 3001)
- **Worker**: Playwright-based browser automation for AI engine scraping

The three services communicate via:
- REST API (frontend ↔ backend)
- BullMQ job queues (backend → worker)
- Shared PostgreSQL database

## Development Commands

### Backend
```bash
cd backend
npm run dev          # Start API server with tsx watch
npm run build        # Compile TypeScript
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
```

### Worker
```bash
cd worker
npm run dev          # Start worker with tsx watch
npm run build        # Compile TypeScript
npm run login:chatgpt    # Login script for ChatGPT session
npm run login:gemini     # Login script for Gemini session
npm run login:perplexity # Login script for Perplexity session
npm test             # Run tests
```

### Frontend
```bash
cd frontend
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run Vitest tests
npm run test:watch   # Run tests in watch mode
```

### Docker
```bash
docker compose build      # Build all services
docker compose up -d      # Start all services
docker compose down       # Stop all services
docker compose logs -f    # Follow logs
```

## Architecture

### Job Queue Flow

1. Backend receives `/api/runs/trigger` request
2. Creates Run records in database (one per prompt × engine combination)
3. Adds jobs to BullMQ `run_prompt` queue via `queue.service.ts`
4. Worker picks up jobs via `worker/src/index.ts`
5. Each job executes `runPromptJob()` in `jobs/runPrompt.ts`:
   - Get engine instance from `engines/baseEngine.ts`
   - Launch browser from `browsers/browserPool.ts`
   - Query AI engine (human-like typing, scrolling, delays)
   - Store Response in database
   - Parse citations via `services/parser.service.ts`
   - Analyze sentiment via `services/sentiment.service.ts`

### Database Schema

Key tables (shared across backend and worker):
- `User`, `Project`, `Competitor`, `Prompt` - Core tracking entities
- `AIEngine` - Registered AI search engines
- `Run` - Execution records (PENDING → RUNNING → COMPLETED/FAILED)
- `Response` - AI engine responses (text + HTML)
- `Citation` - Extracted citations with brand/competitor matching
- `ResponseAnalysis` - Sentiment analysis results
- `Alert`, `ScanSchedule`, `Recommendation` - Advanced features

Both backend and worker have their own `db/schema.ts` files that should be kept in sync.

### Browser Automation

The worker uses Playwright with stealth plugins to avoid detection:
- `browsers/browserPool.ts` - Manages persistent browser contexts per engine
- `engines/baseEngine.ts` - Base class for AI engine interactions
- Supports ChatGPT, Gemini, Claude with human-like behavior:
  - Random delays between requests (5-15s)
  - Character-by-character typing
  - Bezier curve mouse movements
  - Random scroll behavior
  - CAPTCHA detection and handling

Login sessions persist in `chrome-profile/<engine>/` directories. Run login scripts before first use.

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
```

### Worker (.env)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
RECAPTCHA_API_KEY=...  # Optional, for auto-solving CAPTCHAs
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

## Key Files

### Backend
- `src/index.ts` - Express app entry point
- `src/services/queue.service.ts` - BullMQ queue management
- `src/config/index.ts` - Configuration

### Worker
- `src/index.ts` - Worker entry point, processes `run_prompt` queue
- `src/jobs/runPrompt.ts` - Main job handler
- `src/browsers/browserPool.ts` - Browser context management
- `src/engines/baseEngine.ts` - AI engine abstraction
- `src/services/parser.service.ts` - Citation extraction
- `src/services/sentiment.service.ts` - Sentiment analysis

### Frontend
- `src/App.tsx` - Main app component with routing
- `src/services/api.ts` - API client
- `src/types/index.ts` - TypeScript types

## Testing

Tests use Node.js built-in test runner:
- Backend: `node --import tsx --test "test/**/*.test.ts"`
- Worker: Same pattern
- Frontend: Vitest

## Common Patterns

### Adding a new AI engine
1. Add config to `worker/src/engines/baseEngine.ts` `ENGINE_CONFIGS`
2. Add case to `getEngine()` function
3. Create login script in `worker/src/scripts/`

### Database schema changes
1. Modify `backend/src/db/schema.ts`
2. Run `npm run db:push` (dev) or `npm run db:generate && npm run db:migrate` (prod)
3. Sync changes to `worker/src/db/schema.ts`

### Adding new API endpoints
1. Create controller in `backend/src/controllers/`
2. Create routes in `backend/src/routes/`
3. Register routes in `backend/src/index.ts`
4. Add validation schemas in `backend/src/validations/index.ts` if needed