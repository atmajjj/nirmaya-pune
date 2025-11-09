import GetUserService from '../../services/get-user.service';
import { findUserById } from '../../user.queries';
import HttpException from '../../../../utils/httpException';

jest.mock('../../user.queries');

describe('GetUserService', () => {
  let getUserService: GetUserService;
  const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;

  beforeEach(() => {
    getUserService = new GetUserService();
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
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

    it('should return user by id', async () => {
      mockFindUserById.mockResolvedValue(mockUser);

      const result = await getUserService.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(mockFindUserById).toHaveBeenCalledWith(1);
    });

    it('should throw 404 error if user not found', async () => {
      mockFindUserById.mockResolvedValue(undefined);

      await expect(getUserService.getUserById(999)).rejects.toThrow(
        new HttpException(404, 'User not found')
      );
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockFindUserById.mockRejectedValue(error);

      await expect(getUserService.getUserById(1)).rejects.toThrow(
        new HttpException(500, `Error fetching user: ${error.message}`)
      );
    });

    it('should handle HttpException errors without wrapping', async () => {
      const httpError = new HttpException(500, 'Service unavailable');
      mockFindUserById.mockRejectedValue(httpError);

      await expect(getUserService.getUserById(1)).rejects.toThrow(httpError);
    });
  });
});
