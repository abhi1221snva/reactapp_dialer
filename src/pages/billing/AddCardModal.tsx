import { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { X, CreditCard, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingService } from '../../services/billing.service'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddCardModal({ open, onClose, onSuccess }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    try {
      const card = elements.getElement(CardElement)
      if (!card) throw new Error('Card element not found')

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card,
      })

      if (error) {
        toast.error(error.message || 'Card error')
        return
      }

      if (!paymentMethod) throw new Error('No payment method returned')

      await billingService.addPaymentMethod(paymentMethod.id)
      toast.success('Card added successfully')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add card'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <CreditCard size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900">Add Payment Method</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Card Details</label>
            <div className="border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '15px',
                      color: '#1e293b',
                      '::placeholder': { color: '#94a3b8' },
                    },
                    invalid: { color: '#ef4444' },
                  },
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Your card info is securely processed by Stripe. We never see your full card number.</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !stripe}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Add Card
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
