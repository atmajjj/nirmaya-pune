/**
 * GET /api/nirmaya-engine/uploads/:upload_id/download
 * Download calculation results as CSV
 * 
 * Requires: auth + role (admin, scientist, policymaker)
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findCalculationsByUploadId } from '../shared/queries';
import { convertCalculation, WaterQualityCalculation } from '../shared/interface';

// Param schema
const paramSchema = z.object({
  upload_id: z.coerce.number().int().positive(),
});

/**
 * Generate CSV content from calculations
 */
function generateCSV(calculations: WaterQualityCalculation[]): string {
  if (calculations.length === 0) {
    return '';
  }

  // CSV headers
  const headers = [
    'Station ID',
    'Latitude',
    'Longitude',
    'State',
    'City',
    'HPI',
    'HPI Classification',
    'MI',
    'MI Classification',
    'MI Class',
    'WQI',
    'WQI Classification',
    'Metals Analyzed',
    'WQI Parameters Analyzed',
    'Calculated At',
  ];

  // CSV rows
  const rows = calculations.map((calc) => [
    escapeCSV(calc.station_id),
    calc.latitude?.toString() || '',
    calc.longitude?.toString() || '',
    escapeCSV(calc.state || ''),
    escapeCSV(calc.city || ''),
    calc.hpi?.toFixed(2) || '',
    escapeCSV(calc.hpi_classification || ''),
    calc.mi?.toFixed(4) || '',
    escapeCSV(calc.mi_classification || ''),
    escapeCSV(calc.mi_class || ''),
    calc.wqi?.toFixed(2) || '',
    escapeCSV(calc.wqi_classification || ''),
    escapeCSV(calc.metals_analyzed?.join('; ') || ''),
    escapeCSV(calc.wqi_params_analyzed?.join('; ') || ''),
    calc.created_at,
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Escape CSV value (wrap in quotes if contains comma, quote, or newline)
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  // Parse and validate parameters
  const { upload_id } = paramSchema.parse(req.params);

  // Find calculations for this upload
  const calculations = await findCalculationsByUploadId(upload_id);

  if (calculations.length === 0) {
    throw new HttpException(404, 'No calculations found for this upload');
  }

  // Convert to API format
  const data = calculations.map(convertCalculation);

  // Generate CSV
  const csvContent = generateCSV(data);

  // Set headers for CSV download
  const filename = `water_quality_results_upload_${upload_id}_${new Date().toISOString().split('T')[0]}.csv`;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', Buffer.byteLength(csvContent));

  res.send(csvContent);
});

const router = Router();

// GET /api/nirmaya-engine/uploads/:upload_id/download
router.get(
  '/uploads/:upload_id/download',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker']),
  handler
);

export default router;
