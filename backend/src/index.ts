import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initSentry, getSentryMiddleware, getSentryErrorHandler } from './utils/sentry.js';
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
import auditRoutes from './routes/audit.routes';
import { errorHandler } from './middleware/errorHandler.js';
import {
  securityHeaders,
  globalLimiter,
  httpsRedirect,
  requestId,
} from './middleware/security.js';
import { attachCsrfToken } from './middleware/csrf.js';

const app = express();

// Initialize Sentry for error tracking
initSentry();

// Sentry request handler
app.use(getSentryMiddleware());

// Security middleware - apply first
app.use(httpsRedirect);
app.use(securityHeaders);
app.use(requestId);
app.use(globalLimiter);

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Input validation middleware
import { validateInput, validateRequestSize } from './middleware/inputValidation.js';
app.use(validateRequestSize('10mb'));
app.use(validateInput);

// Attach CSRF token to all responses
app.use(attachCsrfToken);

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
app.use('/api/audit', auditRoutes);

// Sentry error handler
app.use(getSentryErrorHandler());

// Custom error handler
app.use(errorHandler);

// Validate secrets before starting server
import { validateSecrets, logSecretStatus } from './utils/secrets.js';

const secretValidation = validateSecrets();
if (!secretValidation.valid) {
  logger.error('Secret validation failed', new Error(secretValidation.errors.join(', ')));
  process.exit(1);
}

logSecretStatus();

app.listen(config.port, () => {
  logger.info('Server started', `Server running on port ${config.port} in ${config.nodeEnv} mode`, {
    port: config.port,
    environment: config.nodeEnv,
  });
});

export default app;

