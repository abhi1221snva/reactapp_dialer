import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Wallet, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingService } from '../../services/billing.service'
import { cn } from '../../utils/cn'

const PRESETS = [25, 50, 100, 250]

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

/**
 * Top up wallet by charging a saved card. The flow:
 *   1. Pick amount + saved payment method.
 *   2. POST /billing/wallet/recharge with payment_method_id → backend creates a
 *      PaymentIntent and confirms it off-session in one round trip.
 *   3. Stripe webhook credits the wallet asynchronously.
 *
 * If the customer has no saved cards we tell them to add one in the Payment
 * Methods tab first — keeps this modal a single-purpose "pay now" flow.
 */
export function TopUpModal({ open, onClose, onSuccess }: Props) {
  const [amountInput, setAmountInput] = useState<string>('25')
  const [selectedPm, setSelectedPm] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Sanitize a raw input string: digits + at most one dot + max 2 decimals.
  // Strips leading zeros so "023" becomes "23", but leaves "0.5" alone.
  function sanitizeAmount(raw: string): string {
    let v = raw.replace(/[^\d.]/g, '')
    // Keep only the first dot
    const firstDot = v.indexOf('.')
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '')
    }
    // Cap to 2 decimal places
    const parts = v.split('.')
    if (parts[1] && parts[1].length > 2) {
      v = parts[0] + '.' + parts[1].slice(0, 2)
    }
    // Strip leading zeros: "00" → "0", "023" → "23", "0.5" stays
    v = v.replace(/^0+(?=\d)/, '')
    return v
  }

  const finalAmount = parseFloat(amountInput)
  const amount = Number.isFinite(finalAmount) ? finalAmount : 0

  const { data: pmRes, isLoading: pmLoading } = useQuery({
    queryKey: ['billing-payment-methods'],
    queryFn: billingService.getPaymentMethods,
    enabled: open,
  })

  const cards = pmRes?.data?.data?.payment_methods ?? []
  const defaultId = pmRes?.data?.data?.default_id ?? null

  // When the modal opens / cards load, default the dropdown to the customer's
  // default card if there is one; otherwise the first card.
  useEffect(() => {
    if (!open) return
    if (selectedPm) return
    if (defaultId && cards.find((c) => c.id === defaultId)) {
      setSelectedPm(defaultId)
    } else if (cards.length > 0) {
      setSelectedPm(cards[0].id)
    }
  }, [open, defaultId, cards, selectedPm])

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setAmountInput('25')
      setSelectedPm('')
      setSubmitting(false)
    }
  }, [open])

  if (!open) return null

  const handleTopUp = async () => {
    if (amount < 10) {
      toast.error('Minimum top up is $10')
      return
    }
    if (!selectedPm) {
      toast.error('Please pick a payment method.')
      return
    }
    setSubmitting(true)
    try {
      const res = await billingService.recharge(amount, selectedPm)
      const status = res.data?.data?.status
      if (status === 'succeeded') {
        toast.success(`$${amount.toFixed(2)} top up complete.`)
      } else if (status === 'requires_action' || status === 'requires_confirmation') {
        toast(`Authentication needed — Stripe will email a link or contact you.`, { icon: 'ℹ️' })
      } else {
        toast.success(`$${amount.toFixed(2)} top up submitted. Wallet will update once Stripe confirms.`)
      }
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Top up failed')
    } finally {
      setSubmitting(false)
    }
  }

  const cardLabel = (c: typeof cards[number]) => {
    const brand = (c.brand ?? 'card').toUpperCase()
    const exp = `${String(c.exp_month ?? '').padStart(2, '0')}/${c.exp_year ?? ''}`
    return `${brand} ****${c.last4 ?? '----'} (exp ${exp})${c.is_default ? ' — Default' : ''}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Wallet size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900">Top Up Wallet</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select Amount</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountInput(String(val))}
                  className={cn(
                    'py-3 rounded-xl font-bold text-sm transition-all border-2',
                    amount === val
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-700 hover:border-indigo-300',
                  )}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Or Enter Custom Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="10.00"
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={amountInput}
                onChange={(e) => setAmountInput(sanitizeAmount(e.target.value))}
                onBlur={() => {
                  // On blur, normalize to a clean number with up to 2 decimals
                  // (e.g. "10." → "10", "" stays empty)
                  if (amountInput === '' || amountInput === '.') return
                  const n = parseFloat(amountInput)
                  if (Number.isFinite(n)) setAmountInput(String(n))
                }}
              />
            </div>
            <p className={cn(
              'text-xs mt-1',
              amountInput && amount > 0 && amount < 10 ? 'text-red-500' : 'text-slate-400'
            )}>
              {amountInput && amount > 0 && amount < 10
                ? `Minimum $10.00 — currently $${amount.toFixed(2)}`
                : 'Minimum $10.00'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
            {pmLoading ? (
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading saved cards…
              </div>
            ) : cards.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No saved cards. Add one in the <strong>Payment Methods</strong> tab first.
              </p>
            ) : (
              <select
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                value={selectedPm}
                onChange={(e) => setSelectedPm(e.target.value)}
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{cardLabel(c)}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTopUp}
              disabled={submitting || cards.length === 0 || amount < 10}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              Top Up ${amount.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
