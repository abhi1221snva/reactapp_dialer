import api from '../api/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DidNumber {
  phone_number: string
  friendly_name: string
  country_code: string
  region: string | null
  area_code: string | null
  number_type: string
  provider: string
  monthly_cost: number
  setup_cost: number
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

export interface DidProvider {
  provider: string
  configured: boolean
  is_active: boolean
  is_default: boolean
  priority: number
  capabilities: Record<string, boolean>
  countries: Array<{ code: string; name: string }>
}

export interface PurchaseLog {
  id: number
  tenant_id: number
  provider: string
  provider_number_id: string | null
  phone_number: string
  country_code: string
  area_code: string | null
  capabilities: Record<string, boolean> | null
  monthly_cost: string
  setup_cost: string
  purchased_by: number
  status: string
  failure_reason: string | null
  api_latency_ms: number | null
  batch_id: string | null
  created_at: string
  updated_at: string
}

export interface SearchParams {
  provider: string
  country?: string
  area_code?: string
  area_codes?: string  // comma-separated: "212,310,516"
  voice?: boolean
  sms?: boolean
  mms?: boolean
  limit?: number
  offset?: number
}

export interface PurchaseParams {
  provider: string
  numbers: Array<{
    phone_number: string
    country_code?: string
    area_code?: string
    monthly_cost?: number
    setup_cost?: number
    capabilities?: Record<string, boolean>
  }>
}

export interface PurchaseResult {
  success: boolean
  phone_number: string
  provider?: string
  provider_sid?: string
  monthly_cost?: number
  purchase_log_id?: number
  error?: string
}

export interface BulkPurchaseResult {
  batch_id: string
  results: PurchaseResult[]
  summary: {
    total: number
    success: number
    failed: number
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const buyDidService = {
  /** Get available providers for the current tenant */
  getProviders: () =>
    api.get<{ success: boolean; providers: DidProvider[] }>('/api/dids/providers'),

  /** Search available numbers from a provider */
  searchNumbers: (params: SearchParams) =>
    api.get<{ success: boolean; data: DidNumber[]; meta: Record<string, unknown> }>(
      '/api/dids/search',
      { params }
    ),

  /** Purchase one or more numbers */
  purchase: (data: PurchaseParams) =>
    api.post<{ success: boolean; data: PurchaseResult | BulkPurchaseResult; message: string }>(
      '/api/dids/purchase',
      data
    ),

  /** Release a purchased number */
  release: (phoneNumber: string) =>
    api.post<{ success: boolean; data: Record<string, unknown>; message: string }>(
      '/api/dids/release',
      { phone_number: phoneNumber }
    ),

  /** Get purchase history */
  getPurchaseHistory: (page = 1, perPage = 25, status?: string) =>
    api.get<{ success: boolean; data: PurchaseLog[]; meta: Record<string, unknown> }>(
      '/api/dids/purchase-history',
      { params: { page, per_page: perPage, ...(status ? { status } : {}) } }
    ),

  /** Get purchase statistics */
  getPurchaseStats: () =>
    api.get<{ success: boolean; stats: Record<string, number> }>('/api/dids/purchase-stats'),

  /** Get supported countries for a provider */
  getCountries: (provider: string) =>
    api.get<{ success: boolean; countries: Array<{ code: string; name: string }> }>(
      '/api/dids/countries',
      { params: { provider } }
    ),

  /** Update provider configuration */
  updateProviderConfig: (data: {
    provider: string
    is_active?: boolean
    is_default?: boolean
    priority?: number
    auto_fallback?: boolean
  }) => api.post<{ success: boolean; data: Record<string, unknown>; message: string }>(
    '/api/dids/provider-config',
    data
  ),
}
