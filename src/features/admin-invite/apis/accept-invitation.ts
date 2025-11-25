/**
 * POST /api/v1/admin/invitations/accept
 * Accept invitation and create user account (Public - no auth)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findInvitationByToken, updateInvitation } from '../shared/queries';
import { findUserByEmail, createUser } from '../../user/shared/queries';
import { IInvitation } from '../shared/interface';

const schema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

type AcceptInvitationDto = z.infer<typeof schema>;

async function handleAcceptInvitation(acceptData: AcceptInvitationDto): Promise<IInvitation> {
  const invitation = await findInvitationByToken(acceptData.token);
  if (!invitation) {
    throw new HttpException(404, 'Invalid or expired invitation token');
  }

  if (invitation.status !== 'pending') {
    throw new HttpException(400, `Invitation has already been ${invitation.status}`);
  }

  if (new Date() > invitation.expires_at) {
    await updateInvitation(invitation.id, { status: 'expired' });
    throw new HttpException(400, 'Invitation has expired');
  }

  const existingUser = await findUserByEmail(invitation.email);
  if (existingUser) {
    throw new HttpException(409, 'User account already exists for this email');
  }

  const hashedPassword = await bcrypt.hash(acceptData.password, 12);

  await createUser({
    name: `${invitation.first_name} ${invitation.last_name}`,
    email: invitation.email,
    password: hashedPassword,
    role: invitation.assigned_role || 'scientist',
    created_by: invitation.invited_by,
  });

  const updatedInvitation = await updateInvitation(invitation.id, {
    status: 'accepted',
    accepted_at: new Date(),
  });

  return updatedInvitation as IInvitation;
}

const handler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const acceptData: AcceptInvitationDto = req.body;
  const invitation = await handleAcceptInvitation(acceptData);

  ResponseFormatter.success(
    res,
    invitation,
    'Invitation accepted successfully. You can now log in with your new password.'
  );
});

const router = Router();
router.post('/accept', validationMiddleware(schema), handler);

export default router;
