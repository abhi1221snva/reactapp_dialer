// ─── Core Lead Types ─────────────────────────────────────────────────────────

export interface CrmLead {
  id: number
  first_name: string
  last_name: string
  email?: string
  phone_number?: string
  gender?: string
  dob?: string
  city?: string
  state?: string
  country?: string
  address?: string
  lead_status: string
  assigned_to?: number
  assigned_name?: string
  lead_source_id?: number
  lead_type?: string
  company_name?: string
  unique_url?: string
  unique_token?: string
  opener_id?: number
  closer_id?: number
  group_id?: number
  is_deleted?: number
  created_at: string
  updated_at?: string
  // Dynamic EAV fields (option_N → column_name)
  [key: string]: unknown
}

// ─── Field Conditions (for conditional visibility) ────────────────────────────

export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'empty'

export interface FieldCondition {
  field: string          // column_name of the controlling field (e.g. "option_5")
  operator: ConditionOperator
  value: string          // comparison value (unused for not_empty / empty)
}

// ─── CRM Label (Dynamic Field Definition) — from crm_labels (new EAV arch) ───

export interface CrmLabel {
  id: number
  label_name: string      // display label (e.g. "First Name")
  field_key: string       // unique EAV key  (e.g. "first_name")
  field_type: string      // text|number|email|phone_number|date|textarea|dropdown|radio|checkbox
  section: string         // owner|contact|business|address|general…
  options?: string | null // JSON-encoded string array for dropdown/radio
  placeholder?: string
  conditions?: FieldCondition[] | null
  required: boolean
  display_order: number
  status: boolean
  created_at?: string
  updated_at?: string
}

/** Alias for semantic clarity in form-builder contexts */
export type LeadField = CrmLabel

// ─── Lead Status ──────────────────────────────────────────────────────────────

export interface LeadStatus {
  id: number
  lead_title: string
  lead_title_url: string
  color?: string
  color_code?: string
  display_order?: number
  status?: number | string
}

// ─── Email Template ───────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: number
  template_name: string
  subject: string
  template_html: string
  lead_status?: string
  send_bcc?: string
  status: 0 | 1
  created_at?: string
  updated_at?: string
}

// ─── SMS Template ─────────────────────────────────────────────────────────────

export interface SmsTemplate {
  id: number
  sms_template_name: string
  sms_template: string
  status: 0 | 1
  created_at?: string
  updated_at?: string
}

// ─── CRM Document ─────────────────────────────────────────────────────────────

export interface CrmDocument {
  id: number
  lead_id: number
  document_type: string
  file_name: string
  file_path: string
  file_size?: number | string
  uploaded_by?: number
  uploaded_by_name?: string
  created_at: string
}

// ─── Lender ───────────────────────────────────────────────────────────────────

export interface LenderApiCredentials {
  id?: number
  crm_lender_id?: number
  type?: string
  url?: string
  username?: string
  password?: string
  api_key?: string
  auth_url?: string
  partner_api_key?: string
  client_id?: string
  sales_rep_email?: string
}

export interface Lender {
  id: number
  lender_name: string
  email: string
  secondary_email?: string
  secondary_email2?: string
  contact_person?: string
  phone?: string
  status: 0 | 1
  api_status?: string | number
  address?: string
  state?: string
  city?: string
  industry?: string
  notes?: string
  min_avg_revenue?: number
  min_monthly_deposit?: number
  lender_api_type?: string
  created_at?: string
  updated_at?: string
}

export interface LenderSendRecord {
  id: number
  lender_id: number | string
  lead_id: number | string
  submitted_date: string
  lender_status_id?: string
  notes?: string
  user_id?: number
  lender_name?: string
  created_at?: string
}

// ─── Enhanced Lender Submission (crm_lender_submissions) ─────────────────────

export type LenderSubmissionStatus = 'pending' | 'submitted' | 'viewed' | 'approved' | 'declined' | 'no_response'
export type LenderResponseStatus   = 'pending' | 'approved' | 'declined' | 'needs_documents' | 'no_response'

export interface LenderSubmission {
  id: number
  lead_id: number
  lender_id: number
  lender_name?: string
  lender_email?: string
  application_pdf?: string
  submission_status: LenderSubmissionStatus
  response_status: LenderResponseStatus
  notes?: string
  response_note?: string
  submitted_by?: number
  submitted_at?: string
  response_received_at?: string
  created_at: string
  updated_at?: string
}

export interface SubmitApplicationPayload {
  lender_ids: number[]
  notes?: string
  pdf_path?: string
}

export interface UpdateSubmissionResponsePayload {
  response_status: LenderResponseStatus
  submission_status?: LenderSubmissionStatus
  response_note?: string
}

// ─── Automation Rule ─────────────────────────────────────────────────────────

export type AutomationTrigger =
  | 'lead_created'
  | 'status_changed'
  | 'lead_assigned'
  | 'document_uploaded'
  | 'approval_granted'
  | 'approval_declined'
  | 'lead_updated'

export type AutomationAction =
  | 'send_email'
  | 'send_sms'
  | 'assign_to'
  | 'change_status'
  | 'add_note'
  | 'notify_agent'

export interface AutomationRule {
  id: number
  name: string
  trigger: AutomationTrigger
  trigger_conditions?: Record<string, unknown>
  action: AutomationAction
  action_config: Record<string, unknown>
  status: 0 | 1
  run_count: number
  last_run_at?: string
  created_at: string
  updated_at?: string
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

export type ActivityType =
  | 'status_change'
  | 'field_update'
  | 'note_added'
  | 'document_uploaded'
  | 'task_created'
  | 'task_completed'
  | 'lender_submitted'
  | 'lender_response'
  | 'email_sent'
  | 'sms_sent'
  | 'call_made'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_declined'
  | 'affiliate_created'
  | 'merchant_accessed'
  | 'lead_created'
  | 'lead_imported'
  | 'lead_assigned'
  | 'webhook_triggered'
  | 'system'

export interface LeadActivity {
  id: number
  lead_id: number
  user_id?: number
  activity_type: ActivityType
  subject: string
  body?: string
  meta?: Record<string, unknown>
  source_type: 'crm_log' | 'crm_notifications' | 'manual' | 'api'
  source_id?: number
  is_pinned: 0 | 1
  created_at: string
  updated_at?: string
  user?: { id: number; name: string }
  user_name?: string
}

export interface ActivityTimelineResponse {
  items: LeadActivity[]
  total: number
  has_more: boolean
}

// ─── Status History ───────────────────────────────────────────────────────────

export interface LeadStatusHistory {
  id: number
  lead_id: number
  user_id: number
  from_status?: string
  to_status: string
  from_assigned_to?: number
  to_assigned_to?: number
  reason?: string
  triggered_by: 'agent' | 'system' | 'webhook' | 'bulk_operation' | 'api'
  created_at: string
  user?: { name: string }
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'declined' | 'withdrawn' | 'expired'
export type ApprovalType = 'funding' | 'lender_submission' | 'document_review' | 'status_override' | 'custom'

export interface LeadApproval {
  id: number
  lead_id: number
  requested_by: number
  reviewed_by?: number
  approval_type: ApprovalType
  approval_stage?: string
  status: ApprovalStatus
  request_note?: string
  review_note?: string
  requested_amount?: number
  approved_amount?: number
  expires_at?: string
  reviewed_at?: string
  created_at: string
  updated_at?: string
  // Backend returns flat name fields
  requested_by_name?: string
  reviewed_by_name?: string
  // Legacy nested form (kept for compatibility)
  requester?: { name: string }
  reviewer?: { name: string }
}

// ─── Affiliate Links ──────────────────────────────────────────────────────────

export interface AffiliateLink {
  id: number
  user_id: number
  client_id: number
  extension_id: string
  token: string
  full_path: string
  label?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  status: 0 | 1
  total_clicks: number
  total_leads: number
  list_id?: number
  expires_at?: string
  created_at: string
  updated_at?: string
  user_name?: string
}

export interface AffiliateLinkStats {
  total_clicks: number
  total_leads: number
  conversion_rate: number
  clicks_by_day: { date: string; clicks: number; leads: number }[]
}

// ─── Merchant Portal ──────────────────────────────────────────────────────────

export interface MerchantPortal {
  id: number
  lead_id: number
  client_id: number
  token: string
  url: string
  status: 0 | 1
  last_accessed_at?: string
  access_count: number
  expires_at?: string
  created_at: string
}

// ─── Pipeline Board ───────────────────────────────────────────────────────────

export interface PipelineCard {
  id: number
  first_name: string
  last_name: string
  company_name?: string
  email?: string
  phone_number?: string
  lead_status: string
  assigned_to?: number
  assigned_name?: string
  created_at: string
  updated_at?: string
}

export interface PipelineColumn {
  status_slug: string
  status_name: string
  display_order: number
  color?: string
  total_count: number
  cards: PipelineCard[]
  has_more: boolean
}

export interface PipelineBoardResponse {
  statuses: PipelineColumn[]
}

// ─── Pipeline View ────────────────────────────────────────────────────────────

export interface PipelineView {
  id: number
  name: string
  user_id?: number
  is_default: 0 | 1
  is_shared: 0 | 1
  view_type: 'kanban' | 'list' | 'table'
  filters?: Record<string, unknown>
  column_config?: Record<string, unknown>
  sort_config?: Record<string, unknown>
  status_columns?: string[]
  created_by: number
  created_at: string
}

// ─── Search & Filters ─────────────────────────────────────────────────────────

export interface CrmSearchParams {
  search?: string
  lead_status?: string[]
  assigned_to?: number[]
  date_from?: string
  date_to?: string
  lead_type?: string
  company_name?: string
  phone_number?: string
  email?: string
  industry_type?: string
  lower_limit?: number
  upper_limit?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export interface CrmSearchResult {
  items: CrmLead[]
  total: number
}

// ─── Bulk Operations ─────────────────────────────────────────────────────────

export interface BulkAssignPayload {
  lead_ids: number[]
  assigned_to: number
}

export interface BulkStatusChangePayload {
  lead_ids: number[]
  lead_status: string
}

export interface BulkDeletePayload {
  lead_ids: number[]
}

export interface BulkExportPayload {
  lead_ids: number[]
  fields?: string[]
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'quarter'

export interface StatusDistributionItem {
  status: string
  status_name: string
  count: number
  percentage: number
  color?: string
}

export interface LeadVelocityItem {
  date: string
  count: number
  moving_avg?: number
}

export interface AgentPerformanceItem {
  agent_id: number
  agent_name: string
  total_leads: number
  converted: number
  conversion_rate: number
  avg_days_to_close?: number
}

export interface ConversionFunnelItem {
  status: string
  status_name: string
  count: number
  percentage: number
  avg_days_in_stage?: number
}

export interface AnalyticsSummary {
  total_leads: number
  new_today: number
  conversion_rate: number
  avg_per_day: number
  top_status: string
}
