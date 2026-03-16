/**
 * Structured logging utility for backend
 * Outputs JSON logs with timestamp, level, action, and context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  action: string;
  message?: string;
  context?: LogContext;
  error?: string;
  stack?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatLog(log: StructuredLog): string {
    if (this.isDevelopment) {
      // Human-readable format for development
      const contextStr = log.context ? ` | ${JSON.stringify(log.context)}` : '';
      const errorStr = log.error ? ` | Error: ${log.error}` : '';
      return `[${log.timestamp}] ${log.level.toUpperCase()} | ${log.action}${contextStr}${errorStr}${log.message ? ` | ${log.message}` : ''}`;
    }
    // JSON format for production
    return JSON.stringify(log);
  }

  private log(level: LogLevel, action: string, message?: string, context?: LogContext, error?: Error): void {
    const log: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      action,
      ...(message && { message }),
      ...(context && { context }),
      ...(error && { error: error.message, stack: error.stack }),
    };

    const formatted = this.formatLog(log);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(action: string, message?: string, context?: LogContext): void {
    this.log('debug', action, message, context);
  }

  info(action: string, message?: string, context?: LogContext): void {
    this.log('info', action, message, context);
  }

  warn(action: string, message?: string, context?: LogContext): void {
    this.log('warn', action, message, context);
  }

  error(action: string, error: Error, context?: LogContext): void {
    this.log('error', action, undefined, context, error);
  }
}

export const logger = new Logger();
