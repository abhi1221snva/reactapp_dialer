import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const voicemailService = {
  // Voice Mail Drops
  list: (params: TableParams) =>
    api.get('/view-voicemail', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
      },
    }),
  create: (data: Record<string, unknown>) => api.post('/add-voice-mail-drop', data),
  getById: (id: number) => api.post('/edit-voicemail', { voicemail_id: id }),
  update: (data: Record<string, unknown>) => api.post('/update-voiemail', data),
  delete: (id: number) => api.post('/delete-voicemail', { voicemail_id: id }),
  sendToEmail: (email: string, filePath: string) =>
    api.post('/send-vm-to-email', { email, file_name_path: filePath }),

  // Mailbox
  getMailbox: (params: {
    start_date?: string
    end_date?: string
    extension?: string
    lower_limit?: number
    upper_limit?: number
  }) => api.post('/mailbox', params),
  editMailbox: (id: number, status: number) =>
    api.post('/edit-mailbox', { mailbox_id: id, status }),
  deleteMailbox: (id: number) => api.post('/delete-mailbox', { mailbox_id: id }),
  getUnreadMailbox: () => api.post('/unread-mailbox', {}),
}
