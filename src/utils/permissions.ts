import type { User } from '../types'

export const LEVELS = {
  SYSTEM_ADMIN: 11,   // system_administrator (id 6)
  SUPERADMIN: 9,      // super_admin (id 5)
  ADMIN: 7,           // admin (id 1)
  MANAGER: 5,         // manager (id 3)
  ASSOCIATE: 3,       // associate (id 4)
  AGENT: 1,           // agent (id 2)
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
