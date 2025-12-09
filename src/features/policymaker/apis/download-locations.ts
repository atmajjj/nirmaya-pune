/**
 * GET /api/policymaker/locations/download
 * Download locations CSV filtered by risk level (safe, moderate, unsafe)
 * Access: policymaker, admin
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { db } from '../../../database/drizzle';
import { waterQualityCalculations } from '../../hmpi-engine/shared/schema';
import { eq, and, or, lt, gte, sql } from 'drizzle-orm';
import { riskLevels, type RiskLevel } from '../shared/schema';
import { DEFAULT_RISK_THRESHOLDS } from '../shared/interface';

const querySchema = z.object({
  risk_level: z.enum(riskLevels),
  state: z.string().optional(),
  year: z.coerce.number().int().optional(),
});

/**
 * Determine risk level based on HPI and MI values
 */
function getRiskLevel(hpi: number | null, mi: number | null): RiskLevel {
  const thresholds = DEFAULT_RISK_THRESHOLDS;

  // Unsafe if either index is very high
  if (
    (hpi !== null && hpi >= thresholds.hpi.moderate) ||
    (mi !== null && mi >= thresholds.mi.moderate)
  ) {
    return 'unsafe';
  }

  // Moderate if either index is elevated
  if (
    (hpi !== null && hpi >= thresholds.hpi.safe) ||
    (mi !== null && mi >= thresholds.mi.safe)
  ) {
    return 'moderate';
  }

  return 'safe';
}

/**
 * Build SQL conditions based on risk level
 */
function buildRiskLevelConditions(riskLevel: RiskLevel) {
  const thresholds = DEFAULT_RISK_THRESHOLDS;

  switch (riskLevel) {
    case 'safe':
      // HPI < 25 AND MI < 1 (or null)
      return and(
        or(
          lt(waterQualityCalculations.hpi, String(thresholds.hpi.safe)),
          sql`${waterQualityCalculations.hpi} IS NULL`
        ),
        or(
          lt(waterQualityCalculations.mi, String(thresholds.mi.safe)),
          sql`${waterQualityCalculations.mi} IS NULL`
        )
      );

    case 'moderate':
      // (HPI >= 25 AND HPI < 75) OR (MI >= 1 AND MI < 4)
      // But NOT unsafe (HPI < 75 AND MI < 4)
      return and(
        or(
          and(
            gte(waterQualityCalculations.hpi, String(thresholds.hpi.safe)),
            lt(waterQualityCalculations.hpi, String(thresholds.hpi.moderate))
          ),
          and(
            gte(waterQualityCalculations.mi, String(thresholds.mi.safe)),
            lt(waterQualityCalculations.mi, String(thresholds.mi.moderate))
          )
        ),
        // Exclude unsafe locations
        or(
          lt(waterQualityCalculations.hpi, String(thresholds.hpi.moderate)),
          sql`${waterQualityCalculations.hpi} IS NULL`
        ),
        or(
          lt(waterQualityCalculations.mi, String(thresholds.mi.moderate)),
          sql`${waterQualityCalculations.mi} IS NULL`
        )
      );

    case 'unsafe':
      // HPI >= 75 OR MI >= 4
      return or(
        gte(waterQualityCalculations.hpi, String(thresholds.hpi.moderate)),
        gte(waterQualityCalculations.mi, String(thresholds.mi.moderate))
      );
  }
}

/**
 * Convert data to CSV string
 */
function toCSV(data: Array<Record<string, unknown>>, headers: string[]): string {
  const lines: string[] = [];

  // Header row
  lines.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape strings with commas or quotes
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

const handler = asyncHandler(async (req, res: Response) => {
  const { risk_level, state, year } = querySchema.parse(req.query);

  // Build conditions
  const conditions = [
    eq(waterQualityCalculations.is_deleted, false),
    buildRiskLevelConditions(risk_level),
  ];

  if (state) {
    conditions.push(sql`LOWER(${waterQualityCalculations.state}) LIKE LOWER(${'%' + state + '%'})`);
  }

  if (year) {
    conditions.push(eq(waterQualityCalculations.year, year));
  }

  const whereClause = and(...conditions.filter(Boolean));

  // Fetch data
  const calculations = await db
    .select({
      station_id: waterQualityCalculations.station_id,
      state: waterQualityCalculations.state,
      district: waterQualityCalculations.district,
      location: waterQualityCalculations.location,
      latitude: waterQualityCalculations.latitude,
      longitude: waterQualityCalculations.longitude,
      year: waterQualityCalculations.year,
      hpi: waterQualityCalculations.hpi,
      hpi_classification: waterQualityCalculations.hpi_classification,
      mi: waterQualityCalculations.mi,
      mi_classification: waterQualityCalculations.mi_classification,
      mi_class: waterQualityCalculations.mi_class,
      metals_analyzed: waterQualityCalculations.metals_analyzed,
    })
    .from(waterQualityCalculations)
    .where(whereClause);

  // Transform data with computed risk level
  const data = calculations.map(calc => ({
    station_id: calc.station_id,
    state: calc.state,
    district: calc.district,
    location: calc.location,
    latitude: calc.latitude ? parseFloat(String(calc.latitude)) : null,
    longitude: calc.longitude ? parseFloat(String(calc.longitude)) : null,
    year: calc.year,
    hpi: calc.hpi ? parseFloat(String(calc.hpi)).toFixed(2) : null,
    hpi_classification: calc.hpi_classification,
    mi: calc.mi ? parseFloat(String(calc.mi)).toFixed(4) : null,
    mi_classification: calc.mi_classification,
    mi_class: calc.mi_class,
    risk_level: getRiskLevel(
      calc.hpi ? parseFloat(String(calc.hpi)) : null,
      calc.mi ? parseFloat(String(calc.mi)) : null
    ),
    metals_analyzed: calc.metals_analyzed,
  }));

  const headers = [
    'station_id',
    'state',
    'district',
    'location',
    'latitude',
    'longitude',
    'year',
    'hpi',
    'hpi_classification',
    'mi',
    'mi_classification',
    'mi_class',
    'risk_level',
    'metals_analyzed',
  ];

  const csv = toCSV(data, headers);

  // Set response headers for CSV download
  const filename = `${risk_level}_locations_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

const router = Router();

router.get(
  '/locations/download',
  requireAuth,
  requireRole(['policymaker', 'admin']),
  handler
);

export default router;
