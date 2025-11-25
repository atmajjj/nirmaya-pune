import { InvitationStatus } from './schema';
import { UserRole } from '../../user/shared/schema';

export interface IInvitation {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  invite_token: string;
  status: InvitationStatus;
  assigned_role?: UserRole;
  password?: string;
  invited_by: number;
  expires_at: Date;
  accepted_at?: Date;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: number;
  deleted_at?: Date;
}

export interface ICreateInvitation {
  first_name: string;
  last_name: string;
  email: string;
  assigned_role: UserRole;
}

export interface IInvitationWithDetails extends IInvitation {
  invited_by_user?: {
    id: number;
    name: string;
    email: string;
  };
}
