import { useQuery } from '@tanstack/react-query'
import { packageService, type TrialStatus } from '../services/package.service'
import { useAuthStore } from '../stores/auth.store'

/**
 * Fetches the current client's trial status.
 * Cached for 5 minutes. Skips fetch for system admins (level >= 9) and during impersonation.
 */
export function useTrialStatus() {
  const user = useAuthStore(s => s.user)
  const impersonating = useAuthStore(s => s.impersonating)
  const level = user?.level ?? 0

  const enabled = level > 0 && level < 9 && !impersonating

  const { data, isLoading } = useQuery({
    queryKey: ['trial-status'],
    queryFn: () => packageService.getTrialStatus(),
    staleTime: 5 * 60 * 1000,
    enabled,
  })

  const trialStatus: TrialStatus | null = data?.data?.data ?? null

  // count === 1 means client only has the trial package
  const isTrial = trialStatus ? trialStatus.count <= 1 : false
  const isExpired = trialStatus?.expired ?? false
  const daysRemaining = trialStatus?.days_remaining ?? 0

  return {
    trialStatus,
    isLoading,
    isTrial,
    isExpired,
    daysRemaining,
    shouldShowBanner: !isLoading && isTrial && enabled,
  }
}
