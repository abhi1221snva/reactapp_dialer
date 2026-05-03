import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw, DollarSign, Users, Upload, Loader2, CheckCircle2, XCircle, Crown,
} from 'lucide-react'
import {
  subscriptionService,
  type SubscriptionPlan,
} from '../../services/subscription.service'
import { Badge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const FEATURE_LABELS: Record<string, string> = {
  has_predictive_dialer: 'Predictive Dialer',
  has_full_crm: 'Full CRM',
  has_api_access: 'API Access',
  has_ai_coaching: 'AI Coaching',
  has_custom_integrations: 'Custom Integrations',
  has_sso: 'SSO',
  has_dedicated_csm: 'Dedicated CSM',
  has_white_label: 'White Label',
  has_on_premise: 'On-Premise',
  has_compliance_packages: 'Compliance Packages',
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'from-slate-500 to-slate-700',
  growth: 'from-blue-500 to-indigo-600',
  pro: 'from-violet-500 to-purple-600',
  enterprise: 'from-amber-500 to-orange-600',
}

export function SubscriptionPlans() {
  const qc = useQueryClient()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionService.listPlans(),
  })

  const plans: SubscriptionPlan[] = (data?.data?.data ?? []) as SubscriptionPlan[]
  const activePlans = plans.filter(p => p.is_active && (p as Record<string, unknown>).billing_model === 'per_seat')
  const legacyPlans = plans.filter(p => !p.is_active || (p as Record<string, unknown>).billing_model !== 'per_seat')

  const syncMutation = useMutation({
    mutationFn: () => subscriptionService.syncToStripe(),
    onSuccess: () => {
      toast.success('All plans synced to Stripe')
      qc.invalidateQueries({ queryKey: ['subscription-plans'] })
    },
    onError: () => { toast.error('Failed to sync plans to Stripe') },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-ghost btn-sm p-2 rounded-lg"
          title="Refresh"
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors"
          title="Sync all plans to Stripe"
        >
          {syncMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Sync All to Stripe
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Active tiered plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activePlans.map(plan => {
              const pr = plan as Record<string, unknown>
              const slug = (pr.slug as string) || 'starter'
              const unitPrice = (pr.unit_price_cents as number) || 0
              const gradient = PLAN_COLORS[slug] || PLAN_COLORS.starter

              return (
                <div key={plan.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <Crown size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{plan.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">{pr.slug as string}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {plan.is_active ? (
                        <Badge variant="green">Active</Badge>
                      ) : (
                        <Badge variant="gray">Inactive</Badge>
                      )}
                      {plan.stripe_product_id ? (
                        <Badge variant="blue">Synced</Badge>
                      ) : (
                        <Badge variant="red">Not Synced</Badge>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 text-center mb-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Price per Seat</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">${(unitPrice / 100).toFixed(0)}/mo</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Plan Order</p>
                      <p className="text-sm font-bold text-slate-900">{pr.plan_order as number}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Trial Days</p>
                      <p className="text-sm font-bold text-slate-900">{plan.trial_days}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Features</h4>
                    <div className="space-y-1">
                      {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                        const on = Boolean(pr[key])
                        return (
                          <div key={key} className="flex items-center gap-1.5 text-xs">
                            {on
                              ? <CheckCircle2 size={12} className="text-emerald-500" />
                              : <XCircle size={12} className="text-slate-300" />}
                            <span className={on ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <DollarSign size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Plans</p>
                <p className="text-2xl font-bold text-slate-900">{activePlans.length}</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-slate-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Legacy Plans</p>
                <p className="text-2xl font-bold text-slate-900">{legacyPlans.length}</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stripe Synced</p>
                <p className="text-2xl font-bold text-slate-900">{plans.filter(p => p.stripe_product_id).length}/{plans.length}</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <DollarSign size={20} className="text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Price Range</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${activePlans.length > 0 ? Math.min(...activePlans.map(p => ((p as Record<string, unknown>).unit_price_cents as number || 0) / 100)).toFixed(0) : '0'}-${activePlans.length > 0 ? Math.max(...activePlans.map(p => ((p as Record<string, unknown>).unit_price_cents as number || 0) / 100)).toFixed(0) : '0'}
                </p>
              </div>
            </div>
          </div>

          {/* Legacy plans (collapsed) */}
          {legacyPlans.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Legacy / Inactive Plans</h3>
              <div className="divide-y divide-slate-100">
                {legacyPlans.map(plan => {
                  const pr = plan as Record<string, unknown>
                  return (
                    <div key={plan.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400">#{plan.id}</span>
                        <div>
                          <span className="font-medium text-sm text-slate-700">{plan.name}</span>
                          <span className="ml-2 text-xs text-slate-400 font-mono">{pr.slug as string}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">
                          ${plan.price_monthly}/mo
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{pr.billing_model as string}</span>
                        {plan.is_active ? (
                          <Badge variant="green">Active</Badge>
                        ) : (
                          <Badge variant="gray">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
