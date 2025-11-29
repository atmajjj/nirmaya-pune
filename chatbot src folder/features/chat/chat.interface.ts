export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SessionSummary {
  id: number;
  agent_id: number;
  agent_name: string;
  created_at: Date;
  message_count: number;
  last_message: string;
  last_message_time: Date;
}

// Database entity interfaces
export interface IChatSession {
  id: number;
  agent_id: number;
  user_id: number;
  created_at: Date;
}

export interface IChatMessage {
  id: number;
  session_id: number;
  content: string;
  role: "user" | "assistant";
  created_at: Date;
}

export interface CreateChatSessionRequest {
  agentId: number;
  userId: number;
}

export interface SaveMessageRequest {
  sessionId: number;
  content: string;
  role: "user" | "assistant";
}
