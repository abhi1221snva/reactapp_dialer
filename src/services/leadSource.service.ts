import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export interface LeadSourceConfigPayload {
  title: string
  description: string
  list_id: number | ''
}

export const leadSourceService = {
  /** List lead source configs — POST /lead-source-configs */
  list: (params: TableParams) =>
    api.post('/lead-source-configs', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    }),

  /** Create lead source config — PUT /lead-source-config */
  create: (data: LeadSourceConfigPayload & { api_key: string; client_id: number }) =>
    api.put('/lead-source-config', data),

  /** Update lead source config — POST /update-lead-source-config/{id} */
  update: (id: number, data: LeadSourceConfigPayload) =>
    api.post(`/update-lead-source-config/${id}`, data),

  /** Delete lead source config — GET /delete-lead-source-config/{id} */
  delete: (id: number) =>
    api.get(`/delete-lead-source-config/${id}`),

  /** Get CRM lists for dropdown — GET /crm-lists */
  getLists: () =>
    api.get('/crm-lists'),
}
