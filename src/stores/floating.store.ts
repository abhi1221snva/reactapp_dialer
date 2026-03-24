import { create } from 'zustand'

/** Visual icon variant for the phone FAB sub-button */
export type PhoneFabIcon = 'idle' | 'calling' | 'loading' | 'incoming'

interface FloatingState {
  // ── Open/close panels ──────────────────────────────────────────────────────
  chatOpen: boolean
  phoneOpen: boolean
  smsOpen: boolean
  phoneMinimized: boolean
  setChatOpen: (v: boolean) => void
  setPhoneOpen: (v: boolean) => void
  setSmsOpen: (v: boolean) => void
  setPhoneMinimized: (v: boolean) => void

  // ── Phone FAB visual ───────────────────────────────────────────────────────
  phoneFabBg: string
  phoneFabShadow: string
  phoneFabIcon: PhoneFabIcon
  phoneHasIncoming: boolean
  phoneStatusMsg: string
  setPhoneFabBg: (v: string) => void
  setPhoneFabShadow: (v: string) => void
  setPhoneFabIcon: (v: PhoneFabIcon) => void
  setPhoneHasIncoming: (v: boolean) => void
  setPhoneStatusMsg: (v: string) => void

  // ── Phone registration state (true when SIP stack says 'ready') ────────────
  phoneRegistered: boolean
  setPhoneRegistered: (v: boolean) => void

  // ── Phone action ─── (WebPhone registers this so FABMenu can call sipEnable)
  phoneClickHandler: (() => void) | null
  registerPhoneClick: (fn: () => void) => void

  // ── Chat unread ────────────────────────────────────────────────────────────
  chatUnread: number
  setChatUnread: (n: number) => void

  // ── SMS unread ─────────────────────────────────────────────────────────────
  smsUnread: number
  setSmsUnread: (n: number) => void
}

export const useFloatingStore = create<FloatingState>((set) => ({
  chatOpen: false,
  phoneOpen: false,
  smsOpen: false,
  phoneMinimized: false,
  setChatOpen: (v) => set((state) => ({
    chatOpen: v,
    phoneOpen: v ? false : state.phoneOpen,
    smsOpen:  v ? false : state.smsOpen,
  })),
  setPhoneOpen: (v) => set((state) => ({
    phoneOpen: v,
    phoneMinimized: v ? state.phoneMinimized : false,
    chatOpen: v ? false : state.chatOpen,
    smsOpen:  v ? false : state.smsOpen,
  })),
  setSmsOpen: (v) => set((state) => ({
    smsOpen:   v,
    chatOpen:  v ? false : state.chatOpen,
    phoneOpen: v ? false : state.phoneOpen,
  })),
  setPhoneMinimized: (v) => set({ phoneMinimized: v }),

  phoneFabBg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  phoneFabShadow: '0 6px 24px rgba(239,68,68,0.5)',
  phoneFabIcon: 'idle',
  phoneHasIncoming: false,
  phoneStatusMsg: 'Not Connected',
  setPhoneFabBg: (v) => set({ phoneFabBg: v }),
  setPhoneFabShadow: (v) => set({ phoneFabShadow: v }),
  setPhoneFabIcon: (v) => set({ phoneFabIcon: v }),
  setPhoneHasIncoming: (v) => set({ phoneHasIncoming: v }),
  setPhoneStatusMsg: (v) => set({ phoneStatusMsg: v }),

  phoneRegistered: false,
  setPhoneRegistered: (v) => set({ phoneRegistered: v }),

  phoneClickHandler: null,
  registerPhoneClick: (fn) => set({ phoneClickHandler: fn }),

  chatUnread: 0,
  setChatUnread: (n) => set({ chatUnread: n }),

  smsUnread: 0,
  setSmsUnread: (n) => set({ smsUnread: n }),
}))
