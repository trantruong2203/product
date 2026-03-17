import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeString, isValidEmail, isValidUrl } from '../src/middleware/inputValidation.js';

describe('Input Validation', () => {
  describe('sanitizeString', () => {
    it('should remove angle brackets', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = sanitizeString(input);
      assert(!sanitized.includes('<'));
      assert(!sanitized.includes('>'));
    });

    it('should remove quotes', () => {
      const input = 'test"value\'with\'quotes';
      const sanitized = sanitizeString(input);
      assert(!sanitized.includes('"'));
      assert(!sanitized.includes("'"));
    });

    it('should trim whitespace', () => {
      const input = '  test value  ';
      const sanitized = sanitizeString(input);
      assert.strictEqual(sanitized, 'test value');
    });

    it('should handle multiple spaces', () => {
      const input = 'test    multiple    spaces';
      const sanitized = sanitizeString(input);
      assert.strictEqual(sanitized, 'test multiple spaces');
    });

    it('should preserve alphanumeric characters', () => {
      const input = 'test123value456';
      const sanitized = sanitizeString(input);
      assert.strictEqual(sanitized, 'test123value456');
    });

    it('should handle empty string', () => {
      const input = '';
      const sanitized = sanitizeString(input);
      assert.strictEqual(sanitized, '');
    });

    it('should handle non-string input', () => {
      const input = 123 as any;
      const sanitized = sanitizeString(input);
      assert.strictEqual(sanitized, 123);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email format', () => {
      assert.strictEqual(isValidEmail('test@example.com'), true);
      assert.strictEqual(isValidEmail('user.name@example.co.uk'), true);
      assert.strictEqual(isValidEmail('user+tag@example.com'), true);
    });

    it('should reject invalid email format', () => {
      assert.strictEqual(isValidEmail('invalid'), false);
      assert.strictEqual(isValidEmail('invalid@'), false);
      assert.strictEqual(isValidEmail('@example.com'), false);
      assert.strictEqual(isValidEmail('invalid@.com'), false);
    });

    it('should reject email longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      assert.strictEqual(isValidEmail(longEmail), false);
    });

    it('should reject email with spaces', () => {
      assert.strictEqual(isValidEmail('test @example.com'), false);
      assert.strictEqual(isValidEmail('test@ example.com'), false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      assert.strictEqual(isValidUrl('https://example.com'), true);
      assert.strictEqual(isValidUrl('http://example.com/path'), true);
      assert.strictEqual(isValidUrl('https://example.com:8080/path?query=value'), true);
    });

    it('should reject invalid URLs', () => {
      assert.strictEqual(isValidUrl('not a url'), false);
      assert.strictEqual(isValidUrl('example.com'), false);
      assert.strictEqual(isValidUrl('htp://example.com'), false);
    });

    it('should reject empty string', () => {
      assert.strictEqual(isValidUrl(''), false);
    });

    it('should handle URLs with fragments', () => {
      assert.strictEqual(isValidUrl('https://example.com#section'), true);
    });

    it('should handle URLs with authentication', () => {
      assert.strictEqual(isValidUrl('https://user:pass@example.com'), true);
    });
  });
});
