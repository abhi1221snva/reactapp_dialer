import { create } from 'zustand'
import type { CallState, TransferState, Campaign, Lead, Disposition, IncomingCall, CallLog } from '../types'

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

  // Transfer sub-state
  transferState: TransferState
  transferSessionId: string | null

  // Session call log (in-memory, cleared on extension logout)
  callLogs: CallLog[]

  // Lead history stack for previous-lead navigation
  leadHistory: Lead[]

  // Provider error reason shown during 'failed' state
  failReason: string | null

  setCallState: (state: CallState) => void
  setActiveCampaign: (campaign: Campaign | null) => void
  setActiveLead: (lead: Lead | null) => void
  setDispositions: (dispositions: Disposition[]) => void
  setExtensionLoggedIn: (val: boolean) => void
  setMuted: (val: boolean) => void
  setOnHold: (val: boolean) => void
  setIncomingCall: (call: IncomingCall | null) => void
  setActiveCallId: (id: string | null) => void

  setFailReason: (reason: string | null) => void

  setTransferState: (state: TransferState) => void
  setTransferSessionId: (id: string | null) => void

  addCallLog: (log: CallLog) => void
  updateLastCallLog: (patch: Partial<CallLog>) => void
  clearCallLogs: () => void

  /** Push current activeLead onto history before switching to next */
  pushLeadToHistory: () => void
  /** Pop the most recent lead from history and set as activeLead */
  goToPreviousLead: () => void

  // Resets callDuration to 0; the interval itself lives in Dialer.tsx via a ref
  startCallTimer: () => void
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
  activeCallId: null,

  transferState: 'idle',
  transferSessionId: null,

  callLogs: [],
  leadHistory: [],
  failReason: null,

  setCallState: (callState) => set({ callState }),
  setActiveCampaign: (activeCampaign) => set({ activeCampaign }),
  setActiveLead: (activeLead) => set({ activeLead }),
  setDispositions: (dispositions) => set({ dispositions }),
  setExtensionLoggedIn: (isExtensionLoggedIn) => set({ isExtensionLoggedIn }),
  setMuted: (isMuted) => set({ isMuted }),
  setOnHold: (isOnHold) => set({ isOnHold }),
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  setActiveCallId: (activeCallId) => set({ activeCallId }),

  setFailReason: (failReason) => set({ failReason }),

  setTransferState: (transferState) => set({ transferState }),
  setTransferSessionId: (transferSessionId) => set({ transferSessionId }),

  addCallLog: (log) => set((s) => ({ callLogs: [log, ...s.callLogs].slice(0, 50) })),

  updateLastCallLog: (patch) =>
    set((s) => {
      if (s.callLogs.length === 0) return s
      const [head, ...rest] = s.callLogs
      return { callLogs: [{ ...head, ...patch }, ...rest] }
    }),

  clearCallLogs: () => set({ callLogs: [] }),

  pushLeadToHistory: () => {
    const { activeLead, leadHistory } = get()
    if (!activeLead) return
    set({ leadHistory: [...leadHistory, activeLead].slice(-20) }) // keep last 20
  },

  goToPreviousLead: () => {
    const { leadHistory } = get()
    if (leadHistory.length === 0) return
    const prev = leadHistory[leadHistory.length - 1]
    set({
      activeLead: prev,
      leadHistory: leadHistory.slice(0, -1),
    })
  },

  startCallTimer: () => set({ callDuration: 0 }),

  resetDialer: () =>
    set({
      callState: 'ready',
      activeLead: null,
      callDuration: 0,
      isMuted: false,
      isOnHold: false,
      activeCallId: null,
      transferState: 'idle',
      transferSessionId: null,
      failReason: null,
    }),
}))
