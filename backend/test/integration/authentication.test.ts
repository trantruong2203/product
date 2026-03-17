import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { authenticate, generateToken, blacklistToken, isTokenBlacklisted } from '../src/middleware/authenticate.js';

describe('Authentication Integration Tests', () => {
  describe('Token Generation and Validation', () => {
    it('should generate valid JWT token', () => {
      const token = generateToken('user-123', 'test@example.com');
      assert(typeof token === 'string');
      assert(token.length > 0);
      assert(token.split('.').length === 3); // JWT has 3 parts
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user-1', 'user1@example.com');
      const token2 = generateToken('user-2', 'user2@example.com');
      assert.notStrictEqual(token1, token2);
    });

    it('should generate different tokens on each call', () => {
      const token1 = generateToken('user-123', 'test@example.com');
      const token2 = generateToken('user-123', 'test@example.com');
      assert.notStrictEqual(token1, token2);
    });
  });

  describe('Token Blacklisting', () => {
    it('should blacklist token on logout', () => {
      const token = generateToken('user-123', 'test@example.com');
      assert.strictEqual(isTokenBlacklisted(token), false);

      blacklistToken(token);
      assert.strictEqual(isTokenBlacklisted(token), true);
    });

    it('should not affect other tokens', () => {
      const token1 = generateToken('user-1', 'user1@example.com');
      const token2 = generateToken('user-2', 'user2@example.com');

      blacklistToken(token1);
      assert.strictEqual(isTokenBlacklisted(token1), true);
      assert.strictEqual(isTokenBlacklisted(token2), false);
    });

    it('should handle multiple blacklisted tokens', () => {
      const tokens = Array.from({ length: 5 }, (_, i) =>
        generateToken(`user-${i}`, `user${i}@example.com`)
      );

      tokens.forEach(token => blacklistToken(token));
      tokens.forEach(token => assert.strictEqual(isTokenBlacklisted(token), true));
    });
  });

  describe('Authentication Middleware', () => {
    it('should reject request without authorization header', async () => {
      const req = {
        headers: {},
      } as any;

      const res = {
        status: function(code: number) {
          this.statusCode = code;
          return this;
        },
        json: function(data: any) {
          this.data = data;
          return this;
        },
      } as any;

      const next = function(error?: any) {
        res.error = error;
      };

      await authenticate(req, res, next);
      assert(res.error);
    });

    it('should reject request with invalid bearer format', async () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat token',
        },
      } as any;

      const res = {
        status: function(code: number) {
          this.statusCode = code;
          return this;
        },
        json: function(data: any) {
          this.data = data;
          return this;
        },
      } as any;

      const next = function(error?: any) {
        res.error = error;
      };

      await authenticate(req, res, next);
      assert(res.error);
    });

    it('should reject blacklisted token', async () => {
      const token = generateToken('user-123', 'test@example.com');
      blacklistToken(token);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as any;

      const res = {
        status: function(code: number) {
          this.statusCode = code;
          return this;
        },
        json: function(data: any) {
          this.data = data;
          return this;
        },
      } as any;

      const next = function(error?: any) {
        res.error = error;
      };

      await authenticate(req, res, next);
      assert(res.error);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should allow generating new token from valid token', () => {
      const originalToken = generateToken('user-123', 'test@example.com');
      const newToken = generateToken('user-123', 'test@example.com');

      assert.notStrictEqual(originalToken, newToken);
      assert.strictEqual(isTokenBlacklisted(originalToken), false);
      assert.strictEqual(isTokenBlacklisted(newToken), false);
    });

    it('should support token rotation', () => {
      let currentToken = generateToken('user-123', 'test@example.com');

      // Simulate token rotation
      for (let i = 0; i < 3; i++) {
        const newToken = generateToken('user-123', 'test@example.com');
        blacklistToken(currentToken);
        currentToken = newToken;
      }

      assert.strictEqual(isTokenBlacklisted(currentToken), false);
    });
  });

  describe('Logout Flow', () => {
    it('should invalidate token on logout', () => {
      const token = generateToken('user-123', 'test@example.com');
      assert.strictEqual(isTokenBlacklisted(token), false);

      // Simulate logout
      blacklistToken(token);
      assert.strictEqual(isTokenBlacklisted(token), true);
    });

    it('should prevent reuse of logged out token', () => {
      const token = generateToken('user-123', 'test@example.com');
      blacklistToken(token);

      // Try to use blacklisted token
      assert.strictEqual(isTokenBlacklisted(token), true);
    });
  });
});
