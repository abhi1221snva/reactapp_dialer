import { useCallback } from 'react'
import { useAuthStore } from '../stores/auth.store'

const DEFAULT_TZ = 'America/New_York'

export function useTimezone() {
  const user = useAuthStore((s) => s.user)
  const tz = user?.timezone || DEFAULT_TZ

  const fmtDate = useCallback(
    (date: string | Date) => {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('en-US', {
        timeZone: tz,
        month: 'short', day: 'numeric', year: 'numeric',
      })
    },
    [tz],
  )

  const fmtDateTime = useCallback(
    (date: string | Date) => {
      if (!date) return '-'
      return new Date(date).toLocaleString('en-US', {
        timeZone: tz,
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    },
    [tz],
  )

  /** Get "today" in the user's timezone as YYYY-MM-DD */
  const today = useCallback(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
  }, [tz])

  /** Get a date N days ago in the user's timezone as YYYY-MM-DD */
  const daysAgo = useCallback((n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
  }, [tz])

  return { tz, fmtDate, fmtDateTime, today, daysAgo }
}
