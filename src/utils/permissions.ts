import type { User } from '../types'

export const LEVELS = {
  SUPERADMIN: 10,
  ADMIN: 7,
  MANAGER: 5,
  AGENT: 1,
} as const

export function canAccess(user: User | null, minLevel: number): boolean {
  if (!user) return false
  // Level 1 means any authenticated user can access
  if (minLevel <= 1) return true
  return (user.level ?? 1) >= minLevel
}

export function isAdmin(user: User | null): boolean {
  return canAccess(user, LEVELS.ADMIN)
}

export function isManager(user: User | null): boolean {
  return canAccess(user, LEVELS.MANAGER)
}

export function isAgent(user: User | null): boolean {
  return canAccess(user, LEVELS.AGENT)
}

export function isSuperAdmin(user: User | null): boolean {
  return canAccess(user, LEVELS.SUPERADMIN)
}
