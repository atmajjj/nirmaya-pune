/**
 * Admin Statistics Interface
 * Comprehensive system-wide statistics for admin dashboard
 */

export interface AdminDashboardStats {
  overview: {
    total_users: number;
    total_uploads: number;
    total_calculations: number;
    total_reports: number;
    total_data_sources: number;
  };
  
  users: {
    by_role: {
      admin: number;
      scientist: number;
      field_technician: number;
      researcher: number;
      policymaker: number;
    };
    recent_registrations: number; // Last 30 days
    active_users: number; // Users with activity in last 30 days
  };
  
  uploads: {
    total: number;
    by_status: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    total_size_bytes: number;
    total_size_mb: number;
    recent_uploads: number; // Last 30 days
  };
  
  calculations: {
    total: number;
    by_index: {
      hpi: number;
      mi: number;
    };
    by_classification: {
      hpi: Record<string, number>;
      mi: Record<string, number>;
    };
    recent_calculations: number; // Last 30 days
  };
  
  data_sources: {
    total: number;
    by_status: {
      pending: number;
      processing: number;
      available: number;
      archived: number;
      failed: number;
    };
    by_file_type: {
      csv: number;
      xlsx: number;
      xls: number;
    };
    total_size_bytes: number;
    total_size_mb: number;
    recent_uploads: number; // Last 30 days
  };
  
  reports: {
    total: number;
    by_status: {
      generating: number;
      completed: number;
      failed: number;
    };
    by_format: {
      pdf: number;
      json: number;
    };
    recent_reports: number; // Last 30 days
  };
  
  system: {
    database_status: 'healthy' | 'degraded' | 'down';
    redis_status: 'healthy' | 'degraded' | 'down';
    api_version: string;
    environment: string;
  };
}

export interface RecentActivityItem {
  id: number;
  type: 'user_registration' | 'upload' | 'calculation' | 'report' | 'data_source';
  description: string;
  user_id: number;
  user_name: string;
  user_email: string;
  created_at: string;
}

export interface RecentActivity {
  activities: RecentActivityItem[];
  total: number;
}
