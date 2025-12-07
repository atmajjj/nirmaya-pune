import { eq, sql, and, desc } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { waterQualityCalculations } from '../../hmpi-engine/shared/schema';
import { uploads } from '../../upload/shared/schema';
import type { ReportData } from '../shared/interface';
import HttpException from '../../../utils/httpException';

/**
 * Report Data Aggregation Service
 * Fetches and aggregates HMPI calculation data for report generation
 */
export class ReportDataService {
  /**
   * Aggregate all calculation data for a given upload
   * Computes statistics, classifications, geographic data, etc.
   *
   * @param uploadId - ID of the upload record
   * @param userId - ID of the user generating the report
   * @returns Aggregated report data
   * @throws HttpException if upload not found or no calculations exist
   */
  static async aggregateReportData(uploadId: number, userId: number): Promise<ReportData> {
    // 1. Fetch upload metadata
    const [upload] = await db
      .select({
        id: uploads.id,
        filename: uploads.filename,
        created_at: uploads.created_at,
      })
      .from(uploads)
      .where(and(eq(uploads.id, uploadId), eq(uploads.is_deleted, false)))
      .limit(1);

    if (!upload) {
      throw new HttpException(404, 'Upload not found');
    }

    // 2. Fetch all calculations for this upload
    const calculations = await db
      .select()
      .from(waterQualityCalculations)
      .where(
        and(
          eq(waterQualityCalculations.upload_id, uploadId),
          eq(waterQualityCalculations.is_deleted, false)
        )
      )
      .orderBy(desc(waterQualityCalculations.hpi));

    if (calculations.length === 0) {
      throw new HttpException(404, 'No calculations found for this upload');
    }

    // 3. Calculate average values
    const avgHPI = this.calculateAverage(
      calculations.map(c => c.hpi).filter(Boolean).map(v => parseFloat(v as string))
    );
    const avgMI = this.calculateAverage(
      calculations.map(c => c.mi).filter(Boolean).map(v => parseFloat(v as string))
    );
    const avgWQI = this.calculateAverage(
      calculations.map(c => c.wqi).filter(Boolean).map(v => parseFloat(v as string))
    );

    // 4. Aggregate HPI statistics
    const hpiStats = this.aggregateHPIStats(calculations);

    // 5. Aggregate MI statistics
    const miStats = this.aggregateMIStats(calculations);

    // 6. Aggregate WQI statistics
    const wqiStats = this.aggregateWQIStats(calculations);

    // 7. Aggregate geographic data
    const geoData = this.aggregateGeoData(calculations);

    // 8. Build report data object
    const reportData: ReportData = {
      uploadId: upload.id,
      uploadFilename: upload.filename,
      totalStations: calculations.length,
      avgHPI,
      avgMI,
      avgWQI,
      hpiStats,
      miStats,
      wqiStats,
      geoData,
      calculationDate: upload.created_at,
      generatedBy: userId,
    };

    return reportData;
  }

  /**
   * Calculate average from array of numbers
   * Returns null if no valid values
   */
  private static calculateAverage(values: number[]): number | null {
    if (values.length === 0) return null;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return parseFloat((sum / values.length).toFixed(4));
  }

  /**
   * Aggregate HPI statistics
   * - Classification counts
   * - Top 10 polluted stations
   */
  private static aggregateHPIStats(calculations: any[]) {
    const classificationCounts: Record<string, number> = {};
    const topPollutedStations: Array<{
      stationId: string;
      hpi: number;
      classification: string;
      location?: string;
    }> = [];

    // Count classifications
    for (const calc of calculations) {
      if (calc.hpi_classification) {
        const classification = calc.hpi_classification;
        classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;
      }
    }

    // Extract top 10 polluted stations (sorted by HPI descending)
    const validHPIStations = calculations
      .filter(c => c.hpi)
      .map(c => ({
        stationId: c.station_id,
        hpi: parseFloat(c.hpi as string),
        classification: c.hpi_classification || 'Unknown',
        location: this.formatLocation(c.city, c.state),
      }))
      .sort((a, b) => b.hpi - a.hpi)
      .slice(0, 10);

    topPollutedStations.push(...validHPIStations);

    return {
      classificationCounts,
      topPollutedStations,
    };
  }

  /**
   * Aggregate MI statistics
   * - Classification counts
   * - Class counts (Class I-VI)
   */
  private static aggregateMIStats(calculations: any[]) {
    const classificationCounts: Record<string, number> = {};
    const classCounts: Record<string, number> = {};

    for (const calc of calculations) {
      // Count MI classifications
      if (calc.mi_classification) {
        const classification = calc.mi_classification;
        classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;
      }

      // Count MI classes
      if (calc.mi_class) {
        const miClass = calc.mi_class;
        classCounts[miClass] = (classCounts[miClass] || 0) + 1;
      }
    }

    return {
      classificationCounts,
      classCounts,
    };
  }

  /**
   * Aggregate WQI statistics
   * - Classification counts
   * - Parameter contributions (if available)
   */
  private static aggregateWQIStats(calculations: any[]) {
    const classificationCounts: Record<string, number> = {};
    const parameterContributions: Record<string, number> = {};

    for (const calc of calculations) {
      // Count WQI classifications
      if (calc.wqi_classification) {
        const classification = calc.wqi_classification;
        classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;
      }

      // Aggregate parameter contributions (if params_analyzed is available)
      if (calc.wqi_params_analyzed) {
        const params = calc.wqi_params_analyzed.split(',').map((p: string) => p.trim());
        for (const param of params) {
          parameterContributions[param] = (parameterContributions[param] || 0) + 1;
        }
      }
    }

    return {
      classificationCounts,
      parameterContributions: Object.keys(parameterContributions).length > 0 
        ? parameterContributions 
        : undefined,
    };
  }

  /**
   * Aggregate geographic data
   * - State-wise counts
   * - City-wise counts
   */
  private static aggregateGeoData(calculations: any[]) {
    const stateMap: Record<string, number> = {};
    const cityMap: Record<string, number> = {};

    for (const calc of calculations) {
      // Count by state
      if (calc.state) {
        const state = calc.state.trim();
        stateMap[state] = (stateMap[state] || 0) + 1;
      }

      // Count by city
      if (calc.city) {
        const city = calc.city.trim();
        cityMap[city] = (cityMap[city] || 0) + 1;
      }
    }

    // Convert to array format sorted by count descending
    const states = Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    const cities = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 cities only

    return {
      states,
      cities,
    };
  }

  /**
   * Format location string from city and state
   */
  private static formatLocation(city?: string | null, state?: string | null): string | undefined {
    if (!city && !state) return undefined;
    if (city && state) return `${city}, ${state}`;
    return city || state || undefined;
  }

  /**
   * Get detailed station data for charts
   * Returns array of all stations with their HPI/MI/WQI values
   *
   * @param uploadId - ID of the upload record
   * @returns Array of station data for visualization
   */
  static async getStationDataForCharts(uploadId: number) {
    const calculations = await db
      .select({
        station_id: waterQualityCalculations.station_id,
        hpi: waterQualityCalculations.hpi,
        hpi_classification: waterQualityCalculations.hpi_classification,
        mi: waterQualityCalculations.mi,
        mi_classification: waterQualityCalculations.mi_classification,
        mi_class: waterQualityCalculations.mi_class,
        wqi: waterQualityCalculations.wqi,
        wqi_classification: waterQualityCalculations.wqi_classification,
        state: waterQualityCalculations.state,
        city: waterQualityCalculations.city,
        latitude: waterQualityCalculations.latitude,
        longitude: waterQualityCalculations.longitude,
      })
      .from(waterQualityCalculations)
      .where(
        and(
          eq(waterQualityCalculations.upload_id, uploadId),
          eq(waterQualityCalculations.is_deleted, false)
        )
      )
      .orderBy(waterQualityCalculations.station_id);

    return calculations.map(calc => ({
      stationId: calc.station_id,
      hpi: calc.hpi ? parseFloat(calc.hpi as string) : null,
      hpiClassification: calc.hpi_classification,
      mi: calc.mi ? parseFloat(calc.mi as string) : null,
      miClassification: calc.mi_classification,
      miClass: calc.mi_class,
      wqi: calc.wqi ? parseFloat(calc.wqi as string) : null,
      wqiClassification: calc.wqi_classification,
      state: calc.state,
      city: calc.city,
      latitude: calc.latitude ? parseFloat(calc.latitude as string) : null,
      longitude: calc.longitude ? parseFloat(calc.longitude as string) : null,
    }));
  }

  /**
   * Validate that calculations exist for an upload
   * Useful before attempting report generation
   *
   * @param uploadId - ID of the upload record
   * @returns True if calculations exist, false otherwise
   */
  static async hasCalculations(uploadId: number): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(waterQualityCalculations)
      .where(
        and(
          eq(waterQualityCalculations.upload_id, uploadId),
          eq(waterQualityCalculations.is_deleted, false)
        )
      );

    return result?.count > 0;
  }

  /**
   * Get calculation statistics for caching in hmpi_reports table
   * Returns just the averages for quick access
   *
   * @param uploadId - ID of the upload record
   * @returns Object with avg_hpi, avg_mi, avg_wqi
   */
  static async getCalculationStatistics(uploadId: number): Promise<{
    avg_hpi: number | null;
    avg_mi: number | null;
    avg_wqi: number | null;
  }> {
    const calculations = await db
      .select({
        hpi: waterQualityCalculations.hpi,
        mi: waterQualityCalculations.mi,
        wqi: waterQualityCalculations.wqi,
      })
      .from(waterQualityCalculations)
      .where(
        and(
          eq(waterQualityCalculations.upload_id, uploadId),
          eq(waterQualityCalculations.is_deleted, false)
        )
      );

    const avgHPI = this.calculateAverage(
      calculations.map(c => c.hpi).filter(Boolean).map(v => parseFloat(v as string))
    );
    const avgMI = this.calculateAverage(
      calculations.map(c => c.mi).filter(Boolean).map(v => parseFloat(v as string))
    );
    const avgWQI = this.calculateAverage(
      calculations.map(c => c.wqi).filter(Boolean).map(v => parseFloat(v as string))
    );

    return {
      avg_hpi: avgHPI,
      avg_mi: avgMI,
      avg_wqi: avgWQI,
    };
  }
}
