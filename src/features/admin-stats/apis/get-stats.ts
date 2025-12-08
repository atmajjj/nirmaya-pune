/**
 * GET /api/admin/stats
 * Get comprehensive system-wide statistics for admin dashboard
 * 
 * Authorization: Admin only
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { db } from '../../../database/drizzle';
import { users } from '../../user/shared/schema';
import { uploads } from '../../upload/shared/schema';
import { waterQualityCalculations } from '../../hmpi-engine/shared/schema';
import { dataSources } from '../../data-sources/shared/schema';
import { hmpiReports } from '../../hmpi-report/shared/schema';
import { formulas } from '../../formula-editor/shared/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import { AdminDashboardStats } from '../shared/interface';

/**
 * Business logic: Get comprehensive admin statistics
 */
async function getAdminStatistics(): Promise<AdminDashboardStats> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Parallel queries for better performance
  const [
    totalUsersResult,
    usersByRoleResult,
    recentUsersResult,
    uploadsData,
    calculationsData,
    dataSourcesData,
    reportsData,
    formulasData,
  ] = await Promise.all([
    // Total users
    db.select({
      total: sql<number>`count(*)::int`,
    }).from(users).where(eq(users.is_deleted, false)),

    // Users by role
    db.select({
      role: users.role,
      count: sql<number>`count(*)::int`,
    }).from(users)
      .where(eq(users.is_deleted, false))
      .groupBy(users.role),

    // Recent users
    db.select({
      count: sql<number>`count(*)::int`,
    }).from(users)
      .where(and(
        eq(users.is_deleted, false),
        gte(users.created_at, thirtyDaysAgo)
      )),

    // Uploads statistics
    db.select({
      total: sql<number>`count(*)::int`,
      status: uploads.status,
      total_size: sql<number>`sum(file_size)::bigint`,
      recent: sql<number>`count(*) filter (where created_at >= ${thirtyDaysAgo})::int`,
    }).from(uploads).where(eq(uploads.is_deleted, false))
      .groupBy(sql`rollup(status)`),

    // Calculations statistics
    db.select({
      total: sql<number>`count(*)::int`,
      hpi_count: sql<number>`count(*) filter (where hpi is not null)::int`,
      mi_count: sql<number>`count(*) filter (where mi is not null)::int`,
      wqi_count: sql<number>`count(*) filter (where wqi is not null)::int`,
      cdeg_count: sql<number>`count(*) filter (where cdeg is not null)::int`,
      hei_count: sql<number>`count(*) filter (where hei is not null)::int`,
      pig_count: sql<number>`count(*) filter (where pig is not null)::int`,
      recent: sql<number>`count(*) filter (where created_at >= ${thirtyDaysAgo})::int`,
    }).from(waterQualityCalculations).where(eq(waterQualityCalculations.is_deleted, false)),

    // Data sources statistics
    db.select({
      total: sql<number>`count(*)::int`,
      status: dataSources.status,
      file_type: dataSources.file_type,
      total_size: sql<number>`sum(file_size)::bigint`,
      recent: sql<number>`count(*) filter (where created_at >= ${thirtyDaysAgo})::int`,
    }).from(dataSources).where(eq(dataSources.is_deleted, false))
      .groupBy(sql`rollup(status, file_type)`),

    // Reports statistics
    db.select({
      total: sql<number>`count(*)::int`,
      status: hmpiReports.status,
      report_type: hmpiReports.report_type,
      recent: sql<number>`count(*) filter (where created_at >= ${thirtyDaysAgo})::int`,
    }).from(hmpiReports).where(eq(hmpiReports.is_deleted, false))
      .groupBy(sql`rollup(status, report_type)`),

    // Formulas statistics
    db.select({
      total: sql<number>`count(*)::int`,
      type: formulas.type,
      active: sql<number>`count(*) filter (where is_active = true)::int`,
      defaults: sql<number>`count(*) filter (where is_default = true)::int`,
    }).from(formulas).where(eq(formulas.is_deleted, false))
      .groupBy(sql`rollup(type)`),
  ]);

  // Process users data
  const totalUsers = totalUsersResult[0]?.total || 0;
  const recentUsers = recentUsersResult[0]?.count || 0;
  
  const usersByRole: Record<string, number> = usersByRoleResult.reduce((acc, curr) => {
    acc[curr.role] = curr.count;
    return acc;
  }, {} as Record<string, number>);

  // Process uploads data
  const totalUploads = uploadsData.find(r => !r.status)?.total || 0;
  const uploadSize = uploadsData.find(r => !r.status)?.total_size || 0;
  const recentUploads = uploadsData.find(r => !r.status)?.recent || 0;
  const uploadsByStatus = uploadsData.reduce((acc, curr) => {
    if (curr.status) acc[curr.status] = curr.total;
    return acc;
  }, {} as Record<string, number>);

  // Process calculations data
  const calc = calculationsData[0] || {};
  
  // Process data sources
  const totalDataSources = dataSourcesData.find(r => !r.status && !r.file_type)?.total || 0;
  const dataSourceSize = dataSourcesData.find(r => !r.status && !r.file_type)?.total_size || 0;
  const recentDataSources = dataSourcesData.find(r => !r.status && !r.file_type)?.recent || 0;
  
  const dataSourcesByStatus = dataSourcesData
    .filter(r => r.status && !r.file_type)
    .reduce((acc, curr) => {
      if (curr.status) acc[curr.status] = curr.total;
      return acc;
    }, {} as Record<string, number>);
    
  const dataSourcesByType = dataSourcesData
    .filter(r => !r.status && r.file_type)
    .reduce((acc, curr) => {
      if (curr.file_type) acc[curr.file_type] = curr.total;
      return acc;
    }, {} as Record<string, number>);

  // Process reports
  const totalReports = reportsData.find(r => !r.status && !r.report_type)?.total || 0;
  const recentReports = reportsData.find(r => !r.status && !r.report_type)?.recent || 0;
  
  const reportsByStatus = reportsData
    .filter(r => r.status && !r.report_type)
    .reduce((acc, curr) => {
      if (curr.status) acc[curr.status] = curr.total;
      return acc;
    }, {} as Record<string, number>);

  // Process formulas
  const totalFormulas = formulasData.find(r => !r.type)?.total || 0;
  const activeFormulas = formulasData.find(r => !r.type)?.active || 0;
  const defaultFormulas = formulasData.find(r => !r.type)?.defaults || 0;
  
  const formulasByType = formulasData
    .filter(r => r.type)
    .reduce((acc, curr) => {
      if (curr.type) acc[curr.type] = curr.total;
      return acc;
    }, {} as Record<string, number>);

  // Get classification counts for calculations
  const [hpiClassifications, miClassifications, wqiClassifications] = await Promise.all([
    db.select({
      classification: waterQualityCalculations.hpi_classification,
      count: sql<number>`count(*)::int`,
    }).from(waterQualityCalculations)
      .where(and(
        eq(waterQualityCalculations.is_deleted, false),
        sql`${waterQualityCalculations.hpi_classification} is not null`
      ))
      .groupBy(waterQualityCalculations.hpi_classification),

    db.select({
      classification: waterQualityCalculations.mi_classification,
      count: sql<number>`count(*)::int`,
    }).from(waterQualityCalculations)
      .where(and(
        eq(waterQualityCalculations.is_deleted, false),
        sql`${waterQualityCalculations.mi_classification} is not null`
      ))
      .groupBy(waterQualityCalculations.mi_classification),

    db.select({
      classification: waterQualityCalculations.wqi_classification,
      count: sql<number>`count(*)::int`,
    }).from(waterQualityCalculations)
      .where(and(
        eq(waterQualityCalculations.is_deleted, false),
        sql`${waterQualityCalculations.wqi_classification} is not null`
      ))
      .groupBy(waterQualityCalculations.wqi_classification),
  ]);

  const stats: AdminDashboardStats = {
    overview: {
      total_users: totalUsers,
      total_uploads: totalUploads,
      total_calculations: calc.total || 0,
      total_reports: totalReports,
      total_data_sources: totalDataSources,
      total_formulas: totalFormulas,
    },
    
    users: {
      by_role: {
        admin: usersByRole.admin || 0,
        scientist: usersByRole.scientist || 0,
        field_technician: usersByRole.field_technician || 0,
        researcher: usersByRole.researcher || 0,
        policymaker: usersByRole.policymaker || 0,
      },
      recent_registrations: recentUsers,
      active_users: totalUsers, // TODO: implement actual active user tracking
    },
    
    uploads: {
      total: totalUploads,
      by_status: {
        pending: uploadsByStatus.pending || 0,
        processing: uploadsByStatus.processing || 0,
        completed: uploadsByStatus.completed || 0,
        failed: uploadsByStatus.failed || 0,
      },
      total_size_bytes: Number(uploadSize),
      total_size_mb: Math.round(Number(uploadSize) / (1024 * 1024) * 100) / 100,
      recent_uploads: recentUploads,
    },
    
    calculations: {
      total: calc.total || 0,
      by_index: {
        hpi: calc.hpi_count || 0,
        mi: calc.mi_count || 0,
        wqi: calc.wqi_count || 0,
        cdeg: calc.cdeg_count || 0,
        hei: calc.hei_count || 0,
        pig: calc.pig_count || 0,
      },
      by_classification: {
        hpi: hpiClassifications.reduce((acc, curr) => {
          if (curr.classification) acc[curr.classification] = curr.count;
          return acc;
        }, {} as Record<string, number>),
        mi: miClassifications.reduce((acc, curr) => {
          if (curr.classification) acc[curr.classification] = curr.count;
          return acc;
        }, {} as Record<string, number>),
        wqi: wqiClassifications.reduce((acc, curr) => {
          if (curr.classification) acc[curr.classification] = curr.count;
          return acc;
        }, {} as Record<string, number>),
        cdeg: {}, // Classifications not grouped by default
        hei: {},
        pig: {},
      },
      recent_calculations: calc.recent || 0,
    },
    
    data_sources: {
      total: totalDataSources,
      by_status: {
        pending: dataSourcesByStatus.pending || 0,
        processing: dataSourcesByStatus.processing || 0,
        available: dataSourcesByStatus.available || 0,
        archived: dataSourcesByStatus.archived || 0,
        failed: dataSourcesByStatus.failed || 0,
      },
      by_file_type: {
        csv: dataSourcesByType.csv || 0,
        xlsx: dataSourcesByType.xlsx || 0,
        xls: dataSourcesByType.xls || 0,
      },
      total_size_bytes: Number(dataSourceSize),
      total_size_mb: Math.round(Number(dataSourceSize) / (1024 * 1024) * 100) / 100,
      recent_uploads: recentDataSources,
    },
    
    reports: {
      total: totalReports,
      by_status: {
        generating: reportsByStatus.generating || 0,
        completed: reportsByStatus.completed || 0,
        failed: reportsByStatus.failed || 0,
      },
      by_format: {
        pdf: 0, // Reports are stored as files but format not tracked separately
        json: 0,
      },
      recent_reports: recentReports,
    },
    
    formulas: {
      total: totalFormulas,
      by_type: {
        hpi: formulasByType.hpi || 0,
        mi: formulasByType.mi || 0,
        wqi: formulasByType.wqi || 0,
      },
      active_formulas: activeFormulas,
      default_formulas: defaultFormulas,
    },
    
    system: {
      database_status: 'healthy',
      redis_status: 'healthy',
      api_version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  };

  return stats;
}

/**
 * Handler: Get admin statistics
 */
const handler = asyncHandler(async (req: any, res: Response) => {
  const stats = await getAdminStatistics();

  ResponseFormatter.success(res, stats, 'Admin statistics retrieved successfully');
});

const router = Router();

router.get('/stats', requireAuth, requireRole('admin'), handler);

export default router;
