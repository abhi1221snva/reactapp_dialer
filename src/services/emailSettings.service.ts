import api from '../api/axios'

export type EmailMailType = 'online application' | 'notification' | 'submission' | 'marketing_campaigns'
export type EmailDriver    = 'Sendgrid' | 'Zoho' | 'Google' | 'Mailgun' | 'SES' | 'Sendpulse' | 'Custom'

export interface EmailSetting {
  id: number
  mail_type: EmailMailType
  mail_driver: EmailDriver | string
  mail_host: string
  mail_port: number | string
  mail_username: string
  mail_password?: string          // hidden server-side; won't be returned on read
  mail_encryption: string
  sender_email: string
  sender_name: string
  send_email_via: 'user_email' | 'custom'
  status: number                  // 1 = active, 0 = inactive
  meta_json?: string
  created_at?: string
  updated_at?: string
}

export interface EmailSettingPayload {
  mail_type: EmailMailType
  mail_driver: string
  mail_host?: string
  mail_port?: number
  mail_username: string
  mail_password: string
  mail_encryption?: string
  sender_email: string
  sender_name?: string
  send_email_via?: 'user_email' | 'custom'
  meta_json?: string
}

export interface TestEmailPayload {
  config: {
    mail_host: string
    mail_port: number
    mail_username: string
    mail_password: string
    mail_encryption: string
    sender_email: string
    sender_name?: string
  }
  test_to: string
}

export const emailSettingsService = {
  // List all (returns { list: EmailSetting[], grouped: {...} })
  list: () =>
    api.get<{ data: { list: EmailSetting[]; grouped: Record<string, EmailSetting | null> } }>('/crm/email-settings'),

  show: (id: number) =>
    api.get<{ data: EmailSetting }>(`/crm/email-settings/${id}`),

  create: (payload: EmailSettingPayload) =>
    api.post('/crm/email-settings', payload),

  update: (id: number, payload: Partial<EmailSettingPayload>) =>
    api.put(`/crm/email-settings/${id}`, payload),

  delete: (id: number) =>
    api.delete(`/crm/email-settings/${id}`),

  toggle: (id: number) =>
    api.post(`/crm/email-settings/${id}/toggle`, {}),

  testEmail: (payload: TestEmailPayload) =>
    api.post<{ success: boolean; message: string }>('/crm/email-settings/test', payload),
}

// ── Driver presets (mirrors backend) ─────────────────────────────────────────
export const DRIVER_PRESETS: Record<string, { mail_host: string; mail_port: number; mail_encryption: string }> = {
  Sendgrid:  { mail_host: 'smtp.sendgrid.net',                      mail_port: 587, mail_encryption: 'TLS' },
  Zoho:      { mail_host: 'smtp.zoho.com',                          mail_port: 587, mail_encryption: 'TLS' },
  Google:    { mail_host: 'smtp.gmail.com',                         mail_port: 587, mail_encryption: 'TLS' },
  Mailgun:   { mail_host: 'smtp.mailgun.org',                       mail_port: 587, mail_encryption: 'TLS' },
  SES:       { mail_host: 'email-smtp.us-east-1.amazonaws.com',     mail_port: 587, mail_encryption: 'TLS' },
  Sendpulse: { mail_host: 'smtp-pulse.com',                         mail_port: 587, mail_encryption: 'TLS' },
  Custom:    { mail_host: '',                                        mail_port: 587, mail_encryption: 'TLS' },
}

export const MAIL_TYPES: { value: EmailMailType; label: string }[] = [
  { value: 'notification',        label: 'Notifications' },
  { value: 'online application',  label: 'Online Applications' },
  { value: 'submission',          label: 'Submissions' },
  { value: 'marketing_campaigns', label: 'Marketing Campaigns' },
]
