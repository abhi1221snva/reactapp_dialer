import api from '../api/axios'

export const dashboardService = {
  getStats: (data?: { date_from?: string; date_to?: string }) =>
    api.post('/dashboard', data || {}),

  getCrmDashboard: () =>
    api.post('/crm-dashboard', {}),
}
