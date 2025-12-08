import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { getApplicationById, rejectApplication } from '../shared/queries';

const schema = z.object({
  application_id: z.string().uuid('Invalid application ID'),
  rejection_reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500, 'Rejection reason too long').optional(),
});

async function businessLogic(applicationId: string, reviewedBy: number, rejectionReason?: string) {
  // Get the application
  const application = await getApplicationById(applicationId);
  if (!application) {
    throw new HttpException(404, 'Application not found');
  }

  // Check if already processed
  if (application.status !== 'pending') {
    throw new HttpException(400, `Application has already been ${application.status}`);
  }

  // Update application status to rejected
  const updatedApplication = await rejectApplication(applicationId, reviewedBy, rejectionReason);

  return updatedApplication;
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { application_id, rejection_reason } = req.body;
  const reviewedBy = getUserId(req);

  const result = await businessLogic(application_id, reviewedBy, rejection_reason);

  ResponseFormatter.success(
    res,
    {
      id: result.id,
      email: result.email,
      status: result.status,
      rejection_reason: result.rejection_reason,
      reviewed_at: result.reviewed_at,
    },
    'Application rejected successfully.'
  );
});

const router = Router();

// Admin only endpoint
router.post(
  '/applications/reject',
  requireAuth,
  requireRole('admin'),
  validationMiddleware(schema),
  handler
);

export default router;
