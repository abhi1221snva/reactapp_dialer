import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export interface DispositionPayload {
  title: string
  d_type: string
  enable_sms: number
  status: number
}

export const dispositionService = {
  // POST /disposition → { success, message, total_rows, data[] }
  list: (params: TableParams) =>
    api.post('/disposition', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { title: params.search } : {}),
      ...(params.filters.status !== undefined && params.filters.status !== ''
        ? { status: params.filters.status }
        : {}),
    }),

  // POST /add-disposition — inserts title, d_type, enable_sms (NOT status)
  // Status requires a separate call to /status-update-disposition
  create: async (payload: DispositionPayload) => {
    const res = await api.post('/add-disposition', {
      title: payload.title,
      d_type: payload.d_type,
      enable_sms: payload.enable_sms,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newId = (res as any).data?.data?.id as number | undefined
    if (newId !== undefined) {
      await api.post('/status-update-disposition', { listId: newId, status: payload.status })
    }
    return res
  },

  // POST /edit-disposition — updates title, d_type, enable_sms
  // Status change requires separate call to /status-update-disposition
  update: async (
    dispositionId: number,
    payload: DispositionPayload,
    currentStatus: number,
  ) => {
    const res = await api.post('/edit-disposition', {
      disposition_id: dispositionId,
      title: payload.title,
      d_type: payload.d_type,
      enable_sms: payload.enable_sms,
    })
    if (payload.status !== currentStatus) {
      await api.post('/status-update-disposition', { listId: dispositionId, status: payload.status })
    }
    return res
  },

  // POST /status-update-disposition — NOTE: backend uses 'listId' (not dispositionId)
  toggleStatus: (dispositionId: number, newStatus: number) =>
    api.post('/status-update-disposition', { listId: dispositionId, status: newStatus }),

  // Soft delete — POST /edit-disposition with is_deleted: 1
  delete: (dispositionId: number) =>
    api.post('/edit-disposition', { disposition_id: dispositionId, is_deleted: 1 }),
}
