import { InvitationStatus } from './schema';
import { UserRole } from '../../user/shared/schema';

export interface IInvitation {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  invite_token?: string;
  status: InvitationStatus;
  assigned_role?: UserRole | null;
  temp_password_encrypted?: string | null;
  password_hash?: string | null;
  invited_by: number;
  expires_at: Date;
  accepted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
}

export interface ICreateInvitation {
  first_name: string;
  last_name: string;
  email: string;
  assigned_role: UserRole;
}

/**
 * Response returned when verifying an invitation token
 * Contains credentials for auto-login on frontend
 */
export interface IInvitationVerifyResponse {
  email: string;
  password: string; // Plain text temp password for frontend pre-fill
  first_name: string;
  last_name: string;
  assigned_role: UserRole;
}
