export type CallState = 'idle' | 'ready' | 'ringing' | 'in-call' | 'wrapping' | 'paused'

export type TransferState = 'idle' | 'initiating' | 'ringing' | 'merged'

export interface Campaign {
  id: number
  campaign_name: string
  dial_method: 'predictive' | 'preview' | 'progressive' | 'manual'
  dial_ratio: number
  status: 'active' | 'inactive'
  total_leads?: number
  called_leads?: number
  // Time-based calling fields (from backend campaign table)
  time_based_calling?: number | string
  call_time_start?: string | null
  call_time_end?: string | null
  timezone?: string | null
  // Feature toggles
  call_transfer?: '1' | '0' | number
}

export interface Lead {
  id: number
  /**
   * CRM lead ID — present when the queue row ID differs from the CRM record ID.
   * Passed as `lead_id` to /call-number; falls back to `id` when absent.
   */
  lead_id?: number
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
  /** Backend requires 0 (no API call) or 1 (trigger campaign API webhook) */
  api_call: 0 | 1
  /** Backend requires 0 (continue dialing) or 1 (pause agent after disposition) */
  pause_calling: 0 | 1
  /** Wrap-up notes saved as a comment on the CDR */
  comment?: string
  call_back?: string
  callback_date?: string
  callback_time?: string
}

export interface IncomingCall {
  number: string
  location_id: number
  parent_id: number
  user_ids: number[]
}

/**
 * Payload for POST /call-transfer/initiate-updated
 * Maps to DialerController@initiateTransferUpdated validation.
 */
export interface TransferRequest {
  lead_id: number
  /** Agent's alt_extension from their user profile (auth store). */
  alt_extension: string
  customer_phone_number: string
  campaign_id: number
  /** Required unless warm_call_transfer_type === 'did' */
  forward_extension?: string
  ring_group?: string
  /** Required when warm_call_transfer_type === 'did' */
  did_number?: string
  /** 'crm' | 'dialer' */
  domain: string
  warm_call_transfer_type: 'extension' | 'ring_group' | 'did'
}

/** Local-only record built when a call starts; no dedicated CDR API exposed yet. */
export interface CallLog {
  id: string
  lead_name: string
  phone_number: string
  /** Mapped from callNumber / hangup / saveDisposition lifecycle. */
  status: 'connected' | 'missed' | 'failed' | 'busy' | 'no_answer'
  duration: number     // seconds (0 if never connected)
  campaign_name: string
  started_at: string   // ISO string
  /** For redial — CRM lead ID used to re-fetch lead data */
  lead_id?: number
  /** For redial — campaign ID the call was placed under */
  campaign_id?: number
}
