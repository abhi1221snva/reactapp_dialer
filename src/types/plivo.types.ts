export interface PlivoAccount {
  id: number
  client_id: number
  name: string | null
  status: 'active' | 'suspended' | 'closed'
  has_own_account: boolean
  has_subaccount: boolean
  masked_token: string
  blocked_countries: string[]
  created_at: string
}

export interface PlivoSubaccount {
  id: number
  auth_id: string
  name: string
  enabled: boolean
  status: 'active' | 'suspended' | 'deleted'
  created_at: string
}

export interface PlivoNumber {
  id: number
  number: string
  number_uuid: string | null
  alias: string | null
  country_iso: string
  sub_type: Record<string, string> | null
  status: 'active' | 'released'
  voice_url: string | null
  sms_url: string | null
  app_id: string | null
  campaign_id: number | null
  last_used_at: string | null
  created_at: string
}

export interface AvailablePlivoNumber {
  number: string
  prefix: string | null
  country: string
  region: string | null
  type: string
  sub_type: Record<string, string> | null
  monthly_rental_rate: string | null
  setup_rate: string | null
  capabilities: {
    voice: boolean
    sms: boolean
  }
}

export interface PlivoTrunk {
  id: number
  app_id: string
  app_name: string
  answer_url: string | null
  hangup_url: string | null
  status_url: string | null
  answer_method: 'GET' | 'POST'
  status: 'active' | 'deleted'
  ip_acl: string[] | null
  created_at: string
}

export interface PlivoCall {
  id: number
  call_uuid: string
  from_number: string
  to_number: string
  direction: 'inbound' | 'outbound'
  call_status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'no-answer' | 'canceled' | 'failed'
  duration: number
  bill_duration: number
  total_amount: number | null
  total_rate: string | null
  campaign_id: number | null
  agent_id: number | null
  recording_url: string | null
  record_url: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface PlivoSms {
  id: number
  message_uuid: string
  from_number: string
  to_number: string
  message_body: string
  direction: 'inbound' | 'outbound'
  message_state: string
  message_type: string | null
  campaign_id: number | null
  agent_id: number | null
  total_amount: number | null
  sent_at: string | null
  created_at: string
}

export interface PlivoRecording {
  id: number
  recording_id: string
  call_uuid: string | null
  duration: number
  recording_url: string | null
  recording_type: 'conference' | 'call'
  status: 'in-progress' | 'completed' | 'failed' | 'deleted'
  agent_id: number | null
  campaign_id: number | null
  add_time: string | null
}

export interface PlivoUsageLog {
  id: number
  resource: string
  description: string | null
  total_count: number
  total_amount: number
  total_duration: number
  duration_unit: string | null
  date_from: string
  date_till: string
  synced_at: string | null
}

export interface PlivoUsageSummary {
  total_calls: number
  total_sms: number
  minutes_used: number
  total_spend: number
}

export interface NumberSearchFilters {
  country: string
  area_code?: string
  voice?: boolean
  sms?: boolean
  limit?: number
}
