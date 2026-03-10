# GEO SaaS - AI Visibility Tracker

A SaaS platform for tracking and analyzing AI search visibility. GEO (Generative Engine Optimization) helps you monitor how your brand appears in AI-powered search results across multiple engines.

## Features

- **Multi-Engine Tracking**: Monitor visibility across major AI search engines
- **Prompt Management**: Create and manage search queries in multiple languages (English, Vietnamese)
- **Competitor Analysis**: Compare your AI visibility against competitors
- **Real-time Analytics**: Track visibility scores, citation rates, and coverage metrics
- **Historical Trends**: Visualize visibility changes over time with interactive charts
- **Multi-language Support**: Full support for English and Vietnamese interfaces

## Tech Stack

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Recharts for data visualization
- react-i18next for internationalization
- Axios for API calls
- Vite for build tooling

### Backend
- Node.js with Express
- Drizzle ORM for database
- Neon (PostgreSQL) for data storage
- BullMQ for job queue processing

### Worker
- Puppeteer/Playwright for web scraping
- Custom AI engine integrations

## Project Structure

```
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service functions
│   │   ├── locales/       # i18n translation files
│   │   │   ├── en.json    # English translations
│   │   │   └── vi.json    # Vietnamese translations
│   │   ├── i18n.ts        # i18n configuration
│   │   ├── types.ts       # TypeScript type definitions
│   │   └── App.tsx        # Main application component
│   └── index.html         # HTML entry point
├── backend/                # Express API server
├── worker/                 # Background job processor
└── README.md              # This file
```
f



- Node.js 18+
- npm or yarn
- PostgreSQL database (Neon)
- API keys for AI engines (OpenAI, Anthropic, etc.)

## Installation

1. **Clone the repository**

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure environment variables**

   Create `.env` files in respective directories:

   **Frontend (.env)**
   ```env
   VITE_API_URL=http://localhost:3001
   ```

   **Backend (.env)**
   ```env
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret-key
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

4. **Set up the database**
   ```bash
   cd backend
   npm run db:push
   ```

## Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the worker**
   ```bash
   cd worker
   npm run dev
   ```

3. **Start the frontend**
   ```bash
   cd frontend
   npm run dev
   ```

4. Open browser at `http://localhost:5173`

### Production Build

1. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Preview production build**
   ```bash
   npm run preview
   ```

## Usage

### Getting Started

1. **Register an account** or log in
2. **Create a project** with your brand name and domain
3. **Add search queries** (prompts) you want to track
4. **Add competitors** for comparison
5. **Run analysis** to fetch current AI visibility data

### Dashboard

The dashboard shows:
- All your projects with key metrics
- Visibility scores
- Number of tracked prompts
- Number of analysis runs

### Project Detail

Each project provides:
- **Metrics Overview**: Visibility score, citation rate, prompt coverage, average position
- **Charts**: Historical visibility trends, competitor comparisons
- **Prompts Management**: Add, delete, and manage search queries
- **Competitors**: Track and compare against competitors

## Internationalization

The application supports English and Vietnamese. To switch languages:

- Default language: Vietnamese (vi)
- Fallback language: English (en)

Translation files are located in:
- `frontend/src/locales/en.json`
- `frontend/src/locales/vi.json`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `DELETE /api/projects/:id` - Delete project

### Prompts
- `GET /api/projects/:projectId/prompts` - List prompts
- `POST /api/projects/:projectId/prompts` - Create prompt
- `DELETE /api/projects/:projectId/prompts/:id` - Delete prompt

### Competitors
- `GET /api/projects/:projectId/competitors` - List competitors
- `POST /api/projects/:projectId/competitors` - Add competitor
- `DELETE /api/projects/:projectId/competitors/:id` - Remove competitor

### Results
- `GET /api/projects/:projectId/results` - Get latest results
- `GET /api/projects/:projectId/history` - Get historical data
- `POST /api/runs/trigger` - Trigger analysis run

## License

MIT License
