/**
 * GET /api/policymaker/locations/summary
 * Get location count summary by risk level
 * Access: policymaker, admin
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { db } from '../../../database/drizzle';
import { waterQualityCalculations } from '../../hmpi-engine/shared/schema';
import { eq, and, sql, count } from 'drizzle-orm';
import { DEFAULT_RISK_THRESHOLDS } from '../shared/interface';

const querySchema = z.object({
  state: z.string().optional(),
  year: z.coerce.number().int().optional(),
});

const handler = asyncHandler(async (req, res: Response) => {
  const { state, year } = querySchema.parse(req.query);

  const thresholds = DEFAULT_RISK_THRESHOLDS;

  // Build base conditions
  const baseConditions = [eq(waterQualityCalculations.is_deleted, false)];

  if (state) {
    baseConditions.push(sql`LOWER(${waterQualityCalculations.state}) LIKE LOWER(${'%' + state + '%'})`);
  }

  if (year) {
    baseConditions.push(eq(waterQualityCalculations.year, year));
  }

  const baseWhere = and(...baseConditions);

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(waterQualityCalculations)
    .where(baseWhere);

  // Get safe count (HPI < 25 AND MI < 1)
  const [safeResult] = await db
    .select({ count: count() })
    .from(waterQualityCalculations)
    .where(
      and(
        baseWhere,
        sql`(${waterQualityCalculations.hpi} IS NULL OR CAST(${waterQualityCalculations.hpi} AS DECIMAL) < ${thresholds.hpi.safe})`,
        sql`(${waterQualityCalculations.mi} IS NULL OR CAST(${waterQualityCalculations.mi} AS DECIMAL) < ${thresholds.mi.safe})`
      )
    );

  // Get unsafe count (HPI >= 75 OR MI >= 4)
  const [unsafeResult] = await db
    .select({ count: count() })
    .from(waterQualityCalculations)
    .where(
      and(
        baseWhere,
        sql`(CAST(${waterQualityCalculations.hpi} AS DECIMAL) >= ${thresholds.hpi.moderate} OR CAST(${waterQualityCalculations.mi} AS DECIMAL) >= ${thresholds.mi.moderate})`
      )
    );

  const total = totalResult?.count || 0;
  const safe = safeResult?.count || 0;
  const unsafe = unsafeResult?.count || 0;
  const moderate = total - safe - unsafe;

  // Get state breakdown
  const stateBreakdown = await db
    .select({
      state: waterQualityCalculations.state,
      total: count(),
    })
    .from(waterQualityCalculations)
    .where(and(baseWhere, sql`${waterQualityCalculations.state} IS NOT NULL`))
    .groupBy(waterQualityCalculations.state)
    .orderBy(sql`count(*) DESC`)
    .limit(15);

  // Get year breakdown
  const yearBreakdown = await db
    .select({
      year: waterQualityCalculations.year,
      total: count(),
    })
    .from(waterQualityCalculations)
    .where(and(baseWhere, sql`${waterQualityCalculations.year} IS NOT NULL`))
    .groupBy(waterQualityCalculations.year)
    .orderBy(sql`${waterQualityCalculations.year} DESC`)
    .limit(10);

  const response = {
    summary: {
      total,
      safe,
      moderate,
      unsafe,
      safe_percentage: total > 0 ? ((safe / total) * 100).toFixed(1) : '0',
      moderate_percentage: total > 0 ? ((moderate / total) * 100).toFixed(1) : '0',
      unsafe_percentage: total > 0 ? ((unsafe / total) * 100).toFixed(1) : '0',
    },
    thresholds: {
      hpi: {
        safe: `< ${thresholds.hpi.safe}`,
        moderate: `${thresholds.hpi.safe} - ${thresholds.hpi.moderate}`,
        unsafe: `>= ${thresholds.hpi.moderate}`,
      },
      mi: {
        safe: `< ${thresholds.mi.safe}`,
        moderate: `${thresholds.mi.safe} - ${thresholds.mi.moderate}`,
        unsafe: `>= ${thresholds.mi.moderate}`,
      },
    },
    by_state: stateBreakdown.map(s => ({
      state: s.state || 'Unknown',
      count: s.total,
    })),
    by_year: yearBreakdown.map(y => ({
      year: y.year,
      count: y.total,
    })),
  };

  ResponseFormatter.success(res, response, 'Location summary fetched successfully');
});

const router = Router();

router.get(
  '/locations/summary',
  requireAuth,
  requireRole(['policymaker', 'admin']),
  handler
);

export default router;
