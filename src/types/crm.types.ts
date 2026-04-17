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

/** A single validation rule object stored in crm_labels.validation_rules */
export interface ValidationRule {
  rule: string
  value?: number | string
  value2?: number | string
}

export interface CrmLabel {
  id: number
  label_name: string      // display label (e.g. "First Name")
  field_key: string       // unique EAV key  (e.g. "first_name")
  field_type: string      // text|number|email|phone_number|date|textarea|dropdown|radio|checkbox
  section: string         // owner|contact|business|address|general…
  options?: string | null // JSON-encoded string array for dropdown/radio
  placeholder?: string
  conditions?: FieldCondition[] | null
  validation_rules?: ValidationRule[] | null
  required: boolean
  /** Controls which public forms this field appears on and is required in.
   *  null     → no restriction (shown on all forms)
   *  affiliate → affiliate apply form only
   *  merchant  → merchant portal form only
   *  both      → both affiliate and merchant forms
   *  The internal CRM (system) form always shows all fields regardless. */
  apply_to?: 'affiliate' | 'merchant' | 'both' | null
  /** Per-context required config. null → fall back to legacy `required` boolean. */
  required_in?: string[] | null
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

export const EMAIL_TYPES = [
  { value: 'general',             label: 'General' },
  { value: 'online_application',  label: 'Online Application' },
] as const

export type EmailType = typeof EMAIL_TYPES[number]['value']

export interface EmailTemplate {
  id: number
  template_name: string
  subject: string
  template_html: string
  lead_status?: string
  send_bcc?: string
  email_type?: EmailType
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
  sub_type?: string | null
  document_name?: string
  tag?: string | null
  file_name: string
  file_path: string | null
  file_size?: number | string
  uploaded_by?: number
  uploaded_by_name?: string
  attachable?: boolean
  created_at: string
}

// ─── Lender ───────────────────────────────────────────────────────────────────

/** @deprecated Use Lender interface directly — API credentials are now on crm_lender */
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

export interface Lender extends Record<string, unknown> {
  id: number
  lender_name: string
  email: string
  secondary_email?: string
  secondary_email2?: string
  secondary_email3?: string
  secondary_email4?: string
  contact_person?: string
  phone?: string
  status: 0 | 1
  api_status?: string | number
  address?: string
  country?: string
  state?: string
  city?: string
  industry?: string
  notes?: string
  // Loan requirements
  min_credit_score?: number | string
  max_negative_days?: number | string
  max_advance?: number | string
  nsfs?: string
  min_time_business?: string
  min_amount?: number | string
  min_deposits?: number | string
  min_monthly_deposit?: number | string
  min_avg_revenue?: number | string
  max_position?: string
  max_term?: string
  daily_balance?: number | string
  // Eligibility
  white_label?: string
  consolidation?: string
  max_mca_payoff_amount?: number | string
  reverse_consolidation?: string
  sole_prop?: string
  home_business?: string
  non_profit?: string
  daily?: string
  coj_req?: string
  bank_verify?: string
  loc?: string
  ownership_percentage?: string
  factor_rate?: string
  // Restrictions
  prohibited_industry?: string
  restricted_industry_note?: string
  guideline_state?: string
  restricted_state_note?: string
  guideline_file?: string
  lender_api_type?: string
  // ── API config (merged from crm_lender_apis) ────────────────────────
  api_username?: string
  api_password?: string
  api_key?: string
  api_url?: string
  sales_rep_email?: string
  partner_api_key?: string
  api_client_id?: string
  auth_url?: string
  api_name?: string
  auth_type?: 'bearer' | 'basic' | 'api_key' | 'oauth2' | 'none'
  auth_credentials?: Record<string, unknown> | null
  base_url?: string
  endpoint_path?: string
  request_method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  default_headers?: Record<string, string> | null
  payload_mapping?: Record<string, unknown> | null
  response_mapping?: Record<string, unknown> | null
  required_fields?: string[] | null
  retry_attempts?: number
  timeout_seconds?: number
  api_notes?: string
  resubmit_method?: string
  resubmit_endpoint_path?: string
  document_upload_enabled?: boolean
  document_upload_endpoint?: string
  document_upload_method?: string
  document_upload_field_name?: string
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

export type LenderSubmissionStatus = 'pending' | 'submitted' | 'failed' | 'viewed' | 'approved' | 'declined' | 'no_response'
export type LenderResponseStatus   = 'pending' | 'approved' | 'declined' | 'needs_documents' | 'no_response'
export type EmailDeliveryStatus    = 'sent' | 'delivered' | 'opened' | 'failed'

export interface MappedApiError {
  label:    string
  field:    string
  message:  string
  fix_type: string
  expected?: string
}

export interface LenderSubmission {
  id: number
  lead_id: number
  lender_id: number
  lender_name?: string
  lender_email?: string
  application_pdf?: string
  submission_status: LenderSubmissionStatus
  submission_type?: 'normal' | 'api'
  response_status: LenderResponseStatus
  notes?: string
  response_note?: string
  api_error?: string
  error_messages?: MappedApiError[] | string | null
  email_status?: EmailDeliveryStatus | null
  email_status_at?: string | null
  doc_upload_status?: 'none' | 'success' | 'partial' | 'failed'
  doc_upload_notes?: string
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
  document_ids?: number[]
  email_subject?: string
  email_html?: string
  submission_type?: 'normal' | 'api'
}

export interface UpdateSubmissionResponsePayload {
  response_status: LenderResponseStatus
  submission_status?: LenderSubmissionStatus
  response_note?: string
}

// ─── Lender API Error Handling ────────────────────────────────────────────────

/** fix_type values returned by the backend ErrorParserService */
export type LenderFixType =
  | 'state_code'
  | 'phone'
  | 'zip'
  | 'required'
  | 'email'
  | 'date'
  | 'ein'
  | 'numeric'
  | 'length'
  | 'unknown'

/** A single parsed error from the backend ErrorParserService */
export interface ParsedApiError {
  field:       string      // dot-notation path, e.g. "owners.0.homeAddress.state"
  raw_message: string      // original message string from the lender
  message:     string      // user-friendly rewrite
  fix_type:    LenderFixType
  expected:    string      // e.g. "2-letter US state code (e.g. NY, CA)"
  path_parts:  string[]    // exploded path segments
}

/** ParsedApiError enriched with current value + auto-fix metadata */
export interface FixSuggestion extends ParsedApiError {
  crm_key:        string        // CRM EAV field_key to update
  current_value:  string | null // current value from the lead record
  auto_fix_value: string | null // suggested corrected value (e.g. "CA")
  can_auto_fix:   boolean       // true → backend has a deterministic conversion
  suggestion:     string        // plain-English suggestion (e.g. 'Convert "California" → "CA"')
}

/** Payload for POST /crm/lead/{id}/apply-lender-fix */
export interface ApplyLenderFixPayload {
  field_key:    string
  new_value:    string
  lender_field?: string  // original lender dot-path (e.g. "owners.0.homeAddress.state") for payload_mapping reverse-lookup
  lender_id?:  number
  resubmit?:   boolean
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

export type AutomationActionType =
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
  action: AutomationActionType
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
  | 'lender_api_result'
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

// ─── Field Change Diff Types ─────────────────────────────────────────────────

export interface FieldChange {
  old: string | null
  new: string | null
  label?: string
}

export interface FieldUpdateMeta {
  changed_fields?: Record<string, FieldChange>
  source?: string
  batch_id?: string
  field?: string
  old_value?: string | null
  new_value?: string | null
}

export interface LeadChangeLog {
  id: number
  lead_id: number
  batch_id: string
  source: string
  user_id: number | null
  user_type: string
  changes: Record<string, FieldChange>
  ip_address: string | null
  summary: string | null
  created_at: string
  user_name?: string | null
}

export interface LeadChangeLogResponse {
  lead_id: number
  total: number
  offset: number
  limit: number
  has_more: boolean
  items: LeadChangeLog[]
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

// ─── Lender Offers ────────────────────────────────────────────────────────────

export type OfferStatus = 'pending' | 'received' | 'accepted' | 'declined' | 'expired'

export interface LenderOffer {
  id: number
  lead_id: number
  lender_id: number
  lender_name?: string
  offered_amount: number
  factor_rate: number
  term_days: number
  daily_payment: number
  total_payback: number
  stips_required?: string[]
  offer_expires_at?: string
  status: OfferStatus
  decline_reason?: string
  notes?: string
  created_by?: number
  created_at: string
  updated_at?: string
}

// ─── Deal Stips ───────────────────────────────────────────────────────────────

export type StipType = 'bank_statement' | 'voided_check' | 'drivers_license' | 'tax_return' | 'lease_agreement' | 'business_license' | 'void_check' | 'articles_of_incorporation' | 'custom'
export type StipStatus = 'requested' | 'uploaded' | 'approved' | 'rejected'

export interface DealStip {
  id: number
  lead_id: number
  lender_id?: number
  stip_name: string
  stip_type: StipType
  status: StipStatus
  document_id?: number
  requested_by: number
  requested_at?: string
  uploaded_at?: string
  approved_at?: string
  approved_by?: number
  notes?: string
  created_at: string
}

// ─── Funded Deals ─────────────────────────────────────────────────────────────

export type FundedDealStatus = 'funded' | 'in_repayment' | 'paid_off' | 'defaulted' | 'renewed'

export interface FundedDeal {
  id: number
  lead_id: number
  lender_id: number
  lender_name?: string
  funded_amount: number
  factor_rate: number
  term_days: number
  total_payback: number
  daily_payment: number
  funding_date: string
  first_debit_date?: string
  contract_number?: string
  wire_confirmation?: string
  renewal_eligible_at?: string
  status: FundedDealStatus
  closed_at?: string
  created_by?: number
  created_at: string
  updated_at?: string
}

// ─── Merchant Positions ───────────────────────────────────────────────────────

export interface MerchantPosition {
  id: number
  lead_id: number
  lender_name: string
  funded_amount: number
  factor_rate?: number
  daily_payment: number
  start_date: string
  est_payoff_date?: string
  remaining_balance?: number
  position_number: number
  source: 'self' | 'reported' | 'imported'
  notes?: string
  created_at: string
}

// ─── Commissions ─────────────────────────────────────────────────────────────

export type CommissionType = 'points' | 'percentage' | 'flat'
export type DealType = 'new' | 'renewal'

export interface CommissionRule {
  id: number
  lender_id?: number
  deal_type: DealType
  commission_type: CommissionType
  value: number
  split_agent_pct: number
  status: number
  created_at: string
}

export interface DealCommission {
  id: number
  lead_id: number
  lender_id?: number
  funded_amount: number
  gross_commission: number
  agent_id?: number
  agent_commission: number
  company_commission: number
  status: 'pending' | 'paid'
  paid_at?: string
  paid_by?: number
  notes?: string
  created_at: string
}

export interface CommissionSummary {
  total_gross: number
  total_agent: number
  total_company: number
  by_agent: Array<{ agent_id: number; agent_name?: string; total: number }>
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export type ComplianceCheckType = 'ofac' | 'kyc' | 'fraud_flag' | 'credit_pull' | 'background' | 'sos_verification' | 'custom'
export type ComplianceResult = 'pass' | 'fail' | 'pending' | 'skipped'

export interface ComplianceCheck {
  id: number
  lead_id: number
  check_type: ComplianceCheckType
  result: ComplianceResult
  score?: string
  notes?: string
  checked_by?: number
  checked_at?: string
  meta?: Record<string, unknown>
  created_at: string
}

export interface AdvanceRegistryEntry {
  id: number
  ein?: string
  ssn_last4?: string
  lead_id?: number
  lender_name: string
  funded_amount: number
  daily_payment?: number
  start_date: string
  est_payoff_date?: string
  source: 'self' | 'reported' | 'shared'
  created_at: string
  business_name?: string
  total_daily_burden?: number
  position_count?: number
}

export interface StackingWarning {
  positions: MerchantPosition[]
  total_daily_burden: number
  position_count: number
}

// ─── Automations ──────────────────────────────────────────────────────────────

export type AutomationTriggerType = 'status_change' | 'field_update' | 'time_elapsed' | 'document_uploaded' | 'deal_funded' | 'stip_uploaded' | 'offer_received'
export type AutomationLogStatus = 'success' | 'failed' | 'skipped'

export interface AutomationAction {
  type: 'email' | 'sms' | 'status_change' | 'assign' | 'task' | 'webhook'
  [key: string]: unknown
}

export interface CrmAutomation {
  id: number
  name: string
  description?: string
  is_active: boolean
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, unknown>
  conditions?: Array<{ field: string; operator: string; value: string }>
  actions: AutomationAction[]
  status: number
  run_count: number
  last_run_at?: string
  created_by?: number
  created_at: string
}

export interface AutomationLog {
  id: number
  automation_id: number
  lead_id: number
  triggered_by?: number
  status: AutomationLogStatus
  output?: string
  created_at: string
  error_message?: string
}

// ─── SMS Inbox ────────────────────────────────────────────────────────────────

export type SmsConversationStatus = 'open' | 'closed' | 'archived'
export type SmsDirection = 'inbound' | 'outbound'
export type SmsMessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'received'

export interface SmsAgent {
  id: number
  name: string
  email: string
}

export interface SmsConversation {
  id: number
  lead_id: number
  lead_phone: string
  agent_id?: number
  agent_name?: string
  last_message_at?: string
  unread_count: number
  status: SmsConversationStatus
  // Joined fields from crm_leads
  company_name?: string
  first_name?: string
  last_name?: string
  created_at: string
}

export interface SmsMessage {
  id: number
  conversation_id: number
  direction: SmsDirection
  body: string
  from_number: string
  to_number: string
  status: SmsMessageStatus
  twilio_sid?: string
  sent_by?: number
  created_at: string
}

// ─── Renewal Pipeline ─────────────────────────────────────────────────────────

export interface RenewalPipelineItem extends FundedDeal {
  days_until_eligible: number
  company_name?: string
  first_name?: string
  last_name?: string
}

// ─── Agent Performance ───────────────────────────────────────────────────────

export interface AgentPerformanceSummary {
  total_funded_volume: number
  total_deals: number
  total_commissions: number
  avg_deal_size: number
  renewal_rate: number
  default_rate: number
}

export interface AgentPerformanceRow {
  agent_id: number
  agent_name: string
  deals: number
  funded_volume: number
  commission: number
  conversion_rate: number
  avg_deal_size: number
  [key: string]: unknown
}

export interface AgentDealRecord {
  deal_id: number
  lead_id: number
  company_name?: string
  lender_name?: string
  funded_amount: number
  factor_rate?: number
  commission: number
  status: string
  funding_date: string
  [key: string]: unknown
}

export interface AgentMonthlyTrend {
  month: string
  deals: number
  funded_volume: number
  commission: number
}

export interface AgentDetailResponse {
  agent_id: number
  agent_name: string
  summary: {
    total_deals: number
    funded_volume: number
    total_commission: number
    avg_deal_size: number
    pipeline_value: number
    conversion_rate: number
  }
  deals: AgentDealRecord[]
  monthly_trend: AgentMonthlyTrend[]
}

export interface AgentBonus {
  id: number
  agent_id: number
  agent_name?: string
  bonus_type: string
  description?: string
  amount: number
  period?: string
  status: 'pending' | 'approved' | 'paid'
  paid_at?: string
  created_by?: number
  created_at: string
  [key: string]: unknown
}

export type LeaderboardMetric = 'funded_volume' | 'deals' | 'commission' | 'conversion_rate'

// ─── Per-Lender Validation & Submission ─────────────────────────────────────

/** Validation result for a single lender, used during pre-submit check */
export interface LenderValidationResult {
  lenderId: number
  lenderName: string
  isApiLender: boolean
  isValid: boolean
  missingFields: string[]
  fieldLabels: Record<string, string>
}

/** Grouped validation state used by LendersPanel */
export interface GroupedValidationState {
  results: LenderValidationResult[]
  validLenderIds: number[]
  invalidLenderIds: number[]
  emailOnlyIds: number[]
  hasAnyErrors: boolean
}

/** Per-lender outcome after a submission attempt */
export interface LenderSubmissionOutcome {
  lenderId: number
  lenderName: string
  success: boolean
  submissionType: 'api' | 'normal'
  error?: string
  submissionId?: number
  validationErrors?: string[]
}

/** Enhanced submit payload with partial submission support */
export interface EnhancedSubmitApplicationPayload extends SubmitApplicationPayload {
  skip_invalid?: boolean
}

/** Lightweight submission status row returned by GET /submission-status */
export interface SubmissionStatusRow {
  id: number
  lender_id: number
  lender_name: string
  submission_status: LenderSubmissionStatus
  submission_type?: 'normal' | 'api'
  api_error?: string | null
  error_messages?: string | null
  doc_upload_status?: string | null
  doc_upload_notes?: string | null
  response_status?: LenderResponseStatus
  response_note?: string | null
  submitted_at?: string | null
  updated_at?: string | null
}

/** Payload for POST /fix-and-resubmit */
export interface FixAndResubmitPayload {
  lender_id: number
  field_updates: Record<string, string>
  document_ids?: number[]
}
