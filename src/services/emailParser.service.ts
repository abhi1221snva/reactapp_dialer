import api from '../api/axios'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ParsedAttachment {
  id: number
  gmail_message_id: string
  gmail_attachment_id: string
  user_id: number
  thread_id: string | null
  email_from: string | null
  email_subject: string | null
  email_date: string | null
  filename: string
  mime_type: string
  file_size: number
  local_path: string | null
  doc_type: 'application' | 'bank_statement' | 'void_cheque' | 'invoice' | 'unknown' | 'pending'
  classification_confidence: number | null
  classification_method: 'ai_vision' | 'keyword' | 'manual' | null
  parse_status: 'pending' | 'parsing' | 'parsed' | 'failed'
  parser_response: Record<string, unknown> | null
  error_message: string | null
  linked_lead_id: number | null
  linked_application_id: number | null
  application?: ParsedApplication | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface ParsedApplication {
  id: number
  attachment_id: number
  gmail_message_id: string
  user_id: number
  business_name: string | null
  business_dba: string | null
  owner_first_name: string | null
  owner_last_name: string | null
  owner_email: string | null
  owner_phone: string | null
  owner_ssn_last4: string | null
  business_ein: string | null
  business_address: string | null
  business_city: string | null
  business_state: string | null
  business_zip: string | null
  business_type: string | null
  annual_revenue: number | null
  monthly_revenue: number | null
  requested_amount: number | null
  use_of_funds: string | null
  time_in_business: string | null
  confidence_score: number | null
  raw_extraction: Record<string, unknown> | null
  extraction_model: string
  status: 'parsed' | 'review' | 'accepted' | 'rejected' | 'lead_created'
  lead_id: number | null
  reviewed_by: number | null
  reviewed_at: string | null
  attachment?: ParsedAttachment | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface ParserStatus {
  by_parse_status: Record<string, number>
  by_doc_type: Record<string, number>
  total_attachments: number
  total_applications: number
  pending_review: number
  leads_created: number
  [key: string]: unknown
}

export interface AuditLogEntry {
  id: number
  user_id: number | null
  action: string
  entity_type: string | null
  entity_id: number | null
  gmail_message_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  [key: string]: unknown
}

export interface LenderConversation {
  id: number
  lead_id: number
  lender_id: number
  gmail_message_id: string
  gmail_thread_id: string | null
  direction: 'inbound' | 'outbound'
  from_email: string
  to_email: string | null
  subject: string | null
  body_preview: string | null
  has_attachments: boolean
  attachment_count: number
  attachment_filenames: string[] | null
  detected_merchant_name: string | null
  detection_source: 'subject' | 'body' | 'both' | null
  offer_detected: boolean
  offer_details: Record<string, unknown> | null
  conversation_date: string
  activity_id: number | null
  note_id: number | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface LenderEmailStats {
  total_conversations: number
  offers_detected: number
  inbound: number
  outbound: number
  by_lender: Array<{ lender_id: number; lender_name: string; count: number }>
  [key: string]: unknown
}

export interface LenderScanResult {
  total_emails_scanned: number
  lender_matches: number
  conversations_logged: number
  offers_detected: number
  [key: string]: unknown
}

// ── Service ─────────────────────────────────────────────────────────────────

export const emailParserService = {
  // Dashboard
  getStatus: () =>
    api.get<{ data: ParserStatus }>('/email-parser/status'),

  triggerScan: (query?: string) =>
    api.post('/email-parser/scan', query ? { query } : {}),

  // Attachments
  getAttachments: (params: {
    page?: number
    per_page?: number
    doc_type?: string
    parse_status?: string
    search?: string
  }) => api.get('/email-parser/attachments', { params }),

  getAttachment: (id: number) =>
    api.get(`/email-parser/attachments/${id}`),

  reclassifyAttachment: (id: number, doc_type: string) =>
    api.post(`/email-parser/attachments/${id}/reclassify`, { doc_type }),

  reparseAttachment: (id: number) =>
    api.post(`/email-parser/attachments/${id}/reparse`),

  downloadAttachmentUrl: (id: number) =>
    `/email-parser/attachments/${id}/download`,

  // Applications
  getApplications: (params: {
    page?: number
    per_page?: number
    status?: string
    search?: string
  }) => api.get('/email-parser/applications', { params }),

  getApplication: (id: number) =>
    api.get(`/email-parser/applications/${id}`),

  deleteApplication: (id: number) =>
    api.delete(`/email-parser/applications/${id}`),

  getApplicationPdfUrl: (id: number) =>
    `/email-parser/applications/${id}/pdf`,

  getAvailableApplications: () =>
    api.get('/email-parser/available-applications'),

  createLead: (applicationId: number, overrides?: Record<string, unknown>) =>
    api.post('/email-parser/create-lead', {
      application_id: applicationId,
      overrides: overrides ?? {},
    }),

  // Audit log
  getAuditLog: (params: {
    page?: number
    per_page?: number
    action?: string
  }) => api.get('/email-parser/audit-log', { params }),

  // ── Lender Email Intelligence ──────────────────────────────────────────────

  scanLenderEmails: (query?: string) =>
    api.post('/lender-email/scan', query ? { query } : {}),

  getLenderConversations: (params: {
    page?: number
    per_page?: number
    lead_id?: number
    lender_id?: number
    offer_detected?: boolean
    search?: string
  }) => api.get('/lender-email/conversations', { params }),

  getLenderConversation: (id: number) =>
    api.get(`/lender-email/conversations/${id}`),

  getLenderEmailStats: () =>
    api.get('/lender-email/stats'),

  getLeadLenderConversations: (leadId: number) =>
    api.get(`/lender-email/lead/${leadId}`),
}
