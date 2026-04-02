import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const leadSourceService = {
  list: (params: TableParams) =>
    api.get('/lead-source', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
      },
    }),

  create: (data: { url: string; source_title: string }) =>
    api.put('/add-lead-source', data),

  update: (id: number, data: { url: string; source_title: string }) =>
    api.post(`/update-lead-sources/${id}`, data),
}
