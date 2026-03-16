import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from '../config/index.js';

if (!config.database.url) {
  throw new Error('Missing DATABASE_URL. Set it in environment or .env file.');
}

// Use smaller pool for development to reduce idle connections
// Production uses max: 20 for handling concurrent requests
// Development uses max: 5 since it handles fewer concurrent operations
const maxConnections = config.nodeEnv === 'production' ? 20 : 5;

const pool = new Pool({
  connectionString: config.database.url,
  max: maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

// Re-export schema tables for backward compatibility
export * from './schema';

export default db;
