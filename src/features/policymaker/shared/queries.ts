import { eq, and, desc, asc, sql, ilike, count } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  policymakerAlerts,
  type PolicymakerAlert,
  type AlertSeverity,
  type AlertStatus,
  type AlertType,
  type RiskLevel,
  type NewPolicymakerAlert,
} from './schema';
import { AlertQueryParams, convertAlertToResponse, AlertResponse } from './interface';

/**
 * Find alert by ID (excluding deleted)
 */
export const findAlertById = async (id: number): Promise<PolicymakerAlert | undefined> => {
  const [alert] = await db
    .select()
    .from(policymakerAlerts)
    .where(and(eq(policymakerAlerts.id, id), eq(policymakerAlerts.is_deleted, false)))
    .limit(1);

  return alert;
};

/**
 * Find alerts by calculation ID
 */
export const findAlertsByCalculationId = async (calculationId: number): Promise<PolicymakerAlert[]> => {
  return db
    .select()
    .from(policymakerAlerts)
    .where(
      and(
        eq(policymakerAlerts.calculation_id, calculationId),
        eq(policymakerAlerts.is_deleted, false)
      )
    )
    .orderBy(desc(policymakerAlerts.created_at));
};

/**
 * Find alerts with filters and pagination
 */
export const findAlerts = async (
  params: AlertQueryParams
): Promise<{ alerts: AlertResponse[]; total: number }> => {
  const {
    page = 1,
    limit = 20,
    severity,
    status,
    alert_type,
    risk_level,
    state,
    district,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = params;

  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(policymakerAlerts.is_deleted, false)];

  if (severity) {
    conditions.push(eq(policymakerAlerts.severity, severity));
  }

  if (status) {
    conditions.push(eq(policymakerAlerts.status, status));
  }

  if (alert_type) {
    conditions.push(eq(policymakerAlerts.alert_type, alert_type));
  }

  if (risk_level) {
    conditions.push(eq(policymakerAlerts.risk_level, risk_level));
  }

  if (state) {
    conditions.push(ilike(policymakerAlerts.state, `%${state}%`));
  }

  if (district) {
    conditions.push(ilike(policymakerAlerts.district, `%${district}%`));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(policymakerAlerts)
    .where(whereClause);

  const total = countResult?.count || 0;

  // Build order by
  const sortColumn = {
    created_at: policymakerAlerts.created_at,
    severity: policymakerAlerts.severity,
    risk_level: policymakerAlerts.risk_level,
    state: policymakerAlerts.state,
  }[sort_by] || policymakerAlerts.created_at;

  const orderFn = sort_order === 'asc' ? asc : desc;

  // Get paginated results
  const alerts = await db
    .select()
    .from(policymakerAlerts)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return {
    alerts: alerts.map(convertAlertToResponse),
    total,
  };
};

/**
 * Create new alert
 */
export const createAlert = async (data: NewPolicymakerAlert): Promise<PolicymakerAlert> => {
  const [alert] = await db
    .insert(policymakerAlerts)
    .values({
      ...data,
      updated_at: new Date(),
    })
    .returning();

  return alert;
};

/**
 * Create multiple alerts (batch insert)
 */
export const createAlertsBatch = async (
  alerts: NewPolicymakerAlert[]
): Promise<PolicymakerAlert[]> => {
  if (alerts.length === 0) return [];

  const inserted = await db
    .insert(policymakerAlerts)
    .values(alerts.map(a => ({ ...a, updated_at: new Date() })))
    .returning();

  return inserted;
};

/**
 * Update alert status
 */
export const updateAlertStatus = async (
  id: number,
  status: AlertStatus,
  userId: number,
  notes?: string
): Promise<PolicymakerAlert | null> => {
  const updateData: Partial<PolicymakerAlert> = {
    status,
    updated_by: userId,
    updated_at: new Date(),
  };

  if (status === 'acknowledged') {
    updateData.acknowledged_by = userId;
    updateData.acknowledged_at = new Date();
  }

  if (status === 'resolved') {
    updateData.resolved_at = new Date();
    if (notes) {
      updateData.resolution_notes = notes;
    }
  }

  const [updated] = await db
    .update(policymakerAlerts)
    .set(updateData)
    .where(and(eq(policymakerAlerts.id, id), eq(policymakerAlerts.is_deleted, false)))
    .returning();

  return updated || null;
};

/**
 * Soft delete alert
 */
export const softDeleteAlert = async (id: number, userId: number): Promise<boolean> => {
  const [deleted] = await db
    .update(policymakerAlerts)
    .set({
      is_deleted: true,
      deleted_by: userId,
      deleted_at: new Date(),
      updated_by: userId,
      updated_at: new Date(),
    })
    .where(and(eq(policymakerAlerts.id, id), eq(policymakerAlerts.is_deleted, false)))
    .returning();

  return !!deleted;
};

/**
 * Get alert statistics
 */
export const getAlertStats = async (): Promise<{
  total: number;
  by_severity: Record<AlertSeverity, number>;
  by_status: Record<AlertStatus, number>;
  by_risk_level: Record<RiskLevel, number>;
  by_state: Array<{ state: string; count: number }>;
}> => {
  // Total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(policymakerAlerts)
    .where(eq(policymakerAlerts.is_deleted, false));

  // By severity
  const bySeverityResult = await db
    .select({
      severity: policymakerAlerts.severity,
      count: count(),
    })
    .from(policymakerAlerts)
    .where(eq(policymakerAlerts.is_deleted, false))
    .groupBy(policymakerAlerts.severity);

  // By status
  const byStatusResult = await db
    .select({
      status: policymakerAlerts.status,
      count: count(),
    })
    .from(policymakerAlerts)
    .where(eq(policymakerAlerts.is_deleted, false))
    .groupBy(policymakerAlerts.status);

  // By risk level
  const byRiskResult = await db
    .select({
      risk_level: policymakerAlerts.risk_level,
      count: count(),
    })
    .from(policymakerAlerts)
    .where(eq(policymakerAlerts.is_deleted, false))
    .groupBy(policymakerAlerts.risk_level);

  // By state (top 10)
  const byStateResult = await db
    .select({
      state: policymakerAlerts.state,
      count: count(),
    })
    .from(policymakerAlerts)
    .where(and(
      eq(policymakerAlerts.is_deleted, false),
      sql`${policymakerAlerts.state} IS NOT NULL`
    ))
    .groupBy(policymakerAlerts.state)
    .orderBy(desc(count()))
    .limit(10);

  // Convert to structured format
  const bySeverity = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  bySeverityResult.forEach(r => {
    bySeverity[r.severity] = r.count;
  });

  const byStatus = {
    active: 0,
    acknowledged: 0,
    resolved: 0,
    dismissed: 0,
  };
  byStatusResult.forEach(r => {
    byStatus[r.status] = r.count;
  });

  const byRiskLevel = {
    safe: 0,
    moderate: 0,
    unsafe: 0,
  };
  byRiskResult.forEach(r => {
    byRiskLevel[r.risk_level] = r.count;
  });

  return {
    total: totalResult?.count || 0,
    by_severity: bySeverity,
    by_status: byStatus,
    by_risk_level: byRiskLevel,
    by_state: byStateResult.map(r => ({
      state: r.state || 'Unknown',
      count: r.count,
    })),
  };
};

/**
 * Get recent alerts (for dashboard)
 */
export const getRecentAlerts = async (limit: number = 10): Promise<AlertResponse[]> => {
  const alerts = await db
    .select()
    .from(policymakerAlerts)
    .where(eq(policymakerAlerts.is_deleted, false))
    .orderBy(desc(policymakerAlerts.created_at))
    .limit(limit);

  return alerts.map(convertAlertToResponse);
};

/**
 * Check if alert already exists for a calculation
 */
export const alertExistsForCalculation = async (
  calculationId: number,
  alertType: AlertType
): Promise<boolean> => {
  const [existing] = await db
    .select({ id: policymakerAlerts.id })
    .from(policymakerAlerts)
    .where(
      and(
        eq(policymakerAlerts.calculation_id, calculationId),
        eq(policymakerAlerts.alert_type, alertType),
        eq(policymakerAlerts.is_deleted, false)
      )
    )
    .limit(1);

  return !!existing;
};
