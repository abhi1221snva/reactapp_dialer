import api from '../api/axios'

export interface EmailTemplatePayload {
  template_name: string
  template_html: string
  subject?: string
  type?: string
}

export const emailTemplateService = {
  /** List all email templates — GET /email-templates */
  list: () =>
    api.get('/email-templates'),

  /** Get single template — GET /email-template/{id} */
  show: (id: number) =>
    api.get(`/email-template/${id}`),

  /** Create template — PUT /email-template */
  create: (data: EmailTemplatePayload) =>
    api.put('/email-template', data),

  /** Update template — POST /email-template/{id} */
  update: (id: number, data: Partial<EmailTemplatePayload>) =>
    api.post(`/email-template/${id}`, data),

  /** Delete template — DELETE /email-template/{id} */
  delete: (id: number) =>
    api.delete(`/email-template/${id}`),

  /** Toggle status — POST /status-update-email-template */
  toggleStatus: (id: number, status: number) =>
    api.post('/status-update-email-template', { listId: id, status }),
}
