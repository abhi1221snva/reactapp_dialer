import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const didService = {
  // Paginated list — POST /did
  list: (params: TableParams) =>
    api.post('/did', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    }),

  getById: (id: number) =>
    api.post('/get-did-by-id', { id }),

  create: (data: Record<string, unknown>) =>
    api.post('/add-did', data),

  update: (data: Record<string, unknown>) =>
    api.post('/save-edit-did', data),

  delete: (id: number) =>
    api.post('/delete-did', { id }),

  getDetail: (cli: string) =>
    api.post('/did_detail', { cli }),

  getExtensions: () =>
    api.get('/extension'),
}
