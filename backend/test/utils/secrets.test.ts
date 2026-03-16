import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { validateSecrets, maskSecret, isSecureMode } from '../src/utils/secrets.js';

describe('Secrets Management', () => {
  describe('validateSecrets', () => {
    it('should return valid=true when all required secrets are set', () => {
      process.env.JWT_SECRET = 'test-secret-key-min-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.REDIS_URL = 'redis://test';

      const result = validateSecrets();
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should return valid=false when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.REDIS_URL = 'redis://test';

      const result = validateSecrets();
      assert.strictEqual(result.valid, false);
      assert(result.errors.some(e => e.includes('JWT_SECRET')));
    });

    it('should return valid=false when DATABASE_URL is missing', () => {
      process.env.JWT_SECRET = 'test-secret-key-min-32-characters-long';
      delete process.env.DATABASE_URL;
      process.env.REDIS_URL = 'redis://test';

      const result = validateSecrets();
      assert.strictEqual(result.valid, false);
      assert(result.errors.some(e => e.includes('DATABASE_URL')));
    });

    it('should return valid=false when REDIS_URL is missing', () => {
      process.env.JWT_SECRET = 'test-secret-key-min-32-characters-long';
      process.env.DATABASE_URL = 'postgresql://test';
      delete process.env.REDIS_URL;

      const result = validateSecrets();
      assert.strictEqual(result.valid, false);
      assert(result.errors.some(e => e.includes('REDIS_URL')));
    });
  });

  describe('maskSecret', () => {
    it('should mask secret with default visible characters', () => {
      const secret = 'my-super-secret-key-12345';
      const masked = maskSecret(secret);
      assert(masked.startsWith('my-s'));
      assert(masked.includes('*'));
    });

    it('should mask secret with custom visible characters', () => {
      const secret = 'my-super-secret-key-12345';
      const masked = maskSecret(secret, 2);
      assert(masked.startsWith('my'));
      assert(masked.endsWith('*'.repeat(secret.length - 2)));
    });

    it('should mask entire secret if shorter than visible chars', () => {
      const secret = 'short';
      const masked = maskSecret(secret, 10);
      assert.strictEqual(masked, '*'.repeat(secret.length));
    });
  });

  describe('isSecureMode', () => {
    it('should return true when all security conditions are met', () => {
      process.env.NODE_ENV = 'production';
      process.env.HTTPS = 'true';
      process.env.JWT_SECRET = 'test-secret-key-min-32-characters-long';

      assert.strictEqual(isSecureMode(), true);
    });

    it('should return false when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'development';
      process.env.HTTPS = 'true';
      process.env.JWT_SECRET = 'test-secret-key-min-32-characters-long';

      assert.strictEqual(isSecureMode(), false);
    });

    it('should return false when HTTPS is not enabled', () => {
      process.env.NODE_ENV = 'production';
      process.env.HTTPS = 'false';
      process.env.JWT_SECRET = 'test-secret-key-min-32-characters-long';

      assert.strictEqual(isSecureMode(), false);
    });

    it('should return false when JWT_SECRET is not set', () => {
      process.env.NODE_ENV = 'production';
      process.env.HTTPS = 'true';
      delete process.env.JWT_SECRET;

      assert.strictEqual(isSecureMode(), false);
    });
  });
});
