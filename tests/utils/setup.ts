import { config } from 'dotenv';

// Load environment variables from .env (not .env.test)
config();

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);
