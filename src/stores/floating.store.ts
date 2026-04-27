import { create } from 'zustand'
import type { Conversation } from '../types/chat.types'

const MAX_CHAT_WINDOWS = 4

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
  chatMaximized: boolean
  setChatMaximized: (v: boolean) => void

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

  // ── Phone in-call state (true when SIP call is connected) ─────────────────
  phoneInCall: boolean
  setPhoneInCall: (v: boolean) => void

  // ── Campaign dial flag (true while Dialer is originating a campaign call) ─
  campaignDialActive: boolean
  setCampaignDialActive: (v: boolean) => void

  // ── Phone action ─── (WebPhone registers this so FABMenu can call sipEnable)
  phoneClickHandler: (() => void) | null
  registerPhoneClick: (fn: () => void) => void

  // ── SIP answer/decline ── (WebPhone registers, IncomingCallModal calls) ──
  sipAnswerHandler: (() => void) | null
  sipDeclineHandler: (() => void) | null
  registerSipAnswer: (fn: () => void) => void
  registerSipDecline: (fn: () => void) => void

  // ── SIP outbound dial ── (WebPhone registers, Dialer calls for WebRTC campaign calls) ──
  sipDialHandler: ((phoneNumber: string) => void | Promise<void>) | null
  registerSipDial: (fn: (phoneNumber: string) => void | Promise<void>) => void

  // ── SIP mute/hold/hangup ── (WebPhone registers, DialerInterface calls) ───
  sipMuteHandler: ((muted: boolean) => void) | null
  sipHoldHandler: ((held: boolean) => void) | null
  sipHangupHandler: (() => void) | null
  registerSipMute: (fn: (muted: boolean) => void) => void
  registerSipHold: (fn: (held: boolean) => void) => void
  registerSipHangup: (fn: () => void) => void

  // ── Chat unread ────────────────────────────────────────────────────────────
  chatUnread: number
  setChatUnread: (n: number) => void

  // ── SMS unread ─────────────────────────────────────────────────────────────
  smsUnread: number
  setSmsUnread: (n: number) => void

  // ── Multi-window chat ──────────────────────────────────────────────────────
  openChatWindows: string[]                      // Conv UUIDs, ordered by focus (last = front)
  chatWindowConvs: Record<string, Conversation>  // Cache for open window rendering
  openChatWindow: (conv: Conversation) => void
  closeChatWindow: (uuid: string) => void
  focusChatWindow: (uuid: string) => void
}

export const useFloatingStore = create<FloatingState>((set) => ({
  chatOpen: false,
  phoneOpen: false,
  smsOpen: false,
  phoneMinimized: false,
  setChatOpen: (v) => set(() => ({
    chatOpen: v,
    // Close all mini windows + exit maximized when chat panel closes
    ...(!v ? { openChatWindows: [], chatWindowConvs: {}, chatMaximized: false } : {}),
  })),
  setPhoneOpen: (v) => set((state) => ({
    phoneOpen: v,
    phoneMinimized: v ? state.phoneMinimized : false,
  })),
  setSmsOpen: (v) => set({ smsOpen: v }),
  setPhoneMinimized: (v) => set({ phoneMinimized: v }),
  chatMaximized: false,
  setChatMaximized: (v) => set({ chatMaximized: v }),

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

  phoneInCall: false,
  setPhoneInCall: (v) => set({ phoneInCall: v }),

  campaignDialActive: false,
  setCampaignDialActive: (v) => set({ campaignDialActive: v }),

  phoneClickHandler: null,
  registerPhoneClick: (fn) => set({ phoneClickHandler: fn }),

  sipAnswerHandler: null,
  sipDeclineHandler: null,
  registerSipAnswer: (fn) => set({ sipAnswerHandler: fn }),
  registerSipDecline: (fn) => set({ sipDeclineHandler: fn }),

  sipDialHandler: null,
  registerSipDial: (fn) => set({ sipDialHandler: fn }),

  sipMuteHandler: null,
  sipHoldHandler: null,
  sipHangupHandler: null,
  registerSipMute: (fn) => set({ sipMuteHandler: fn }),
  registerSipHold: (fn) => set({ sipHoldHandler: fn }),
  registerSipHangup: (fn) => set({ sipHangupHandler: fn }),

  chatUnread: 0,
  setChatUnread: (n) => set({ chatUnread: n }),

  smsUnread: 0,
  setSmsUnread: (n) => set({ smsUnread: n }),

  // ── Multi-window chat ──────────────────────────────────────────────────────
  openChatWindows: [],
  chatWindowConvs: {},

  openChatWindow: (conv) => set((state) => {
    const uuid = conv.uuid
    // Already open -> just focus it (move to end)
    if (state.openChatWindows.includes(uuid)) {
      return {
        openChatWindows: [...state.openChatWindows.filter(id => id !== uuid), uuid],
      }
    }
    // Add to end
    let windows = [...state.openChatWindows, uuid]
    const convs = { ...state.chatWindowConvs, [uuid]: conv }
    // Over limit -> evict oldest (first)
    if (windows.length > MAX_CHAT_WINDOWS) {
      const evicted = windows[0]
      windows = windows.slice(1)
      delete convs[evicted]
    }
    return { openChatWindows: windows, chatWindowConvs: convs }
  }),

  closeChatWindow: (uuid) => set((state) => {
    const convs = { ...state.chatWindowConvs }
    delete convs[uuid]
    return {
      openChatWindows: state.openChatWindows.filter(id => id !== uuid),
      chatWindowConvs: convs,
    }
  }),

  focusChatWindow: (uuid) => set((state) => {
    if (!state.openChatWindows.includes(uuid)) return state
    return {
      openChatWindows: [...state.openChatWindows.filter(id => id !== uuid), uuid],
    }
  }),
}))

// ── Widget layout constants ─────────────────────────────────────────────────

const BASE_RIGHT = 16
const WIDGET_GAP = 12
const PHONE_WIDTH = 320
const SMS_WIDTH = 340
const CHAT_WIDTH = 300
const MINI_CHAT_WIDTH = 300

/** Computes `right` offset for each widget based on which widgets are open */
export function useWidgetPositions() {
  const phoneOpen = useFloatingStore(s => s.phoneOpen)
  const smsOpen = useFloatingStore(s => s.smsOpen)
  const chatOpen = useFloatingStore(s => s.chatOpen)

  const phoneRight = BASE_RIGHT
  const smsRight = BASE_RIGHT + (phoneOpen ? PHONE_WIDTH + WIDGET_GAP : 0)
  const chatRight = smsRight + (smsOpen ? SMS_WIDTH + WIDGET_GAP : 0)

  return {
    phoneRight,
    smsRight,
    chatRight,
    miniChatRight: (index: number) =>
      chatRight + (chatOpen ? CHAT_WIDTH + WIDGET_GAP : 0) + index * (MINI_CHAT_WIDTH + WIDGET_GAP),
  }
}
