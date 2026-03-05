import { create } from 'zustand'
import type { CallState, Campaign, Lead, Disposition, IncomingCall } from '../types'

interface DialerState {
  callState: CallState
  activeCampaign: Campaign | null
  activeLead: Lead | null
  callDuration: number
  dispositions: Disposition[]
  isExtensionLoggedIn: boolean
  isMuted: boolean
  isOnHold: boolean
  incomingCall: IncomingCall | null
  callTimer: ReturnType<typeof setInterval> | null
  activeCallId: string | null

  setCallState: (state: CallState) => void
  setActiveCampaign: (campaign: Campaign | null) => void
  setActiveLead: (lead: Lead | null) => void
  setDispositions: (dispositions: Disposition[]) => void
  setExtensionLoggedIn: (val: boolean) => void
  setMuted: (val: boolean) => void
  setOnHold: (val: boolean) => void
  setIncomingCall: (call: IncomingCall | null) => void
  setActiveCallId: (id: string | null) => void
  startCallTimer: () => void
  stopCallTimer: () => void
  resetDialer: () => void
}

export const useDialerStore = create<DialerState>((set, get) => ({
  callState: 'idle',
  activeCampaign: null,
  activeLead: null,
  callDuration: 0,
  dispositions: [],
  isExtensionLoggedIn: false,
  isMuted: false,
  isOnHold: false,
  incomingCall: null,
  callTimer: null,
  activeCallId: null,

  setCallState: (callState) => set({ callState }),
  setActiveCampaign: (activeCampaign) => set({ activeCampaign }),
  setActiveLead: (activeLead) => set({ activeLead }),
  setDispositions: (dispositions) => set({ dispositions }),
  setExtensionLoggedIn: (isExtensionLoggedIn) => set({ isExtensionLoggedIn }),
  setMuted: (isMuted) => set({ isMuted }),
  setOnHold: (isOnHold) => set({ isOnHold }),
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  setActiveCallId: (activeCallId) => set({ activeCallId }),

  startCallTimer: () => {
    const existing = get().callTimer
    if (existing) clearInterval(existing)
    set({ callDuration: 0 })
    const timer = setInterval(() => {
      set((state) => ({ callDuration: state.callDuration + 1 }))
    }, 1000)
    set({ callTimer: timer })
  },

  stopCallTimer: () => {
    const timer = get().callTimer
    if (timer) clearInterval(timer)
    set({ callTimer: null })
  },

  resetDialer: () => {
    const timer = get().callTimer
    if (timer) clearInterval(timer)
    set({
      callState: 'ready',
      activeLead: null,
      callDuration: 0,
      isMuted: false,
      isOnHold: false,
      callTimer: null,
      activeCallId: null,
    })
  },
}))
