// ─── DialerStudio — Shared types (UI-only prototype) ──────────────────────────
// No backend coupling. All types local to the Studio prototype.

export interface StudioCampaign {
  id: number
  name: string
  dialMethod: 'Predictive' | 'Preview' | 'Power' | 'Manual'
  ratio: number
  totalLeads: number
  calledLeads: number
  status: 'active' | 'paused'
  color: string
}

export interface LeadField {
  key: string
  label: string
  value: string
  type?: 'text' | 'email' | 'phone' | 'select' | 'number'
  readOnly?: boolean
  options?: string[]
}

export interface StudioLead {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  mobile?: string
  state: string
  country: string
  company: string
  avatar?: string
  tags?: string[]
  // Dynamic / custom fields (handles unknown keys)
  customFields: LeadField[]
  score?: number
  lastContact?: string
}

export interface StudioAgent {
  id: number
  name: string
  extension: string
  department: string
  status: 'available' | 'busy' | 'offline' | 'away'
  avatar: string
}

export interface StudioDisposition {
  id: string
  label: string
  color: string
  icon?: string
  group: 'positive' | 'neutral' | 'negative'
}

export interface StudioEvent {
  id: number
  type: 'call' | 'sms' | 'email' | 'note' | 'disposition'
  title: string
  description: string
  timestamp: string
  agent?: string
  duration?: string
}

export interface StudioNote {
  id: number
  author: string
  avatar: string
  text: string
  timestamp: string
}

export type SidebarTab = 'lead' | 'sms' | 'email' | 'script' | 'notes' | 'events'

export type CallState = 'idle' | 'dialing' | 'ringing' | 'in-call' | 'wrap-up'
