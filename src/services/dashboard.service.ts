import api from '../api/axios'

export const dashboardService = {
  getStats: (data?: { date_from?: string; date_to?: string }) =>
    api.post('/dashboard', data || {}),

  getCrmDashboard: () =>
    api.post('/crm-dashboard', {}),

  getCdrSummary: (data?: { date_from?: string; date_to?: string }) =>
    api.post('/cdr-dashboard-summary', data || {}),

  getDailyReport: (data?: { date_from?: string; date_to?: string; campaign_id?: number }) =>
    api.post('/daily-call-report', data || {}),

  getDispositionReport: (data?: { date_from?: string; date_to?: string; campaign_id?: number }) =>
    api.post('/disposition-wise-call', data || {}),

  getStateReport: (data?: { date_from?: string; date_to?: string; campaign_id?: number }) =>
    api.post('/state-wise-call', data || {}),

  getRevenueMetrics: (data?: { period?: string; start_date?: string; end_date?: string }) =>
    api.post('/dashboard/revenue-metrics', data || { period: 'month' }),
}
