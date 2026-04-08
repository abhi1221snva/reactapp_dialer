import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useMenuStore } from '../stores/menu.store'
import { useAuthStore } from '../stores/auth.store'
import { useEngineStore } from '../stores/engine.store'
import { LEVELS } from '../utils/permissions'

/** Routes that are always accessible regardless of menu permissions */
const ALWAYS_ALLOWED = new Set([
  '/dashboard',
  '/dialer',
  '/profile',
  '/settings/security',
  '/settings/2fa-setup',
  '/onboarding',
  '/agents',
])

/**
 * Wraps a route element and checks if the current path is in
 * the user's allowed menu. Redirects to /dashboard if not.
 * System administrators (level 11) bypass all checks.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { sections, loaded, loading, fetchMenu } = useMenuStore()
  const user = useAuthStore(s => s.user)
  const engine = useEngineStore(s => s.engine)
  const userLevel = user?.level ?? 1

  // Trigger menu fetch if not yet loaded
  useEffect(() => {
    if (!loaded && !loading) {
      fetchMenu(engine)
    }
  }, [loaded, loading, engine, fetchMenu])

  // System admin bypasses all frontend guards
  if (userLevel >= LEVELS.SYSTEM_ADMIN) return <>{children}</>

  // Always-allowed routes
  if (ALWAYS_ALLOWED.has(location.pathname)) return <>{children}</>

  // Block rendering until menu is loaded — show loading spinner
  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Check if the current path matches any menu item's route_path
  const currentPath = location.pathname
  const isAllowed = sections.some(section =>
    section.items.some(item => {
      // Exact match
      if (item.route_path === currentPath) return true
      // Sub-route match: /campaigns/123 should match /campaigns
      if (currentPath.startsWith(item.route_path + '/')) return true
      return false
    })
  )

  if (!isAllowed) {
    return <Navigate to={engine === 'crm' ? '/crm/dashboard' : '/dashboard'} replace />
  }

  return <>{children}</>
}
