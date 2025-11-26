/**
 * Admin Invite Routes
 * Combines all admin invitation API endpoints
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import createInvitationRouter from './apis/create-invitation';
import getInvitationsRouter from './apis/get-invitations';
import verifyInvitationRouter from './apis/verify-invitation';
import acceptInvitationRouter from './apis/accept-invitation';

class AdminInviteRoute implements Route {
  public path = '/admin/invitations';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Mount API routes
    this.router.use(this.path, createInvitationRouter);
    this.router.use(this.path, getInvitationsRouter);
    this.router.use(this.path, verifyInvitationRouter); // POST /verify - public, rate-limited
    this.router.use(this.path, acceptInvitationRouter); // POST /accept - public, rate-limited
  }
}

export default AdminInviteRoute;
