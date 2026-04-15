import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MerchantUser {
  id: number
  email: string
  client_id: number
  lead_id: number
  status: number
  token: string
  expires_at: string
}

interface MerchantAuthState {
  merchant: MerchantUser | null
  isAuthenticated: boolean
  login: (merchant: MerchantUser) => void
  logout: () => void
}

export const useMerchantAuthStore = create<MerchantAuthState>()(
  persist(
    (set) => ({
      merchant: null,
      isAuthenticated: false,
      login: (merchant) => set({ merchant, isAuthenticated: true }),
      logout: () => set({ merchant: null, isAuthenticated: false }),
    }),
    { name: 'merchant-auth' },
  ),
)
