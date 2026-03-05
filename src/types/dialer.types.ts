export type CallState = 'idle' | 'ready' | 'ringing' | 'in-call' | 'wrapping' | 'paused'

export interface Campaign {
  id: number
  campaign_name: string
  dial_method: 'predictive' | 'preview' | 'progressive' | 'manual'
  dial_ratio: number
  status: 'active' | 'inactive'
  total_leads?: number
  called_leads?: number
}

export interface Lead {
  id: number
  list_id: number
  phone_number: string
  first_name?: string
  last_name?: string
  email?: string
  address?: string
  city?: string
  state?: string
  fields?: Record<string, string>
}

export interface Disposition {
  id: number
  disposition: string
  d_type: string
  hotkey?: string
  color?: string
}

export interface ExtensionLive {
  id: number
  name: string
  extension: string
  status: 'available' | 'on-call' | 'break' | 'offline'
  campaign?: string
  duration?: string
  call_id?: string
}

export interface SaveDispositionRequest {
  lead_id: number
  campaign_id: number
  disposition_id: number
  notes?: string
  callback_date?: string
  callback_time?: string
}

export interface IncomingCall {
  number: string
  location_id: number
  parent_id: number
  user_ids: number[]
}
