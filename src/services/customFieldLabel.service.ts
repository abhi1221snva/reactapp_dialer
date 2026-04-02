import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const customFieldLabelService = {
  // ── Labels ──────────────────────────────────
  list: (params: TableParams) =>
    api.get('/custom-field-labels', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
      },
    }),

  create: (data: { title: string }) =>
    api.put('/custom-field-label', data),

  update: (id: number, data: { title: string }) =>
    api.post(`/custom-field-label/${id}`, data),

  delete: (id: number) =>
    api.get(`/delete-custom-field-label/${id}`),

  // ── Values ──────────────────────────────────
  listValues: (params: TableParams) =>
    api.get('/custom-field-labels-values', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
      },
    }),

  getValuesByLabel: (labelId: number) =>
    api.get(`/custom-label-value/${labelId}`),

  createValue: (data: { custom_id: number; title_match: string; title_links?: string }) =>
    api.put('/custom-field-labels-value', data),

  updateValue: (id: number, data: { title_match: string; title_links?: string }) =>
    api.post(`/custom-field-value/${id}`, data),

  deleteValue: (id: number) =>
    api.get(`/delete-custom-field-value/${id}`),
}
