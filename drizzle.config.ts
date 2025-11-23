import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'development') {
  dotenv.config({ path: '.env.dev' });
} else if (nodeEnv === 'production') {
  dotenv.config({ path: '.env.prod' });
}

export default defineConfig({
  schema: './src/features/**/shared/schema.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
