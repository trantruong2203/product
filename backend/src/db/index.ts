import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from '../config/index.js';

if (!config.database.url) {
  throw new Error('Missing DATABASE_URL. Set it in environment or .env file.');
}

// Neon requires SSL connection
// Parse the DATABASE_URL and ensure sslmode=require is set correctly
function buildConnectionConfig(url: string) {
  try {
    const urlObj = new URL(url);

    // Check if it's a Neon URL
    const isNeon = urlObj.hostname.includes('neon.tech') || url.includes('neon');

    // Build connection options
    const connectionOptions: Record<string, string> = {};

    // Extract all query params
    urlObj.searchParams.forEach((value, key) => {
      connectionOptions[key] = value;
    });

    // Ensure sslmode is set for production/Neon
    if (isNeon || config.nodeEnv === 'production') {
      connectionOptions['sslmode'] = 'require';
    } else {
      connectionOptions['sslmode'] = connectionOptions['sslmode'] || 'prefer';
    }

    // Rebuild the connection string with proper encoding
    const cleanUrl = `${urlObj.protocol}//${urlObj.username}:${encodeURIComponent(urlObj.password)}@${urlObj.host}${urlObj.pathname}`;

    // Add query params
    const queryString = Object.entries(connectionOptions)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return `${cleanUrl}${queryString ? '?' + queryString : ''}`;
  } catch (error) {
    // If URL parsing fails, return original URL with sslmode appended
    console.warn('Failed to parse DATABASE_URL, using as-is with sslmode=require');
    return url.includes('sslmode') ? url : `${url}&sslmode=require`;
  }
}

const connectionString = buildConnectionConfig(config.database.url);

console.log(`Database connected to: ${config.database.url.split('@')[1]?.split('?')[0] || 'Neon'}`);

// Use smaller pool for development to reduce idle connections
// Production uses max: 10 for handling concurrent requests (Neon has connection limits)
const maxConnections = config.nodeEnv === 'production' ? 10 : 5;
const connectionTimeoutMillis = config.nodeEnv === 'production' ? 15000 : 20000;

const pool = new Pool({
  connectionString,
  max: maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis,
  keepAlive: true,
  // Neon-specific settings
  statement_timeout: 30000, // 30 second query timeout
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

pool.on('connect', () => {
  console.log('New database connection established');
});

export const db = drizzle(pool, { schema });

// Re-export schema tables for backward compatibility
export * from './schema';

export default db;
