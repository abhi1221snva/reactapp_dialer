import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  activeModal: string | null
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  openModal: (name: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  activeModal: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}))
