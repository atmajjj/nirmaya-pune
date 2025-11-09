import bcrypt from 'bcrypt';
import HttpException from '../../../utils/httpException';
import { findInvitationByToken, updateInvitation } from '../admin-invite.queries';
import { findUserByEmail, createUser } from '../../user/user.queries';
import { IInvitation } from '../admin-invite.interface';

interface AcceptInvitationData {
  token: string;
  password: string;
}

class AcceptInvitationService {
  /**
   * Accept an invitation and create user account
   */
  public async acceptInvitation(acceptData: AcceptInvitationData): Promise<IInvitation> {
    try {
      // Find invitation by token
      const invitation = await findInvitationByToken(acceptData.token);
      if (!invitation) {
        throw new HttpException(404, 'Invalid or expired invitation token');
      }

      // Check if invitation is still valid
      if (invitation.status !== 'pending') {
        throw new HttpException(400, `Invitation has already been ${invitation.status}`);
      }

      // Check if invitation has expired
      if (new Date() > invitation.expires_at) {
        // Update invitation status to expired
        await updateInvitation(invitation.invitation_id, { status: 'expired' });
        throw new HttpException(400, 'Invitation has expired');
      }

      // Check if user already exists
      const existingUser = await findUserByEmail(invitation.email);
      if (existingUser) {
        throw new HttpException(409, 'User account already exists for this email');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(acceptData.password, 12);

      // Create user account
      const newUser = await createUser({
        name: `${invitation.first_name} ${invitation.last_name}`,
        email: invitation.email,
        password: hashedPassword,
        role: invitation.assigned_role || 'scientist',
        created_by: invitation.invited_by,
      });

      // Update invitation status to accepted
      const updatedInvitation = await updateInvitation(invitation.invitation_id, {
        status: 'accepted',
        accepted_at: new Date(),
      });

      return updatedInvitation as IInvitation;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error accepting invitation: ${error.message}`);
    }
  }
}

export default AcceptInvitationService;