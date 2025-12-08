import { Router, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { getAllResearcherApplications } from '../shared/queries';
import { applicationStatuses, ApplicationStatus } from '../shared/schema';

async function businessLogic(status?: ApplicationStatus) {
  const applications = await getAllResearcherApplications(status);
  return applications;
}

const handler = asyncHandler(async (req, res: Response) => {
  const { status } = req.query;
  
  // Validate status if provided
  if (status && !applicationStatuses.includes(status as ApplicationStatus)) {
    throw new HttpException(400, `Invalid status. Must be one of: ${applicationStatuses.join(', ')}`);
  }
  
  const result = await businessLogic(status as ApplicationStatus | undefined);
  
  ResponseFormatter.success(
    res,
    result,
    `Retrieved ${result.length} researcher application(s)`
  );
});

const router = Router();

// Admin only endpoint
router.get(
  '/applications',
  requireAuth,
  requireRole('admin'),
  handler
);

export default router;
