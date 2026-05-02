import api from '../api/axios'

// ── Types ──────────────────────���──────────────────────────────────────────────

export interface TrialStatus {
  expired: boolean
  days_remaining: number
  count: number // total number of client_packages (trial + paid)
}

export interface PackageModule {
  key: string
  name: string
  display_order: number
  [key: string]: unknown
}

export interface PortalPackage {
  key: string
  name: string
  description: string
  is_active: number
  is_trial: number
  display_order: number
  show_on: string[]
  modules: PackageModule[] | Record<string, PackageModule>
  currency_code: string
  base_rate_monthly_billed: number
  base_rate_quarterly_billed: number
  base_rate_half_yearly_billed: number
  base_rate_yearly_billed: number
  call_rate_per_minute: number
  rate_per_sms: number
  rate_per_did: number
  free_call_minute_monthly: number
  free_sms_monthly: number
  [key: string]: unknown
}

export interface ClientPackageInfo {
  id: number
  package_key: string
  package_name: string
  start_time: string
  end_time: string
  quantity: number
  assigned: number[]
}

// ── Service ─────────────────────────────────────────────────���─────────────────

export const packageService = {
  /** Trial status for the authenticated client */
  getTrialStatus: () =>
    api.get<{ success: boolean; message: string; data: TrialStatus }>('/client-packages/trial'),

  /** All portal-visible packages (for upgrade page) */
  getPortalPackages: () =>
    api.get<{ success: boolean; message: string; data: PortalPackage[] }>('/packages', {
      params: { show_on: 'portal' },
    }),

  /** Client's current active packages */
  getClientPackages: () =>
    api.get<{ success: boolean; message: string; data: ClientPackageInfo[] }>('/client-packages'),
}
