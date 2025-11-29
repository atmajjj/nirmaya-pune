export interface IAgent {
  id: number;
  name: string;
  encrypted_api_key: string;
  encryption_salt: string;
  is_active: number;
  model: string;
  temperature: number;
  system_prompt: string;
  provider: string;
  trained_on: Date;
  user_id: number;
  created_by: number;
  created_at: Date;
  updated_by?: number;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: number;
  deleted_at?: Date;
  training_status: "idle" | "pending" | "in-progress" | "completed" | "failed";
  training_progress: number;
  training_error?: string;
  embedded_sources_count: number;
  total_sources_count: number;
}

export interface CreateAgentRequest {
  name: string;
  provider: string;
  api_key: string;
  model?: string;
  temperature?: number;
  system_prompt?: string;
  is_active?: number;
}

export interface UpdateAgentRequest {
  name?: string;
  provider?: string;
  api_key?: string;
  model?: string;
  temperature?: number;
  system_prompt?: string;
  is_active?: number;
}
