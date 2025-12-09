/**
 * Alert Generator Service
 * Generates alerts for high-risk locations based on HPI/MI values
 */

import { logger } from '../../../utils/logger';
import { db } from '../../../database/drizzle';
import { waterQualityCalculations } from '../../hmpi-engine/shared/schema';
import {
  policymakerAlerts,
  type AlertSeverity,
  type RiskLevel,
  type NewPolicymakerAlert,
} from '../shared/schema';
import { createAlertsBatch, alertExistsForCalculation } from '../shared/queries';
import { DEFAULT_RISK_THRESHOLDS, RiskThresholds } from '../shared/interface';
import { eq, and, or, gte } from 'drizzle-orm';

/**
 * Generate recommendations based on risk factors
 */
function generateRecommendations(
  hpi: number | null,
  mi: number | null,
  riskLevel: RiskLevel
): string {
  const recommendations: string[] = [];

  if (riskLevel === 'unsafe') {
    recommendations.push('• Immediate action required - water source may not be safe for consumption');
    recommendations.push('• Conduct detailed source investigation to identify pollution sources');
    recommendations.push('• Consider providing alternative water supply to affected communities');
    recommendations.push('• Implement water treatment measures before distribution');
  } else if (riskLevel === 'moderate') {
    recommendations.push('• Regular monitoring recommended - increase sampling frequency');
    recommendations.push('• Investigate potential contamination sources in the area');
    recommendations.push('• Consider pre-treatment options for affected parameters');
  }

  if (hpi !== null && hpi > 75) {
    recommendations.push('• High HPI indicates significant heavy metal contamination');
    recommendations.push('• Check for industrial discharge, mining activities, or agricultural runoff');
  }

  if (mi !== null && mi > 4) {
    recommendations.push('• High MI suggests multiple metals exceeding safe limits');
    recommendations.push('• Comprehensive water treatment may be necessary');
  }

  return recommendations.join('\n');
}

/**
 * Determine alert severity based on index values
 */
function determineSeverity(
  hpi: number | null,
  mi: number | null,
  thresholds: RiskThresholds
): AlertSeverity {
  // Critical: HPI > 100 or MI > 6
  if ((hpi !== null && hpi > 100) || (mi !== null && mi > 6)) {
    return 'critical';
  }

  // High: HPI > 75 or MI > 4
  if ((hpi !== null && hpi > thresholds.hpi.moderate) || (mi !== null && mi > thresholds.mi.moderate)) {
    return 'high';
  }

  // Medium: HPI > 50 or MI > 2
  if ((hpi !== null && hpi > 50) || (mi !== null && mi > 2)) {
    return 'medium';
  }

  return 'low';
}

/**
 * Determine risk level based on HPI and MI values
 */
function determineRiskLevel(
  hpi: number | null,
  mi: number | null,
  thresholds: RiskThresholds
): RiskLevel {
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
 * Generate alert title based on indices
 */
function generateAlertTitle(
  stationId: string,
  hpi: number | null,
  mi: number | null,
  riskLevel: RiskLevel
): string {
  const parts: string[] = [];

  if (riskLevel === 'unsafe') {
    parts.push('⚠️ CRITICAL');
  } else if (riskLevel === 'moderate') {
    parts.push('⚡ WARNING');
  }

  parts.push(`Water Quality Alert at ${stationId}`);

  const issues: string[] = [];
  if (hpi !== null && hpi > 75) issues.push(`HPI: ${hpi.toFixed(2)}`);
  if (mi !== null && mi > 4) issues.push(`MI: ${mi.toFixed(2)}`);

  if (issues.length > 0) {
    parts.push(`(${issues.join(', ')})`);
  }

  return parts.join(' ');
}

/**
 * Generate alert description
 */
function generateAlertDescription(
  hpi: number | null,
  hpiClassification: string | null,
  mi: number | null,
  miClassification: string | null,
  location: string | null,
  state: string | null,
  district: string | null
): string {
  const lines: string[] = [];

  lines.push('Water quality assessment indicates elevated contamination levels.');
  lines.push('');

  if (hpi !== null) {
    lines.push(`Heavy Metal Pollution Index (HPI): ${hpi.toFixed(2)}`);
    if (hpiClassification) {
      lines.push(`Classification: ${hpiClassification}`);
    }
    lines.push('');
  }

  if (mi !== null) {
    lines.push(`Metal Index (MI): ${mi.toFixed(2)}`);
    if (miClassification) {
      lines.push(`Classification: ${miClassification}`);
    }
    lines.push('');
  }

  const locationParts = [location, district, state].filter(Boolean);
  if (locationParts.length > 0) {
    lines.push(`Location: ${locationParts.join(', ')}`);
  }

  return lines.join('\n');
}

export class AlertGeneratorService {
  /**
   * Generate alerts for calculations from a specific upload
   */
  static async generateAlertsForUpload(
    uploadId: number,
    userId: number,
    thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
  ): Promise<{ generated: number; skipped: number }> {
    logger.info(`Generating alerts for upload ${uploadId}`);

    // Fetch calculations that need alerts (HPI >= 25 OR MI >= 1)
    const calculations = await db
      .select()
      .from(waterQualityCalculations)
      .where(
        and(
          eq(waterQualityCalculations.upload_id, uploadId),
          eq(waterQualityCalculations.is_deleted, false),
          or(
            gte(waterQualityCalculations.hpi, String(thresholds.hpi.safe)),
            gte(waterQualityCalculations.mi, String(thresholds.mi.safe))
          )
        )
      );

    if (calculations.length === 0) {
      logger.info(`No elevated risk calculations found for upload ${uploadId}`);
      return { generated: 0, skipped: 0 };
    }

    const alertsToCreate: NewPolicymakerAlert[] = [];
    let skipped = 0;

    for (const calc of calculations) {
      const hpi = calc.hpi ? parseFloat(String(calc.hpi)) : null;
      const mi = calc.mi ? parseFloat(String(calc.mi)) : null;

      // Check if alert already exists
      const exists = await alertExistsForCalculation(calc.id, 'combined');
      if (exists) {
        skipped++;
        continue;
      }

      const riskLevel = determineRiskLevel(hpi, mi, thresholds);
      
      // Only create alerts for moderate or unsafe
      if (riskLevel === 'safe') {
        continue;
      }

      const severity = determineSeverity(hpi, mi, thresholds);

      alertsToCreate.push({
        calculation_id: calc.id,
        alert_type: 'combined',
        severity,
        status: 'active',
        station_id: calc.station_id,
        state: calc.state,
        district: calc.district,
        location: calc.location,
        latitude: calc.latitude,
        longitude: calc.longitude,
        hpi_value: calc.hpi,
        hpi_classification: calc.hpi_classification,
        mi_value: calc.mi,
        mi_classification: calc.mi_classification,
        wqi_value: null,
        wqi_classification: null,
        risk_level: riskLevel,
        title: generateAlertTitle(calc.station_id, hpi, mi, riskLevel),
        description: generateAlertDescription(
          hpi,
          calc.hpi_classification,
          mi,
          calc.mi_classification,
          calc.location,
          calc.state,
          calc.district
        ),
        recommendations: generateRecommendations(hpi, mi, riskLevel),
        created_by: userId,
      });
    }

    if (alertsToCreate.length > 0) {
      await createAlertsBatch(alertsToCreate);
      logger.info(`Generated ${alertsToCreate.length} alerts for upload ${uploadId}`);
    }

    return {
      generated: alertsToCreate.length,
      skipped,
    };
  }

  /**
   * Generate alerts for a single calculation
   */
  static async generateAlertForCalculation(
    calculationId: number,
    userId: number,
    thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
  ): Promise<boolean> {
    const [calc] = await db
      .select()
      .from(waterQualityCalculations)
      .where(
        and(
          eq(waterQualityCalculations.id, calculationId),
          eq(waterQualityCalculations.is_deleted, false)
        )
      )
      .limit(1);

    if (!calc) {
      logger.warn(`Calculation ${calculationId} not found`);
      return false;
    }

    const hpi = calc.hpi ? parseFloat(String(calc.hpi)) : null;
    const mi = calc.mi ? parseFloat(String(calc.mi)) : null;

    const riskLevel = determineRiskLevel(hpi, mi, thresholds);

    // Only create alerts for moderate or unsafe
    if (riskLevel === 'safe') {
      return false;
    }

    // Check if alert already exists
    const exists = await alertExistsForCalculation(calc.id, 'combined');
    if (exists) {
      return false;
    }

    const severity = determineSeverity(hpi, mi, thresholds);

    await createAlertsBatch([{
      calculation_id: calc.id,
      alert_type: 'combined',
      severity,
      status: 'active',
      station_id: calc.station_id,
      state: calc.state,
      district: calc.district,
      location: calc.location,
      latitude: calc.latitude,
      longitude: calc.longitude,
      hpi_value: calc.hpi,
      hpi_classification: calc.hpi_classification,
      mi_value: calc.mi,
      mi_classification: calc.mi_classification,
      wqi_value: null,
      wqi_classification: null,
      risk_level: riskLevel,
      title: generateAlertTitle(calc.station_id, hpi, mi, riskLevel),
      description: generateAlertDescription(
        hpi,
        calc.hpi_classification,
        mi,
        calc.mi_classification,
        calc.location,
        calc.state,
        calc.district
      ),
      recommendations: generateRecommendations(hpi, mi, riskLevel),
      created_by: userId,
    }]);

    return true;
  }

  /**
   * Regenerate all alerts (useful for recalculation with new thresholds)
   */
  static async regenerateAllAlerts(
    userId: number,
    thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
  ): Promise<{ generated: number; total_calculations: number }> {
    logger.info('Regenerating all alerts with new thresholds');

    // Soft delete all existing alerts
    await db
      .update(policymakerAlerts)
      .set({
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
      })
      .where(eq(policymakerAlerts.is_deleted, false));

    // Fetch all calculations that need alerts
    const calculations = await db
      .select()
      .from(waterQualityCalculations)
      .where(
        and(
          eq(waterQualityCalculations.is_deleted, false),
          or(
            gte(waterQualityCalculations.hpi, String(thresholds.hpi.safe)),
            gte(waterQualityCalculations.mi, String(thresholds.mi.safe))
          )
        )
      );

    const alertsToCreate: NewPolicymakerAlert[] = [];

    for (const calc of calculations) {
      const hpi = calc.hpi ? parseFloat(String(calc.hpi)) : null;
      const mi = calc.mi ? parseFloat(String(calc.mi)) : null;

      const riskLevel = determineRiskLevel(hpi, mi, thresholds);

      if (riskLevel === 'safe') {
        continue;
      }

      const severity = determineSeverity(hpi, mi, thresholds);

      alertsToCreate.push({
        calculation_id: calc.id,
        alert_type: 'combined',
        severity,
        status: 'active',
        station_id: calc.station_id,
        state: calc.state,
        district: calc.district,
        location: calc.location,
        latitude: calc.latitude,
        longitude: calc.longitude,
        hpi_value: calc.hpi,
        hpi_classification: calc.hpi_classification,
        mi_value: calc.mi,
        mi_classification: calc.mi_classification,
        wqi_value: null,
        wqi_classification: null,
        risk_level: riskLevel,
        title: generateAlertTitle(calc.station_id, hpi, mi, riskLevel),
        description: generateAlertDescription(
          hpi,
          calc.hpi_classification,
          mi,
          calc.mi_classification,
          calc.location,
          calc.state,
          calc.district
        ),
        recommendations: generateRecommendations(hpi, mi, riskLevel),
        created_by: userId,
      });
    }

    if (alertsToCreate.length > 0) {
      // Batch insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < alertsToCreate.length; i += chunkSize) {
        const chunk = alertsToCreate.slice(i, i + chunkSize);
        await createAlertsBatch(chunk);
      }
    }

    logger.info(`Regenerated ${alertsToCreate.length} alerts from ${calculations.length} calculations`);

    return {
      generated: alertsToCreate.length,
      total_calculations: calculations.length,
    };
  }
}
