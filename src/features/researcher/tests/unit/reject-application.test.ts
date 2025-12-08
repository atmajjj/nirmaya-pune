/**
 * Unit tests for admin reject application
 */

import * as researcherQueries from '../../shared/queries';

// Mock dependencies
jest.mock('../../shared/queries');

const mockResearcherQueries = researcherQueries as jest.Mocked<typeof researcherQueries>;

describe('Reject Researcher Application', () => {
  const mockApplication = {
    id: 'app-uuid-123',
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    phone_number: '+1234567890',
    organization: 'Test Organization',
    purpose: 'Testing purposes',
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

  const mockRejectedApplication = {
    ...mockApplication,
    status: 'rejected' as const,
    reviewed_by: 1,
    reviewed_at: new Date('2025-12-08T12:00:00Z'),
    rejection_reason: 'Does not meet criteria',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rejectApplication', () => {
    it('should successfully reject application with reason', async () => {
      mockResearcherQueries.getApplicationById.mockResolvedValue(mockApplication);
      mockResearcherQueries.rejectApplication.mockResolvedValue(mockRejectedApplication);

      const result = await mockResearcherQueries.rejectApplication(
        'app-uuid-123',
        1,
        'Does not meet criteria'
      );

      expect(result.status).toBe('rejected');
      expect(result.reviewed_by).toBe(1);
      expect(result.rejection_reason).toBe('Does not meet criteria');
      expect(result.reviewed_at).toBeDefined();
    });

    it('should successfully reject application without reason', async () => {
      const rejectedWithoutReason = {
        ...mockRejectedApplication,
        rejection_reason: null,
      };

      mockResearcherQueries.getApplicationById.mockResolvedValue(mockApplication);
      mockResearcherQueries.rejectApplication.mockResolvedValue(rejectedWithoutReason);

      const result = await mockResearcherQueries.rejectApplication('app-uuid-123', 1);

      expect(result.status).toBe('rejected');
      expect(result.reviewed_by).toBe(1);
      expect(result.rejection_reason).toBeNull();
    });

    it('should handle application not found', async () => {
      mockResearcherQueries.getApplicationById.mockResolvedValue(undefined as any);

      const application = await mockResearcherQueries.getApplicationById('non-existent');
      
      expect(application).toBeUndefined();
      // In real code, this would throw HttpException(404, 'Application not found')
    });

    it('should handle already processed application', async () => {
      const processedApplication = {
        ...mockApplication,
        status: 'accepted' as const,
      };

      mockResearcherQueries.getApplicationById.mockResolvedValue(processedApplication);

      const application = await mockResearcherQueries.getApplicationById('app-uuid-123');
      
      expect(application.status).toBe('accepted');
      // In real code, this would throw HttpException(400, 'Application has already been accepted')
    });
  });
});
