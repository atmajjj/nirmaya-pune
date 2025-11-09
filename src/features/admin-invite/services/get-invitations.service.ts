import HttpException from '../../../utils/httpException';
import { getInvitations } from '../admin-invite.queries';
import { IInvitation } from '../admin-invite.interface';

class GetInvitationsService {
  /**
   * Get all invitations with optional filtering and pagination
   */
  public async getInvitations(
    filters: { status?: string } = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ invitations: IInvitation[]; total: number; page: number; limit: number }> {
    try {
      const result = await getInvitations(filters, pagination);
      const { page = 1, limit = 10 } = pagination;

      return {
        invitations: result.invitations as IInvitation[],
        total: result.total,
        page,
        limit,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching invitations: ${error.message}`);
    }
  }
}

export default GetInvitationsService;