/**
 * Auth Routes
 * Combines all authentication API endpoints
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import registerRouter from './apis/register';
import loginRouter from './apis/login';
import refreshTokenRouter from './apis/refresh-token';
import logoutRouter from './apis/logout';

class AuthRoute implements Route {
  public path = '/auth';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.path, registerRouter);
    this.router.use(this.path, loginRouter);
    this.router.use(this.path, refreshTokenRouter);
    this.router.use(this.path, logoutRouter);
  }
}

export default AuthRoute;
