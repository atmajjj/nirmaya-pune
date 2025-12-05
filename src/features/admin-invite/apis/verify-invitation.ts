/**
 * POST /api/admin/invitations/verify
 * Verify invitation token and return credentials for auto-login (Public - no auth)
 * Frontend calls this to get email + password for pre-filling login form
 * 
 * SECURITY: Uses POST instead of GET to prevent:
 * - Credentials appearing in browser history
 * - Credentials being cached by proxies/CDNs
 * - Credentials appearing in server access logs
 */

import { Router, Request, Response } from 'express';
import { sql, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { logger } from '../../../utils/logger';
import { decrypt } from '../../../utils/encryption';
import { findInvitationByToken, updateInvitation } from '../shared/queries';
import { IInvitationVerifyResponse } from '../shared/interface';
// import { invitationRateLimit } from '../../../middlewares/rate-limit.middleware'; // DISABLED
import { db } from '../../../database/drizzle';
import { invitations } from '../shared/schema';

// Validation schema for POST body
const verifySchema = z.object({
  token: z.string().length(64, 'Invalid invitation token format').regex(/^[a-f0-9]+$/i, 'Invalid token format'),
});

// Max verification attempts before lockout (brute force protection)
const MAX_VERIFY_ATTEMPTS = 5;

async function handleVerifyInvitation(token: string): Promise<IInvitationVerifyResponse> {
  const invitation = await findInvitationByToken(token);
  
  if (!invitation) {
    logger.warn('Invitation not found for token', { tokenPrefix: token.substring(0, 8) });
    throw new HttpException(404, 'Invalid or expired invitation token');
  }

  // Check verification attempts (brute force protection)
  if (invitation.verify_attempts >= MAX_VERIFY_ATTEMPTS) {
    logger.warn('Max verification attempts exceeded', { 
      invitationId: invitation.id, 
      attempts: invitation.verify_attempts 
    });
    throw new HttpException(429, 'Too many verification attempts. Please contact administrator.');
  }

  // Increment verification attempts (do this early to count even failed attempts)
  await db
    .update(invitations)
    .set({ verify_attempts: sql`${invitations.verify_attempts} + 1` })
    .where(eq(invitations.id, invitation.id));

  if (invitation.status !== 'pending') {
    throw new HttpException(400, `Invitation has already been ${invitation.status}`);
  }

  if (new Date() > invitation.expires_at) {
    await updateInvitation(invitation.id, { status: 'expired' });
    throw new HttpException(400, 'Invitation has expired');
  }

  if (!invitation.temp_password_encrypted) {
    logger.error('Invitation missing encrypted password', { invitationId: invitation.id });
    throw new HttpException(500, 'Invitation data is corrupted');
  }

  // Decrypt the temporary password
  let plainPassword: string;
  try {
    plainPassword = decrypt(invitation.temp_password_encrypted);
  } catch (error) {
    logger.error('Failed to decrypt invitation password', { 
      invitationId: invitation.id,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new HttpException(500, 'Failed to retrieve credentials');
  }

  logger.info('Invitation verified successfully', { 
    email: invitation.email,
    invitationId: invitation.id 
  });

  return {
    email: invitation.email,
    password: plainPassword,
    first_name: invitation.first_name,
    last_name: invitation.last_name,
    assigned_role: invitation.assigned_role!,
  };
}

const handler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate token from POST body (not URL params - security)
  const { token } = verifySchema.parse(req.body);
  const credentials = await handleVerifyInvitation(token);

  ResponseFormatter.success(
    res, 
    credentials, 
    'Invitation verified. Use these credentials to log in.'
  );
});

const router = Router();
// POST method + rate limiting for security
router.post('/verify', handler); // invitationRateLimit DISABLED

export default router;
