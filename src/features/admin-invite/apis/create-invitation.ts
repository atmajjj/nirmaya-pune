/**
 * POST /api/v1/admin/invitations
 * Create invitation and send email with credentials (Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { sendInvitationEmail } from '../../../utils/sendInvitationEmail';
import { config } from '../../../utils/validateEnv';
import { userRoles } from '../../user/shared/schema';
import { createInvitation, findInvitationByEmail } from '../shared/queries';
import { ICreateInvitation, IInvitation } from '../shared/interface';

const schema = z.object({
  first_name: z.string().min(1, 'First name is required').max(255, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(255, 'Last name too long'),
  email: z.string().email('Invalid email format'),
  assigned_role: z.enum(userRoles),
});

type CreateInvitationDto = z.infer<typeof schema>;

async function handleCreateInvitation(
  invitationData: ICreateInvitation,
  invitedBy: number
): Promise<IInvitation> {
  const existingInvitation = await findInvitationByEmail(invitationData.email);
  if (existingInvitation && existingInvitation.status === 'pending') {
    throw new HttpException(409, 'An active invitation already exists for this email');
  }

  const inviteToken = randomBytes(32).toString('hex');
  const tempPassword = randomBytes(12).toString('hex');
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const newInvitation = await createInvitation({
    ...invitationData,
    invite_token: inviteToken,
    password: hashedPassword,
    invited_by: invitedBy,
    expires_at: expiresAt,
    status: 'pending',
  });

  try {
    const inviteLink = `${config.ALLOWED_ORIGINS}/accept-invitation?token=${inviteToken}`;
    await sendInvitationEmail({
      to: invitationData.email,
      firstName: invitationData.first_name,
      email: invitationData.email,
      password: tempPassword,
      inviteLink,
    });
  } catch (emailError) {
    const { logger } = await import('../../../utils/logger');
    logger.error('Failed to send invitation email', { error: emailError });
  }

  // Exclude password from response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...invitationResponse } = newInvitation;
  return invitationResponse as IInvitation;
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response): Promise<void> => {
  const invitationData: CreateInvitationDto = req.body;
  const invitedBy = getUserId(req);

  const invitation = await handleCreateInvitation(invitationData, invitedBy);

  ResponseFormatter.success(res, invitation, 'Invitation sent successfully');
});

const router = Router();
router.post('/', requireAuth, requireRole('admin'), validationMiddleware(schema), handler);

export default router;
