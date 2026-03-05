import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const campaignService = {
  // Paginated list — POST /campaign (supports start/limit/title search)
  list: (params: TableParams) =>
    api.post('/campaign', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { title: params.search } : {}),
    }),

  // Full list (no pagination) — used in dialer campaign selector
  getAll: () =>
    api.get('/campaigns'),

  getById: (id: number) =>
    api.post('/campaign-by-id', { campaign_id: id }),

  create: (data: Record<string, unknown>) =>
    api.post('/add-campaign', data),

  update: (data: Record<string, unknown>) =>
    api.post('/edit-campaign', data),

  delete: (id: number) =>
    api.post('/delete-campaign', { campaign_id: id }),

  toggle: (id: number, status: string) =>
    api.post('/status-update-campaign', { campaign_id: id, status }),

  copy: (id: number) =>
    api.post('/copy-campaign', { campaign_id: id }),

  getTypes: () =>
    api.get('/campaign-type'),
}
