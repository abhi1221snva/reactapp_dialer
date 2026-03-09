import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const ringgroupService = {
  list: (params: TableParams) =>
    api.post('/ring-group', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    }),
  getById: (id: number) => api.post('/ring-group-by-id', { ring_id: id }),
  create: (data: Record<string, unknown>) => api.post('/add-ring-group', data),
  update: (data: Record<string, unknown>) => api.post('/edit-ring-group', data),
  delete: (id: number) => api.post('/delete-ring-group', { ring_id: id }),
  getExtensions: () => api.get('/extension'),
}
