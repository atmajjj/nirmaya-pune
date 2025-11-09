import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { cleanEnv, port, str, num } from 'envalid';
import { logger } from './logger';

/**
 * Validate all required environment variables for the application
 * Throws an error if any required variable is missing or invalid
 */
export const validateEnv = () => {
  const env = cleanEnv(process.env, {
    JWT_SECRET: str(),
    PORT: port(),

    // Database configuration - using DATABASE_URL for connection
    DATABASE_URL: str(),

    // Redis configuration (optional)
    REDIS_HOST: str({ default: '' }),
    REDIS_PORT: num({ default: 6379 }),
    REDIS_PASSWORD: str({ default: '' }),

    // AWS S3 configuration
    AWS_ACCESS_KEY: str(),
    AWS_SECRET_KEY: str(),
    AWS_REGION: str(),
    AWS_ENDPOINT: str(),
    AWS_BUCKET_NAME: str(),

    // Email configuration
    EMAIL_USER: str(),
    EMAIL_PASSWORD: str(),

    // Security configuration
    ALLOWED_ORIGINS: str(),
  });

  // Additional JWT secret validation
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }

  logger.info('✅ Environment variables validated.');
  return env;
};
