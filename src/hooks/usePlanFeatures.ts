/**
 * Single-plan model: every active tenant has the same feature set, so this
 * hook now always returns true. Kept as a hook (not a constant) so existing
 * call sites compile unchanged.
 */
export function usePlanFeatures() {
  return {
    features: {} as Record<string, boolean>,
    loading: false,
    error: null as unknown,
    hasFeature: (_key: string): boolean => true,
  }
}
