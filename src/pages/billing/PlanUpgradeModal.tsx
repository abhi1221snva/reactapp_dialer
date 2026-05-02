import { useState, useEffect } from 'react'
import { X, ArrowUp, Loader2, CheckCircle2, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingService, type PaymentMethod } from '../../services/billing.service'
import type { SubscriptionPlan } from '../../services/subscription.service'
import { cn } from '../../utils/cn'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  plan: SubscriptionPlan
  currentPlan: SubscriptionPlan | null
  currentCycle: 'monthly' | 'annual'
  hasSubscription: boolean
  paymentMethods: PaymentMethod[]
  onAddCard: () => void
}

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

export function PlanUpgradeModal({ open, onClose, onSuccess, plan, currentPlan, currentCycle, hasSubscription, paymentMethods, onAddCard }: Props) {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>(currentCycle)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ amount_due: number; lines: { description: string; amount: number }[] } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedPm, setSelectedPm] = useState('')

  const defaultPm = paymentMethods.find(m => m.is_default)
  const activePm = selectedPm || defaultPm?.id || paymentMethods[0]?.id || ''

  useEffect(() => {
    if (!open || !hasSubscription) {
      setPreview(null)
      return
    }

    setPreviewLoading(true)
    billingService.upgradePreview(plan.id, cycle)
      .then(res => setPreview(res.data?.data?.preview ?? null))
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false))
  }, [open, plan.id, cycle, hasSubscription])

  if (!open) return null

  const price = cycle === 'annual' ? plan.price_annual : plan.price_monthly

  const handleConfirm = async () => {
    if (!activePm) {
      toast.error('Please add a payment method first')
      onAddCard()
      return
    }

    setLoading(true)
    try {
      if (hasSubscription) {
        await billingService.upgrade({ plan_id: plan.id, billing_cycle: cycle })
        toast.success('Plan upgraded successfully')
      } else {
        await billingService.subscribe({ plan_id: plan.id, payment_method: activePm, billing_cycle: cycle })
        toast.success('Subscription activated')
      }
      onSuccess()
      onClose()
    } catch {
      // Error toast handled by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  const features = Object.entries(FEATURE_LABELS)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <ArrowUp size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900">{hasSubscription ? 'Upgrade Plan' : 'Subscribe to Plan'}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Plan summary */}
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4">
            <h4 className="font-bold text-lg text-slate-900">{plan.name}</h4>
            <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
            <div className="flex items-end gap-1 mt-3">
              <span className="text-3xl font-bold text-indigo-600">${price}</span>
              <span className="text-slate-500 text-sm mb-1">/{cycle === 'annual' ? 'year' : 'month'}</span>
            </div>
          </div>

          {/* Billing cycle */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Billing Cycle</label>
            <div className="flex gap-2">
              {(['monthly', 'annual'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all capitalize',
                    cycle === c
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                  )}
                >
                  {c}
                  {c === 'annual' && plan.price_annual > 0 && plan.price_monthly > 0 && (
                    <span className="ml-1 text-xs text-emerald-600">
                      (Save {Math.round((1 - plan.price_annual / (plan.price_monthly * 12)) * 100)}%)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feature comparison */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Included Features</label>
            <div className="space-y-1.5">
              {features.map(([key, label]) => {
                const included = !!(plan as Record<string, unknown>)[key]
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {included ? (
                      <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Minus size={15} className="text-slate-300 flex-shrink-0" />
                    )}
                    <span className={included ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Proration preview */}
          {hasSubscription && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Proration Preview</label>
              {previewLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Calculating...
                </div>
              ) : preview ? (
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
                  {preview.lines.map((line, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-slate-600">{line.description}</span>
                      <span className="font-semibold">${(line.amount / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                    <span className="font-semibold text-slate-900">Amount Due Today</span>
                    <span className="font-bold text-indigo-600">${(preview.amount_due / 100).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Unable to load preview</p>
              )}
            </div>
          )}

          {/* Payment method */}
          {!hasSubscription && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
              {paymentMethods.length > 0 ? (
                <select
                  value={activePm}
                  onChange={e => setSelectedPm(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>
                      {pm.brand.toUpperCase()} ****{pm.last4}
                      {pm.is_default ? ' — Default' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={onAddCard}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
                >
                  Add a payment method first
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || (!hasSubscription && !activePm)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 disabled:opacity-50 transition-all"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {hasSubscription ? 'Confirm Upgrade' : 'Subscribe Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
