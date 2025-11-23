/**
 * POST /api/v1/auth/login
 * Login with email and password (Public - no auth)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { generateToken } from '../../../utils/jwt';
import { findUserByEmail } from '../../user/shared/queries';
import { IAuthUserWithToken } from '../../../interfaces/request.interface';

const schema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginDto = z.infer<typeof schema>;

async function handleLogin(email: string, password: string): Promise<IAuthUserWithToken> {
  if (!email || !password) {
    throw new HttpException(400, 'Email and password are required');
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw new HttpException(404, 'Email not registered');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new HttpException(401, 'Incorrect password');
  }

  const token = generateToken(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    '24h'
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone_number: user.phone_number || undefined,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
    token,
  };
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  const loginData: LoginDto = req.body;
  const user = await handleLogin(loginData.email, loginData.password);

  ResponseFormatter.success(res, user, 'Login successful');
});

const router = Router();
router.post('/login', validationMiddleware(schema), handler);

export default router;
