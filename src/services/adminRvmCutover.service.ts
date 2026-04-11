import api from '../api/axios'

export type PipelineMode = 'legacy' | 'shadow' | 'dry_run' | 'live'
export type LiveProvider = 'mock' | 'twilio' | 'plivo' | 'slybroadcast'
export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip'

export interface RvmTenantFlag extends Record<string, unknown> {
  client_id: number
  company_name: string
  pipeline_mode: PipelineMode
  live_provider: LiveProvider | null
  live_daily_cap: number | null
  live_enabled_at: string | null
  notes: string | null
  enabled_by: number | null
  shadow_24h: number
  rejected_24h: number
  updated_at: string | null
}

export interface TenantListResponse {
  global_kill_switch: boolean
  tenants: RvmTenantFlag[]
}

export interface UpdateFlagPayload {
  pipeline_mode: PipelineMode
  notes?: string | null
  live_provider?: LiveProvider | null
  live_daily_cap?: number | null
}

export interface ReadinessCheck {
  id: string // T1..T9
  label: string
  status: CheckStatus
  detail: string
}

export interface ReadinessReport {
  ok: boolean
  checks: ReadinessCheck[]
  exit_code: number
}

export interface RollbackAllResponse {
  affected_count: number
  affected: Array<{ client_id: number; previous_mode: PipelineMode }>
}

// Bulk mode change — legacy/shadow/dry_run only. Promotion to live is
// deliberately single-tenant on the backend (needs per-tenant readiness
// check + provider/cap selection), so this type enforces the subset.
export type BulkPipelineMode = Exclude<PipelineMode, 'live'>

export interface BulkSetModePayload {
  client_ids: number[]
  pipeline_mode: BulkPipelineMode
  notes?: string | null
}

export interface BulkSetModeRowSuccess {
  client_id: number
  company_name: string
  previous_mode: PipelineMode | null
  new_mode: PipelineMode
}

export interface BulkSetModeRowFailure {
  client_id: number
  error: string
  message: string
}

export interface BulkSetModeResponse {
  mode: BulkPipelineMode
  requested_count: number
  succeeded_count: number
  failed_count: number
  succeeded: BulkSetModeRowSuccess[]
  failed: BulkSetModeRowFailure[]
}

export interface ShadowLogRow {
  id: number
  legacy_rvm_cdr_log_id: number | null
  phone_e164: string
  would_dispatch: boolean | number
  would_provider: string | null
  would_cost_cents: number | null
  would_reject_reason: string | null
  divergence_flags: Record<string, unknown> | string[] | null
  legacy_dispatched_at: string | null
  created_at: string
}

export interface TenantDetailResponse {
  client: { id: number; company_name: string }
  flag: RvmTenantFlag | null
  breakdown_24h: Array<{ reason: string; total: number }>
  providers_24h: Array<{ provider: string; total: number }>
  recent_shadow: ShadowLogRow[]
}

export type DashboardWindow = '24h' | '7d'

export interface DashboardKpis {
  total: number
  dispatched: number
  rejected: number
  rejection_rate: number
  total_cost_cents: number
  tenant_count: number
}

export interface DashboardModeDistribution {
  legacy: number
  shadow: number
  dry_run: number
  live: number
}

export interface DashboardProviderRow {
  provider: string
  count: number
  cost_cents: number
}

export interface DashboardRejectReason {
  reason: string
  total: number
  pct: number
}

export interface DashboardTopTenant {
  client_id: number
  company_name: string
  pipeline_mode: PipelineMode
  total: number
  rejected: number
  rejection_rate: number
}

export interface DashboardHourlyBucket {
  hour: string
  total: number
  dispatched: number
  rejected: number
}

export interface DashboardResponse {
  window: DashboardWindow
  generated_at: string
  global_kill_switch: boolean
  kpis: DashboardKpis
  mode_distribution: DashboardModeDistribution
  provider_breakdown: DashboardProviderRow[]
  reject_reasons: DashboardRejectReason[]
  top_tenants: DashboardTopTenant[]
  hourly_buckets: DashboardHourlyBucket[]
}

export type AuditActionType = 'set_mode' | 'check_readiness' | 'rollback_all'

export interface AuditHistoryRow extends Record<string, unknown> {
  id: number
  created_at: string
  user_id: number
  actor_name: string | null
  actor_email: string | null
  method: string
  path: string
  action_type: AuditActionType
  payload: Record<string, unknown> | null
  ip: string
}

export interface HistoryResponse {
  client_id: number
  history: AuditHistoryRow[]
}

export const adminRvmCutoverService = {
  list: () =>
    api.get<{ success: boolean; message: string; data: TenantListResponse }>(
      '/admin/rvm/cutover',
    ),

  show: (clientId: number) =>
    api.get<{ success: boolean; message: string; data: TenantDetailResponse }>(
      `/admin/rvm/cutover/${clientId}`,
    ),

  history: (clientId: number) =>
    api.get<{ success: boolean; message: string; data: HistoryResponse }>(
      `/admin/rvm/cutover/${clientId}/history`,
    ),

  historyCsv: (clientId: number) =>
    api.get<Blob>(`/admin/rvm/cutover/${clientId}/history?format=csv`, {
      responseType: 'blob',
    }),

  dashboard: (window: DashboardWindow = '24h') =>
    api.get<{ success: boolean; message: string; data: DashboardResponse }>(
      `/admin/rvm/dashboard?window=${window}`,
    ),

  update: (clientId: number, payload: UpdateFlagPayload) =>
    api.post<{ success: boolean; message: string; data: RvmTenantFlag }>(
      `/admin/rvm/cutover/${clientId}`,
      payload,
    ),

  checkReadiness: (clientId: number) =>
    api.post<{ success: boolean; message: string; data: ReadinessReport }>(
      `/admin/rvm/cutover/${clientId}/check-readiness`,
    ),

  rollbackAll: () =>
    api.post<{ success: boolean; message: string; data: RollbackAllResponse }>(
      '/admin/rvm/cutover/rollback-all',
    ),

  bulkSetMode: (payload: BulkSetModePayload) =>
    api.post<{ success: boolean; message: string; data: BulkSetModeResponse }>(
      '/admin/rvm/cutover/bulk',
      payload,
    ),
}
