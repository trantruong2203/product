import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import competitorRoutes from './routes/competitor.routes';
import promptRoutes from './routes/prompt.routes';
import runRoutes from './routes/run.routes';
import resultRoutes from './routes/result.routes';
import engineRoutes from './routes/engine.routes';
import somRoutes from './routes/som.routes';
import citationRoutes from './routes/citation.routes';
import alertRoutes from './routes/alert.routes';
import scheduleRoutes from './routes/schedule.routes';
import analysisRoutes from './routes/analysis.routes';
import recommendationRoutes from './routes/recommendation.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', competitorRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/engines', engineRoutes);
app.use('/api/som', somRoutes);
app.use('/api/citations', citationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

export default app;
