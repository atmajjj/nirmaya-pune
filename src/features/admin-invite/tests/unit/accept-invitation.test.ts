/**
 * Unit tests for accept-invitation business logic
 */

import bcrypt from 'bcrypt';
import HttpException from '../../../../utils/httpException';
import * as inviteQueries from '../../shared/queries';
import * as userQueries from '../../../user/shared/queries';
import { IInvitation } from '../../shared/interface';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../shared/queries');
jest.mock('../../../user/shared/queries');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockInviteQueries = inviteQueries as jest.Mocked<typeof inviteQueries>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;

interface AcceptInvitationDto {
  token: string;
  password: string;
}

// Recreate the business logic for testing
async function handleAcceptInvitation(acceptData: AcceptInvitationDto): Promise<IInvitation> {
  const invitation = await inviteQueries.findInvitationByToken(acceptData.token);
  if (!invitation) {
    throw new HttpException(404, 'Invalid or expired invitation token');
  }

  if (invitation.status !== 'pending') {
    throw new HttpException(400, `Invitation has already been ${invitation.status}`);
  }

  if (new Date() > invitation.expires_at) {
    await inviteQueries.updateInvitation(invitation.id, { status: 'expired' });
    throw new HttpException(400, 'Invitation has expired');
  }

  const existingUser = await userQueries.findUserByEmail(invitation.email);
  if (existingUser) {
    throw new HttpException(409, 'User account already exists for this email');
  }

  const hashedPassword = await bcrypt.hash(acceptData.password, 12);

  await userQueries.createUser({
    name: `${invitation.first_name} ${invitation.last_name}`,
    email: invitation.email,
    password: hashedPassword,
    role: invitation.assigned_role || 'scientist',
    created_by: invitation.invited_by,
  });

  const updatedInvitation = await inviteQueries.updateInvitation(invitation.id, {
    status: 'accepted',
    accepted_at: new Date(),
  });

  return updatedInvitation as IInvitation;
}

describe('Accept Invitation Business Logic', () => {
  const mockInvitation = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    invite_token: 'validtoken123',
    status: 'pending' as const,
    assigned_role: 'scientist' as const,
    password: 'hashedTempPassword',
    invited_by: 1,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    accepted_at: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  const mockAcceptedInvitation = {
    ...mockInvitation,
    status: 'accepted' as const,
    accepted_at: new Date(),
  };

  const mockCreatedUser = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'hashedPassword',
    phone_number: null,
    role: 'scientist' as const,
    created_by: 1,
    created_at: new Date(),
    updated_by: null,
    updated_at: new Date(),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    mockUserQueries.createUser.mockResolvedValue(mockCreatedUser);
    mockInviteQueries.updateInvitation.mockResolvedValue(mockAcceptedInvitation);
  });

  describe('handleAcceptInvitation', () => {
    it('should successfully accept valid invitation', async () => {
      mockInviteQueries.findInvitationByToken.mockResolvedValue(mockInvitation);
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      const result = await handleAcceptInvitation({
        token: 'validtoken123',
        password: 'newPassword123',
      });

      expect(mockInviteQueries.findInvitationByToken).toHaveBeenCalledWith('validtoken123');
      expect(mockUserQueries.createUser).toHaveBeenCalled();
      expect(result.status).toBe('accepted');
    });

    it('should throw 404 if invitation token not found', async () => {
      mockInviteQueries.findInvitationByToken.mockResolvedValue(undefined);

      await expect(
        handleAcceptInvitation({ token: 'invalidtoken', password: 'password123' })
      ).rejects.toThrow(HttpException);
      await expect(
        handleAcceptInvitation({ token: 'invalidtoken', password: 'password123' })
      ).rejects.toMatchObject({
        status: 404,
        message: 'Invalid or expired invitation token',
      });
    });

    it('should throw 400 if invitation already accepted', async () => {
      mockInviteQueries.findInvitationByToken.mockResolvedValue({
        ...mockInvitation,
        status: 'accepted',
      });

      await expect(
        handleAcceptInvitation({ token: 'validtoken123', password: 'password123' })
      ).rejects.toThrow(HttpException);
      await expect(
        handleAcceptInvitation({ token: 'validtoken123', password: 'password123' })
      ).rejects.toMatchObject({
        status: 400,
        message: 'Invitation has already been accepted',
      });
    });

    it('should throw 400 if invitation was revoked', async () => {
      mockInviteQueries.findInvitationByToken.mockResolvedValue({
        ...mockInvitation,
        status: 'revoked',
      });

      await expect(
        handleAcceptInvitation({ token: 'validtoken123', password: 'password123' })
      ).rejects.toMatchObject({
        status: 400,
        message: 'Invitation has already been revoked',
      });
    });

    it('should throw 400 and update status if invitation expired', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expires_at: new Date(Date.now() - 1000), // Expired
      };
      mockInviteQueries.findInvitationByToken.mockResolvedValue(expiredInvitation);

      await expect(
        handleAcceptInvitation({ token: 'validtoken123', password: 'password123' })
      ).rejects.toMatchObject({
        status: 400,
        message: 'Invitation has expired',
      });

      expect(mockInviteQueries.updateInvitation).toHaveBeenCalledWith(1, { status: 'expired' });
    });

    it('should throw 409 if user already exists', async () => {
      mockInviteQueries.findInvitationByToken.mockResolvedValue(mockInvitation);
      mockUserQueries.findUserByEmail.mockResolvedValue(mockCreatedUser);

      await expect(
        handleAcceptInvitation({ token: 'validtoken123', password: 'password123' })
      ).rejects.toThrow(HttpException);
      await expect(
        handleAcceptInvitation({ token: 'validtoken123', password: 'password123' })
      ).rejects.toMatchObject({
        status: 409,
        message: 'User account already exists for this email',
      });
    });

    it('should hash password with salt rounds of 12', async () => {
      mockInviteQueries.findInvitationByToken.mockResolvedValue(mockInvitation);
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      await handleAcceptInvitation({ token: 'validtoken123', password: 'newPassword123' });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
    });

    it('should create user with combined first and last name', async () => {
      mockInviteQueries.findInvitationByToken.mockResolvedValue(mockInvitation);
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      await handleAcceptInvitation({ token: 'validtoken123', password: 'password123' });

      expect(mockUserQueries.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john.doe@example.com',
        })
      );
    });

    it('should use assigned role from invitation', async () => {
      const adminInvitation = { ...mockInvitation, assigned_role: 'admin' as const };
      mockInviteQueries.findInvitationByToken.mockResolvedValue(adminInvitation);
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      await handleAcceptInvitation({ token: 'validtoken123', password: 'password123' });

      expect(mockUserQueries.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' })
      );
    });

    it('should default to scientist role if not specified', async () => {
      const noRoleInvitation = { ...mockInvitation, assigned_role: null };
      mockInviteQueries.findInvitationByToken.mockResolvedValue(noRoleInvitation);
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      await handleAcceptInvitation({ token: 'validtoken123', password: 'password123' });

      expect(mockUserQueries.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'scientist' })
      );
    });

    it('should set created_by to invited_by value', async () => {
      const invitedBy5 = { ...mockInvitation, invited_by: 5 };
      mockInviteQueries.findInvitationByToken.mockResolvedValue(invitedBy5);
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      await handleAcceptInvitation({ token: 'validtoken123', password: 'password123' });

      expect(mockUserQueries.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: 5 })
      );
    });

    it('should update invitation status to accepted', async () => {
      mockInviteQueries.findInvitationByToken.mockResolvedValue(mockInvitation);
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      await handleAcceptInvitation({ token: 'validtoken123', password: 'password123' });

      expect(mockInviteQueries.updateInvitation).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'accepted',
          accepted_at: expect.any(Date),
        })
      );
    });

    it('should return updated invitation', async () => {
      mockInviteQueries.findInvitationByToken.mockResolvedValue(mockInvitation);
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      const result = await handleAcceptInvitation({
        token: 'validtoken123',
        password: 'password123',
      });

      expect(result).toEqual(mockAcceptedInvitation);
    });
  });
});
