import dotenv from "dotenv";
dotenv.config({ quiet: true });

import { cleanEnv, port, str, num } from "envalid";
import { logger } from "./logger";

const validateEnv = () => {
  const env = cleanEnv(process.env, {
    JWT_SECRET: str(),
    PORT: port(),
    GROQ_API_KEY: str({ default: "" }), // Now optional - API keys are stored per-agent in database

    // Database configuration
    DB_HOST: str(),
    DB_USER: str(),
    DB_PASSWORD: str(),
    DB_DATABASE: str(),
    DB_PORT: num(),
    SCHEMA_NAME: str(),

    // Pinecone configuration
    PINECONE_API_KEY: str(),
    PINECONE_INDEX_NAME: str({ default: "chatverse" }),

    // Redis configuration
    REDIS_HOST: str(),
    REDIS_PORT: num(),
    REDIS_PASSWORD: str(),

    // Queue configuration
    TRAINING_QUEUE_NAME: str(),
    MAX_CONCURRENT_JOBS: num(),
    JOB_TIMEOUT: num(),

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
    throw new Error(
      "JWT_SECRET must be at least 32 characters long for security"
    );
  }

  logger.info("✅ Environment variables validated.");
  return env;
};

export default validateEnv;
