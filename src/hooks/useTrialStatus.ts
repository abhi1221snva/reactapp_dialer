import { useQuery } from '@tanstack/react-query'
import { billingService } from '../services/billing.service'
import { useAuthStore } from '../stores/auth.store'

/**
 * Trial status derived from the new billing engine. A tenant is "on trial"
 * while their subscription.status === 'trialing'. Days remaining is computed
 * from current_period_end (or trial_ends_at if present).
 *
 * Skips for system admins (level >= 9) and during impersonation.
 */
export function useTrialStatus() {
  const user = useAuthStore((s) => s.user)
  const impersonating = useAuthStore((s) => s.impersonating)
  const level = user?.level ?? 0
  const enabled = level > 0 && level < 9 && !impersonating

  const { data, isLoading } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: billingService.getSubscription,
    staleTime: 5 * 60 * 1000,
    enabled,
  })

  const sub = data?.data?.data?.subscription ?? null
  const status = sub?.status ?? null

  const trialEnds = sub?.trial_ends_at ?? sub?.current_period_end ?? null
  const isTrial = status === 'trialing'
  const isExpired = status === 'past_due' || status === 'canceled' || status === 'incomplete_expired'

  let daysRemaining = 0
  if (trialEnds) {
    const ms = new Date(trialEnds).getTime() - Date.now()
    daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  }

  return {
    trialStatus: sub,
    isLoading,
    isTrial,
    isExpired,
    daysRemaining,
    shouldShowBanner: !isLoading && (isTrial || isExpired) && enabled,
  }
}
