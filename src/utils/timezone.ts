/**
 * Timezone-aware campaign calling-hours check.
 *
 * Uses the campaign's own timezone (from DB), falls back to the user's
 * profile timezone, then to the browser's Intl timezone.
 */

interface CampaignTimeFields {
  time_based_calling?: number | boolean | string
  call_time_start?: string | null
  call_time_end?: string | null
  timezone?: string | null
}

export interface CallingHoursResult {
  inHours: boolean
  reason?: string
  /** Next window start formatted for display, e.g. "09:00 AM EST" */
  nextWindow?: string
}

/**
 * Returns the current HH:mm in a given IANA timezone.
 */
function nowInTimezone(tz: string): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const hours = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const minutes = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  return { hours, minutes }
}

/**
 * Parse "HH:mm" or "HH:mm:ss" into total minutes since midnight.
 */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Format "HH:mm" time for display with timezone abbreviation.
 */
function formatTimeDisplay(time: string, tz: string): string {
  try {
    const abbr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value ?? tz

    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m || 0).padStart(2, '0')} ${period} ${abbr}`
  } catch {
    return time
  }
}

/**
 * Check whether a campaign is currently within its configured calling hours.
 *
 * @param campaign  - campaign record (needs time_based_calling, call_time_start/end, timezone)
 * @param userTz    - user.timezone from auth store (optional)
 * @returns         - { inHours, reason?, nextWindow? }
 */
export function isCampaignInCallingHours(
  campaign: CampaignTimeFields,
  userTz?: string,
): CallingHoursResult {
  // If time-based calling is off, always in hours
  const tbc = Number(campaign.time_based_calling ?? 0)
  if (!tbc) return { inHours: true }

  // If start/end not configured, treat as always open
  if (!campaign.call_time_start || !campaign.call_time_end) {
    return { inHours: true }
  }

  // Resolve timezone: campaign → user → browser
  const tz =
    campaign.timezone || userTz || Intl.DateTimeFormat().resolvedOptions().timeZone

  const { hours, minutes } = nowInTimezone(tz)
  const nowMin = hours * 60 + minutes
  const startMin = parseTime(campaign.call_time_start)
  const endMin = parseTime(campaign.call_time_end)

  let inHours: boolean
  if (startMin <= endMin) {
    // Normal range, e.g. 09:00–17:00
    inHours = nowMin >= startMin && nowMin <= endMin
  } else {
    // Overnight range, e.g. 22:00–06:00
    inHours = nowMin >= startMin || nowMin <= endMin
  }

  if (!inHours) {
    return {
      inHours: false,
      reason: `Outside calling hours`,
      nextWindow: `${formatTimeDisplay(campaign.call_time_start, tz)} – ${formatTimeDisplay(campaign.call_time_end, tz)}`,
    }
  }

  return { inHours: true }
}
