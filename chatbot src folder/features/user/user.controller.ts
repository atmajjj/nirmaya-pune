import { NextFunction, Request, Response } from "express";
import { UserDto, UpdateUserDto, LoginDto } from "./user.dto";
import { RequestWithUser } from "../../interfaces/auth.interface";
import UserService from "./services/user.service";
import HttpException from "../../exceptions/HttpException";
import ResponseUtil from "../../utils/response.util";

class UserController {
  public userService = new UserService();

  public register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userData: UserDto = req.body;
      const user = await this.userService.register(userData);

      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;

      res.status(201).json(
        ResponseUtil.created("User registered successfully", userResponse)
      );
    } catch (error) {
      next(error);
    }
  };

  public login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password }: LoginDto = req.body;

      if (!email || !password) {
        throw new HttpException(400, "Please provide both email and password");
      }

      const user = await this.userService.login(email, password);

      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;

      res.status(200).json(
        ResponseUtil.success("Login successful", userResponse)
      );
    } catch (error) {
      next(error);
    }
  };

  public getAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const users = await this.userService.getAllUsers();

      // Remove passwords from response
      const usersResponse = users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.status(200).json(
        ResponseUtil.success("Users retrieved successfully", usersResponse)
      );
    } catch (error) {
      next(error);
    }
  };

  public getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw new HttpException(400, "Invalid user ID");
      }

      const user = await this.userService.getUserById(id);

      // Remove password from response
      const { password, ...userResponse } = user;

      res.status(200).json(
        ResponseUtil.success("User retrieved successfully", userResponse)
      );
    } catch (error) {
      next(error);
    }
  };

  public updateUser = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const updateData: UpdateUserDto = req.body;

      if (isNaN(id)) {
        throw new HttpException(400, "Invalid user ID");
      }

      // Get the user making the update (from auth middleware)
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const user = await this.userService.updateUser(id, updateData, userId);

      // Remove password from response
      const { password, ...userResponse } = user;

      res.status(200).json(
        ResponseUtil.updated("User updated successfully", userResponse)
      );
    } catch (error) {
      next(error);
    }
  };

  public deleteUser = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        throw new HttpException(400, "Invalid user ID");
      }

      // Get the user making the deletion (from auth middleware)
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      await this.userService.deleteUser(id, userId);

      res.status(200).json(
        ResponseUtil.deleted("User deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  };
}

export default UserController;
