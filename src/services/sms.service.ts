import api from '../api/axios'

export const smsService = {
  // B9 fixed: was GET /sms/conversations → backend is POST /sms-by-did
  getConversations: (did_id: number) =>
    api.post('/sms-by-did', { did_id }),

  // B10 fixed: was GET /sms/thread → backend is POST /sms-by-did-recent
  getThread: (did_id: number, contact_number: string) =>
    api.post('/sms-by-did-recent', { did_id, contact_number }),

  // B11 fixed: was POST /sms/send → backend is POST /send-sms
  send: (data: { did_id: number; to: string; message: string }) =>
    api.post('/send-sms', { ...data, to_number: data.to }),

  // B12 fixed: was GET /sms/dids → backend is GET /sms_did_list
  getDids: () =>
    api.get('/sms_did_list'),

  // B13 fixed: was POST /sms/mark-read (missing) → added route in backend
  markRead: (thread_id: number) =>
    api.post('/sms/mark-read', { thread_id }),
}
