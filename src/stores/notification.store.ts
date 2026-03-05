import { create } from 'zustand'

interface NotificationState {
  unreadSms: number
  unreadVoicemail: number
  pendingCallbacks: number
  /** Unix ms timestamp of the last inbound SMS Pusher event — used to trigger reactive refetches */
  lastSmsAt: number
  setUnreadSms: (n: number) => void
  setUnreadVoicemail: (n: number) => void
  setPendingCallbacks: (n: number) => void
  incrementSms: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadSms: 0,
  unreadVoicemail: 0,
  pendingCallbacks: 0,
  lastSmsAt: 0,
  setUnreadSms: (n) => set({ unreadSms: n }),
  setUnreadVoicemail: (n) => set({ unreadVoicemail: n }),
  setPendingCallbacks: (n) => set({ pendingCallbacks: n }),
  incrementSms: () => set({ unreadSms: get().unreadSms + 1, lastSmsAt: Date.now() }),
}))
