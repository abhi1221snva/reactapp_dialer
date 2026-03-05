import { useAuthStore } from '../stores/auth.store'
import { canAccess, isAdmin, isManager, isSuperAdmin, LEVELS } from '../utils/permissions'

export function useAuth() {
  const { user, token, isAuthenticated, clearAuth } = useAuthStore()

  const sipConfig = user
    ? {
        extension: user.alt_extension || user.extension,
        server: user.server,
        domain: user.domain,
        password: user.secret ? atob(user.secret) : '',
        wsUri: `wss://${user.server}:8089/ws`,
      }
    : null

  return {
    user,
    token,
    isAuthenticated,
    level: user?.level ?? 0,
    canAccess: (minLevel: number) => canAccess(user, minLevel),
    isAdmin: isAdmin(user),
    isManager: isManager(user),
    isSuperAdmin: isSuperAdmin(user),
    isAgent: user ? user.level < LEVELS.MANAGER : false,
    sipConfig,
    logout: clearAuth,
  }
}
