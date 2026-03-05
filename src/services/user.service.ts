import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const userService = {
  // Paginated list — GET /users (supports start/limit/search/status)
  list: (params: TableParams) =>
    api.get('/users', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
        ...(params.filters.status !== undefined && params.filters.status !== ''
          ? { status: params.filters.status }
          : {}),
      },
    }),

  getAll: () =>
    api.get('/users'),

  getById: (id: number) =>
    api.get(`/extension/${id}`),

  create: (data: Record<string, unknown>) =>
    api.put('/user', data),

  update: (data: Record<string, unknown>) =>
    api.post('/edit-extension-save', data),

  delete: (id: number) =>
    api.post('/delete-user', { user_id: id }),

  getGroups: () =>
    api.get('/extension-group'),

  getRoles: () =>
    api.get('/role'),
}
