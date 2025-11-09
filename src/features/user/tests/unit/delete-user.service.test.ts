import DeleteUserService from '../../services/delete-user.service';
import { findUserById } from '../../user.queries';
import { db } from '../../../../database/drizzle';
import HttpException from '../../../../utils/httpException';

jest.mock('../../user.queries');
jest.mock('../../../../database/drizzle', () => ({
  db: {
    update: jest.fn(),
  },
}));

describe('DeleteUserService', () => {
  let deleteUserService: DeleteUserService;
  const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;

  beforeEach(() => {
    deleteUserService = new DeleteUserService();
    jest.clearAllMocks();
  });

  describe('deleteUser', () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed',
      phone_number: '1234567890',
      role: 'user' as const,
      created_by: 1,
      created_at: new Date(),
      updated_by: null,
      updated_at: new Date(),
      is_deleted: false,
      deleted_by: null,
      deleted_at: null,
    };

    it('should successfully soft delete a user', async () => {
      mockFindUserById.mockResolvedValue(mockUser);

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });
      (db.update as jest.Mock) = mockUpdate;

      await deleteUserService.deleteUser(1, 2);

      expect(mockFindUserById).toHaveBeenCalledWith(1);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw 404 error if user not found', async () => {
      mockFindUserById.mockResolvedValue(undefined);

      await expect(deleteUserService.deleteUser(999, 2)).rejects.toThrow(
        new HttpException(404, 'User not found')
      );
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockFindUserById.mockRejectedValue(error);

      await expect(deleteUserService.deleteUser(1, 2)).rejects.toThrow(
        new HttpException(500, `Error deleting user: ${error.message}`)
      );
    });

    it('should handle HttpException errors without wrapping', async () => {
      const httpError = new HttpException(500, 'Service unavailable');
      mockFindUserById.mockRejectedValue(httpError);

      await expect(deleteUserService.deleteUser(1, 2)).rejects.toThrow(httpError);
    });
  });
});
