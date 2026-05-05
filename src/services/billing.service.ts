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

export interface SubscriptionResponse {
  subscription: Subscription | null
  seats: SeatSummary
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

// ── Admin service ─────────────────────────────────────────────────────────────

export interface BillingSettings {
  price_per_seat: string
  trial_seats: number
  trial_credits: string
  wallet_to_credit_rate: string
  low_balance_threshold: string
  block_calls_on_zero_balance: boolean
  default_plan_code: string
}

export interface UsageRate {
  id: number
  rate_key: 'call_outgoing_per_min' | 'call_incoming_per_min' | 'sms'
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
}
