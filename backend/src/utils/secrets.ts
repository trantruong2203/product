import { config } from '../config/index.js';

/**
 * Secrets management utility
 * Handles secure storage and retrieval of sensitive data
 */

interface SecretConfig {
  name: string;
  required: boolean;
  default?: string;
}

const REQUIRED_SECRETS: SecretConfig[] = [
  { name: 'JWT_SECRET', required: true },
  { name: 'DATABASE_URL', required: true },
  { name: 'REDIS_URL', required: true },
];

const OPTIONAL_SECRETS: SecretConfig[] = [
  { name: 'RECAPTCHA_API_KEY', required: false },
  { name: 'SENTRY_DSN', required: false },
];

/**
 * Validate that all required secrets are configured
 */
export const validateSecrets = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (const secret of REQUIRED_SECRETS) {
    const value = process.env[secret.name];
    if (!value || value.trim() === '') {
      errors.push(`Missing required secret: ${secret.name}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Get a secret value safely
 */
export const getSecret = (name: string, defaultValue?: string): string => {
  const value = process.env[name];

  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Secret not found: ${name}`);
  }

  return value;
};

/**
 * Mask sensitive data in logs
 */
export const maskSecret = (value: string, visibleChars: number = 4): string => {
  if (value.length <= visibleChars) {
    return '*'.repeat(value.length);
  }

  const visible = value.substring(0, visibleChars);
  const masked = '*'.repeat(value.length - visibleChars);
  return visible + masked;
};

/**
 * Log secret validation status (without exposing values)
 */
export const logSecretStatus = (): void => {
  console.log('🔐 Secret validation:');

  for (const secret of REQUIRED_SECRETS) {
    const value = process.env[secret.name];
    const status = value ? '✅' : '❌';
    console.log(`  ${status} ${secret.name}`);
  }

  for (const secret of OPTIONAL_SECRETS) {
    const value = process.env[secret.name];
    const status = value ? '✅' : '⚠️';
    console.log(`  ${status} ${secret.name} (optional)`);
  }
};

/**
 * Rotate JWT secret (for security updates)
 * In production, this should trigger re-authentication
 */
export const rotateJwtSecret = (newSecret: string): void => {
  if (!newSecret || newSecret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters');
  }

  process.env.JWT_SECRET = newSecret;
  console.log('⚠️ JWT secret rotated. Users will need to re-authenticate.');
};

/**
 * Check if running in secure mode
 */
export const isSecureMode = (): boolean => {
  return process.env.NODE_ENV === 'production' &&
    process.env.HTTPS === 'true' &&
    process.env.JWT_SECRET !== undefined;
};
