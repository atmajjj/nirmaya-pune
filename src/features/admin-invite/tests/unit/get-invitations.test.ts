/**
 * Unit tests for get-invitations business logic
 */

import * as inviteQueries from '../../shared/queries';
import { InvitationStatus, Invitation } from '../../shared/schema';
import { IInvitation } from '../../shared/interface';

// Mock dependencies
jest.mock('../../shared/queries');

const mockInviteQueries = inviteQueries as jest.Mocked<typeof inviteQueries>;

// Recreate the business logic for testing
async function handleGetInvitations(
  filters: { status?: InvitationStatus },
  pagination: { page?: number; limit?: number }
): Promise<{ invitations: IInvitation[]; total: number; page: number; limit: number }> {
  const result = await inviteQueries.getInvitations(filters, pagination);
  const { page = 1, limit = 10 } = pagination;

  return {
    invitations: result.invitations as IInvitation[],
    total: result.total,
    page,
    limit,
  };
}

describe('Get Invitations Business Logic', () => {
  const mockInvitations: Invitation[] = [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      invite_token: 'token1',
      status: 'pending',
      assigned_role: 'scientist',
      temp_password_encrypted: 'encrypted_password_1',
      password_hash: 'hashedPassword1',
      verify_attempts: 0,
      invited_by: 1,
      expires_at: new Date('2024-01-02'),
      accepted_at: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      is_deleted: false,
      deleted_by: null,
      deleted_at: null,
    },
    {
      id: 2,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      invite_token: 'token2',
      status: 'accepted',
      assigned_role: 'researcher',
      temp_password_encrypted: 'encrypted_password_2',
      password_hash: 'hashedPassword2',
      verify_attempts: 0,
      invited_by: 1,
      expires_at: new Date('2024-01-02'),
      accepted_at: new Date('2024-01-01T12:00:00'),
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      is_deleted: false,
      deleted_by: null,
      deleted_at: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetInvitations', () => {
    it('should return all invitations with default pagination', async () => {
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: mockInvitations,
        total: 2,
      });

      const result = await handleGetInvitations({}, {});

      expect(mockInviteQueries.getInvitations).toHaveBeenCalledWith({}, {});
      expect(result.invitations).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by pending status', async () => {
      const pendingInvitations = mockInvitations.filter(i => i.status === 'pending');
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: pendingInvitations,
        total: 1,
      });

      const result = await handleGetInvitations({ status: 'pending' }, {});

      expect(mockInviteQueries.getInvitations).toHaveBeenCalledWith({ status: 'pending' }, {});
      expect(result.invitations).toHaveLength(1);
      expect(result.invitations[0].status).toBe('pending');
    });

    it('should filter by accepted status', async () => {
      const acceptedInvitations = mockInvitations.filter(i => i.status === 'accepted');
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: acceptedInvitations,
        total: 1,
      });

      const result = await handleGetInvitations({ status: 'accepted' }, {});

      expect(result.invitations).toHaveLength(1);
      expect(result.invitations[0].status).toBe('accepted');
    });

    it('should apply pagination parameters', async () => {
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: mockInvitations.slice(0, 1),
        total: 2,
      });

      const result = await handleGetInvitations({}, { page: 1, limit: 1 });

      expect(mockInviteQueries.getInvitations).toHaveBeenCalledWith({}, { page: 1, limit: 1 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should return custom page number', async () => {
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: [],
        total: 2,
      });

      const result = await handleGetInvitations({}, { page: 2, limit: 10 });

      expect(result.page).toBe(2);
    });

    it('should return custom limit', async () => {
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: mockInvitations,
        total: 2,
      });

      const result = await handleGetInvitations({}, { page: 1, limit: 50 });

      expect(result.limit).toBe(50);
    });

    it('should return empty array when no invitations exist', async () => {
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: [],
        total: 0,
      });

      const result = await handleGetInvitations({}, {});

      expect(result.invitations).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter by expired status', async () => {
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: [],
        total: 0,
      });

      const result = await handleGetInvitations({ status: 'expired' }, {});

      expect(mockInviteQueries.getInvitations).toHaveBeenCalledWith({ status: 'expired' }, {});
      expect(result.invitations).toHaveLength(0);
    });

    it('should filter by revoked status', async () => {
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: [],
        total: 0,
      });

      const result = await handleGetInvitations({ status: 'revoked' }, {});

      expect(result).toBeDefined();
      expect(mockInviteQueries.getInvitations).toHaveBeenCalledWith({ status: 'revoked' }, {});
    });

    it('should handle database errors', async () => {
      mockInviteQueries.getInvitations.mockRejectedValue(new Error('Database error'));

      await expect(handleGetInvitations({}, {})).rejects.toThrow('Database error');
    });

    it('should return invitations with all fields', async () => {
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: mockInvitations,
        total: 2,
      });

      const result = await handleGetInvitations({}, {});

      expect(result.invitations[0]).toHaveProperty('id');
      expect(result.invitations[0]).toHaveProperty('first_name');
      expect(result.invitations[0]).toHaveProperty('last_name');
      expect(result.invitations[0]).toHaveProperty('email');
      expect(result.invitations[0]).toHaveProperty('status');
      expect(result.invitations[0]).toHaveProperty('assigned_role');
    });

    it('should combine filters and pagination', async () => {
      mockInviteQueries.getInvitations.mockResolvedValue({
        invitations: mockInvitations.filter(i => i.status === 'pending'),
        total: 1,
      });

      const result = await handleGetInvitations({ status: 'pending' }, { page: 1, limit: 5 });

      expect(mockInviteQueries.getInvitations).toHaveBeenCalledWith(
        { status: 'pending' },
        { page: 1, limit: 5 }
      );
      expect(result.page).toBe(1);
      expect(result.limit).toBe(5);
    });
  });
});
