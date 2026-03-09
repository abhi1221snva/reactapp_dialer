import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const extensiongroupService = {
  list: (params: TableParams) =>
    api.get('/extension-group', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
      },
    }),
  getById: (id: number) => api.get(`/extension-group/${id}`),
  create: (data: Record<string, unknown>) => api.put('/extension-group', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch('/extension-group-update', { group_id: id, ...data }),
  delete: (id: number) =>
    api.delete('/extension-group-delete', { data: { group_id: id } }),
  updateStatus: (id: number, status: boolean) =>
    api.post('/status-update-group', { listId: id, status }),
  deleteExtensionFromGroup: (groupId: number, extensionId: number) =>
    api.post('/extension/deleteFromGroup', { group_id: groupId, extension_id: extensionId }),
  getExtensions: () => api.get('/extension'),
}
