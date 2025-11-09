import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import validationMiddleware from '../../middlewares/validation.middleware';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import UserController from './user.controller';
import { updateUserSchema } from './user.validation';

class UserRoute implements Route {
  public path = '/users';
  public router = Router();
  public userController = new UserController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      `${this.path}`,
      requireAuth,
      requireRole('admin'),
      this.userController.getAllUsers
    );

    this.router.get(`${this.path}/:id`, requireAuth, this.userController.getUserById);

    this.router.put(
      `${this.path}/:id`,
      requireAuth,
      validationMiddleware(updateUserSchema),
      this.userController.updateUser
    );

    this.router.delete(
      `${this.path}/:id`,
      requireAuth,
      requireRole('admin'),
      this.userController.deleteUser
    );
  }
}

export default UserRoute;
