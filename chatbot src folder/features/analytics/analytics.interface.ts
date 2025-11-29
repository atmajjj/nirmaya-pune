export interface AnalyticsEvent {
  userId: number;
  eventType: string;
  eventData: Record<string, any>;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ChatSessionAnalytics {
  userId: number;
  agentId: number;
  sessionId: number;
  messageCount: number;
  sessionDurationSeconds?: number;
  contextUsed: boolean;
  contextLength: number;
  sourceFirstBlocked: boolean;
  responseTimeMs?: number;
  costEstimate?: number;
  userSatisfactionScore?: number;
  sourceSelection?: string; // Track which source type was selected for filtering
}

export interface AgentPerformanceData {
  agentId: number;
  date: string;
  totalChats: number;
  totalMessages: number;
  avgResponseTimeMs?: number;
  totalTokensConsumed: number;
  totalCost?: number;
  sourceFirstBlocks: number;
  errorCount: number;
  avgSatisfactionScore?: number;
}

export interface SystemMetric {
  metricName: string;
  metricValue: number;
  metricUnit: string;
  metricTags?: Record<string, any>;
  recordedAt?: Date;
}

export interface UserActivityEvent {
  id: number;
  userId: number;
  eventType: string;
  eventData: Record<string, any>;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ChatAnalytics {
  id: number;
  userId: number;
  agentId: number;
  sessionId: number;
  messageCount: number;
  sessionDurationSeconds?: number;
  contextUsed: boolean;
  contextLength: number;
  sourceFirstBlocked: boolean;
  responseTimeMs?: number;
  costEstimate?: number;
  userSatisfactionScore?: number;
  createdAt: Date;
}

export interface AgentPerformanceMetrics {
  id: number;
  agentId: number;
  date: string;
  totalChats: number;
  totalMessages: number;
  avgResponseTimeMs?: number;
  totalTokensConsumed: number;
  totalCost?: number;
  sourceFirstBlocks: number;
  errorCount: number;
  avgSatisfactionScore?: number;
  createdAt: Date;
}

export interface SystemPerformanceMetrics {
  id: number;
  metricName: string;
  metricValue: number;
  metricUnit: string;
  metricTags?: Record<string, any>;
  recordedAt: Date;
}

// Event Types Constants
export const EVENT_TYPES = {
  // Authentication events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  
  // Agent events
  AGENT_CREATE: 'agent_create',
  AGENT_UPDATE: 'agent_update',
  AGENT_DELETE: 'agent_delete',
  AGENT_TRAIN_START: 'agent_train_start',
  AGENT_TRAIN_COMPLETE: 'agent_train_complete',
  AGENT_TRAIN_ERROR: 'agent_train_error',
  
  // Chat events
  CHAT_SESSION_START: 'chat_session_start',
  CHAT_SESSION_END: 'chat_session_end',
  CHAT_MESSAGE_SEND: 'chat_message_send',
  CHAT_MESSAGE_RECEIVE: 'chat_message_receive',
  CHAT_SOURCE_FIRST_BLOCK: 'chat_source_first_block',
  
  // Source events
  SOURCE_CREATE: 'source_create',
  SOURCE_UPDATE: 'source_update',
  SOURCE_DELETE: 'source_delete',
  SOURCE_PROCESS_START: 'source_process_start',
  SOURCE_PROCESS_COMPLETE: 'source_process_complete',
  SOURCE_PROCESS_ERROR: 'source_process_error',
  
  // System events
  API_REQUEST: 'api_request',
  API_ERROR: 'api_error',
  SYSTEM_ERROR: 'system_error',
  PERFORMANCE_METRIC: 'performance_metric',
} as const;

// Metric Names Constants
export const METRIC_NAMES = {
  // Performance metrics
  API_RESPONSE_TIME: 'api_response_time',
  DATABASE_QUERY_TIME: 'database_query_time',
  CACHE_HIT_RATE: 'cache_hit_rate',
  VECTOR_SEARCH_TIME: 'vector_search_time',
  
  // System metrics
  MEMORY_USAGE: 'memory_usage',
  CPU_USAGE: 'cpu_usage',
  DISK_USAGE: 'disk_usage',
  ACTIVE_CONNECTIONS: 'active_connections',
  
  // Business metrics
  ACTIVE_USERS: 'active_users',
  CONCURRENT_CHATS: 'concurrent_chats',
  ERROR_RATE: 'error_rate',
  THROUGHPUT: 'throughput',
} as const;

// Metric Units Constants
export const METRIC_UNITS = {
  MILLISECONDS: 'ms',
  SECONDS: 'seconds',
  PERCENTAGE: 'percent',
  COUNT: 'count',
  BYTES: 'bytes',
  MEGABYTES: 'mb',
  GIGABYTES: 'gb',
  REQUESTS_PER_SECOND: 'rps',
  DOLLARS: 'usd',
} as const;