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

  // Send MMS — sends message with media file attachment
  sendMms: (data: { from: string; to: string; message: string; mms_file: File }) => {
    const formData = new FormData()
    formData.append('from', data.from)
    formData.append('to', data.to)
    formData.append('message', data.message)
    formData.append('date', new Date().toISOString().slice(0, 19).replace('T', ' '))
    formData.append('mms_file', data.mms_file)
    return api.post('/send-sms', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // List DIDs assigned to current user with SMS capability
  getDids: () =>
    api.get('/sms_did_list'),

  // Mark thread as read
  markRead: (thread_id: number) =>
    api.post('/sms/mark-read', { thread_id }),
}
