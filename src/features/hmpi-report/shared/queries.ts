import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { hmpiReports, ReportStatus } from './schema';
import {
  CreateReportInput,
  UpdateReportInput,
  ReportListParams,
  ReportListResult,
  convertReport,
} from './interface';

/**
 * Find report by ID (excluding deleted)
 */
export const findReportById = async (id: number) => {
  const [report] = await db
    .select()
    .from(hmpiReports)
    .where(and(eq(hmpiReports.id, id), eq(hmpiReports.is_deleted, false)))
    .limit(1);

  return report ? convertReport(report) : undefined;
};

/**
 * Find reports by upload ID
 */
export const findReportsByUploadId = async (uploadId: number) => {
  const reports = await db
    .select()
    .from(hmpiReports)
    .where(and(eq(hmpiReports.upload_id, uploadId), eq(hmpiReports.is_deleted, false)))
    .orderBy(desc(hmpiReports.created_at));

  return reports.map(convertReport);
};

/**
 * Find latest report for an upload
 */
export const findLatestReportByUploadId = async (uploadId: number) => {
  const [report] = await db
    .select()
    .from(hmpiReports)
    .where(and(eq(hmpiReports.upload_id, uploadId), eq(hmpiReports.is_deleted, false)))
    .orderBy(desc(hmpiReports.created_at))
    .limit(1);

  return report ? convertReport(report) : undefined;
};

/**
 * Create a new report
 */
export const createReport = async (input: CreateReportInput) => {
  const [report] = await db
    .insert(hmpiReports)
    .values({
      upload_id: input.upload_id,
      report_title: input.report_title,
      report_type: input.report_type || 'comprehensive',
      file_name: input.file_name,
      file_path: input.file_path,
      file_url: input.file_url,
      file_size: input.file_size,
      total_stations: input.total_stations,
      avg_hpi: input.avg_hpi?.toString() || null,
      avg_mi: input.avg_mi?.toString() || null,
      avg_wqi: input.avg_wqi?.toString() || null,
      status: input.status || 'pending',
      error_message: input.error_message || null,
      generated_at: input.generated_at || null,
      created_by: input.created_by,
      updated_by: input.created_by,
    })
    .returning();

  return convertReport(report);
};

/**
 * Update report by ID
 */
export const updateReport = async (id: number, input: UpdateReportInput) => {
  const updateData: Record<string, any> = {
    updated_by: input.updated_by,
    updated_at: new Date(),
  };

  if (input.report_title !== undefined) updateData.report_title = input.report_title;
  if (input.file_name !== undefined) updateData.file_name = input.file_name;
  if (input.file_path !== undefined) updateData.file_path = input.file_path;
  if (input.file_url !== undefined) updateData.file_url = input.file_url;
  if (input.file_size !== undefined) updateData.file_size = input.file_size;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.error_message !== undefined) updateData.error_message = input.error_message;
  if (input.generated_at !== undefined) updateData.generated_at = input.generated_at;

  const [report] = await db
    .update(hmpiReports)
    .set(updateData)
    .where(and(eq(hmpiReports.id, id), eq(hmpiReports.is_deleted, false)))
    .returning();

  return report ? convertReport(report) : undefined;
};

/**
 * Update report status
 */
export const updateReportStatus = async (
  id: number,
  status: ReportStatus,
  errorMessage?: string
) => {
  const updateData: Record<string, any> = {
    status,
    updated_at: new Date(),
  };

  if (status === 'completed') {
    updateData.generated_at = new Date();
  }

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const [report] = await db
    .update(hmpiReports)
    .set(updateData)
    .where(and(eq(hmpiReports.id, id), eq(hmpiReports.is_deleted, false)))
    .returning();

  return report ? convertReport(report) : undefined;
};

/**
 * Soft delete report
 */
export const deleteReport = async (id: number, deletedBy: number) => {
  const [report] = await db
    .update(hmpiReports)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
      updated_by: deletedBy,
      updated_at: new Date(),
    })
    .where(and(eq(hmpiReports.id, id), eq(hmpiReports.is_deleted, false)))
    .returning();

  return report ? convertReport(report) : undefined;
};

/**
 * List reports with filters and pagination
 */
export const listReports = async (params: ReportListParams): Promise<ReportListResult> => {
  const {
    page = 1,
    limit = 10,
    upload_id,
    status,
    report_type,
    created_by,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = params;

  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(hmpiReports.is_deleted, false)];

  if (upload_id) {
    conditions.push(eq(hmpiReports.upload_id, upload_id));
  }

  if (status) {
    conditions.push(eq(hmpiReports.status, status));
  }

  if (report_type) {
    conditions.push(eq(hmpiReports.report_type, report_type));
  }

  if (created_by) {
    conditions.push(eq(hmpiReports.created_by, created_by));
  }

  // Build sort
  const sortColumn = {
    created_at: hmpiReports.created_at,
    generated_at: hmpiReports.generated_at,
    file_size: hmpiReports.file_size,
    total_stations: hmpiReports.total_stations,
  }[sort_by];

  const orderFn = sort_order === 'asc' ? asc : desc;

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hmpiReports)
    .where(and(...conditions));

  // Get paginated results
  const reports = await db
    .select()
    .from(hmpiReports)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return {
    reports: reports.map(convertReport),
    total: count,
  };
};

/**
 * Get report statistics
 */
export const getReportStatistics = async (userId?: number) => {
  const conditions = [eq(hmpiReports.is_deleted, false)];

  if (userId) {
    conditions.push(eq(hmpiReports.created_by, userId));
  }

  // Total reports
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hmpiReports)
    .where(and(...conditions));

  // By status
  const [completedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hmpiReports)
    .where(and(...conditions, eq(hmpiReports.status, 'completed')));

  const [failedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hmpiReports)
    .where(and(...conditions, eq(hmpiReports.status, 'failed')));

  const [pendingResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hmpiReports)
    .where(and(...conditions, eq(hmpiReports.status, 'pending')));

  const [generatingResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hmpiReports)
    .where(and(...conditions, eq(hmpiReports.status, 'generating')));

  // Averages (completed reports only)
  const [avgResult] = await db
    .select({
      totalStations: sql<number>`sum(total_stations)::int`,
      avgHPI: sql<number>`avg(avg_hpi::numeric)::float`,
      avgMI: sql<number>`avg(avg_mi::numeric)::float`,
      avgWQI: sql<number>`avg(avg_wqi::numeric)::float`,
    })
    .from(hmpiReports)
    .where(and(...conditions, eq(hmpiReports.status, 'completed')));

  return {
    totalReports: totalResult.count,
    completedReports: completedResult.count,
    failedReports: failedResult.count,
    pendingReports: pendingResult.count,
    generatingReports: generatingResult.count,
    totalStations: avgResult.totalStations || 0,
    avgHPI: avgResult.avgHPI || null,
    avgMI: avgResult.avgMI || null,
    avgWQI: avgResult.avgWQI || null,
  };
};

/**
 * Check if report exists for upload
 */
export const reportExistsForUpload = async (uploadId: number): Promise<boolean> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hmpiReports)
    .where(and(eq(hmpiReports.upload_id, uploadId), eq(hmpiReports.is_deleted, false)))
    .limit(1);

  return result.count > 0;
};
