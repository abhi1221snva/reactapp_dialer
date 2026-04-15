import { create } from 'zustand'
import api from '../api/axios'

export interface MenuItemApi {
  route_path: string
  label: string
  icon_name: string | null
  badge_source: string | null
}

export interface MenuSectionApi {
  section_label: string
  items: MenuItemApi[]
}

interface MenuState {
  sections: MenuSectionApi[]
  loading: boolean
  loaded: boolean
  error: string | null
  fetchMenu: (engine: 'dialer' | 'crm') => Promise<void>
  clearMenu: () => void
}

export const useMenuStore = create<MenuState>()((set, get) => ({
  sections: [],
  loading: false,
  loaded: false,
  error: null,

  fetchMenu: async (engine) => {
    // Avoid redundant fetches while one is in-flight
    if (get().loading) return

    set({ loading: true, error: null })
    try {
      const res = await api.get('/user/menu', { params: { engine } })
      const data = res.data?.data ?? res.data ?? []
      set({ sections: data, loaded: true, loading: false })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load menu'
      console.error('[menu.store] fetchMenu error:', msg)
      set({ error: msg, loading: false, loaded: true })
    }
  },

  clearMenu: () => set({ sections: [], loaded: false, loading: false, error: null }),
}))
