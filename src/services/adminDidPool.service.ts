import api from '../api/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DidPoolItem extends Record<string, unknown> {
  id: number
  phone_number: string
  status: 'free' | 'assigned' | 'reserved' | 'blocked' | 'cooldown'
  assigned_client_id: number | null
  client_name: string | null
  provider: string | null
  provider_sid: string | null
  area_code: string | null
  country_code: string
  number_type: string
  capabilities: { voice?: boolean; sms?: boolean; mms?: boolean } | null
  assignment_type: string | null
  assigned_at: string | null
  released_at: string | null
  cooldown_until: string | null
  blocked_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DidPoolListResponse {
  dids: DidPoolItem[]
  total: number
  current_page: number
  per_page: number
}

export interface DidPoolStats {
  total: number
  available: number
  assigned: number
  cooldown: number
  blocked: number
  reserved: number
}

export interface DidPoolFilters {
  page?: number
  per_page?: number
  status?: string
  search?: string
  provider?: string
  client_id?: number
}

export interface AddDidPayload {
  phone_number: string
  provider?: string
  provider_sid?: string
  country_code?: string
  number_type?: string
  area_code?: string
  notes?: string
}

export interface BulkImportPayload {
  numbers: string[]
  provider?: string
  country_code?: string
}

export interface BulkImportResult {
  imported: number
  skipped: number
  errors: Array<{ number: string; reason: string }>
}

export interface DidPoolAuditEntry extends Record<string, unknown> {
  id: number
  did_pool_id: number
  phone_number: string
  action: string
  from_status: string | null
  to_status: string
  client_id: number | null
  performed_by: number | null
  triggered_by: string
  metadata: Record<string, unknown> | null
  created_at: string
}

// ── Service ───────────────────────────────────────────────────────────────────

export const adminDidPoolService = {
  list: (filters: DidPoolFilters = {}) =>
    api.get<{ data: DidPoolListResponse }>('/admin/did-pool', { params: filters }),

  stats: () =>
    api.get<{ data: DidPoolStats }>('/admin/did-pool/stats'),

  add: (payload: AddDidPayload) =>
    api.post<{ data: DidPoolItem }>('/admin/did-pool', payload),

  bulkImport: (payload: BulkImportPayload) =>
    api.post<{ data: BulkImportResult }>('/admin/did-pool/bulk-import', payload),

  assign: (id: number, clientId: number) =>
    api.post(`/admin/did-pool/${id}/assign`, { client_id: clientId }),

  release: (id: number) =>
    api.post(`/admin/did-pool/${id}/release`),

  block: (id: number, reason?: string) =>
    api.post(`/admin/did-pool/${id}/block`, { reason }),

  unblock: (id: number) =>
    api.post(`/admin/did-pool/${id}/unblock`),

  audit: (id: number) =>
    api.get<{ data: { audit: DidPoolAuditEntry[] } }>(`/admin/did-pool/${id}/audit`),
}
