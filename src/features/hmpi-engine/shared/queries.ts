import { eq, and, desc, asc, sql, gte, lte, ilike, or } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  waterQualityCalculations,
  type WaterQualityCalculation as DrizzleCalculation,
} from './schema';

/**
 * Find calculation by ID (excluding deleted)
 */
export const findCalculationById = async (
  id: number
): Promise<DrizzleCalculation | undefined> => {
  const [calculation] = await db
    .select()
    .from(waterQualityCalculations)
    .where(and(eq(waterQualityCalculations.id, id), eq(waterQualityCalculations.is_deleted, false)))
    .limit(1);

  return calculation;
};

/**
 * Find calculations by upload ID
 */
export const findCalculationsByUploadId = async (
  uploadId: number
): Promise<DrizzleCalculation[]> => {
  return db
    .select()
    .from(waterQualityCalculations)
    .where(
      and(
        eq(waterQualityCalculations.upload_id, uploadId),
        eq(waterQualityCalculations.is_deleted, false)
      )
    )
    .orderBy(asc(waterQualityCalculations.station_id));
};

/**
 * Query parameters for listing calculations
 */
export interface CalculationQueryParams {
  page?: number;
  limit?: number;
  state?: string;
  city?: string;
  upload_id?: number;
  hpi_min?: number;
  hpi_max?: number;
  mi_min?: number;
  mi_max?: number;
  wqi_min?: number;
  wqi_max?: number;
  classification?: string;
  sort_by?: 'hpi' | 'mi' | 'wqi' | 'created_at' | 'station_id';
  sort_order?: 'asc' | 'desc';
}

/**
 * Find calculations with filters and pagination
 */
export const findCalculations = async (
  params: CalculationQueryParams
): Promise<{ calculations: DrizzleCalculation[]; total: number }> => {
  const {
    page = 1,
    limit = 20,
    state,
    city,
    upload_id,
    hpi_min,
    hpi_max,
    mi_min,
    mi_max,
    wqi_min,
    wqi_max,
    classification,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = params;

  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(waterQualityCalculations.is_deleted, false)];

  if (state) {
    conditions.push(ilike(waterQualityCalculations.state, `%${state}%`));
  }

  if (city) {
    conditions.push(ilike(waterQualityCalculations.city, `%${city}%`));
  }

  if (upload_id) {
    conditions.push(eq(waterQualityCalculations.upload_id, upload_id));
  }

  if (hpi_min !== undefined) {
    conditions.push(gte(waterQualityCalculations.hpi, hpi_min.toString()));
  }

  if (hpi_max !== undefined) {
    conditions.push(lte(waterQualityCalculations.hpi, hpi_max.toString()));
  }

  if (mi_min !== undefined) {
    conditions.push(gte(waterQualityCalculations.mi, mi_min.toString()));
  }

  if (mi_max !== undefined) {
    conditions.push(lte(waterQualityCalculations.mi, mi_max.toString()));
  }

  if (wqi_min !== undefined) {
    conditions.push(gte(waterQualityCalculations.wqi, wqi_min.toString()));
  }

  if (wqi_max !== undefined) {
    conditions.push(lte(waterQualityCalculations.wqi, wqi_max.toString()));
  }

  if (classification) {
    conditions.push(
      or(
        ilike(waterQualityCalculations.hpi_classification, `%${classification}%`),
        ilike(waterQualityCalculations.mi_classification, `%${classification}%`),
        ilike(waterQualityCalculations.wqi_classification, `%${classification}%`)
      )!
    );
  }

  // Build sort
  const sortColumn = {
    hpi: waterQualityCalculations.hpi,
    mi: waterQualityCalculations.mi,
    wqi: waterQualityCalculations.wqi,
    created_at: waterQualityCalculations.created_at,
    station_id: waterQualityCalculations.station_id,
  }[sort_by];

  const orderFn = sort_order === 'asc' ? asc : desc;

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waterQualityCalculations)
    .where(and(...conditions));

  // Get paginated results
  const calculations = await db
    .select()
    .from(waterQualityCalculations)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return { calculations, total: count };
};

/**
 * Get statistics for water quality calculations
 */
export const getCalculationStats = async (params?: {
  state?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) => {
  const conditions = [eq(waterQualityCalculations.is_deleted, false)];

  if (params?.state) {
    conditions.push(ilike(waterQualityCalculations.state, `%${params.state}%`));
  }

  if (params?.dateFrom) {
    conditions.push(gte(waterQualityCalculations.created_at, params.dateFrom));
  }

  if (params?.dateTo) {
    conditions.push(lte(waterQualityCalculations.created_at, params.dateTo));
  }

  // Total calculations
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waterQualityCalculations)
    .where(and(...conditions));

  // Unique uploads count
  const [uploadsResult] = await db
    .select({ count: sql<number>`count(distinct upload_id)::int` })
    .from(waterQualityCalculations)
    .where(and(...conditions));

  // Average indices
  const [avgResult] = await db
    .select({
      avg_hpi: sql<number>`avg(hpi::numeric)::float`,
      avg_mi: sql<number>`avg(mi::numeric)::float`,
      avg_wqi: sql<number>`avg(wqi::numeric)::float`,
    })
    .from(waterQualityCalculations)
    .where(and(...conditions));

  // By HPI classification
  const hpiClassifications = await db
    .select({
      classification: waterQualityCalculations.hpi_classification,
      count: sql<number>`count(*)::int`,
    })
    .from(waterQualityCalculations)
    .where(and(...conditions, sql`${waterQualityCalculations.hpi_classification} IS NOT NULL`))
    .groupBy(waterQualityCalculations.hpi_classification);

  // By MI classification
  const miClassifications = await db
    .select({
      classification: waterQualityCalculations.mi_classification,
      count: sql<number>`count(*)::int`,
    })
    .from(waterQualityCalculations)
    .where(and(...conditions, sql`${waterQualityCalculations.mi_classification} IS NOT NULL`))
    .groupBy(waterQualityCalculations.mi_classification);

  // By WQI classification
  const wqiClassifications = await db
    .select({
      classification: waterQualityCalculations.wqi_classification,
      count: sql<number>`count(*)::int`,
    })
    .from(waterQualityCalculations)
    .where(and(...conditions, sql`${waterQualityCalculations.wqi_classification} IS NOT NULL`))
    .groupBy(waterQualityCalculations.wqi_classification);

  // By state (top 10)
  const byState = await db
    .select({
      state: waterQualityCalculations.state,
      count: sql<number>`count(*)::int`,
    })
    .from(waterQualityCalculations)
    .where(and(...conditions, sql`${waterQualityCalculations.state} IS NOT NULL`))
    .groupBy(waterQualityCalculations.state)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return {
    total_calculations: totalResult.count,
    total_uploads: uploadsResult.count,
    by_hpi_classification: Object.fromEntries(
      hpiClassifications.map(c => [c.classification, c.count])
    ),
    by_mi_classification: Object.fromEntries(
      miClassifications.map(c => [c.classification, c.count])
    ),
    by_wqi_classification: Object.fromEntries(
      wqiClassifications.map(c => [c.classification, c.count])
    ),
    by_state: Object.fromEntries(byState.map(s => [s.state, s.count])),
    averages: {
      hpi: avgResult.avg_hpi || 0,
      mi: avgResult.avg_mi || 0,
      wqi: avgResult.avg_wqi || 0,
    },
  };
};
