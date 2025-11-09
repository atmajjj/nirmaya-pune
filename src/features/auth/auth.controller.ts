import { Request, Response } from 'express';
import { CreateUser, Login } from './auth.validation';
import { RegisterService, LoginService, RefreshTokenService } from './services';
import { RequestWithUser } from '../../interfaces/request.interface';
import { ResponseFormatter } from '../../utils/responseFormatter';
import { asyncHandler } from '../../utils/controllerHelpers';

class AuthController {
  public registerService = new RegisterService();
  public loginService = new LoginService();
  public refreshTokenService = new RefreshTokenService();

  public register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userData: CreateUser = req.body;
    const user = await this.registerService.register(userData);

    ResponseFormatter.created(res, user, 'User registered successfully');
  });

  public login = asyncHandler(async (req: Request, res: Response) => {
    const loginData: Login = req.body;
    const user = await this.loginService.login(loginData.email, loginData.password);

    ResponseFormatter.success(res, user, 'Login successful');
  });

  public refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const result = await this.refreshTokenService.refreshToken(refreshToken);

    ResponseFormatter.success(res, result, 'Token refreshed successfully');
  });

  public logout = asyncHandler(async (req: RequestWithUser, res: Response) => {
    // For JWT, logout is client-side (remove token), but can add server-side logic if needed
    ResponseFormatter.success(res, null, 'Logout successful');
  });
}

export default AuthController;
