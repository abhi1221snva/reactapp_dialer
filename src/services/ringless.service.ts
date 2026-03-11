import api from '../api/axios'

export const ringlessService = {
  // Campaigns
  list: (params: { start?: number; limit?: number; title?: string }) =>
    api.get('/ringless/campaign', { params }),

  getById: (id: number) =>
    api.post('/ringless/campaign/show', { campaign_id: id }),

  create: (data: Record<string, unknown>) =>
    api.post('/ringless/campaign/add', data),

  update: (data: Record<string, unknown>) =>
    api.post('/ringless/campaign/edit', data),

  delete: (id: number) =>
    api.post('/ringless/campaign/delete', { campaign_id: id }),

  toggle: (id: number, status: number) =>
    api.post('/ringless/campaign/update-status', { campaign_id: id, status }),

  copy: (id: number) =>
    api.post('/ringless/campaign/copy', { campaign_id: id }),

  // Dropdown data
  getVoiceTemplates: () => api.get('/voice-templete'),
  getVoipConfigs: () => api.get('/voip-configurations'),
  getCountryCodes: () => api.post('/country-list', {}),

  // Reports
  getReport: (params: Record<string, unknown>) =>
    api.post('/ringless/reports/call-data', params),
}
