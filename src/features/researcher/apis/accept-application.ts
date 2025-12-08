import { Router, Response } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { sendInvitationEmail } from '../../../utils/sendInvitationEmail';
import { config } from '../../../utils/validateEnv';
import { logger } from '../../../utils/logger';
import { encrypt, generateSecurePassword } from '../../../utils/encryption';
import { hashPassword } from '../../../utils/password';
import { getApplicationById, acceptApplication } from '../shared/queries';
import { findUserByEmail } from '../../user/shared/queries';
import { createInvitation } from '../../admin-invite/shared/queries';

const schema = z.object({
  application_id: z.string().uuid('Invalid application ID'),
});

/** Invitation expiry in hours */
const INVITATION_EXPIRY_HOURS = 24;

async function businessLogic(applicationId: string, reviewedBy: number) {
  // Get the application
  const application = await getApplicationById(applicationId);
  if (!application) {
    throw new HttpException(404, 'Application not found');
  }

  // Check if already processed
  if (application.status !== 'pending') {
    throw new HttpException(400, `Application has already been ${application.status}`);
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(application.email);
  if (existingUser) {
    throw new HttpException(409, 'A user with this email already exists in the system');
  }

  // Generate invitation token and credentials (similar to admin-invite flow)
  const inviteToken = randomBytes(32).toString('hex');
  const tempPassword = generateSecurePassword(16);
  const tempPasswordEncrypted = encrypt(tempPassword);
  const passwordHash = await hashPassword(tempPassword);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);

  // Split full name into first and last name (basic split)
  const nameParts = application.full_name.trim().split(' ');
  const firstName = nameParts[0] || application.full_name;
  const lastName = nameParts.slice(1).join(' ') || '';

  // Create invitation record
  await createInvitation({
    first_name: firstName,
    last_name: lastName,
    email: application.email,
    assigned_role: 'researcher',
    invite_token: inviteToken,
    temp_password_encrypted: tempPasswordEncrypted,
    password_hash: passwordHash,
    invited_by: reviewedBy,
    expires_at: expiresAt,
    status: 'pending',
  });

  // Update application status
  const updatedApplication = await acceptApplication(applicationId, reviewedBy, inviteToken);

  // Send invitation email
  try {
    const frontendUrl = config.FRONTEND_URL.replace(/\/+$/, '');
    const inviteLink = `${frontendUrl}/accept-invitation/${inviteToken}`;

    await sendInvitationEmail({
      to: application.email,
      firstName: firstName,
      lastName: lastName,
      assignedRole: 'researcher',
      inviteLink,
      expiresIn: `${INVITATION_EXPIRY_HOURS} hours`,
    });

    logger.info('Researcher invitation email sent successfully', {
      email: application.email,
      applicationId,
    });
  } catch (emailError) {
    logger.error('Failed to send researcher invitation email', {
      email: application.email,
      applicationId,
      error: emailError,
    });
    throw new HttpException(500, 'Application accepted but failed to send invitation email. Please retry or contact the researcher manually.');
  }

  return updatedApplication;
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { application_id } = req.body;
  const reviewedBy = getUserId(req);

  const result = await businessLogic(application_id, reviewedBy);

  ResponseFormatter.success(
    res,
    {
      id: result.id,
      email: result.email,
      status: result.status,
      reviewed_at: result.reviewed_at,
    },
    'Application accepted successfully! Invitation email sent to the researcher.'
  );
});

const router = Router();

// Admin only endpoint
router.post(
  '/applications/accept',
  requireAuth,
  requireRole('admin'),
  validationMiddleware(schema),
  handler
);

export default router;
