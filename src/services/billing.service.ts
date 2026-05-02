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
  billing_cycle: 'monthly' | 'annual'
  subscription_status: string | null
  subscription_started_at: string | null
  subscription_ends_at: string | null
  usage: {
    agents: UsageMetric
    calls: UsageMetric
    sms: UsageMetric
    year_month: string
  }
  wallet_balance: number
  upcoming_invoice: UpcomingInvoice | null
}

export interface AvailablePlansResponse {
  plans: SubscriptionPlan[]
  current_plan_id: number | null
  billing_cycle: string
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

// ── Service ───────────────────────────────────────────────────────────────────

export const billingService = {
  // Overview
  getOverview: () =>
    api.get<{ data: BillingOverview }>('/billing/overview'),

  // Plans
  getAvailablePlans: () =>
    api.get<{ data: AvailablePlansResponse }>('/billing/plans'),

  // Subscribe (trial → paid)
  subscribe: (payload: { plan_id: number; payment_method: string; billing_cycle: 'monthly' | 'annual' }) =>
    api.post('/billing/subscribe', payload),

  // Upgrade
  upgrade: (payload: { plan_id: number; billing_cycle?: 'monthly' | 'annual' }) =>
    api.post('/billing/upgrade', payload),

  // Upgrade preview (proration)
  upgradePreview: (planId: number, billingCycle?: string) =>
    api.get('/billing/upgrade/preview', { params: { plan_id: planId, billing_cycle: billingCycle } }),

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
}
