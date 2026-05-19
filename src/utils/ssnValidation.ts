/**
 * ssnValidation.ts — Validation + normalization for US SSN fields
 * (ssn, owner_2_ssn, social_security_number, etc.) in CRM lead forms.
 *
 * Rules (per QA tickets ID_81–ID_87, ID_148–ID_149, mirrors SSA rules):
 *  - Exactly 9 digits.
 *  - Accepts XXX-XX-XXXX or XXXXXXXXX (hyphens stripped on save).
 *  - Area number (first 3) must not be 000, 666, or 900–999.
 *  - Group number (middle 2) must not be 00.
 *  - Serial number (last 4) must not be 0000.
 *  - All-zero (000000000) rejected.
 */

export const SSN_DIGIT_COUNT = 9

const SSN_KEY_PATTERN = /(?:^|[_\s-])(?:ssn|social[_\s-]?security|tin)(?:$|[_\s-])/i
const SSN_LABEL_PATTERN = /\b(?:ssn|social\s*security|tin)\b/i

export function isSsnField(fieldKeyOrLabel: string, label?: string): boolean {
  if (SSN_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && SSN_LABEL_PATTERN.test(label)) return true
  if (/^ssn$/i.test(fieldKeyOrLabel)) return true
  return false
}

/** Strip hyphens and spaces, return digits-only string. */
export function normalizeSsn(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/[^0-9]/g, '')
}

/** Format 9 digits as XXX-XX-XXXX for display. Returns input unchanged if not 9 digits. */
export function formatSsn(value: string | null | undefined): string {
  const digits = normalizeSsn(value)
  if (digits.length !== SSN_DIGIT_COUNT) return digits
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

/** Strip non-digits and non-hyphens; cap at 11 chars (XXX-XX-XXXX) for typing. */
export function sanitizeSsnInput(value: string): string {
  return value.replace(/[^0-9-]/g, '').slice(0, 11)
}

export function validateSsn(
  raw: string | null | undefined,
  label = 'SSN',
  required = false,
): true | string {
  const digits = normalizeSsn(raw)
  if (!digits) {
    return required ? `${label} is required` : true
  }
  if (digits.length !== SSN_DIGIT_COUNT) {
    return `${label} must be exactly ${SSN_DIGIT_COUNT} digits`
  }
  if (/^0{9}$/.test(digits)) {
    return `${label} cannot be all zeros`
  }
  const area   = digits.slice(0, 3)
  const group  = digits.slice(3, 5)
  const serial = digits.slice(5)

  if (area === '000' || area === '666' || /^9/.test(area)) {
    return `${label}: invalid area number (cannot be 000, 666, or 900–999)`
  }
  if (group === '00') {
    return `${label}: invalid group number (middle two digits cannot be 00)`
  }
  if (serial === '0000') {
    return `${label}: invalid serial number (last four digits cannot be 0000)`
  }
  return true
}

export function ssnRule(label: string, required = false) {
  return (val: string) => validateSsn(val, label, required)
}

/** Replace any matched SSN field in the payload with the digits-only form. */
export function normalizeSsnsInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isSsnField(key) && typeof out[key] === 'string') {
      out[key] = normalizeSsn(out[key] as string)
    }
  }
  return out
}
