import api from '../api/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginHistoryRecord {
  created_at: string
  ip: string
  user_agent: string
  first_name: string
  last_name: string
  extension: string
  [key: string]: unknown
}

export interface LoginHistoryResponse {
  success: string
  message: string
  record_count: number
  data: LoginHistoryRecord[]
}

export interface AuthEventRecord {
  id: number
  user_id: number
  first_name: string
  last_name: string
  extension: string
  event_type: string
  ip_address: string
  user_agent: string
  metadata: Record<string, unknown> | null
  created_at: string
  [key: string]: unknown
}

export interface AuthEventsResponse {
  success: boolean
  message: string
  total: number
  data: AuthEventRecord[]
}

export interface ActiveUser {
  user_id: number
  first_name: string
  last_name: string
  device_type: string
  browser: string
  os: string
  ip_address: string
  last_active_at: string
  [key: string]: unknown
}

export interface ActiveUsersResponse {
  success: boolean
  data: {
    count: number
    users: ActiveUser[]
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const loginHistoryService = {
  getHistory: (params: {
    start_date?: string
    end_date?: string
    user_id?: number
    extension?: string
    ip?: string
    lower_limit?: number
    upper_limit?: number
  }) => api.post<LoginHistoryResponse>('/login-history', params),

  getAuthEvents: (params: {
    event_type?: string
    user_id?: number
    ip?: string
    start_date?: string
    end_date?: string
    lower_limit?: number
    upper_limit?: number
  }) => api.post<AuthEventsResponse>('/admin/auth-events', params),

  getActiveUsers: () =>
    api.get<ActiveUsersResponse>('/admin/auth-events/active-users'),
}
