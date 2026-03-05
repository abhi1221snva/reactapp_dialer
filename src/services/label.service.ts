import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const labelService = {
  // Paginated list — POST /label
  list: (params: TableParams) =>
    api.post('/label', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { title: params.search } : {}),
    }),

  // All labels without pagination (for reorder view)
  listAll: () => api.post('/label', {}),

  // Create — POST /add-label (title only), then POST /status-update-label
  // Backend addLabel only inserts title; status must be set in a second call
  create: async (title: string, status: number) => {
    const res = await api.post('/add-label', { title })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newId = (res as any).data?.data?.id as number | undefined
    if (newId) {
      await api.post('/status-update-label', { listId: newId, status })
    }
    return res
  },

  // Edit — POST /edit-label for title; POST /status-update-label if status changed
  update: async (labelId: number, title: string, newStatus: number, currentStatus: number | null) => {
    const res = await api.post('/edit-label', { label_id: labelId, title })
    if (newStatus !== currentStatus) {
      await api.post('/status-update-label', { listId: labelId, status: newStatus })
    }
    return res
  },

  // Toggle active/inactive — POST /status-update-label
  // NOTE: backend uses 'listId' field name (not labelId) — intentional
  toggleStatus: (labelId: number, status: number) =>
    api.post('/status-update-label', { listId: labelId, status }),

  // Soft delete — POST /edit-label with is_deleted: "1"
  delete: (labelId: number) =>
    api.post('/edit-label', { label_id: labelId, is_deleted: '1' }),

  // Reorder — POST /label/updateDisplayOrder
  // display_order = ordered array of label IDs e.g. [3, 1, 2]
  updateDisplayOrder: (orderedIds: number[]) =>
    api.post('/label/updateDisplayOrder', { display_order: orderedIds }),
}
