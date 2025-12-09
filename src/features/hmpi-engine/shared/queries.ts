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
  district?: string;
  year?: number;
  city?: string;
  upload_id?: number;
  hpi_min?: number;
  hpi_max?: number;
  mi_min?: number;
  mi_max?: number;
  classification?: string;
  sort_by?: 'hpi' | 'mi' | 'created_at' | 'station_id' | 'year';
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
    district,
    year,
    city,
    upload_id,
    hpi_min,
    hpi_max,
    mi_min,
    mi_max,
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

  if (district) {
    conditions.push(ilike(waterQualityCalculations.district, `%${district}%`));
  }

  if (year !== undefined) {
    conditions.push(eq(waterQualityCalculations.year, year));
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

  if (classification) {
    conditions.push(
      or(
        ilike(waterQualityCalculations.hpi_classification, `%${classification}%`),
        ilike(waterQualityCalculations.mi_classification, `%${classification}%`)
      )!
    );
  }

  // Build sort
  const sortColumn = {
    hpi: waterQualityCalculations.hpi,
    mi: waterQualityCalculations.mi,
    created_at: waterQualityCalculations.created_at,
    station_id: waterQualityCalculations.station_id,
    year: waterQualityCalculations.year,
  }[sort_by] || waterQualityCalculations.created_at;

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
    by_state: Object.fromEntries(byState.map(s => [s.state, s.count])),
    averages: {
      hpi: avgResult.avg_hpi || 0,
      mi: avgResult.avg_mi || 0,
    },
  };
};

/**
 * Get geomap data for frontend visualization
 * Returns stations with coordinates, HPI scores, and risk levels
 */
export const getGeomapData = async (params?: {
  state?: string;
  uploadId?: number;
  riskLevel?: 'safe' | 'moderate' | 'unsafe';
  year?: number;
  minHpi?: number;
  maxHpi?: number;
}): Promise<GeomapStation[]> => {
  const conditions = [eq(waterQualityCalculations.is_deleted, false)];

  // Apply filters
  if (params?.state) {
    conditions.push(ilike(waterQualityCalculations.state, `%${params.state}%`));
  }

  if (params?.uploadId) {
    conditions.push(eq(waterQualityCalculations.upload_id, params.uploadId));
  }

  if (params?.year) {
    conditions.push(eq(waterQualityCalculations.year, params.year));
  }

  if (params?.minHpi !== undefined) {
    conditions.push(gte(waterQualityCalculations.hpi, params.minHpi.toString()));
  }

  if (params?.maxHpi !== undefined) {
    conditions.push(lte(waterQualityCalculations.hpi, params.maxHpi.toString()));
  }

  // Risk level filter (based on HPI ranges)
  if (params?.riskLevel) {
    const riskRanges = {
      safe: { min: 0, max: 50 },      // HPI < 50: Excellent to Good
      moderate: { min: 50, max: 100 }, // HPI 50-100: Poor to Very Poor
      unsafe: { min: 100, max: 9999 }, // HPI > 100: Unsuitable/Critical
    };
    const range = riskRanges[params.riskLevel];
    conditions.push(
      and(
        gte(waterQualityCalculations.hpi, range.min.toString()),
        lte(waterQualityCalculations.hpi, range.max.toString())
      )!
    );
  }

  // Query stations with coordinates only (filter out null lat/long)
  const stations = await db
    .select({
      id: waterQualityCalculations.id,
      station_id: waterQualityCalculations.station_id,
      name: waterQualityCalculations.location,
      state: waterQualityCalculations.state,
      district: waterQualityCalculations.district,
      city: waterQualityCalculations.city,
      latitude: waterQualityCalculations.latitude,
      longitude: waterQualityCalculations.longitude,
      year: waterQualityCalculations.year,
      hpi: waterQualityCalculations.hpi,
      hpi_classification: waterQualityCalculations.hpi_classification,
      mi: waterQualityCalculations.mi,
      mi_classification: waterQualityCalculations.mi_classification,
      metals_analyzed: waterQualityCalculations.metals_analyzed,
    })
    .from(waterQualityCalculations)
    .where(
      and(
        ...conditions,
        sql`${waterQualityCalculations.latitude} IS NOT NULL`,
        sql`${waterQualityCalculations.longitude} IS NOT NULL`
      )
    )
    .orderBy(desc(waterQualityCalculations.hpi));

  // Transform to geomap format with risk levels
  return stations.map((station) => {
    const hpiValue = station.hpi ? parseFloat(station.hpi as string) : null;
    
    // Determine risk level based on HPI value
    let riskLevel: 'safe' | 'moderate' | 'unsafe' = 'safe';
    if (hpiValue !== null) {
      if (hpiValue > 100) {
        riskLevel = 'unsafe';
      } else if (hpiValue >= 50) {
        riskLevel = 'moderate';
      }
    }

    return {
      id: station.id,
      station_id: station.station_id,
      name: station.name || station.station_id,
      location: {
        latitude: parseFloat(station.latitude as string),
        longitude: parseFloat(station.longitude as string),
        state: station.state,
        district: station.district,
        city: station.city,
      },
      year: station.year,
      hpi_score: hpiValue,
      hpi_classification: station.hpi_classification,
      mi_score: station.mi ? parseFloat(station.mi as string) : null,
      mi_classification: station.mi_classification,
      risk_level: riskLevel,
      metals_analyzed: station.metals_analyzed?.split(',').map(m => m.trim()) || [],
    };
  });
};

// ============================================================================
// Type Exports
// ============================================================================

export interface GeomapStation {
  id: number;
  station_id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    state: string | null;
    district: string | null;
    city: string | null;
  };
  year: number | null;
  hpi_score: number | null;
  hpi_classification: string | null;
  mi_score: number | null;
  mi_classification: string | null;
  risk_level: 'safe' | 'moderate' | 'unsafe';
  metals_analyzed: string[];
}

