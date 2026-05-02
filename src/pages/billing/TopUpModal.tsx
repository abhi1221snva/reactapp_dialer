import { useState } from 'react'
import { X, Wallet, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingService, type PaymentMethod } from '../../services/billing.service'
import { cn } from '../../utils/cn'

const PRESETS = [25, 50, 100, 250]

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  paymentMethods: PaymentMethod[]
  onAddCard: () => void
}

export function TopUpModal({ open, onClose, onSuccess, paymentMethods, onAddCard }: Props) {
  const [amount, setAmount] = useState<number | ''>('')
  const [selectedPm, setSelectedPm] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const defaultPm = paymentMethods.find(m => m.is_default)
  const activePm = selectedPm || defaultPm?.id || paymentMethods[0]?.id || ''
  const finalAmount = typeof amount === 'number' ? amount : 0

  const handlePreset = (val: number) => {
    setAmount(val)
  }

  const handleSubmit = async () => {
    if (finalAmount < 10) {
      toast.error('Minimum top-up amount is $10')
      return
    }
    if (!activePm) {
      toast.error('Please add a payment method first')
      onAddCard()
      return
    }

    setLoading(true)
    try {
      await billingService.walletTopUp({ amount: finalAmount, payment_method: activePm })
      toast.success(`$${finalAmount.toFixed(2)} added to wallet`)
      onSuccess()
      onClose()
    } catch {
      // Error toast handled by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
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
          {/* Preset amounts */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select Amount</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map(val => (
                <button
                  key={val}
                  onClick={() => handlePreset(val)}
                  className={cn(
                    'py-3 rounded-xl font-bold text-sm transition-all border-2',
                    amount === val
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-700 hover:border-indigo-300'
                  )}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Or Enter Custom Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input
                type="number"
                min={10}
                step="0.01"
                placeholder="10.00"
                value={amount === '' ? '' : amount}
                onChange={e => setAmount(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Minimum $10.00</p>
          </div>

          {/* Card selector */}
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
                    {pm.brand.toUpperCase()} ****{pm.last4} (exp {pm.exp_month}/{pm.exp_year})
                    {pm.is_default ? ' — Default' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <button
                onClick={onAddCard}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
              >
                <Plus size={15} /> Add a payment method
              </button>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || finalAmount < 10 || !activePm}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Top Up ${finalAmount > 0 ? finalAmount.toFixed(2) : '0.00'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
