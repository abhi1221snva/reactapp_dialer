import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  // Impersonation — system admin switched into a client workspace
  impersonating: boolean
  originalToken: string | null
  originalUser: User | null
  impersonatingCompany: string | null

  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
  startImpersonation: (newToken: string, newUser: User, company: string) => void
  stopImpersonation: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      impersonating: false,
      originalToken: null,
      originalUser: null,
      impersonatingCompany: null,

      setAuth: (token, user) => {
        localStorage.setItem('auth_token', token)
        set({ token, user, isAuthenticated: true })
      },

      clearAuth: () => {
        const { token } = get()
        // Blacklist token on backend (fire and forget — local state cleared regardless)
        if (token) {
          fetch(`${(import.meta.env.VITE_API_URL as string) || ''}/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {})
        }
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        set({
          token: null, user: null, isAuthenticated: false,
          impersonating: false, originalToken: null, originalUser: null, impersonatingCompany: null,
        })
      },

      updateUser: (partial) => {
        const current = get().user
        if (current) set({ user: { ...current, ...partial } })
      },

      startImpersonation: (newToken, newUser, company) => {
        const { token, user } = get()
        localStorage.setItem('auth_token', newToken)
        set({
          originalToken: token,
          originalUser: user,
          impersonatingCompany: company,
          impersonating: true,
          token: newToken,
          user: newUser,
          isAuthenticated: true,
        })
      },

      stopImpersonation: () => {
        const { originalToken, originalUser } = get()
        if (originalToken && originalUser) {
          localStorage.setItem('auth_token', originalToken)
          set({
            token: originalToken,
            user: originalUser,
            impersonating: false,
            originalToken: null,
            originalUser: null,
            impersonatingCompany: null,
            isAuthenticated: true,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        impersonating: state.impersonating,
        originalToken: state.originalToken,
        originalUser: state.originalUser,
        impersonatingCompany: state.impersonatingCompany,
      }),
    }
  )
)
