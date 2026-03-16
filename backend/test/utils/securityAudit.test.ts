import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  logSecurityEvent,
  getUserSecurityEvents,
  getRecentSecurityEvents,
  getSecurityEventsByType,
  getSecurityEventsBySeverity,
  getSecuritySummary,
  clearOldSecurityEvents,
} from '../src/utils/securityAudit.js';

describe('Security Audit Logging', () => {
  beforeEach(() => {
    // Clear events before each test
    clearOldSecurityEvents(0);
  });

  describe('logSecurityEvent', () => {
    it('should log a security event with all fields', () => {
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/auth/login',
        severity: 'LOW',
      });

      const events = getRecentSecurityEvents(1);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].type, 'LOGIN_SUCCESS');
      assert.strictEqual(events[0].userId, 'user-123');
      assert.strictEqual(events[0].email, 'test@example.com');
      assert.strictEqual(events[0].severity, 'LOW');
    });

    it('should include timestamp in logged event', () => {
      const beforeTime = new Date();
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-123',
        email: 'test@example.com',
        severity: 'LOW',
      });
      const afterTime = new Date();

      const events = getRecentSecurityEvents(1);
      const eventTime = new Date(events[0].timestamp);
      assert(eventTime >= beforeTime && eventTime <= afterTime);
    });
  });

  describe('getUserSecurityEvents', () => {
    it('should return events for specific user', () => {
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-123',
        email: 'test@example.com',
        severity: 'LOW',
      });

      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-456',
        email: 'other@example.com',
        severity: 'LOW',
      });

      const userEvents = getUserSecurityEvents('user-123');
      assert.strictEqual(userEvents.length, 1);
      assert.strictEqual(userEvents[0].userId, 'user-123');
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        logSecurityEvent({
          type: 'LOGIN_SUCCESS',
          userId: 'user-123',
          email: 'test@example.com',
          severity: 'LOW',
        });
      }

      const userEvents = getUserSecurityEvents('user-123', 5);
      assert.strictEqual(userEvents.length, 5);
    });
  });

  describe('getRecentSecurityEvents', () => {
    it('should return recent events in reverse chronological order', () => {
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-1',
        severity: 'LOW',
      });

      logSecurityEvent({
        type: 'LOGIN_FAILED',
        userId: 'user-2',
        severity: 'MEDIUM',
      });

      const events = getRecentSecurityEvents(10);
      assert.strictEqual(events.length, 2);
      assert.strictEqual(events[0].type, 'LOGIN_FAILED');
      assert.strictEqual(events[1].type, 'LOGIN_SUCCESS');
    });
  });

  describe('getSecurityEventsByType', () => {
    it('should filter events by type', () => {
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-1',
        severity: 'LOW',
      });

      logSecurityEvent({
        type: 'LOGIN_FAILED',
        userId: 'user-2',
        severity: 'MEDIUM',
      });

      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-3',
        severity: 'LOW',
      });

      const loginSuccessEvents = getSecurityEventsByType('LOGIN_SUCCESS');
      assert.strictEqual(loginSuccessEvents.length, 2);
      assert(loginSuccessEvents.every(e => e.type === 'LOGIN_SUCCESS'));
    });
  });

  describe('getSecurityEventsBySeverity', () => {
    it('should filter events by severity', () => {
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-1',
        severity: 'LOW',
      });

      logSecurityEvent({
        type: 'LOGIN_FAILED',
        userId: 'user-2',
        severity: 'CRITICAL',
      });

      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-3',
        severity: 'LOW',
      });

      const criticalEvents = getSecurityEventsBySeverity('CRITICAL');
      assert.strictEqual(criticalEvents.length, 1);
      assert.strictEqual(criticalEvents[0].severity, 'CRITICAL');
    });
  });

  describe('getSecuritySummary', () => {
    it('should return summary of security events in last hour', () => {
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-1',
        severity: 'LOW',
      });

      logSecurityEvent({
        type: 'LOGIN_FAILED',
        userId: 'user-2',
        severity: 'MEDIUM',
      });

      logSecurityEvent({
        type: 'CSRF_VIOLATION',
        userId: 'user-3',
        severity: 'HIGH',
      });

      const summary = getSecuritySummary();
      assert(summary.totalEvents >= 3);
      assert(summary.eventsLastHour >= 3);
      assert.strictEqual(summary.failedLogins, 1);
      assert.strictEqual(summary.csrfViolations, 1);
    });

    it('should count critical events', () => {
      logSecurityEvent({
        type: 'LOGIN_FAILED',
        userId: 'user-1',
        severity: 'CRITICAL',
      });

      logSecurityEvent({
        type: 'CSRF_VIOLATION',
        userId: 'user-2',
        severity: 'CRITICAL',
      });

      const summary = getSecuritySummary();
      assert.strictEqual(summary.criticalEvents, 2);
    });
  });

  describe('clearOldSecurityEvents', () => {
    it('should remove events older than specified days', () => {
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-1',
        severity: 'LOW',
      });

      const removed = clearOldSecurityEvents(0);
      assert.strictEqual(removed, 1);

      const events = getRecentSecurityEvents(10);
      assert.strictEqual(events.length, 0);
    });

    it('should keep recent events', () => {
      logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        userId: 'user-1',
        severity: 'LOW',
      });

      const removed = clearOldSecurityEvents(30);
      assert.strictEqual(removed, 0);

      const events = getRecentSecurityEvents(10);
      assert.strictEqual(events.length, 1);
    });
  });
});
