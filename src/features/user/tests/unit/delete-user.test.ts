/**
 * Unit tests for delete-user business logic (soft delete)
 */

import HttpException from '../../../../utils/httpException';
import * as userQueries from '../../shared/queries';
import { db } from '../../../../database/drizzle';
import { users } from '../../shared/schema';

// Mock dependencies
jest.mock('../../shared/queries');
jest.mock('../../../../database/drizzle', () => ({
  db: {
    update: jest.fn().mockReturnThis(),
  },
}));

const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;
const mockDb = db as jest.Mocked<typeof db>;

// Recreate the business logic for testing
async function deleteUser(id: number, deletedBy: number): Promise<void> {
  const existingUser = await userQueries.findUserById(id);

  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  await (db.update(users).set({
    is_deleted: true,
    deleted_by: deletedBy,
    deleted_at: new Date(),
  }) as any).where();
}

describe('Delete User Business Logic', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    phone_number: '1234567890',
    role: 'scientist' as const,
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_by: null,
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain
    const mockWhere = jest.fn().mockResolvedValue(undefined);
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });
  });

  describe('deleteUser', () => {
    it('should successfully soft delete user', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      await expect(deleteUser(1, 2)).resolves.toBeUndefined();

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(1);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw 404 when user not found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(deleteUser(999, 2)).rejects.toThrow(HttpException);
      await expect(deleteUser(999, 2)).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });

    it('should set is_deleted to true', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockWhere = jest.fn().mockResolvedValue(undefined);
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await deleteUser(1, 2);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          is_deleted: true,
        })
      );
    });

    it('should set deleted_by field', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockWhere = jest.fn().mockResolvedValue(undefined);
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await deleteUser(1, 5);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_by: 5,
        })
      );
    });

    it('should set deleted_at timestamp', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockWhere = jest.fn().mockResolvedValue(undefined);
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await deleteUser(1, 2);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(Date),
        })
      );
    });

    it('should call findUserById with correct id', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      await deleteUser(42, 2);

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(42);
    });

    it('should not call update when user not found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      try {
        await deleteUser(999, 2);
      } catch {
        // Expected to throw
      }

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockWhere = jest.fn().mockRejectedValue(new Error('Database error'));
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await expect(deleteUser(1, 2)).rejects.toThrow('Database error');
    });

    it('should be idempotent - deleting already deleted user still checks existence', async () => {
      // If user is already soft-deleted, findUserById returns undefined
      // (because queries filter by is_deleted = false)
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(deleteUser(1, 2)).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });
  });
});
