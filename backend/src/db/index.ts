import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { config } from '../config/index.js';

if (!config.database.url) {
  throw new Error('Missing DATABASE_URL. Set it in environment or .env file.');
}

// Neon serverless driver - handles connection pooling automatically
const sql = neon(config.database.url);

console.log(`Database connected to: ${config.database.url.split('@')[1]?.split('?')[0] || 'Neon'}`);

export const db = drizzle(sql, { schema });

// Re-export schema tables for backward compatibility
export * from './schema';

export default db;
