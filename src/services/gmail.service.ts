import api from '../api/axios'

export const gmailService = {
  getStatus: () => api.get('/gmail/status'),

  listEmails: (params: {
    folder?: string
    limit?: number
    page_token?: string
    q?: string
  }) => api.get('/gmail/mailbox', { params }),

  getEmail: (messageId: string) =>
    api.get(`/gmail/mailbox/${messageId}`),

  sendEmail: (data: {
    to: string
    subject: string
    body: string
    cc?: string
    bcc?: string
  }) => api.post('/gmail/mailbox/send', data),

  starEmail:   (messageId: string) => api.post(`/gmail/mailbox/${messageId}/star`),
  unstarEmail: (messageId: string) => api.post(`/gmail/mailbox/${messageId}/unstar`),
  trashEmail:  (messageId: string) => api.post(`/gmail/mailbox/${messageId}/trash`),
  deleteEmail: (messageId: string) => api.delete(`/gmail/mailbox/${messageId}`),
  markAsRead:  (messageId: string) => api.post(`/gmail/mailbox/${messageId}/read`),
  markAsUnread:(messageId: string) => api.post(`/gmail/mailbox/${messageId}/unread`),
  getLabels:   ()                  => api.get('/gmail/mailbox/labels'),
}
