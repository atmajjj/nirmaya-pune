import { Request, Response } from 'express';
import { CreateInvitation, AcceptInvitation, GetInvitationsQuery } from './admin-invite.validation';
import { RequestWithUser } from '../../interfaces/request.interface';
import {
  CreateInvitationService,
  GetInvitationsService,
  AcceptInvitationService
} from './services';
import { ResponseFormatter } from '../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../utils/controllerHelpers';

class AdminInviteController {
  public createInvitationService = new CreateInvitationService();
  public getInvitationsService = new GetInvitationsService();
  public acceptInvitationService = new AcceptInvitationService();

  /**
   * Create a new invitation (Admin only)
   */
  public createInvitation = asyncHandler(async (req: RequestWithUser, res: Response): Promise<void> => {
    const invitationData: CreateInvitation = req.body;
    const invitedBy = getUserId(req);

    const invitation = await this.createInvitationService.createInvitation(invitationData, invitedBy);

    ResponseFormatter.success(res, invitation, 'Invitation sent successfully');
  });

  /**
   * Get all invitations (Admin only)
   */
  public getInvitations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: GetInvitationsQuery = req.query;

    const result = await this.getInvitationsService.getInvitations(
      { status: query.status },
      { page: query.page, limit: query.limit }
    );

    ResponseFormatter.success(res, result, 'Invitations retrieved successfully');
  });

  /**
   * Accept an invitation (Public endpoint)
   */
  public acceptInvitation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const acceptData: AcceptInvitation = req.body;

    const invitation = await this.acceptInvitationService.acceptInvitation(acceptData);

    ResponseFormatter.success(res, invitation, 'Invitation accepted successfully. You can now log in with your new password.');
  });
}

export default AdminInviteController;