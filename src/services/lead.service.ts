import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const leadService = {
  // Paginated list — POST /leads
  list: (params: TableParams) =>
    api.post('/leads', {
      lower_limit: (params.page - 1) * params.limit,
      upper_limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
      ...(params.filters.lead_status ? { lead_status: params.filters.lead_status } : {}),
      ...(params.filters.assigned_to ? { assigned_to: [params.filters.assigned_to] } : {}),
    }),

  getById: (id: number) =>
    api.get(`/lead/${id}`),

  create: (data: Record<string, unknown>) =>
    api.put('/lead/add', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.post(`/lead/${id}/edit`, data),

  delete: (id: number) =>
    api.get(`/lead/${id}/delete`),

  getCrmLists: () =>
    api.get('/crm-lists'),

  getActivity: (leadId: number) =>
    api.get(`/documents/lead/${leadId}`),

  getLeadStatuses: () =>
    api.get('/lead-status'),

  getLeadSources: () =>
    api.get('/lead-source'),
}
