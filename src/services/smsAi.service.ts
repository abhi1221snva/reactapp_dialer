import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const smsAiService = {
  // ─── Campaigns ──────────────────────────────────────────────────────────────
  list: (params: TableParams) =>
    api.get('/smsai/campaigns', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
      },
    }),

  listAll: () => api.get('/smsai/campaigns'),

  create: (data: Record<string, unknown>) =>
    api.put('/smsai/campaign/add', data),

  show: (id: number) =>
    api.get(`/smsai/campaign/view/${id}`),

  update: (id: number, data: Record<string, unknown>) =>
    api.post(`/smsai/campaign/update/${id}`, data),

  copy: (id: number) =>
    api.post('/smsai/campaign/copy', { c_id: id }),

  updateStatus: (id: number, status: string) =>
    api.post('/smsai/campaign/update-status', { listId: id, status }),

  delete: (id: number) =>
    api.post('/smsai/campaign/delete', { campaign_id: id }),

  getCampaignLists: (id: number) =>
    api.post('/smsai/campaign-list', { campaign_id: id }),

  // ─── Lists ──────────────────────────────────────────────────────────────────
  listLists: (params: TableParams) =>
    api.get('/smsai/lists', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
      },
    }),

  createList: (data: Record<string, unknown>) =>
    api.put('/smsai/list/add', data),

  showList: (id: number) =>
    api.get(`/smsai/list/view/${id}`),

  updateList: (id: number, data: Record<string, unknown>) =>
    api.post(`/smsai/list/update/${id}`, data),

  updateListStatus: (id: number, status: string) =>
    api.post('/smsai/list/update-status', { listId: id, status }),

  deleteList: (id: number) =>
    api.get(`/smsai/list/delete/${id}`),

  recycleList: (id: number) =>
    api.get(`/smsai/list/recycle/${id}`),

  // ─── Templates ──────────────────────────────────────────────────────────────
  listTemplates: (params: TableParams) =>
    api.get('/smsai/templates', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
      },
    }),

  listAllTemplates: () => api.get('/smsai/templates'),

  createTemplate: (data: Record<string, unknown>) =>
    api.put('/smsai/template/add', data),

  showTemplate: (id: number) =>
    api.get(`/smsai/template/view/${id}`),

  updateTemplate: (id: number, data: Record<string, unknown>) =>
    api.post(`/smsai/template/update/${id}`, data),

  deleteTemplate: (id: number) =>
    api.get(`/smsai/template/delete/${id}`),

  updateTemplateStatus: (id: number, status: string) =>
    api.post('/smsai/template/update-status', { template_id: id, status }),

  // ─── Reports ────────────────────────────────────────────────────────────────
  listReports: (params: {
    start?: number
    length?: number
    search?: { value: string }
    start_date?: string
    end_date?: string
    draw?: number
  }) => api.post('/smsai/reports', params),

  listDailyReports: (params: {
    start_date?: string
    end_date?: string
    search?: string
    lower_limit?: number
    upper_limit?: number
  }) => api.post('/smsai/daily/reports', params),

  // ─── Wallet ─────────────────────────────────────────────────────────────────
  getWalletAmount: () =>
    api.get('/smsai/wallet/amount'),

  getWalletTransactions: (params?: { start?: number; limit?: number }) =>
    api.get('/smsai/wallet/transactions', { params }),
}
