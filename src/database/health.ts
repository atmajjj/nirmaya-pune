import { db, pool } from './drizzle';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Database health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message: string;
  details: {
    connected: boolean;
    queryTest: boolean;
    poolStats: {
      total: number;
      idle: number;
      waiting: number;
    };
  };
  timestamp: Date;
}

/**
 * Check database health with comprehensive diagnostics
 * Includes connection test and pool statistics
 *
 * When run as CLI script (npm run db:test), logs results and exits
 * When called programmatically, returns health result object
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const timestamp = new Date();

  try {
    await db.execute(sql`SELECT 1 as test`);

    const result: HealthCheckResult = {
      status: 'healthy',
      message: 'Database is healthy and responsive',
      details: {
        connected: true,
        queryTest: true,
        poolStats: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
      },
      timestamp,
    };

    if (require.main === module) {
      logger.info(
        `Database connection successful! Pool stats: ${JSON.stringify(result.details.poolStats)}`
      );
      process.exit(0);
    }

    return result;
  } catch (error) {
    const result: HealthCheckResult = {
      status: 'unhealthy',
      message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        connected: false,
        queryTest: false,
        poolStats: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
      },
      timestamp,
    };

    if (require.main === module) {
      logger.error(`Database connection failed: ${result.message}`);
      process.exit(1);
    }

    return result;
  }
}

// Run health check if executed directly (npm run db:test)
if (require.main === module) {
  checkDatabaseHealth();
}
