/**
 * POST /api/v1/admin/invitations
 * Create invitation with auto-generated secure password (Admin only)
 * User will receive email with invite link, credentials shown on verification
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
import { logger } from '../../../utils/logger';
import { encrypt, generateSecurePassword } from '../../../utils/encryption';
import { userRoles } from '../../user/shared/schema';
import { createInvitation, findInvitationByEmail } from '../shared/queries';
import { findUserByEmail } from '../../user/shared/queries';
import { ICreateInvitation, IInvitation } from '../shared/interface';

/** Standard bcrypt cost factor */
const BCRYPT_ROUNDS = 12;

const schema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  email: z.string().email('Invalid email format'),
  assigned_role: z.enum(userRoles),
});

type CreateInvitationDto = z.infer<typeof schema>;

/** Invitation expiry in hours */
const INVITATION_EXPIRY_HOURS = 24;

async function handleCreateInvitation(
  invitationData: ICreateInvitation & { first_name: string; last_name: string },
  invitedBy: number
): Promise<IInvitation> {
  // Check if user already exists
  const existingUser = await findUserByEmail(invitationData.email);
  if (existingUser) {
    throw new HttpException(409, 'A user with this email already exists');
  }

  // Check for existing pending invitation
  const existingInvitation = await findInvitationByEmail(invitationData.email);
  if (existingInvitation && existingInvitation.status === 'pending') {
    throw new HttpException(409, 'An active invitation already exists for this email');
  }

  // Generate secure random token (64 chars hex)
  const inviteToken = randomBytes(32).toString('hex');
  
  // Generate secure temporary password
  const tempPassword = generateSecurePassword(16);
  
  // Encrypt temp password (for retrieval during verification)
  const tempPasswordEncrypted = encrypt(tempPassword);
  
  // Hash password (for actual login verification)
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);

  const newInvitation = await createInvitation({
    first_name: invitationData.first_name,
    last_name: invitationData.last_name,
    email: invitationData.email,
    assigned_role: invitationData.assigned_role,
    invite_token: inviteToken,
    temp_password_encrypted: tempPasswordEncrypted,
    password_hash: passwordHash,
    invited_by: invitedBy,
    expires_at: expiresAt,
    status: 'pending',
  });

  // Send invitation email (without password)
  try {
    const frontendUrl = config.FRONTEND_URL.replace(/\/+$/, '');
    const inviteLink = `${frontendUrl}/accept-invitation/${inviteToken}`;
    
    await sendInvitationEmail({
      to: invitationData.email,
      firstName: invitationData.first_name,
      lastName: invitationData.last_name,
      assignedRole: invitationData.assigned_role,
      inviteLink,
      expiresIn: `${INVITATION_EXPIRY_HOURS} hours`,
    });
  } catch (emailError) {
    logger.error('Failed to send invitation email', { 
      email: invitationData.email,
      error: emailError 
    });
  }

  // Exclude sensitive fields from response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    temp_password_encrypted: _enc, 
    password_hash: _hash, 
    invite_token: _token, 
    ...invitationResponse 
  } = newInvitation;
  
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
