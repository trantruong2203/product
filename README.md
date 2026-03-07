# GEO SaaS - AI Visibility Tracker

Track your brand visibility inside AI answers. This system helps you understand:
- Whether your brand appears in AI responses
- What position it appears at
- Whether competitors appear
- How visibility changes over time

## Features

- Multi-engine support: ChatGPT, Perplexity, Gemini, Claude
- Real-time AI response tracking
- Competitor comparison
- Historical trend analysis
- Visibility score calculation

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma
- **Queue**: Redis + BullMQ
- **Automation**: Playwright

## Quick Start with Docker

1. Clone the repository
2. Create `.env` files for backend and worker
3. Run:

```bash
docker-compose up -d
```

4. Access the frontend at http://localhost:5173

## Manual Setup

### Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### Worker

```bash
cd worker
npm install
npx playwright install chromium
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Prompts
- `POST /api/prompts` - Create prompt
- `GET /api/prompts/:projectId` - List prompts
- `DELETE /api/prompts/:projectId/:promptId` - Delete prompt

### Competitors
- `POST /api/projects/:id/competitors` - Add competitor
- `GET /api/projects/:id/competitors` - List competitors
- `DELETE /api/projects/:id/competitors/:id` - Delete competitor

### Runs
- `POST /api/runs/run` - Trigger new run
- `GET /api/runs` - List runs
- `GET /api/runs/:id` - Get run details

### Results
- `GET /api/results/:projectId` - Get project results
- `GET /api/results/:projectId/history` - Get historical data
- `GET /api/results/:projectId/competitors` - Get competitor comparison

## Visibility Score Formula

```javascript
score = (citation_rate * 0.5) + (prompt_coverage * 0.3) + (avg_position_score * 0.2)
```

## License

MIT
