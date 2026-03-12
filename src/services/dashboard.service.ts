import api from '../api/axios'

function toDateTime(date: string, endOfDay = false): string {
  return `${date} ${endOfDay ? '23:59:59' : '00:00:00'}`
}

export const dashboardService = {
  getStats: (data?: { date_from?: string; date_to?: string }) =>
    api.post('/dashboard', data || {}),

  getCrmDashboard: () =>
    api.post('/crm-dashboard', {}),

  getCdrSummary: (data?: { date_from?: string; date_to?: string; userId?: number[] }) =>
    api.post('/cdr-dashboard-summary', data ? {
      startTime: data.date_from ? toDateTime(data.date_from) : undefined,
      endTime:   data.date_to   ? toDateTime(data.date_to, true) : undefined,
      userId:    data.userId,
    } : {}),

  getDailyReport: (data?: { date_from?: string; date_to?: string; campaign_id?: number }) =>
    api.post('/daily-call-report', data || {}),

  getDispositionReport: (data?: { date_from?: string; date_to?: string; campaign_id?: number }) =>
    api.post('/disposition-wise-call', data ? {
      startTime: data.date_from ? toDateTime(data.date_from) : undefined,
      endTime:   data.date_to   ? toDateTime(data.date_to, true) : undefined,
      campaign_id: data.campaign_id,
    } : {}),

  getStateReport: (data?: { date_from?: string; date_to?: string; campaign_id?: number }) =>
    api.post('/state-wise-call', data || {}),

  getRevenueMetrics: (data?: { period?: string; start_date?: string; end_date?: string }) =>
    api.post('/dashboard/revenue-metrics', data || { period: 'month' }),
}
