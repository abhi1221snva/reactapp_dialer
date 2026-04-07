import api from '../api/axios'

export interface SmsTemplatePayload {
  templete_name: string
  templete_desc: string
}

export const smsTemplateService = {
  /** List all SMS templates — GET /sms-templete */
  list: () =>
    api.get('/sms-templete'),

  /** Create template — POST /add-sms-templete */
  create: (data: SmsTemplatePayload) =>
    api.post('/add-sms-templete', data),

  /** Update template — POST /edit-sms-templete */
  update: (id: number, data: SmsTemplatePayload) =>
    api.post('/edit-sms-templete', { templete_id: id, ...data }),

  /** Delete template — DELETE /sms-template/{id} */
  delete: (id: number) =>
    api.delete(`/sms-template/${id}`),

  /** Toggle status — POST /update-sms-templete-status */
  toggleStatus: (id: number, status: number) =>
    api.post('/update-sms-templete-status', { templete_id: id, status }),
}
