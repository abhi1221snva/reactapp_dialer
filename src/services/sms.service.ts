import api from '../api/axios'

export const smsService = {
  getConversations: (did_id: number) =>
    api.get(`/sms/conversations`, { params: { did_id } }),

  getThread: (did_id: number, contact_number: string) =>
    api.get(`/sms/thread`, { params: { did_id, contact_number } }),

  send: (data: { did_id: number; to: string; message: string }) =>
    api.post('/sms/send', data),

  getDids: () =>
    api.get('/sms/dids'),

  markRead: (thread_id: number) =>
    api.post(`/sms/mark-read`, { thread_id }),
}
