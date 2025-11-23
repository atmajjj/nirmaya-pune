import { config } from 'dotenv';

// Load environment variables from .env (not .env.test)
config();

// Set test environment to development (since we only support dev/prod)
process.env.NODE_ENV = 'development';

// Global test timeout
jest.setTimeout(30000);
