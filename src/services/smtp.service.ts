import api from '../api/axios'

// ── Types ────────────────────────────────────────────────────────────────────

export type SmtpSenderType = 'default' | 'user' | 'campaign' | 'system'

export interface SmtpSetting {
  id: number
  mail_driver: string
  mail_host: string
  mail_port: string | number
  mail_username: string
  mail_password?: string
  mail_encryption: string
  sender_type: SmtpSenderType
  from_email: string
  from_name: string
  user_id?: number | null
  campaign_id?: number | null
  status?: number
  created_at?: string
  updated_at?: string
}

export interface SmtpPayload {
  mail_driver: string
  mail_host: string
  mail_port: string
  mail_username: string
  mail_password: string
  mail_encryption: string
  sender_type: SmtpSenderType
  from_email?: string
  from_name?: string
  user_id?: number | null
  campaign_id?: number | null
}

// ── Service ──────────────────────────────────────────────────────────────────

export const smtpService = {
  /** List all SMTP settings (supports ?search=, ?start=, ?limit=) */
  list: (params?: { search?: string; start?: number; limit?: number }) =>
    api.get('/smtps', { params }),

  /** Get a single SMTP setting by ID */
  show: (id: number) =>
    api.get<{ data: SmtpSetting }>(`/smtp/${id}`),

  /** Create a new SMTP setting (PUT /smtp) */
  create: (payload: SmtpPayload) =>
    api.put('/smtp', payload),

  /** Update an existing SMTP setting (POST /smtp/{id}) */
  update: (id: number, payload: Partial<SmtpPayload>) =>
    api.post(`/smtp/${id}`, payload),

  /** Delete an SMTP setting */
  delete: (id: number) =>
    api.delete(`/smtp/${id}`),

  /** Query by sender type */
  getByType: (senderType: SmtpSenderType, params?: { campaign_id?: number; user_id?: number }) =>
    api.get(`/smtp/type/${senderType}`, { params }),

  /** Toggle status (active/inactive) */
  toggleStatus: (id: number, status: number) =>
    api.post('/status-update-smtp', { listId: id, status: String(status) }),
}

// ── Driver presets ───────────────────────────────────────────────────────────

export const DRIVER_PRESETS: Record<string, { mail_host: string; mail_port: number; mail_encryption: string }> = {
  Sendgrid:  { mail_host: 'smtp.sendgrid.net',                  mail_port: 587, mail_encryption: 'TLS' },
  Zoho:      { mail_host: 'smtp.zoho.com',                      mail_port: 587, mail_encryption: 'TLS' },
  Google:    { mail_host: 'smtp.gmail.com',                     mail_port: 587, mail_encryption: 'TLS' },
  Mailgun:   { mail_host: 'smtp.mailgun.org',                   mail_port: 587, mail_encryption: 'TLS' },
  SES:       { mail_host: 'email-smtp.us-east-1.amazonaws.com', mail_port: 587, mail_encryption: 'TLS' },
  Sendpulse: { mail_host: 'smtp-pulse.com',                     mail_port: 587, mail_encryption: 'TLS' },
  Custom:    { mail_host: '',                                    mail_port: 587, mail_encryption: 'TLS' },
}

// ── Sender type labels ──────────────────────────────────────────────────────

export const SENDER_TYPES: { value: SmtpSenderType; label: string }[] = [
  { value: 'default',  label: 'Default' },
  { value: 'user',     label: 'User' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'system',   label: 'System' },
]
