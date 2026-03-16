import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

/**
 * Initialize Sentry for error tracking
 */
export const initSentry = (): void => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.warn('Sentry initialization', 'SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Don't send 4xx errors to Sentry
          if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('404')) {
            return null;
          }
        }
      }
      return event;
    },
  });

  logger.info('Sentry initialized', 'Error tracking enabled', {
    environment: process.env.NODE_ENV,
  });
};

/**
 * Capture exception in Sentry
 */
export const captureException = (error: Error, context?: Record<string, any>): void => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureException(error);
  });
};

/**
 * Capture message in Sentry
 */
export const captureMessage = (message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'): void => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.captureMessage(message, level);
};

/**
 * Set user context in Sentry
 */
export const setUserContext = (userId: string, email: string, name?: string): void => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.setUser({
    id: userId,
    email,
    username: name,
  });
};

/**
 * Clear user context
 */
export const clearUserContext = (): void => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.setUser(null);
};

/**
 * Get Sentry middleware for Express
 */
export const getSentryMiddleware = () => {
  if (!process.env.SENTRY_DSN) {
    return (req: any, res: any, next: any) => next();
  }

  return Sentry.Handlers.requestHandler();
};

/**
 * Get Sentry error handler middleware for Express
 */
export const getSentryErrorHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (err: any, req: any, res: any, next: any) => next(err);
  }

  return Sentry.Handlers.errorHandler();
};
