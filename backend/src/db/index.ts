import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '../config/index.js';

if (!config.database.url) {
  throw new Error('Missing DATABASE_URL. Set it in environment or .env file.');
}

// Build connection string with proper encoding for Neon
function buildNeonConnectionString(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Ensure SSL is enabled for Neon
    urlObj.searchParams.set('sslmode', 'require');
    
    // Re-encode username and password to handle special characters
    const username = encodeURIComponent(urlObj.username);
    const password = encodeURIComponent(urlObj.password);
    
    return `${urlObj.protocol}//${username}:${password}@${urlObj.host}${urlObj.pathname}?${urlObj.searchParams.toString()}`;
  } catch {
    return url.includes('sslmode') ? url : `${url}?sslmode=require`;
  }
}

const connectionString = buildNeonConnectionString(config.database.url);

console.log(`Database connected to: ${config.database.url.split('@')[1]?.split('?')[0] || 'Neon'}`);

// Use postgres-js with connection pool for Neon
// Disable prepared statements to avoid parameter binding issues
const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
  types: {
    bigint: postgres.BigInt,
  },
  // Disable prepared statement protocol
  prepare: false,
});

export const db = drizzle(sql, { schema });

// Re-export schema tables for backward compatibility
export * from './schema';

export default db;
