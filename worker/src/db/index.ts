import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Worker processes handle one job at a time, so use smaller pool
// Production uses max: 5 (worker doesn't need many concurrent connections)
// Development uses max: 3 to minimize idle connections
const maxConnections = process.env.NODE_ENV === 'production' ? 5 : 3;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

export default db;
