import { useEffect, useState } from 'react'
import { X, CreditCard, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { billingService } from '../../services/billing.service'

let stripePromise: Promise<Stripe | null> | null = null
function getStripe() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_KEY as string | undefined
    stripePromise = key ? loadStripe(key) : Promise.resolve(null)
  }
  return stripePromise
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

/**
 * Inline card capture using Stripe Elements (no redirect).
 *   1. POST /billing/payment-methods/setup-intent → { client_secret }
 *   2. <PaymentElement> renders for that secret
 *   3. stripe.confirmSetup() attaches the payment method to the Stripe customer
 */
export function AddCardModal({ open, onClose, onSuccess }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) {
      setClientSecret(null)
      setCreating(false)
      return
    }
    setCreating(true)
    billingService.createPaymentMethodSetupIntent()
      .then((res) => {
        const secret = res.data?.data?.client_secret
        if (!secret) {
          toast.error('Could not start card setup.')
          onClose()
          return
        }
        setClientSecret(secret)
      })
      .catch((e: any) => {
        toast.error(e?.response?.data?.message ?? 'Could not start card setup.')
        onClose()
      })
      .finally(() => setCreating(false))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <CreditCard size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900">Add Payment Method</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {creating || !clientSecret ? (
          <div className="p-10 flex items-center justify-center text-slate-500 gap-2">
            <Loader2 size={16} className="animate-spin" /> Preparing secure form…
          </div>
        ) : (
          <Elements stripe={getStripe()}>
            <CardForm clientSecret={clientSecret} onClose={onClose} onSuccess={onSuccess} />
          </Elements>
        )}
      </div>
    </div>
  )
}

function CardForm({ clientSecret, onClose, onSuccess }: { clientSecret: string; onClose: () => void; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    const card = elements.getElement(CardElement)
    if (!card) return

    setSubmitting(true)
    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    })

    if (error) {
      toast.error(error.message ?? 'Could not save card.')
      setSubmitting(false)
      return
    }

    toast.success('Card saved.')
    setSubmitting(false)
    onSuccess()
    onClose()
  }

  return (
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
        <p className="text-xs text-slate-400 mt-2">
          Your card info is securely processed by Stripe. We never see your full card number.
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !stripe || !elements}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Add Card
        </button>
      </div>
    </form>
  )
}
