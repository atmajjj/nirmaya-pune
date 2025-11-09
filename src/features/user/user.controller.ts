import { Request, Response } from 'express';
import { UpdateUser } from './user.validation';
import { RequestWithUser } from '../../interfaces/request.interface';
import { GetUsersService, GetUserService, UpdateUserService, DeleteUserService } from './services';
import { ResponseFormatter } from '../../utils/responseFormatter';
import { asyncHandler, parseIdParam, getUserId } from '../../utils/controllerHelpers';
import { sanitizeUser, sanitizeUsers } from '../../utils/sanitizeUser';

class UserController {
  public getUsersService = new GetUsersService();
  public getUserService = new GetUserService();
  public updateUserService = new UpdateUserService();
  public deleteUserService = new DeleteUserService();

  public getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const users = await this.getUsersService.getAllUsers();
    const usersResponse = sanitizeUsers(users);

    ResponseFormatter.success(res, usersResponse, 'Users retrieved successfully');
  });

  public getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseIdParam(req);
    const user = await this.getUserService.getUserById(id);
    const userResponse = sanitizeUser(user);

    ResponseFormatter.success(res, userResponse, 'User retrieved successfully');
  });

  public updateUser = asyncHandler(async (req: RequestWithUser, res: Response): Promise<void> => {
    const id = parseIdParam(req);
    const updateData: UpdateUser = req.body;
    const userId = getUserId(req);

    const user = await this.updateUserService.updateUser(id, updateData, userId);
    const userResponse = sanitizeUser(user);

    ResponseFormatter.success(res, userResponse, 'User updated successfully');
  });

  public deleteUser = asyncHandler(async (req: RequestWithUser, res: Response): Promise<void> => {
    const id = parseIdParam(req);
    const userId = getUserId(req);

    await this.deleteUserService.deleteUser(id, userId);

    ResponseFormatter.success(res, null, 'User deleted successfully');
  });
}

export default UserController;
