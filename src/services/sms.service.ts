import api from '../api/axios'

export const smsService = {
  // List unique conversations for a DID (grouped by contact number)
  getConversations: (did_id: number) =>
    api.post('/sms-conversations-by-did', { did_id }),

  // Get message thread between a DID and a contact number
  getThread: (did_id: number, contact_number: string) =>
    api.post('/sms-thread-by-did', { did_id, contact_number }),

  // Send SMS — requires the DID phone number as `from` and current date
  send: (data: { from: string; to: string; message: string }) =>
    api.post('/send-sms', {
      from: data.from,
      to: data.to,
      message: data.message,
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }),

  // List DIDs assigned to current user with SMS capability
  getDids: () =>
    api.get('/sms_did_list'),

  // Mark thread as read
  markRead: (thread_id: number) =>
    api.post('/sms/mark-read', { thread_id }),
}
