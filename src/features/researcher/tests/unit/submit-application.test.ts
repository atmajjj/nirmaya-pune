/**
 * Unit tests for researcher application submission
 */

import HttpException from '../../../../utils/httpException';
import * as researcherQueries from '../../shared/queries';
import * as userQueries from '../../../user/shared/queries';

// Mock dependencies
jest.mock('../../shared/queries');
jest.mock('../../../user/shared/queries');

const mockResearcherQueries = researcherQueries as jest.Mocked<typeof researcherQueries>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;

// Business logic from join.ts
async function submitApplication(data: {
  full_name: string;
  email: string;
  phone_number: string;
  organization: string;
  purpose: string;
}) {
  // Check if email already exists in users table
  const existingUser = await userQueries.findUserByEmail(data.email);
  if (existingUser) {
    throw new HttpException(400, 'This email is already registered in the system');
  }

  // Check if email already has a pending or accepted application
  const existingApplication = await researcherQueries.findApplicationByEmail(data.email);
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
  const application = await researcherQueries.createResearcherApplication(data);
  
  return application;
}

describe('Researcher Application Submission', () => {
  const validApplicationData = {
    full_name: 'Jane Smith',
    email: 'jane.smith@research.org',
    phone_number: '+1234567890',
    organization: 'MIT Research Lab',
    purpose: 'I want to conduct water quality research for environmental studies',
  };

  const mockApplication = {
    id: 'uuid-123',
    ...validApplicationData,
    status: 'pending' as const,
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    invite_token: null,
    invite_sent_at: null,
    created_by: null,
    created_at: new Date('2025-12-08T10:00:00Z'),
    updated_by: null,
    updated_at: new Date('2025-12-08T10:00:00Z'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitApplication', () => {
    it('should successfully create application with valid data', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      mockResearcherQueries.findApplicationByEmail.mockResolvedValue(undefined as any);
      mockResearcherQueries.createResearcherApplication.mockResolvedValue(mockApplication);

      const result = await submitApplication(validApplicationData);

      expect(result).toEqual(mockApplication);
      expect(mockUserQueries.findUserByEmail).toHaveBeenCalledWith(validApplicationData.email);
      expect(mockResearcherQueries.findApplicationByEmail).toHaveBeenCalledWith(validApplicationData.email);
      expect(mockResearcherQueries.createResearcherApplication).toHaveBeenCalledWith(validApplicationData);
    });

    it('should throw error if email already registered as user', async () => {
      const existingUser = {
        id: 1,
        name: 'Existing User',
        email: validApplicationData.email,
        password: 'hashed',
        phone_number: '1234567890',
        role: 'researcher' as const,
        created_by: 1,
        created_at: new Date(),
        updated_by: null,
        updated_at: new Date(),
        is_deleted: false,
        deleted_by: null,
        deleted_at: null,
      };

      mockUserQueries.findUserByEmail.mockResolvedValue(existingUser);

      await expect(submitApplication(validApplicationData)).rejects.toThrow(HttpException);
      await expect(submitApplication(validApplicationData)).rejects.toMatchObject({
        status: 400,
        message: 'This email is already registered in the system',
      });

      expect(mockResearcherQueries.findApplicationByEmail).not.toHaveBeenCalled();
      expect(mockResearcherQueries.createResearcherApplication).not.toHaveBeenCalled();
    });

    it('should throw error if pending application exists', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      mockResearcherQueries.findApplicationByEmail.mockResolvedValue({
        ...mockApplication,
        status: 'pending',
      });

      await expect(submitApplication(validApplicationData)).rejects.toThrow(HttpException);
      await expect(submitApplication(validApplicationData)).rejects.toMatchObject({
        status: 400,
        message: 'You already have a pending application. Please wait for admin review.',
      });

      expect(mockResearcherQueries.createResearcherApplication).not.toHaveBeenCalled();
    });

    it('should throw error if accepted application exists', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      mockResearcherQueries.findApplicationByEmail.mockResolvedValue({
        ...mockApplication,
        status: 'accepted',
      });

      await expect(submitApplication(validApplicationData)).rejects.toThrow(HttpException);
      await expect(submitApplication(validApplicationData)).rejects.toMatchObject({
        status: 400,
        message: 'Your application has already been accepted. Check your email for invitation.',
      });

      expect(mockResearcherQueries.createResearcherApplication).not.toHaveBeenCalled();
    });

    it('should allow reapplication if previous application was rejected', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      mockResearcherQueries.findApplicationByEmail.mockResolvedValue({
        ...mockApplication,
        status: 'rejected',
        rejection_reason: 'Did not meet criteria',
      });
      mockResearcherQueries.createResearcherApplication.mockResolvedValue(mockApplication);

      const result = await submitApplication(validApplicationData);

      expect(result).toEqual(mockApplication);
      expect(mockResearcherQueries.createResearcherApplication).toHaveBeenCalledWith(validApplicationData);
    });
  });
});
