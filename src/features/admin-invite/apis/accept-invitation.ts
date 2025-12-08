/**
 * POST /api/admin/invitations/accept
 * Accept invitation - creates user account and returns auth token (Public - no auth)
 * User manually enters credentials received via email along with the token from URL
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import validationMiddleware from '../../../middlewares/validation.middleware';
// import { invitationRateLimit } from '../../../middlewares/rate-limit.middleware'; // DISABLED
import { verifyPassword } from '../../../utils/password';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { logger } from '../../../utils/logger';
import { generateToken } from '../../../utils/jwt';
import { findInvitationByToken, updateInvitation } from '../shared/queries';
import { findUserByEmail, createUser } from '../../user/shared/queries';
import { IAuthUserWithToken } from '../../../interfaces/request.interface';

const schema = z.object({
  token: z.string().length(64, 'Invalid invitation token'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type AcceptInvitationDto = z.infer<typeof schema>;

async function handleAcceptInvitation(acceptData: AcceptInvitationDto): Promise<IAuthUserWithToken> {
  const invitation = await findInvitationByToken(acceptData.token);
  
  if (!invitation) {
    logger.warn('Invalid invitation token used', { 
      tokenPrefix: acceptData.token.substring(0, 8) 
    });
    throw new HttpException(404, 'Invalid or expired invitation token');
  }

  if (invitation.status !== 'pending') {
    throw new HttpException(400, `Invitation has already been ${invitation.status}`);
  }

  if (new Date() > invitation.expires_at) {
    await updateInvitation(invitation.id, { status: 'expired' });
    throw new HttpException(400, 'Invitation has expired');
  }

  // Verify email matches invitation
  if (invitation.email.toLowerCase() !== acceptData.email.toLowerCase()) {
    throw new HttpException(400, 'Email does not match invitation');
  }

  // Verify password against stored hash
  if (!invitation.password_hash) {
    throw new HttpException(500, 'Invitation data is corrupted');
  }

  const isPasswordValid = await verifyPassword(acceptData.password, invitation.password_hash);
  if (!isPasswordValid) {
    throw new HttpException(401, 'Invalid credentials');
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(invitation.email);
  if (existingUser) {
    throw new HttpException(409, 'User account already exists for this email');
  }

  // Create the user account with the same hashed password
  const newUser = await createUser({
    name: `${invitation.first_name} ${invitation.last_name}`,
    email: invitation.email,
    password: invitation.password_hash, // Use the same hash
    role: invitation.assigned_role || 'scientist',
    created_by: invitation.invited_by,
  });

  // Mark invitation as accepted
  await updateInvitation(invitation.id, {
    status: 'accepted',
    accepted_at: new Date(),
    // Clear encrypted password for security
    temp_password_encrypted: null,
  });

  // Generate auth token for immediate login
  const token = generateToken(
    {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
    '24h'
  );

  logger.info('Invitation accepted, user created', { 
    email: invitation.email,
    userId: newUser.id,
    invitationId: invitation.id 
  });

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
    token,
  };
}

const handler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const acceptData: AcceptInvitationDto = req.body;
  const user = await handleAcceptInvitation(acceptData);

  ResponseFormatter.success(
    res,
    user,
    'Account created successfully. Welcome!'
  );
});

const router = Router();
router.post('/accept', validationMiddleware(schema), handler); // invitationRateLimit DISABLED

export default router;
