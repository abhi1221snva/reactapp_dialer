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
  // Resets callDuration to 0; the interval itself lives in a React ref (Dialer.tsx)
  startCallTimer: () => void
  resetDialer: () => void
}

export const useDialerStore = create<DialerState>((set) => ({
  callState: 'idle',
  activeCampaign: null,
  activeLead: null,
  callDuration: 0,
  dispositions: [],
  isExtensionLoggedIn: false,
  isMuted: false,
  isOnHold: false,
  incomingCall: null,
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

  startCallTimer: () => set({ callDuration: 0 }),

  resetDialer: () =>
    set({
      callState: 'ready',
      activeLead: null,
      callDuration: 0,
      isMuted: false,
      isOnHold: false,
      activeCallId: null,
    }),
}))
