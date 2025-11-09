import AcceptInvitationService from '../../services/accept-invitation.service';
import { findInvitationByToken, updateInvitation } from '../../admin-invite.queries';
import { findUserByEmail, createUser } from '../../../user/user.queries';
import HttpException from '../../../../utils/httpException';
import bcrypt from 'bcrypt';

jest.mock('../../admin-invite.queries');
jest.mock('../../../user/user.queries');
jest.mock('bcrypt');

describe('AcceptInvitationService', () => {
  let acceptInvitationService: AcceptInvitationService;
  const mockFindInvitationByToken = findInvitationByToken as jest.MockedFunction<
    typeof findInvitationByToken
  >;
  const mockUpdateInvitation = updateInvitation as jest.MockedFunction<typeof updateInvitation>;
  const mockFindUserByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>;
  const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>;
  const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

  beforeEach(() => {
    acceptInvitationService = new AcceptInvitationService();
    jest.clearAllMocks();
  });

  describe('acceptInvitation', () => {
    const validAcceptData = {
      token: 'valid-token',
      password: 'NewPassword123!',
    };

    const mockInvitation = {
      invitation_id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      invite_token: 'valid-token',
      status: 'pending' as const,
      assigned_role: 'scientist' as const,
      password: '$2b$12$hashedtemppassword',
      invited_by: 1,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      accepted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    };

    const mockNewUser = {
      id: 2,
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: '$2b$12$newsecurepassword',
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

    const mockUpdatedInvitation = {
      ...mockInvitation,
      status: 'accepted' as const,
      accepted_at: new Date(),
    };

    it('should successfully accept invitation and create user', async () => {
      mockFindInvitationByToken.mockResolvedValue(mockInvitation);
      mockFindUserByEmail.mockResolvedValue(undefined);
      mockBcryptHash.mockResolvedValue('$2b$12$newsecurepassword' as never);
      mockCreateUser.mockResolvedValue(mockNewUser);
      mockUpdateInvitation.mockResolvedValue(mockUpdatedInvitation);

      const result = await acceptInvitationService.acceptInvitation(validAcceptData);

      expect(result.status).toBe('accepted');
      expect(mockFindInvitationByToken).toHaveBeenCalledWith(validAcceptData.token);
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'scientist',
          created_by: 1,
        })
      );
      expect(mockUpdateInvitation).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'accepted',
        })
      );
    });

    it('should throw 404 error if token is invalid', async () => {
      mockFindInvitationByToken.mockResolvedValue(undefined);

      await expect(acceptInvitationService.acceptInvitation(validAcceptData)).rejects.toThrow(
        new HttpException(404, 'Invalid or expired invitation token')
      );

      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('should throw 400 error if invitation is already accepted', async () => {
      const acceptedInvitation = { ...mockInvitation, status: 'accepted' as const };
      mockFindInvitationByToken.mockResolvedValue(acceptedInvitation);

      await expect(acceptInvitationService.acceptInvitation(validAcceptData)).rejects.toThrow(
        new HttpException(400, 'Invitation has already been accepted')
      );

      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('should throw 400 error if invitation is revoked', async () => {
      const revokedInvitation = { ...mockInvitation, status: 'revoked' as const };
      mockFindInvitationByToken.mockResolvedValue(revokedInvitation);

      await expect(acceptInvitationService.acceptInvitation(validAcceptData)).rejects.toThrow(
        new HttpException(400, 'Invitation has already been revoked')
      );

      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('should throw 400 error if invitation has expired', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expires_at: new Date(Date.now() - 1000), // 1 second ago
      };
      mockFindInvitationByToken.mockResolvedValue(expiredInvitation);
      mockUpdateInvitation.mockResolvedValue({ ...expiredInvitation, status: 'expired' as const });

      await expect(acceptInvitationService.acceptInvitation(validAcceptData)).rejects.toThrow(
        new HttpException(400, 'Invitation has expired')
      );

      expect(mockUpdateInvitation).toHaveBeenCalledWith(1, { status: 'expired' });
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('should throw 409 error if user already exists', async () => {
      mockFindInvitationByToken.mockResolvedValue(mockInvitation);
      mockFindUserByEmail.mockResolvedValue(mockNewUser);

      await expect(acceptInvitationService.acceptInvitation(validAcceptData)).rejects.toThrow(
        new HttpException(409, 'User account already exists for this email')
      );

      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockFindInvitationByToken.mockRejectedValue(error);

      await expect(acceptInvitationService.acceptInvitation(validAcceptData)).rejects.toThrow(
        new HttpException(500, 'Error accepting invitation: Database error')
      );
    });

    it('should handle HttpException errors without wrapping', async () => {
      const httpError = new HttpException(500, 'Internal server error');
      mockFindInvitationByToken.mockRejectedValue(httpError);

      await expect(acceptInvitationService.acceptInvitation(validAcceptData)).rejects.toThrow(
        httpError
      );
    });
  });
});
