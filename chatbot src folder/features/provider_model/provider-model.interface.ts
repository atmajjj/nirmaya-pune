export interface ProviderModel {
  id?: number;
  provider: string;
  model_name: string;
  description?: string;
  created_by: number;
  created_at?: Date;
  updated_by?: number;
  updated_at?: Date;
  is_deleted?: boolean;
  deleted_by?: number;
  deleted_at?: Date;
}
