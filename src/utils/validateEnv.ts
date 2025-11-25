import dotenv from 'dotenv';
dotenv.config({ quiet: true });

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'development') {
  dotenv.config({ path: '.env.dev', override: true });
} else if (nodeEnv === 'production') {
  dotenv.config({ path: '.env.prod', override: true });
}

import { cleanEnv, port, str, num } from 'envalid';
import { logger } from './logger';

/**
 * Validate all required environment variables for the application
 * Throws an error if any required variable is missing or invalid
 */
export const validateEnv = () => {
  const env = cleanEnv(process.env, {
    // Environment
    NODE_ENV: str({ choices: ['development', 'production'], default: 'development' }),
    
    // Server configuration
    JWT_SECRET: str(),
    PORT: port({ default: 8000 }),

    // Database configuration - using DATABASE_URL for connection
    DATABASE_URL: str(),

    // Redis configuration (optional)
    REDIS_HOST: str({ default: 'localhost' }),
    REDIS_PORT: num({ default: 6379 }),
    REDIS_PASSWORD: str({ default: '' }),
    REDIS_URL: str({ default: '' }),

    // AWS S3 configuration
    AWS_ACCESS_KEY: str(),
    AWS_SECRET_KEY: str(),
    AWS_REGION: str({ default: 'us-east-1' }),
    AWS_ENDPOINT: str(),
    AWS_BUCKET_NAME: str(),

    // Email configuration
    EMAIL_USER: str(),
    EMAIL_PASSWORD: str(),
    APP_NAME: str({ default: 'Nirmaya' }),

    // Security configuration
    ALLOWED_ORIGINS: str(),
    FRONTEND_URL: str({ desc: 'Frontend URL for invitation links' }),
    
    // File upload configuration
    ALLOWED_FILE_TYPES: str({ default: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
  });

  // Additional JWT secret validation
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }

  logger.info('✅ Environment variables validated.');
  return env;
};

/**
 * Singleton validated environment configuration
 * Import and use this instead of process.env for type safety and validation
 * 
 * @example
 * import { config } from '@utils/validateEnv';
 * const port = config.PORT;
 * const isDev = config.isDevelopment;
 */
export const config = validateEnv();

/**
 * Environment helper utilities
 */
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
