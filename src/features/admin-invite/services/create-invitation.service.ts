import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import HttpException from '../../../utils/httpException';
import { createInvitation, findInvitationByEmail } from '../admin-invite.queries';
import { sendInvitationEmail } from '../../../utils/sendInvitationEmail';
import { ICreateInvitation, IInvitation } from '../admin-invite.interface';
import { validateEnv } from '../../../utils/validateEnv';

const env = validateEnv();

class CreateInvitationService {
  /**
   * Create a new invitation and send email
   */
  public async createInvitation(
    invitationData: ICreateInvitation,
    invitedBy: number
  ): Promise<IInvitation> {
    try {
      // Check if invitation already exists for this email
      const existingInvitation = await findInvitationByEmail(invitationData.email);
      if (existingInvitation && existingInvitation.status === 'pending') {
        throw new HttpException(409, 'An active invitation already exists for this email');
      }

      // Generate secure token and password
      const inviteToken = randomBytes(32).toString('hex');
      const tempPassword = randomBytes(12).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Set expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create invitation record
      const newInvitation = await createInvitation({
        ...invitationData,
        invite_token: inviteToken,
        password: hashedPassword,
        invited_by: invitedBy,
        expires_at: expiresAt,
        status: 'pending',
      });

      // Send invitation email
      try {
        const inviteLink = `${env.ALLOWED_ORIGINS}/accept-invitation?token=${inviteToken}`;

        await sendInvitationEmail({
          to: invitationData.email,
          firstName: invitationData.first_name,
          email: invitationData.email,
          password: tempPassword,
          inviteLink,
        });
      } catch (emailError) {
        // Log email error but don't fail the invitation creation
        console.error('Failed to send invitation email:', emailError);
        // You might want to add email sending status to the invitation record
      }

      // Remove password from response
      const { password, ...invitationResponse } = newInvitation;

      return invitationResponse as IInvitation;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error creating invitation: ${error.message}`);
    }
  }
}

export default CreateInvitationService;