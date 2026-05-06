import api from '../api/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: number
  code: string
  name: string
  description: string | null
  price_per_seat: string
  currency: string
  monthly_bonus_credits: string
  trial_days: number
  is_active: boolean
  stripe_price_id: string | null
}

export interface Subscription {
  id: number
  client_id: number
  plan_id: number | null
  plan?: SubscriptionPlan
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  status:
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
  seat_count: number
  current_period_start: string | null
  current_period_end: string | null
  trial_ends_at: string | null
  cancel_at_period_end: boolean
}

export interface SeatSummary {
  purchased: number
  used: number
  available: number
}

export interface ProviderBillingProfile {
  id: number
  client_id: number
  provider: 'twilio' | 'plivo' | 'sip_trunk'
  ownership_type: 'platform_managed' | 'client_owned'
  voice_billing: 'credit_deduct' | 'passthrough'
  sms_billing: 'credit_deduct' | 'passthrough'
  did_billing: 'credit_deduct' | 'passthrough'
  margin_percent: number
  custom_rates: Record<string, number> | null
  notes: string | null
  created_by: number | null
  created_at: string
  updated_at: string
}

export type ProviderMode = 'platform' | 'byoc' | 'hybrid'

// ── Provider Setup Types ──────────────────────────────────────────────────────

export interface ConnectedProvider {
  provider: 'twilio' | 'plivo'
  voice_billing: 'credit_deduct' | 'passthrough'
  sms_billing: 'credit_deduct' | 'passthrough'
  did_billing: 'credit_deduct' | 'passthrough'
  created_at: string | null
}

export interface ProviderSetupStatus {
  provider_mode: ProviderMode
  provider_setup_completed: boolean
  provider_setup_completed_at: string | null
  provider_mode_changed_at: string | null
  connected_providers: ConnectedProvider[]
  billing_profiles: ProviderBillingProfile[]
  can_switch: boolean
}

export interface CredentialValidation {
  valid: boolean
  error?: string
  account_name?: string
  account_sid?: string
  auth_id?: string
  status?: string
}

export type TwilioCredentials = { account_sid: string; auth_token: string }
export type PlivoCredentials = { auth_id: string; auth_token: string }
export type ProviderCredentials = TwilioCredentials | PlivoCredentials

export interface SubscriptionResponse {
  subscription: Subscription | null
  seats: SeatSummary
  provider_mode: ProviderMode
  billing_profiles: ProviderBillingProfile[]
}

export interface CreditBalance {
  bonus: string   // string for bcmath precision
  wallet: string
  total: string
}

export interface CreditTransaction extends Record<string, unknown> {
  id: number
  client_id: number
  direction: 'debit' | 'credit'
  bucket: 'bonus' | 'wallet'
  amount: string
  reason: string
  reference_type: string | null
  reference_id: string | null
  balance_after_bonus: string
  balance_after_wallet: string
  transaction_group_id: string
  idempotency_key: string
  created_at: string
}

export interface WalletBalance {
  currency: string
  balance: string
}

export interface WalletTransaction extends Record<string, unknown> {
  id: number
  wallet_id: number
  client_id: number
  type: 'recharge' | 'refund' | 'adjustment'
  amount: string
  stripe_payment_intent_id: string | null
  idempotency_key: string
  meta: Record<string, unknown> | null
  created_at: string
}

export interface RechargeIntent {
  payment_intent_id: string
  client_secret: string | null
  status?: string
  amount: string
  currency: string
}

// ── Envelope helper ───────────────────────────────────────────────────────────

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

// ── Service ───────────────────────────────────────────────────────────────────

export const billingService = {
  // Subscription
  getSubscription: () =>
    api.get<Envelope<SubscriptionResponse>>('/billing/subscription'),

  getPlans: () =>
    api.get<Envelope<{ plans: SubscriptionPlan[] }>>('/billing/subscription/plans'),

  subscribe: (seats: number, planId?: number) =>
    api.post<Envelope<{ subscription: Subscription }>>('/billing/subscription', {
      seats,
      ...(planId ? { plan_id: planId } : {}),
    }),

  updateSeats: (seats: number) =>
    api.patch<Envelope<{ subscription: Subscription }>>('/billing/subscription/seats', { seats }),

  cancel: () =>
    api.delete<Envelope<{ subscription: Subscription }>>('/billing/subscription'),

  // Wallet
  getWallet: () =>
    api.get<Envelope<WalletBalance>>('/billing/wallet'),

  recharge: (amount: number | string, paymentMethodId?: string) =>
    api.post<Envelope<RechargeIntent>>('/billing/wallet/recharge', {
      amount: String(amount),
      ...(paymentMethodId ? { payment_method_id: paymentMethodId } : {}),
    }),

  getWalletTransactions: () =>
    api.get<Envelope<{ transactions: WalletTransaction[] }>>('/billing/wallet/transactions'),

  // Credits
  getCredits: () =>
    api.get<Envelope<CreditBalance>>('/billing/credits'),

  getCreditLedger: (params: {
    page?: number
    per_page?: number
    q?: string
    direction?: 'credit' | 'debit' | ''
    bucket?: 'bonus' | 'wallet' | ''
    reason?: string
    include_markers?: 0 | 1
  } = {}) =>
    api.get<Envelope<{
      transactions: CreditTransaction[]
      pagination: { page: number; per_page: number; total: number; last_page: number }
    }>>('/billing/credits/ledger', {
      params: Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
      ),
    }),

  // Payment methods
  getPaymentMethods: () =>
    api.get<Envelope<{ payment_methods: PaymentMethod[]; default_id: string | null }>>(
      '/billing/payment-methods'
    ),

  createPaymentMethodSetupIntent: () =>
    api.post<Envelope<{ client_secret: string }>>('/billing/payment-methods/setup-intent'),

  setDefaultPaymentMethod: (id: string) =>
    api.post<Envelope<unknown>>(`/billing/payment-methods/${id}/default`),

  deletePaymentMethod: (id: string) =>
    api.delete<Envelope<unknown>>(`/billing/payment-methods/${id}`),

  getPaymentMethodPortalLink: (returnUrl?: string) =>
    api.post<Envelope<{ url: string }>>('/billing/payment-methods/portal', {
      ...(returnUrl ? { return_url: returnUrl } : {}),
    }),

  // Invoices
  getInvoices: (limit = 25) =>
    api.get<Envelope<{ invoices: Invoice[] }>>('/billing/invoices', { params: { limit } }),

  // Auto-recharge
  getAutoRecharge: () =>
    api.get<Envelope<AutoRechargeSettings>>('/billing/auto-recharge'),

  updateAutoRecharge: (payload: AutoRechargeSettings) =>
    api.put<Envelope<AutoRechargeSettings>>('/billing/auto-recharge', payload),

  // ── Provider Setup (Self-Service) ──────────────────────────────────────
  getProviderSetup: () =>
    api.get<Envelope<ProviderSetupStatus>>('/billing/provider-setup'),

  choosePlatform: () =>
    api.post<Envelope<ProviderSetupStatus>>('/billing/provider-setup/platform'),

  validateCredentials: (provider: 'twilio' | 'plivo', credentials: ProviderCredentials) =>
    api.post<Envelope<CredentialValidation>>('/billing/provider-setup/validate-credentials', {
      provider,
      credentials,
    }),

  setupByoc: (provider: 'twilio' | 'plivo', credentials: ProviderCredentials) =>
    api.post<Envelope<ProviderSetupStatus>>('/billing/provider-setup/byoc', {
      provider,
      credentials,
    }),

  switchProviderMode: (payload: {
    target_mode: 'platform' | 'byoc'
    confirmed: boolean
    provider?: 'twilio' | 'plivo'
    credentials?: ProviderCredentials
  }) =>
    api.post<Envelope<ProviderSetupStatus>>('/billing/provider-setup/switch', payload),

  disconnectProvider: (provider: 'twilio' | 'plivo') =>
    api.delete<Envelope<ProviderSetupStatus>>(`/billing/provider-setup/${provider}`),
}

export interface PaymentMethod extends Record<string, unknown> {
  id: string
  brand: string | null
  last4: string | null
  exp_month: number | null
  exp_year: number | null
  is_default: boolean
  created: number
}

export interface Invoice extends Record<string, unknown> {
  id: string
  number: string | null
  amount_due: number
  amount_paid: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void' | string
  created: number
  period_start: number | null
  period_end: number | null
  hosted_url: string | null
  pdf_url: string | null
}

// ── Auto-recharge types ───────────────────────────────────────────────────────

export interface AutoRechargeSettings {
  auto_recharge_enabled: boolean
  auto_recharge_threshold: string
  auto_recharge_amount: string
}

// ── Admin types ──────────────────────────────────────────────────────────────

export interface AutoRechargeLogEntry extends Record<string, unknown> {
  id: number
  client_id: number
  amount: string
  status: 'success' | 'failed' | 'cooldown_skipped'
  stripe_payment_intent_id: string | null
  failure_reason: string | null
  balance_before: string
  balance_after: string
  created_at: string
}

export interface BillingDashboardData {
  total_revenue_30d: string
  active_clients: number
  low_balance_clients: number
  revenue_breakdown: {
    voice_revenue: string | null
    sms_count: string | null
    did_revenue: string | null
    sms_revenue: string | null
  }
  recent_auto_recharges: AutoRechargeLogEntry[]
}

export interface UsageSummaryRow extends Record<string, unknown> {
  client_id: number
  summary_date: string
  call_minutes_out: string
  call_minutes_in: string
  sms_out_count: number
  sms_in_count: number
  did_charges: string
  total_credits_used: string
  total_credits_granted: string
}

// ── Admin service ─────────────────────────────────────────────────────────────

export interface BillingSettings {
  price_per_seat: string
  trial_seats: number
  trial_credits: string
  wallet_to_credit_rate: string
  low_balance_threshold: string
  block_calls_on_zero_balance: boolean
  default_plan_code: string
  billing_shadow_mode: boolean
}

export interface UsageRate {
  id: number
  rate_key: 'call_outgoing_per_min' | 'call_incoming_per_min' | 'sms' | 'sms_outbound' | 'sms_inbound'
  credits_per_unit: string
  effective_from: string
}

export const adminBillingService = {
  getSettings: () =>
    api.get<Envelope<{ settings: BillingSettings }>>('/admin/billing/settings'),

  updateSettings: (patch: Partial<BillingSettings>) =>
    api.put<Envelope<{ settings: BillingSettings }>>('/admin/billing/settings', patch),

  getUsageRates: () =>
    api.get<Envelope<{ current: Record<string, UsageRate>; history: UsageRate[] }>>(
      '/admin/billing/usage-rates',
    ),

  addUsageRate: (payload: { rate_key: string; credits_per_unit: number | string; effective_from?: string }) =>
    api.post<Envelope<{ rate: UsageRate }>>('/admin/billing/usage-rates', payload),

  getTenantBilling: (clientId: number) =>
    api.get<Envelope<{
      subscription: Subscription | null
      wallet: WalletBalance | null
      credits: CreditBalance
      seats: SeatSummary
      ledger: CreditTransaction[]
    }>>(`/admin/billing/tenants/${clientId}`),

  adjustCredit: (clientId: number, payload: { direction: 'credit' | 'debit'; amount: number | string; reason?: string }) =>
    api.post<Envelope<{ result: string; balance: CreditBalance }>>(
      `/admin/billing/tenants/${clientId}/credit-adjust`,
      payload,
    ),

  // ── Plans CRUD ──────────────────────────────────────────────────────────
  listPlans: () =>
    api.get<Envelope<{ plans: SubscriptionPlan[] }>>('/admin/billing/plans'),

  createPlan: (payload: {
    code: string
    name: string
    description?: string
    price_per_seat: number | string
    currency?: string
    monthly_bonus_credits?: number | string
    trial_days?: number
    is_active?: boolean
  }) => api.post<Envelope<{ plan: SubscriptionPlan }>>('/admin/billing/plans', payload),

  updatePlan: (id: number, patch: Partial<{
    name: string
    description: string
    price_per_seat: number | string
    currency: string
    monthly_bonus_credits: number | string
    trial_days: number
    is_active: boolean
  }>) => api.put<Envelope<{ plan: SubscriptionPlan }>>(`/admin/billing/plans/${id}`, patch),

  deactivatePlan: (id: number) =>
    api.delete<Envelope<{ plan: SubscriptionPlan }>>(`/admin/billing/plans/${id}`),

  syncPlanStripe: (id: number) =>
    api.post<Envelope<{ plan: SubscriptionPlan }>>(`/admin/billing/plans/${id}/sync-stripe`),

  // ── Provider Billing Profiles ─────────────────────────────────────────
  getProviderProfiles: (clientId: number) =>
    api.get<Envelope<{ profiles: ProviderBillingProfile[]; provider_mode: ProviderMode; client_id: number }>>(
      `/admin/billing/provider-profiles/${clientId}`,
    ),

  setProviderProfile: (clientId: number, payload: {
    provider: 'twilio' | 'plivo' | 'sip_trunk'
    ownership_type: 'platform_managed' | 'client_owned'
    voice_billing?: 'credit_deduct' | 'passthrough'
    sms_billing?: 'credit_deduct' | 'passthrough'
    did_billing?: 'credit_deduct' | 'passthrough'
    margin_percent?: number
    custom_rates?: Record<string, number> | null
    notes?: string | null
  }) => api.post<Envelope<{ profile: ProviderBillingProfile; provider_mode: ProviderMode }>>(
    `/admin/billing/provider-profiles/${clientId}`,
    payload,
  ),

  deleteProviderProfile: (clientId: number, provider: string) =>
    api.delete<Envelope<{ provider_mode: ProviderMode }>>(
      `/admin/billing/provider-profiles/${clientId}/${provider}`,
    ),

  // ── Dashboard & Reports ─────────────────────────────────────────────────
  getDashboard: () =>
    api.get<Envelope<BillingDashboardData>>('/admin/billing/dashboard'),

  getUsageReport: (params: { from?: string; to?: string; client_id?: number; page?: number; per_page?: number }) =>
    api.get<Envelope<{
      summaries: UsageSummaryRow[]
      pagination: { page: number; per_page: number; total: number; last_page: number }
      totals: { total_credits_used: string; total_credits_granted: string }
    }>>('/admin/billing/reports/usage', {
      params: Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ),
    }),

  getRevenueReport: (params: { from?: string; to?: string }) =>
    api.get<Envelope<{
      period: { from: string; to: string }
      totals: { total_debits: string; total_credits: string; net_revenue: string }
      top_clients: Array<{ client_id: number; total_debits: string; total_credits: string }>
    }>>('/admin/billing/reports/revenue', {
      params: Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ),
    }),
}
