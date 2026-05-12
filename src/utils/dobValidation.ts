/**
 * dobValidation.ts — Validation for Date of Birth fields (dob, date_of_birth,
 * owner_dob, owner_2_date_of_birth) in CRM lead forms.
 *
 * Rules (per QA tickets ID_46–ID_48):
 *  - Must be a valid date.
 *  - Cannot be today or in the future.
 *  - Subject must be at least 18 years old (legal adult for financial forms).
 *  - Realistic upper bound: at most 120 years ago.
 */

export const DOB_MIN_AGE_YEARS = 18
export const DOB_MAX_AGE_YEARS = 120

const DOB_KEY_PATTERN = /(?:^|[_\s-])(?:dob|date[_\s-]?of[_\s-]?birth|birth[_\s-]?date|birthday)(?:$|[_\s-])/i
const DOB_LABEL_PATTERN = /\b(?:date of birth|d\.o\.b\.?|dob|birth\s*date|birthday)\b/i

export function isDobField(fieldKeyOrLabel: string, label?: string): boolean {
  if (DOB_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && DOB_LABEL_PATTERN.test(label)) return true
  if (/^dob$/i.test(fieldKeyOrLabel)) return true
  if (DOB_LABEL_PATTERN.test(fieldKeyOrLabel)) return true
  return false
}

/** Compute the latest allowed DOB (today − DOB_MIN_AGE_YEARS), as ISO yyyy-mm-dd. */
export function dobMaxIsoDate(today: Date = new Date()): string {
  const d = new Date(today.getFullYear() - DOB_MIN_AGE_YEARS, today.getMonth(), today.getDate())
  return d.toISOString().slice(0, 10)
}

/** Compute the earliest allowed DOB (today − DOB_MAX_AGE_YEARS), as ISO yyyy-mm-dd. */
export function dobMinIsoDate(today: Date = new Date()): string {
  const d = new Date(today.getFullYear() - DOB_MAX_AGE_YEARS, today.getMonth(), today.getDate())
  return d.toISOString().slice(0, 10)
}

/**
 * Validate a DOB value (ISO yyyy-mm-dd or any parseable date string).
 * Returns `true` if valid, otherwise an error message.
 */
export function validateDob(
  raw: string | null | undefined,
  label = 'Date of Birth',
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
  const dob = new Date(ts)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dob >= today) {
    return `${label} cannot be today or a future date`
  }
  // Compute age in years
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  if (age < DOB_MIN_AGE_YEARS) {
    return `${label}: must be at least ${DOB_MIN_AGE_YEARS} years old`
  }
  if (age > DOB_MAX_AGE_YEARS) {
    return `${label} is not a realistic date`
  }
  return true
}

/** RHF `validate` function bound to a label. */
export function dobRule(label: string, required = false) {
  return (val: string) => validateDob(val, label, required)
}
