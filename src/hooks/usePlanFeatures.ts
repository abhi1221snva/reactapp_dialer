import { useQuery } from '@tanstack/react-query'
import { subscriptionService, type PlanFeatures } from '../services/subscription.service'

/**
 * Hook that fetches the current client's plan features.
 * Returns a `hasFeature(key)` helper for conditionally showing UI.
 *
 * Features are cached for 5 minutes to avoid excessive API calls.
 */
export function usePlanFeatures() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['plan-features'],
    queryFn: () => subscriptionService.getMyFeatures(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const features: PlanFeatures = data?.data?.data ?? {}

  return {
    features,
    loading: isLoading,
    error,
    hasFeature: (key: string): boolean => {
      // Default to true if features haven't loaded (backward compat)
      if (isLoading || Object.keys(features).length === 0) return true
      return features[key] ?? false
    },
  }
}
