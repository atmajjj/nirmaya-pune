/**
 * POST /api/nirmaya-engine/preview
 * Preview CSV file and detect available calculations
 *
 * Requires: auth + role (admin, scientist, policymaker)
 *
 * Input: CSV file with water quality data
 * Output: Detected columns and available index calculations
 */

import { Router, Response, Request } from 'express';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { uploadCsvMiddleware } from '../../../middlewares/upload.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { CSVPreviewService, CSVPreviewResult } from '../services/csv-preview.service';

/**
 * Preview CSV file and return detected columns + available calculations
 */
async function previewCSV(
  file: Express.Multer.File
): Promise<CSVPreviewResult> {
  return CSVPreviewService.previewCSV(file.buffer, file.originalname);
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    throw new HttpException(400, 'No file uploaded. Please upload a CSV file.');
  }

  // Preview CSV (validation already done by uploadCsvMiddleware)
  const result = await previewCSV(file);

  // Determine response message
  const availableIndices: string[] = [];
  if (result.available_calculations.hpi.available) availableIndices.push('HPI');
  if (result.available_calculations.mi.available) availableIndices.push('MI');
  if (result.available_calculations.wqi.available) availableIndices.push('WQI');

  let message: string;
  if (availableIndices.length === 0) {
    message = 'No indices can be calculated. Please check your CSV columns.';
  } else if (availableIndices.length === 3) {
    message = 'All indices (HPI, MI, WQI) can be calculated from this file.';
  } else {
    message = `Available calculations: ${availableIndices.join(', ')}`;
  }

  ResponseFormatter.success(res, result, message);
});

const router = Router();

// POST /api/hmpi-engine/preview
// Requires auth and role (admin, scientist, policymaker can preview)
router.post(
  '/preview',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker']),
  uploadCsvMiddleware,
  handler
);

export default router;
