import api from '../api/axios'
import type { SubscriptionPlan } from './subscription.service'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UsageMetric {
  current: number
  max: number
}

export interface UpcomingInvoice {
  amount_due: number
  currency: string
  period_start: number
  period_end: number
  lines: { description: string; amount: number }[]
}

export interface BillingOverview {
  plan: SubscriptionPlan | null
  billing_cycle: 'monthly'
  subscription_status: string | null
  subscription_started_at: string | null
  subscription_ends_at: string | null
  seat_quantity: number
  price_per_seat: number
  monthly_total: number
  usage: {
    agents: UsageMetric
    calls: UsageMetric
    sms: UsageMetric
    seat_quantity: number
    year_month: string
  }
  wallet_balance: number
  wallet_low_threshold_cents: number
  upcoming_invoice: UpcomingInvoice | null
}

export interface PlansResponse {
  plans: SubscriptionPlan[]
  current_plan: SubscriptionPlan | null
  seat_quantity: number
  has_subscription: boolean
}

export interface PlanChangePreview {
  amount_due: number
  currency: string
  period_start: number
  period_end: number
  new_plan: SubscriptionPlan
  seat_quantity: number
  new_monthly: number
  lines: { description: string; amount: number }[]
}

export interface SeatsPreviewResponse {
  preview: {
    amount_due: number
    currency: string
    period_start: number
    period_end: number
    lines: { description: string; amount: number }[]
  } | null
  current_seats: number
  new_seats: number
  price_per_seat: number
}

export interface InvoiceRecord extends Record<string, unknown> {
  id: string
  status: string
  amount_due: number
  amount_paid: number
  currency: string
  hosted_invoice_url: string | null
  invoice_pdf_url: string | null
  period_start: number
  period_end: number
  created: number
}

export interface PaymentMethod {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  is_default: boolean
}

export interface WalletTransaction extends Record<string, unknown> {
  id: number
  currency_code: string
  amount: number
  transaction_type: string
  transaction_reference: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionEvent extends Record<string, unknown> {
  id: number
  client_id: number
  event_type: string
  from_status: string | null
  to_status: string | null
  plan_id: number | null
  metadata: Record<string, unknown> | null
  triggered_by: string
  created_at: string
}

export interface WalletThreshold {
  wallet_low_threshold_cents: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const billingService = {
  // Overview
  getOverview: () =>
    api.get<{ data: BillingOverview }>('/billing/overview'),

  // Plans (all tiered per-seat plans)
  getPlans: () =>
    api.get<{ data: PlansResponse }>('/billing/plans'),

  // Subscribe (trial → paid)
  subscribe: (payload: { plan_id: number; seat_count: number; payment_method: string }) =>
    api.post('/billing/subscribe', payload),

  // Change plan (upgrade/downgrade), optionally update seats at the same time
  changePlan: (planId: number, seatCount?: number) =>
    api.post('/billing/change-plan', { plan_id: planId, ...(seatCount != null ? { seat_count: seatCount } : {}) }),

  // Plan change preview (proration)
  changePlanPreview: (planId: number, seatCount?: number) =>
    api.get<{ data: { preview: PlanChangePreview | null } }>('/billing/change-plan/preview', {
      params: { plan_id: planId, ...(seatCount != null ? { seat_count: seatCount } : {}) },
    }),

  // Update seats
  updateSeats: (seatCount: number) =>
    api.post('/billing/update-seats', { seat_count: seatCount }),

  // Seat change preview (proration)
  seatsPreview: (seatCount: number) =>
    api.get<{ data: SeatsPreviewResponse }>('/billing/seats/preview', { params: { seat_count: seatCount } }),

  // Invoices
  getInvoices: (startingAfter?: string) =>
    api.get<{ data: { data: InvoiceRecord[]; has_more: boolean } }>('/billing/invoices', {
      params: startingAfter ? { starting_after: startingAfter } : undefined,
    }),

  // Wallet
  walletTopUp: (payload: { amount: number; payment_method: string }) =>
    api.post('/billing/wallet/top-up', payload),

  getWalletBalance: () =>
    api.get<{ data: { balance: number; currency: string } }>('/billing/wallet'),

  getWalletTransactions: (page = 1) =>
    api.get<{ data: { data: WalletTransaction[]; total: number; page: number; per_page: number; last_page: number } }>(
      '/billing/wallet/transactions', { params: { page } }
    ),

  // Payment methods
  getPaymentMethods: () =>
    api.get<{ data: PaymentMethod[] }>('/billing/payment-methods'),

  addPaymentMethod: (paymentMethod: string, setDefault = true) =>
    api.post('/billing/payment-methods', { payment_method: paymentMethod, set_default: setDefault }),

  removePaymentMethod: (id: string) =>
    api.delete(`/billing/payment-methods/${id}`),

  // Subscription events / activity log
  getEvents: (page = 1) =>
    api.get<{ data: { data: SubscriptionEvent[]; total: number; page: number; per_page: number; last_page: number } }>(
      '/billing/events', { params: { page } }
    ),

  // Wallet low-balance threshold
  updateWalletThreshold: (thresholdCents: number) =>
    api.put('/billing/wallet/threshold', { wallet_low_threshold_cents: thresholdCents }),
}
