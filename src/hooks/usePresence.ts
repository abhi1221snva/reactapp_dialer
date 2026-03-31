import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/auth.store'
import { chatService } from '../services/chat.service'

/**
 * Global presence hook — runs for all authenticated pages (not just /chat).
 *
 * Status logic:
 *   online  — user has had mouse/keyboard/touch activity within the last 5 minutes
 *   away    — user is logged in but idle for > 5 minutes
 *   offline — set on unmount (logout / tab close)
 *
 * Sends a heartbeat every 25 seconds so the server-side staleness window (60s)
 * never expires while the user has the app open.
 */

const IDLE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes → away
const HEARTBEAT_INTERVAL_MS = 25_000     // 25 seconds

export function usePresence() {
  const { user } = useAuthStore()
  const lastActivityRef = useRef(Date.now())
  const currentStatusRef = useRef<'online' | 'away'>('online')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return

    // Track user activity across the whole page
    const onActivity = () => {
      lastActivityRef.current = Date.now()
      // If was away, immediately switch back to online
      if (currentStatusRef.current === 'away') {
        currentStatusRef.current = 'online'
        chatService.updatePresence('online').catch(() => {})
      }
    }

    const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))

    // Initial presence
    chatService.updatePresence('online').catch(() => {})

    // Heartbeat: check idle state + send presence
    intervalRef.current = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current
      const newStatus = idleMs > IDLE_THRESHOLD_MS ? 'away' : 'online'

      // Only send if status changed, or as a keep-alive heartbeat
      currentStatusRef.current = newStatus
      chatService.updatePresence(newStatus).catch(() => {})
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity))
      if (intervalRef.current) clearInterval(intervalRef.current)
      chatService.updatePresence('offline').catch(() => {})
    }
  }, [user?.id])
}
