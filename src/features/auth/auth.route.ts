import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import validationMiddleware from '../../middlewares/validation.middleware';
import AuthController from './auth.controller';
import { createUserSchema, loginSchema, refreshTokenSchema } from './auth.validation';

class AuthRoute implements Route {
  public path = '/auth';
  public router = Router();
  public authController = new AuthController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}/register`,
      validationMiddleware(createUserSchema),
      this.authController.register
    );

    this.router.post(
      `${this.path}/login`,
      validationMiddleware(loginSchema),
      this.authController.login
    );

    this.router.post(
      `${this.path}/refresh-token`,
      validationMiddleware(refreshTokenSchema),
      this.authController.refreshToken
    );

    this.router.post(`${this.path}/logout`, this.authController.logout);
  }
}

export default AuthRoute;
