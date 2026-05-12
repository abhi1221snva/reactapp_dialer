/**
 * addressValidation.ts — Validation + normalization for street-address
 * fields (home_address, business_address, owner_2_home_address, etc.) in
 * CRM lead forms.
 *
 * Rules (per QA tickets ID_49–ID_52):
 *  - Whitelist: letters, digits, single space, comma, period, hyphen,
 *    forward slash, hash (#), apostrophe.
 *  - Rejects @, !, $, %, *, =, ;, <, >, etc. — blocks SQLi / XSS payloads.
 *  - Must contain at least one alphabetic character (rejects pure-numeric
 *    junk and gibberish keystroke-mashes).
 *  - Max length: 200 characters.
 *  - Rejects 5+ consecutive identical letters (keystroke-mash guard).
 */

export const ADDRESS_MAX_LENGTH = 200

const ADDRESS_PATTERN = /^[A-Za-z0-9 ,.\-#/']+$/
const HAS_LETTER_PATTERN = /[A-Za-z]/
const REPEATED_CHAR_PATTERN = /([A-Za-z])\1{4,}/i

const ADDRESS_KEY_PATTERN = /(?:^|[_\s-])(?:address|street|line1|line2|line_1|line_2|apt|suite|unit)(?:$|[_\s-])/i
const ADDRESS_LABEL_PATTERN = /\b(?:address|street|apt|suite|unit|line\s*[12])\b/i

export function isAddressField(fieldKeyOrLabel: string, label?: string): boolean {
  if (ADDRESS_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && ADDRESS_LABEL_PATTERN.test(label)) return true
  if (/^address$/i.test(fieldKeyOrLabel)) return true
  if (ADDRESS_LABEL_PATTERN.test(fieldKeyOrLabel)) return true
  return false
}

/** Trim leading/trailing whitespace and collapse multiple spaces to one. */
export function normalizeAddress(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

/**
 * Strip characters that aren't allowed in an address at input time.
 * Used in onChange handlers so XSS / SQLi payloads can't be typed.
 */
export function sanitizeAddressInput(value: string): string {
  return value.replace(/[^A-Za-z0-9 ,.\-#/']/g, '').slice(0, ADDRESS_MAX_LENGTH)
}

export function validateAddress(
  raw: string | null | undefined,
  label = 'Address',
  required = false,
): true | string {
  const value = normalizeAddress(raw)
  if (!value) {
    return required ? `${label} is required` : true
  }
  if (value.length > ADDRESS_MAX_LENGTH) {
    return `${label} must not exceed ${ADDRESS_MAX_LENGTH} characters`
  }
  if (!HAS_LETTER_PATTERN.test(value)) {
    return `${label} must contain at least one letter`
  }
  if (!ADDRESS_PATTERN.test(value)) {
    return `${label} contains invalid characters. Allowed: letters, digits, spaces, and , . - / # '`
  }
  if (REPEATED_CHAR_PATTERN.test(value)) {
    return `${label}: please enter a valid address`
  }
  return true
}

export function addressRule(label: string, required = false) {
  return (val: string) => validateAddress(val, label, required)
}

export function normalizeAddressesInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isAddressField(key) && typeof out[key] === 'string') {
      out[key] = normalizeAddress(out[key] as string)
    }
  }
  return out
}
