import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw, DollarSign, Users, Upload, Loader2, CheckCircle2,
} from 'lucide-react'
import {
  subscriptionService,
  type SubscriptionPlan,
} from '../../services/subscription.service'
import { Badge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

export function SubscriptionPlans() {
  const qc = useQueryClient()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionService.listPlans(),
  })

  const plans: SubscriptionPlan[] = (data?.data?.data ?? []) as SubscriptionPlan[]
  const perSeatPlan = plans.find(p => (p.slug as string) === 'per_seat')
  const legacyPlans = plans.filter(p => (p.slug as string) !== 'per_seat')

  const syncMutation = useMutation({
    mutationFn: () => subscriptionService.syncToStripe(),
    onSuccess: () => {
      toast.success('Per-seat plan synced to Stripe')
      qc.invalidateQueries({ queryKey: ['subscription-plans'] })
    },
    onError: () => { toast.error('Failed to sync plan to Stripe') },
  })

  const pricePerSeat = perSeatPlan
    ? Number((perSeatPlan as Record<string, unknown>).unit_price_cents ?? 2900)
    : 2900

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
          title="Sync per-seat plan to Stripe"
        >
          {syncMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Sync to Stripe
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Active per-seat plan */}
          {perSeatPlan && (
            <div className="card ring-2 ring-indigo-500 shadow-indigo-100 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <DollarSign size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{perSeatPlan.name}</h3>
                    <p className="text-sm text-slate-500">{perSeatPlan.description as string}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {perSeatPlan.is_active ? (
                    <Badge variant="green">Active</Badge>
                  ) : (
                    <Badge variant="red">Inactive</Badge>
                  )}
                  {perSeatPlan.stripe_product_id ? (
                    <Badge variant="blue">Stripe Synced</Badge>
                  ) : (
                    <Badge variant="gray">Not Synced</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Price per Seat</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">${(pricePerSeat / 100).toFixed(0)}/mo</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Billing Model</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">Per-Seat</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Trial Period</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{perSeatPlan.trial_days} days</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Plan ID</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">#{perSeatPlan.id}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">Included Features (All)</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                    const on = Boolean((perSeatPlan as Record<string, unknown>)[key])
                    return (
                      <div key={key} className="flex items-center gap-1.5 text-sm">
                        <CheckCircle2 size={14} className={on ? 'text-emerald-500' : 'text-slate-300'} />
                        <span className={on ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <DollarSign size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Plans</p>
                <p className="text-2xl font-bold text-slate-900">{plans.filter(p => p.is_active).length}</p>
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
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Per-Seat Price</p>
                <p className="text-2xl font-bold text-slate-900">${(pricePerSeat / 100).toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Legacy plans (read-only, collapsed) */}
          {legacyPlans.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Legacy Plans (Deactivated)</h3>
              <div className="divide-y divide-slate-100">
                {legacyPlans.map(plan => (
                  <div key={plan.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">#{plan.id}</span>
                      <div>
                        <span className="font-medium text-sm text-slate-700">{plan.name}</span>
                        <span className="ml-2 text-xs text-slate-400 font-mono">{plan.slug as string}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">
                        ${plan.price_monthly}/mo
                      </span>
                      {plan.is_active ? (
                        <Badge variant="green">Active</Badge>
                      ) : (
                        <Badge variant="gray">Inactive</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
