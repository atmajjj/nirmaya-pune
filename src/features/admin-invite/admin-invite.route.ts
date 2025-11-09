import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import validationMiddleware from '../../middlewares/validation.middleware';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import AdminInviteController from './admin-invite.controller';
import {
  createInvitationSchema,
  acceptInvitationSchema,
  getInvitationsQuerySchema
} from './admin-invite.validation';

class AdminInviteRoute implements Route {
  public path = '/admin/invitations';
  public router = Router();
  public adminInviteController = new AdminInviteController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // POST /api/v1/admin/invitations - Create invitation (Admin only)
    this.router.post(
      `${this.path}`,
      requireAuth,
      requireRole('admin'),
      validationMiddleware(createInvitationSchema),
      this.adminInviteController.createInvitation
    );

    // GET /api/v1/admin/invitations - Get all invitations (Admin only)
    this.router.get(
      `${this.path}`,
      requireAuth,
      requireRole('admin'),
      validationMiddleware(getInvitationsQuerySchema, 'query'),
      this.adminInviteController.getInvitations
    );

    // POST /api/v1/admin/invitations/accept - Accept invitation (Public)
    this.router.post(
      `${this.path}/accept`,
      validationMiddleware(acceptInvitationSchema),
      this.adminInviteController.acceptInvitation
    );
  }
}

export default AdminInviteRoute;