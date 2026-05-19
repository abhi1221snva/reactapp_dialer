/**
 * businessDateValidation.ts — Validation for "business start date" /
 * "business established" / "incorporation date" style fields.
 *
 * Rules (per QA tickets ID_119, ID_121):
 *  - Must be a valid date.
 *  - Cannot be in the future.
 *  - Cannot be earlier than 1800-01-01 (rejects "1300-01-01" type junk).
 *  - Today is allowed (some businesses register the same day).
 */

export const BUSINESS_DATE_EARLIEST_YEAR = 1800

const BUSINESS_DATE_KEY_PATTERN =
  /(?:^|[_\s-])(?:business[_\s-]?start[_\s-]?date|business[_\s-]?established|established[_\s-]?date|incorporat\w+[_\s-]?date|business[_\s-]?inception|inception[_\s-]?date|formation[_\s-]?date|start[_\s-]?date)(?:$|[_\s-])/i

const BUSINESS_DATE_LABEL_PATTERN =
  /\b(?:business\s*start|business\s*established|established|incorporat\w+|inception|formation\s*date|start\s*date)\b/i

export function isBusinessDateField(fieldKeyOrLabel: string, label?: string): boolean {
  if (BUSINESS_DATE_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && BUSINESS_DATE_LABEL_PATTERN.test(label)) return true
  return false
}

/** Today's date as ISO yyyy-mm-dd. Used as `max` attr on the input. */
export function businessDateMaxIso(today: Date = new Date()): string {
  return today.toISOString().slice(0, 10)
}

/** Earliest realistic business date as ISO yyyy-mm-dd. Used as `min` attr. */
export function businessDateMinIso(): string {
  return `${BUSINESS_DATE_EARLIEST_YEAR}-01-01`
}

export function validateBusinessDate(
  raw: string | null | undefined,
  label = 'Business Start Date',
  required = false,
): true | string {
  const value = raw == null ? '' : String(raw).trim()
  if (!value) {
    return required ? `${label} is required` : true
  }
  const ts = Date.parse(value)
  if (isNaN(ts)) {
    return `${label} must be a valid date`
  }
  const d = new Date(ts)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // allow today
  if (d > today) {
    return `${label} cannot be in the future`
  }
  if (d.getFullYear() < BUSINESS_DATE_EARLIEST_YEAR) {
    return `${label} must be on or after ${BUSINESS_DATE_EARLIEST_YEAR}-01-01`
  }
  return true
}

export function businessDateRule(label: string, required = false) {
  return (val: string) => validateBusinessDate(val, label, required)
}
