import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import type { ReactNode } from 'react'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY || '')

export function StripeProvider({ children }: { children: ReactNode }) {
  return (
    <Elements stripe={stripePromise} options={{ locale: 'en' }}>
      {children}
    </Elements>
  )
}
