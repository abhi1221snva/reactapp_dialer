import { useEffect, useRef, useCallback, useState } from 'react'

interface UseIdleTimeoutOptions {
  /** Total idle timeout in ms (default: 30 min) */
  timeout?: number
  /** Show warning this many ms before logout (default: 5 min) */
  warningBefore?: number
  /** Called when the warning threshold is crossed */
  onWarning?: () => void
  /** Called when the full timeout elapses */
  onTimeout?: () => void
  /** Disable the hook entirely (default: true) */
  enabled?: boolean
}

export function useIdleTimeout({
  timeout = 30 * 60 * 1000,
  warningBefore = 5 * 60 * 1000,
  onWarning,
  onTimeout,
  enabled = true,
}: UseIdleTimeoutOptions = {}) {
  const [showWarning, setShowWarning] = useState(false)
  const [remaining, setRemaining] = useState(warningBefore)

  const lastActivity = useRef(Date.now())
  const warningFired = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now()
    warningFired.current = false
    setShowWarning(false)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const
    const handler = () => {
      if (!warningFired.current) {
        lastActivity.current = Date.now()
      }
    }

    events.forEach(e => document.addEventListener(e, handler, { passive: true }))

    timerRef.current = setInterval(() => {
      const idle = Date.now() - lastActivity.current

      if (idle >= timeout) {
        clearInterval(timerRef.current)
        setShowWarning(false)
        onTimeout?.()
        return
      }

      if (idle >= timeout - warningBefore && !warningFired.current) {
        warningFired.current = true
        setShowWarning(true)
        onWarning?.()
      }

      if (warningFired.current) {
        setRemaining(Math.max(0, timeout - idle))
      }
    }, 1000)

    return () => {
      events.forEach(e => document.removeEventListener(e, handler))
      clearInterval(timerRef.current)
    }
  }, [enabled, timeout, warningBefore, onWarning, onTimeout])

  return { showWarning, remaining, dismissWarning: resetTimer }
}
