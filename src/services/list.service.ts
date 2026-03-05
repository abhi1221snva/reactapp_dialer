import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const listService = {
  // Paginated list of all lists — POST /raw-list
  list: (params: TableParams) =>
    api.post('/raw-list', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { title: params.search } : {}),
    }),

  // Get list by id — POST /raw-list with list_id returns single object
  getById: (listId: number) =>
    api.post('/raw-list', { list_id: listId }),

  // Create list via file upload — POST /add-list-api (multipart)
  // Do NOT set Content-Type manually; let Axios set it with the boundary automatically
  create: (data: FormData) =>
    api.post('/add-list-api', data),

  // Edit list — POST /edit-list
  update: (data: Record<string, unknown>) =>
    api.post('/edit-list', data),

  // Toggle status — POST /status-update-list
  toggleStatus: (listId: number, campaignId: number, status: number) =>
    api.post('/status-update-list', { listId, campaign_id: campaignId, status }),

  // Delete list — POST /edit-list with is_deleted: 1
  delete: (listId: number, campaignId: number) =>
    api.post('/edit-list', { list_id: listId, campaign_id: campaignId, is_deleted: 1 }),

  // Paginated leads for a list — POST /list-data/{id}/content
  getLeads: (listId: number, params: { start: number; limit: number; search?: string }) =>
    api.post(`/list-data/${listId}/content`, {
      start: params.start,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    }),

  // Get list headers
  getHeaders: (listId: number) =>
    api.post('/list-header', { id: listId, list_data: [0] }),
}
