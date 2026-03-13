import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from '../config/index.js';

if (!config.database.url) {
  throw new Error('Missing DATABASE_URL. Set it in environment or .env file.');
}

const pool = new Pool({
  connectionString: config.database.url,
});

export const db = drizzle(pool, { schema });

// Re-export schema tables for backward compatibility
export * from './schema';

export default db;
