/**
 * POST /api/auth/register
 * Register new user account (Public - no auth)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { hashPassword } from '../../../utils/password';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { generateToken } from '../../../utils/jwt';
import { findUserByEmail, createUser, updateUserById } from '../../user/shared/queries';
import { IAuthUserWithToken } from '../../../interfaces/request.interface';

/** Default role for public registration - cannot be changed by users */
const DEFAULT_REGISTRATION_ROLE = 'scientist' as const;

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone_number: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  // Note: role is intentionally not accepted from user input for security
});

type RegisterDto = z.infer<typeof schema>;

async function handleRegister(data: RegisterDto): Promise<IAuthUserWithToken> {
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    throw new HttpException(409, 'Email already registered');
  }

  const hashedPassword = await hashPassword(data.password);
  const userData = {
    ...data,
    password: hashedPassword,
    role: DEFAULT_REGISTRATION_ROLE, // Hardcoded for security - admins must use invite system
  };

  const newUser = await createUser(userData);

  // Self-reference: User created themselves
  await updateUserById(newUser.id, { created_by: newUser.id, updated_by: newUser.id });

  const token = generateToken(
    {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
    '24h'
  );

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    phone_number: newUser.phone_number || undefined,
    role: newUser.role,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
    token,
  };
}

const handler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userData: RegisterDto = req.body;
  const user = await handleRegister(userData);

  ResponseFormatter.created(res, user, 'User registered successfully');
});

const router = Router();
router.post('/register', validationMiddleware(schema), handler);

export default router;
