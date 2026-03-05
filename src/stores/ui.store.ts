import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  activeModal: string | null
  toggleSidebar: () => void
  openModal: (name: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeModal: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}))
