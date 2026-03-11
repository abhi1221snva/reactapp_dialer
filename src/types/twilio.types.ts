export interface TwilioAccount {
  id: number
  client_id: number
  friendly_name: string | null
  status: 'active' | 'suspended' | 'closed'
  has_own_account: boolean
  has_subaccount: boolean
  masked_token: string
  blocked_countries: string[]
  created_at: string
}

export interface TwilioSubaccount {
  id: number
  sid: string
  friendly_name: string
  status: 'active' | 'suspended' | 'closed'
  created_at: string
}

export interface TwilioNumber {
  id: number
  sid: string
  phone_number: string
  friendly_name: string | null
  country_code: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
  status: 'active' | 'released'
  voice_url: string | null
  sms_url: string | null
  campaign_id: number | null
  last_used_at: string | null
  created_at: string
}

export interface AvailableNumber {
  phone_number: string
  friendly_name: string
  region: string | null
  postal_code: string | null
  iso_country: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

export interface TwilioTrunk {
  id: number
  sid: string
  friendly_name: string
  domain_name: string | null
  origination_url: string | null
  status: 'active' | 'deleted'
  ip_acl: string[] | null
  created_at: string
}

export interface TwilioCall {
  id: number
  call_sid: string
  from_number: string
  to_number: string
  direction: 'inbound' | 'outbound'
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'no-answer' | 'canceled' | 'failed'
  duration: number
  campaign_id: number | null
  agent_id: number | null
  recording_sid: string | null
  recording_url: string | null
  price: number | null
  price_unit: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface TwilioSms {
  id: number
  sms_sid: string
  from_number: string
  to_number: string
  body: string
  direction: 'inbound' | 'outbound'
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'received'
  campaign_id: number | null
  agent_id: number | null
  price: number | null
  sent_at: string | null
  created_at: string
}

export interface TwilioRecording {
  id: number
  recording_sid: string
  call_sid: string | null
  duration: number
  url: string | null
  status: 'in-progress' | 'completed' | 'failed' | 'deleted'
  agent_id: number | null
  campaign_id: number | null
  recorded_at: string | null
}

export interface TwilioUsageRecord {
  category: string
  description: string
  count: number
  count_unit: string
  usage: number
  usage_unit: string
  price: number
  price_unit: string
  start_date: string
  end_date: string
}

export interface TwilioUsageSummary {
  total_calls: number
  total_sms: number
  minutes_used: number
  total_spend: number
}

export interface CampaignNumber {
  cn_id: number
  id: number
  phone_number: string
  campaign_id: number | null
  last_used_at: string | null
}

export interface NumberSearchFilters {
  country: string
  area_code?: string
  voice?: boolean
  sms?: boolean
  mms?: boolean
  limit?: number
}
