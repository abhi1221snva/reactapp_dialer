import api from '../api/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan extends Record<string, unknown> {
  id: number
  slug: string
  name: string
  description: string | null
  price_monthly: number
  price_annual: number
  max_agents: number
  max_calls_monthly: number
  max_sms_monthly: number
  has_predictive_dialer: boolean
  has_full_crm: boolean
  has_api_access: boolean
  has_ai_coaching: boolean
  has_custom_integrations: boolean
  has_sso: boolean
  has_dedicated_csm: boolean
  has_white_label: boolean
  has_on_premise: boolean
  has_compliance_packages: boolean
  is_active: boolean
  display_order: number
  trial_days: number
  created_at?: string
  updated_at?: string
}

export interface ClientSubscription {
  plan: SubscriptionPlan | null
  client: {
    subscription_plan_id: number | null
    billing_cycle: 'monthly' | 'annual'
    subscription_status: string
    subscription_started_at: string | null
    subscription_ends_at: string | null
    custom_max_agents: number | null
    custom_max_calls_monthly: number | null
    custom_max_sms_monthly: number | null
  }
}

export interface UsageSummary {
  agents: { current: number; max: number }
  calls: { current: number; max: number }
  sms: { current: number; max: number }
  year_month: string
}

export interface PlanFeatures {
  [key: string]: boolean
}

export interface AssignPlanPayload {
  subscription_plan_id: number
  billing_cycle?: 'monthly' | 'annual'
  subscription_status?: string
  custom_max_agents?: number | null
  custom_max_calls_monthly?: number | null
  custom_max_sms_monthly?: number | null
}

export interface CreatePlanPayload {
  slug: string
  name: string
  description?: string
  price_monthly: number
  price_annual: number
  max_agents: number
  max_calls_monthly: number
  max_sms_monthly: number
  has_predictive_dialer?: boolean
  has_full_crm?: boolean
  has_api_access?: boolean
  has_ai_coaching?: boolean
  has_custom_integrations?: boolean
  has_sso?: boolean
  has_dedicated_csm?: boolean
  has_white_label?: boolean
  has_on_premise?: boolean
  has_compliance_packages?: boolean
  is_active?: boolean
  display_order?: number
  trial_days?: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const subscriptionService = {
  // Admin: list all plans
  listPlans: () =>
    api.get<{ data: SubscriptionPlan[] }>('/admin/subscription-plans'),

  // Admin: create plan
  createPlan: (payload: CreatePlanPayload) =>
    api.post<{ data: SubscriptionPlan }>('/admin/subscription-plans', payload),

  // Admin: update plan
  updatePlan: (id: number, payload: Partial<CreatePlanPayload>) =>
    api.put<{ data: SubscriptionPlan }>(`/admin/subscription-plans/${id}`, payload),

  // Admin: get client subscription
  getClientSubscription: (clientId: number) =>
    api.get<{ data: ClientSubscription }>(`/admin/clients/${clientId}/subscription`),

  // Admin: assign plan to client
  assignPlan: (clientId: number, payload: AssignPlanPayload) =>
    api.put<{ data: Record<string, unknown> }>(`/admin/clients/${clientId}/subscription`, payload),

  // Client-facing: my plan
  getMyPlan: () =>
    api.get<{ data: Record<string, unknown> }>('/subscription/plan'),

  // Client-facing: my usage
  getMyUsage: () =>
    api.get<{ data: UsageSummary }>('/subscription/usage'),

  // Client-facing: my features
  getMyFeatures: () =>
    api.get<{ data: PlanFeatures }>('/subscription/features'),
}
