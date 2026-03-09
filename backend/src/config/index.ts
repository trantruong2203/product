import dotenv from 'dotenv';
dotenv.config();

interface JwtConfig {
  secret: string;
  expiresIn: string;
}

interface Config {
  nodeEnv: string;
  port: number;
  database: { url: string };
  jwt: JwtConfig;
  redis: { url: string };
  cors: { origin: string };
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
};
