import GetInvitationsService from '../../services/get-invitations.service';
import { getInvitations } from '../../admin-invite.queries';
import HttpException from '../../../../utils/httpException';

jest.mock('../../admin-invite.queries');

describe('GetInvitationsService', () => {
  let getInvitationsService: GetInvitationsService;
  const mockGetInvitations = getInvitations as jest.MockedFunction<typeof getInvitations>;

  beforeEach(() => {
    getInvitationsService = new GetInvitationsService();
    jest.clearAllMocks();
  });

  describe('getInvitations', () => {
    const mockInvitations = [
      {
        invitation_id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        invite_token: 'token1',
        status: 'pending' as const,
        assigned_role: 'scientist' as const,
        password: '$2b$12$hashed',
        invited_by: 1,
        expires_at: new Date(),
        accepted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      },
      {
        invitation_id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        invite_token: 'token2',
        status: 'accepted' as const,
        assigned_role: 'researcher' as const,
        password: '$2b$12$hashed',
        invited_by: 1,
        expires_at: new Date(),
        accepted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      },
    ];

    it('should return invitations with default pagination', async () => {
      mockGetInvitations.mockResolvedValue({
        invitations: mockInvitations,
        total: 2,
      });

      const result = await getInvitationsService.getInvitations();

      expect(result).toEqual({
        invitations: mockInvitations,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(mockGetInvitations).toHaveBeenCalledWith({}, {});
    });

    it('should filter invitations by status', async () => {
      const pendingInvitations = [mockInvitations[0]];
      mockGetInvitations.mockResolvedValue({
        invitations: pendingInvitations,
        total: 1,
      });

      const result = await getInvitationsService.getInvitations({ status: 'pending' });

      expect(result).toEqual({
        invitations: pendingInvitations,
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(mockGetInvitations).toHaveBeenCalledWith({ status: 'pending' }, {});
    });

    it('should support custom pagination', async () => {
      mockGetInvitations.mockResolvedValue({
        invitations: mockInvitations,
        total: 20,
      });

      const result = await getInvitationsService.getInvitations({}, { page: 2, limit: 5 });

      expect(result).toEqual({
        invitations: mockInvitations,
        total: 20,
        page: 2,
        limit: 5,
      });
      expect(mockGetInvitations).toHaveBeenCalledWith({}, { page: 2, limit: 5 });
    });

    it('should return empty array when no invitations exist', async () => {
      mockGetInvitations.mockResolvedValue({
        invitations: [],
        total: 0,
      });

      const result = await getInvitationsService.getInvitations();

      expect(result).toEqual({
        invitations: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockGetInvitations.mockRejectedValue(error);

      await expect(getInvitationsService.getInvitations()).rejects.toThrow(
        new HttpException(500, 'Error fetching invitations: Database error')
      );
    });

    it('should handle HttpException errors without wrapping', async () => {
      const httpError = new HttpException(403, 'Forbidden');
      mockGetInvitations.mockRejectedValue(httpError);

      await expect(getInvitationsService.getInvitations()).rejects.toThrow(httpError);
    });
  });
});
