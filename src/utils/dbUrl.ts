/**
 * Database URL Configuration Utility
 * 
 * Handles the conversion of Docker container hostnames to localhost
 * for scripts/tests running on the host machine.
 * 
 * Usage:
 *   import { getDatabaseUrl } from '../utils/dbUrl';
 *   const dbUrl = getDatabaseUrl();
 */

/**
 * Port mapping for each environment when running from host
 * (Docker exposes different host ports to avoid conflicts)
 */
const HOST_PORTS: Record<string, number> = {
  development: 5434,
  test: 5433,
  production: 5432, // Production uses external DB, port doesn't matter
};

/**
 * Get the correct DATABASE_URL based on environment
 * 
 * - Inside Docker: Uses container hostname (postgres:5432)
 * - On Host: Converts to localhost with mapped port
 */
export function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isRunningInDocker = process.env.RUNNING_IN_DOCKER === 'true';
  let dbUrl = process.env.DATABASE_URL || '';

  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // If running on host (not in Docker), convert container hostname to localhost
  if (!isRunningInDocker && dbUrl.includes('@postgres:5432')) {
    const hostPort = HOST_PORTS[nodeEnv] || 5432;
    dbUrl = dbUrl.replace('@postgres:5432', `@localhost:${hostPort}`);
  }

  return dbUrl;
}

/**
 * Get database URL with password masked
 */
export function getMaskedDatabaseUrl(): string {
  return getDatabaseUrl().replace(/:[^:@]+@/, ':****@');
}
