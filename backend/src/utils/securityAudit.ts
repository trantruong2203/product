import { Request } from 'express';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_LOCKED'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'CSRF_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INJECTION_ATTEMPT'
  | 'UNAUTHORIZED_ACCESS'
  | 'PERMISSION_DENIED';

export interface SecurityEvent {
  timestamp: string;
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  details?: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// In-memory event log (in production, use a dedicated logging service)
const securityLog: SecurityEvent[] = [];
const MAX_LOG_SIZE = 10000;

/**
 * Extract client IP from request
 */
export const getClientIp = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

/**
 * Log security event
 */
export const logSecurityEvent = (event: Omit<SecurityEvent, 'timestamp'>): void => {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  securityLog.push(fullEvent);

  // Keep log size manageable
  if (securityLog.length > MAX_LOG_SIZE) {
    securityLog.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    const severityEmoji = {
      LOW: '🟢',
      MEDIUM: '🟡',
      HIGH: '🔴',
      CRITICAL: '🚨',
    };

    console.log(
      `${severityEmoji[event.severity]} [${event.type}] ${event.email || event.userId || 'Unknown'} - ${event.ipAddress}`
    );
  }

  // Alert on critical events
  if (event.severity === 'CRITICAL') {
    console.error(`🚨 CRITICAL SECURITY EVENT: ${event.type}`, event);
  }
};

/**
 * Get security events for a user
 */
export const getUserSecurityEvents = (userId: string, limit: number = 50): SecurityEvent[] => {
  return securityLog
    .filter(e => e.userId === userId)
    .slice(-limit)
    .reverse();
};

/**
 * Get recent security events
 */
export const getRecentSecurityEvents = (limit: number = 100): SecurityEvent[] => {
  return securityLog.slice(-limit).reverse();
};

/**
 * Get security events by type
 */
export const getSecurityEventsByType = (type: SecurityEventType, limit: number = 50): SecurityEvent[] => {
  return securityLog
    .filter(e => e.type === type)
    .slice(-limit)
    .reverse();
};

/**
 * Get security events by severity
 */
export const getSecurityEventsBySeverity = (severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', limit: number = 50): SecurityEvent[] => {
  return securityLog
    .filter(e => e.severity === severity)
    .slice(-limit)
    .reverse();
};

/**
 * Get security summary
 */
export const getSecuritySummary = () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recentEvents = securityLog.filter(e => new Date(e.timestamp) > oneHourAgo);

  return {
    totalEvents: securityLog.length,
    eventsLastHour: recentEvents.length,
    criticalEvents: recentEvents.filter(e => e.severity === 'CRITICAL').length,
    highEvents: recentEvents.filter(e => e.severity === 'HIGH').length,
    failedLogins: recentEvents.filter(e => e.type === 'LOGIN_FAILED').length,
    lockedAccounts: recentEvents.filter(e => e.type === 'LOGIN_LOCKED').length,
    csrfViolations: recentEvents.filter(e => e.type === 'CSRF_VIOLATION').length,
    rateLimitExceeded: recentEvents.filter(e => e.type === 'RATE_LIMIT_EXCEEDED').length,
  };
};

/**
 * Clear old security events (older than specified days)
 */
export const clearOldSecurityEvents = (daysOld: number = 30): number => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const initialLength = securityLog.length;
  const filtered = securityLog.filter(e => new Date(e.timestamp) > cutoffDate);

  securityLog.length = 0;
  securityLog.push(...filtered);

  return initialLength - securityLog.length;
};
