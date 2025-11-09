import CreateInvitationService from '../../services/create-invitation.service';
import { createInvitation, findInvitationByEmail } from '../../admin-invite.queries';
import { sendInvitationEmail } from '../../../../utils/sendInvitationEmail';
import HttpException from '../../../../utils/httpException';

jest.mock('../../admin-invite.queries');
jest.mock('../../../../utils/sendInvitationEmail');
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
}));

describe('CreateInvitationService', () => {
  let createInvitationService: CreateInvitationService;
  const mockFindInvitationByEmail = findInvitationByEmail as jest.MockedFunction<
    typeof findInvitationByEmail
  >;
  const mockCreateInvitation = createInvitation as jest.MockedFunction<typeof createInvitation>;
  const mockSendInvitationEmail = sendInvitationEmail as jest.MockedFunction<
    typeof sendInvitationEmail
  >;

  beforeEach(() => {
    createInvitationService = new CreateInvitationService();
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    const validInvitationData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      assigned_role: 'scientist' as const,
    };

    const mockInvitation = {
      invitation_id: 1,
      ...validInvitationData,
      invite_token: 'mock-token',
      password: '$2b$12$hashedpassword',
      status: 'pending' as const,
      invited_by: 1,
      expires_at: new Date(),
      accepted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    };

    it('should successfully create an invitation and send email', async () => {
      mockFindInvitationByEmail.mockResolvedValue(undefined);
      mockCreateInvitation.mockResolvedValue(mockInvitation);
      mockSendInvitationEmail.mockResolvedValue();

      const result = await createInvitationService.createInvitation(validInvitationData, 1);

      expect(result).toEqual(mockInvitation);
      expect(mockFindInvitationByEmail).toHaveBeenCalledWith(validInvitationData.email);
      expect(mockCreateInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: validInvitationData.first_name,
          last_name: validInvitationData.last_name,
          email: validInvitationData.email,
          assigned_role: validInvitationData.assigned_role,
          invited_by: 1,
          status: 'pending',
        })
      );
      expect(mockSendInvitationEmail).toHaveBeenCalled();
    });

    it('should throw 409 error if active invitation already exists', async () => {
      const existingInvitation = { ...mockInvitation, status: 'pending' as const };
      mockFindInvitationByEmail.mockResolvedValue(existingInvitation);

      await expect(
        createInvitationService.createInvitation(validInvitationData, 1)
      ).rejects.toThrow(
        new HttpException(409, 'An active invitation already exists for this email')
      );

      expect(mockCreateInvitation).not.toHaveBeenCalled();
    });

    it('should create invitation even if email sending fails', async () => {
      mockFindInvitationByEmail.mockResolvedValue(undefined);
      mockCreateInvitation.mockResolvedValue(mockInvitation);
      mockSendInvitationEmail.mockRejectedValue(new Error('Email service error'));

      const result = await createInvitationService.createInvitation(validInvitationData, 1);

      expect(result).toEqual(mockInvitation);
      expect(mockCreateInvitation).toHaveBeenCalled();
    });

    it('should allow creating invitation if previous invitation was accepted', async () => {
      const acceptedInvitation = { ...mockInvitation, status: 'accepted' as const };
      mockFindInvitationByEmail.mockResolvedValue(acceptedInvitation);
      mockCreateInvitation.mockResolvedValue(mockInvitation);
      mockSendInvitationEmail.mockResolvedValue();

      const result = await createInvitationService.createInvitation(validInvitationData, 1);

      expect(result).toEqual(mockInvitation);
      expect(mockCreateInvitation).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockFindInvitationByEmail.mockRejectedValue(error);

      await expect(
        createInvitationService.createInvitation(validInvitationData, 1)
      ).rejects.toThrow(new HttpException(500, 'Error creating invitation: Database error'));
    });

    it('should handle HttpException errors without wrapping', async () => {
      const httpError = new HttpException(400, 'Bad request');
      mockFindInvitationByEmail.mockRejectedValue(httpError);

      await expect(
        createInvitationService.createInvitation(validInvitationData, 1)
      ).rejects.toThrow(httpError);
    });
  });
});
