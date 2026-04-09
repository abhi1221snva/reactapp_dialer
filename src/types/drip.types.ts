// ── Drip Campaign V2 Types ──────────────────────────────────────────────────

export type DripCampaignStatus = 'draft' | 'active' | 'paused' | 'archived'
export type DripChannel = 'email' | 'sms' | 'both'
export type DripStepChannel = 'email' | 'sms'
export type DripDelayUnit = 'minutes' | 'hours' | 'days'
export type DripEnrollmentStatus = 'active' | 'completed' | 'stopped' | 'failed'
export type DripEnrolledVia = 'manual' | 'trigger' | 'api'
export type DripSendStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed'

export interface DripCampaign extends Record<string, unknown> {
  id: number
  name: string
  description: string | null
  status: DripCampaignStatus
  channel: DripChannel
  email_setting_id: number | null
  sms_from_number: string | null
  entry_conditions: Record<string, unknown> | null
  exit_conditions: Record<string, unknown> | null
  trigger_rules: TriggerRule[] | null
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  quiet_hours_tz: string | null
  created_by: number | null
  updated_by: number | null
  activated_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  steps?: DripStep[]
  steps_count?: number
  stats?: DripCampaignQuickStats
}

export interface DripStep {
  id?: number
  campaign_id?: number
  position: number
  channel: DripStepChannel
  delay_value: number
  delay_unit: DripDelayUnit
  send_at_time: string | null
  subject: string | null
  body_html: string | null
  body_plain: string | null
  email_template_id: number | null
  sms_template_id: number | null
  is_active: boolean
}

export interface DripEnrollment extends Record<string, unknown> {
  id: number
  campaign_id: number
  lead_id: number
  current_step_id: number | null
  status: DripEnrollmentStatus
  enrolled_by: number | null
  enrolled_via: DripEnrolledVia
  trigger_rule: string | null
  next_send_at: string | null
  stopped_reason: string | null
  completed_at: string | null
  stopped_at: string | null
  created_at: string
  updated_at: string
  campaign?: DripCampaign
  send_logs?: DripSendLog[]
}

export interface DripSendLog {
  id: number
  enrollment_id: number
  step_id: number
  lead_id: number
  channel: DripStepChannel
  to_address: string
  from_address: string | null
  subject: string | null
  body_preview: string | null
  provider_message_id: string | null
  status: DripSendStatus
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  failed_at: string | null
  error_message: string | null
  created_at: string
}

export interface DripAnalytics {
  total_enrolled: number
  active: number
  completed: number
  stopped: number
  emails_sent: number
  emails_opened: number
  emails_clicked: number
  emails_bounced: number
  sms_sent: number
  sms_delivered: number
  sms_failed: number
}

export interface DripStepAnalytics {
  step_id: number
  position: number
  channel: DripStepChannel
  subject: string | null
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  failed: number
}

export interface DripCampaignQuickStats {
  enrolled: number
  active: number
  sent: number
  opened: number
}

export interface TriggerRule {
  type: string
  status?: string
  lead_type?: string
  [key: string]: unknown
}

export interface MergeTag {
  key: string
  label: string
  group: string
}

export interface SenderOptions {
  smtp_settings: SmtpOption[]
  twilio_numbers: TwilioNumberOption[]
}

export interface SmtpOption {
  id: number
  sender_name: string
  sender_email: string
  mail_host: string
  mail_driver: string
}

export interface TwilioNumberOption {
  id: number
  phone_number: string
  friendly_name: string | null
}

export interface BulkEnrollResult {
  enrolled: number
  skipped: number
  errors: { lead_id: number; reason: string }[]
}
