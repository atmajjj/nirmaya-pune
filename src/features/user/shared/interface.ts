import { UserRole } from './schema';

export interface IUser {
  id: number;
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  role: UserRole;
  created_by: number;
  created_at: Date;
  updated_by?: number;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: number;
  deleted_at?: Date;
}
