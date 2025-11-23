/**
 * User Routes
 * Combines all user API endpoints
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import getAllUsersRouter from './apis/get-all-users';
import getUserByIdRouter from './apis/get-user-by-id';
import updateUserRouter from './apis/update-user';
import deleteUserRouter from './apis/delete-user';

class UserRoute implements Route {
  public path = '/users';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.path, getAllUsersRouter);
    this.router.use(this.path, getUserByIdRouter);
    this.router.use(this.path, updateUserRouter);
    this.router.use(this.path, deleteUserRouter);
  }
}

export default UserRoute;
