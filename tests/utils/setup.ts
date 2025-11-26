// Set test environment FIRST
process.env.NODE_ENV = 'test';

// Load environment from .env.test
import { loadEnv } from '../../src/utils/loadEnv';
loadEnv();

// Convert Docker hostname to localhost for host-based test runs
import { getDatabaseUrl } from '../../src/utils/dbUrl';
process.env.DATABASE_URL = getDatabaseUrl();

// Global test timeout
jest.setTimeout(30000);

// Run migrations before all tests (only once per test run)
beforeAll(async () => {
  const { runMigrations } = await import('./migrations');
  await runMigrations();
});
