import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { config } from '../config/index.js';

if (!config.database.url) {
  throw new Error('Missing DATABASE_URL. Set it in environment or .env file.');
}

const sql = neon(config.database.url);

export const db = drizzle(sql, { schema });

// Re-export schema tables for backward compatibility
export * from './schema';

export default db;
