import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  playwright: {
    browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || '',
    screenshotsPath: process.env.PLAYWRIGHT_SCREENSHOTS_PATH || './screenshots',
  },
};
