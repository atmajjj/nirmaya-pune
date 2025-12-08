import { Router, Response } from 'express';
import { z } from 'zod';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { createResearcherApplication, findApplicationByEmail } from '../shared/queries';
import { findUserByEmail } from '../../user/shared/queries';

// Validation schema for researcher application
const schema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(200, 'Full name too long'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits').max(20, 'Phone number too long'),
  organization: z.string().min(2, 'Organization name is required').max(255, 'Organization name too long'),
  purpose: z.string().min(10, 'Please provide a detailed purpose (minimum 10 characters)').max(1000, 'Purpose too long'),
});

async function businessLogic(data: z.infer<typeof schema>) {
  // Check if email already exists in users table
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    throw new HttpException(400, 'This email is already registered in the system');
  }

  // Check if email already has a pending or accepted application
  const existingApplication = await findApplicationByEmail(data.email);
  if (existingApplication) {
    if (existingApplication.status === 'pending') {
      throw new HttpException(400, 'You already have a pending application. Please wait for admin review.');
    }
    if (existingApplication.status === 'accepted') {
      throw new HttpException(400, 'Your application has already been accepted. Check your email for invitation.');
    }
    // If rejected, allow reapplication
  }

  // Create the application
  const application = await createResearcherApplication(data);
  
  return application;
}

const handler = asyncHandler(async (req, res: Response) => {
  const result = await businessLogic(req.body);
  ResponseFormatter.created(
    res, 
    { id: result.id, status: result.status }, 
    'Application submitted successfully! Admin will review and contact you via email.'
  );
});

const router = Router();

// Public endpoint - no auth required
router.post('/apply', validationMiddleware(schema), handler);

export default router;