import api from '../api/axios'

export interface PlaceholderDef {
  key: string
  label: string
  sample: string
}

export interface SystemEmailTemplate extends Record<string, unknown> {
  id: number
  template_key: string
  template_name: string
  subject: string
  body_html: string
  placeholders: PlaceholderDef[] | string | null
  is_active: boolean
  updated_by: number | null
  created_at: string
  updated_at: string
}

export interface CreatePayload {
  template_key: string
  template_name: string
  subject: string
  body_html: string
  placeholders?: PlaceholderDef[]
}

export interface UpdatePayload {
  template_name?: string
  subject?: string
  body_html?: string
  is_active?: boolean
}

export interface PreviewResult {
  subject: string
  html: string
}

export const systemEmailTemplateService = {
  getAll: () =>
    api.get<{ data: SystemEmailTemplate[] }>('/admin/email-templates'),

  getById: (id: number) =>
    api.get<{ data: SystemEmailTemplate }>(`/admin/email-templates/${id}`),

  create: (data: CreatePayload) =>
    api.post<{ data: SystemEmailTemplate }>('/admin/email-templates', data),

  update: (id: number, data: UpdatePayload) =>
    api.put<{ data: SystemEmailTemplate }>(`/admin/email-templates/${id}`, data),

  delete: (id: number) =>
    api.delete(`/admin/email-templates/${id}`),

  preview: (id: number, sampleData?: Record<string, string>) =>
    api.post<{ data: PreviewResult }>(`/admin/email-templates/${id}/preview`, {
      sample_data: sampleData ?? {},
    }),

  testSend: (id: number, toEmail: string) =>
    api.post(`/admin/email-templates/${id}/test-send`, { to_email: toEmail }),

  seed: () =>
    api.post<{ inserted: number }>('/admin/email-templates/seed'),
}
