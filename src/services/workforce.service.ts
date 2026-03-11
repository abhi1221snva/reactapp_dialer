import api from '../api/axios'

export interface AgentRow {
  id: number
  name: string
  email: string
  extension: string
  dialer_status: 'available' | 'on_call' | 'on_break' | 'after_call_work' | 'offline'
  campaign_id: number | null
  login_time: string | null
  is_clocked_in: boolean
  is_on_break: boolean
  calls_today: number
  talk_time_today: number
  attendance_status: string
  status_since: string | null
}

export interface DashboardData {
  agents: AgentRow[]
  summary: {
    total: number
    clocked_in: number
    available: number
    on_call: number
    on_break: number
    after_call_work: number
    offline: number
  }
  staffing_warnings: Array<{
    campaign_id: number
    campaign_name: string
    required_agents: number
    available_agents: number
    shortage: number
    severity: 'warning' | 'critical'
  }>
  last_updated: string
}

export const workforceService = {
  // Phase 1: Dashboard
  getDashboard: () =>
    api.get<{ success: string; data: DashboardData }>('/workforce/dashboard'),

  getAgentStatus: (userId: number) =>
    api.get(`/workforce/agent-status/${userId}`),

  // Phase 3: Status sync
  updateAgentStatus: (userId: number, status: string, campaignId?: number) =>
    api.post('/workforce/agent-status', { user_id: userId, status, campaign_id: campaignId }),

  getAgentsOnline: () =>
    api.get('/workforce/agents-online'),

  // Phase 4: Campaign staffing
  getStaffing: () =>
    api.get('/workforce/campaign-staffing'),

  upsertStaffing: (data: { campaign_id: number; required_agents: number; min_agents: number }) =>
    api.post('/workforce/campaign-staffing', data),

  deleteStaffing: (campaignId: number) =>
    api.delete(`/workforce/campaign-staffing/${campaignId}`),

  // Phase 5: Break policies
  getBreakPolicies: () =>
    api.get('/workforce/break-policy'),

  upsertBreakPolicy: (data: { campaign_id?: number; max_concurrent_breaks: number; max_break_minutes: number }) =>
    api.post('/workforce/break-policy', data),

  deleteBreakPolicy: (id: number) =>
    api.delete(`/workforce/break-policy/${id}`),

  // Phase 8: Reports
  getProductivityReport: (params: {
    date_from: string
    date_to: string
    user_id?: number
    start?: number
    limit?: number
    export?: boolean
  }) => api.post('/workforce/report/productivity', params),

  getStaffingReport: (params: {
    date_from: string
    date_to: string
    campaign_id?: number
  }) => api.post('/workforce/report/staffing', params),

  getIdleReport: (params: {
    date_from: string
    date_to: string
    user_id?: number
  }) => api.post('/workforce/report/idle', params),

  // Phase 9: Analytics
  getAttendanceTrend: (days = 30) =>
    api.get(`/workforce/analytics/attendance-trend?days=${days}`),

  getCallVsAvailability: (days = 30) =>
    api.get(`/workforce/analytics/call-vs-availability?days=${days}`),

  getBreakDistribution: (days = 30) =>
    api.get(`/workforce/analytics/break-distribution?days=${days}`),

  getUtilizationTrend: (days = 30) =>
    api.get(`/workforce/analytics/utilization-trend?days=${days}`),

  getLeaderboard: (days = 7) =>
    api.get(`/workforce/analytics/leaderboard?days=${days}`),
}
