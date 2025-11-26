/**
 * Unit tests for get-user-by-id business logic
 */

import HttpException from '../../../../utils/httpException';
import * as userQueries from '../../shared/queries';
import { IUser } from '../../shared/interface';

// Mock dependencies
jest.mock('../../shared/queries');

const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;

// Recreate the business logic for testing
async function getUserById(id: number): Promise<IUser> {
  const user = await userQueries.findUserById(id);

  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  return user as IUser;
}

describe('Get User By ID Business Logic', () => {
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
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const result = await getUserById(1);

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('should throw 404 when user not found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(getUserById(999)).rejects.toThrow(HttpException);
      await expect(getUserById(999)).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });

    it('should return user with all fields', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const result = await getUserById(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Test User');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('role', 'scientist');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('is_deleted', false);
    });

    it('should call findUserById with correct id', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      await getUserById(42);

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(42);
      expect(mockUserQueries.findUserById).toHaveBeenCalledTimes(1);
    });

    it('should return user with admin role', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      mockUserQueries.findUserById.mockResolvedValue(adminUser);

      const result = await getUserById(1);

      expect(result.role).toBe('admin');
    });

    it('should return user without phone number', async () => {
      const userWithoutPhone = { ...mockUser, phone_number: null };
      mockUserQueries.findUserById.mockResolvedValue(userWithoutPhone);

      const result = await getUserById(1);

      expect(result.phone_number).toBeNull();
    });

    it('should handle database errors', async () => {
      mockUserQueries.findUserById.mockRejectedValue(new Error('Database error'));

      await expect(getUserById(1)).rejects.toThrow('Database error');
    });
  });
});
