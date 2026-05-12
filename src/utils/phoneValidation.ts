/**
 * phoneValidation.ts — Validation + formatting for US phone fields
 * (mobile, phone_number, business_phone, cell_phone_number, fax) in CRM
 * lead forms.
 *
 * Rules (per QA tickets ID_39–ID_45):
 *  - North American Numbering Plan (NANP) format:
 *      Area code (NXX): N = 2-9, X = 0-9, X = 0-9
 *      Exchange (NXX): N = 2-9, X = 0-9, X = 0-9
 *      Subscriber (XXXX): four digits
 *  - Strict regex: `^[2-9]\d{2}[2-9]\d{6}$`
 *  - Rejects 0/1-prefixed numbers, all-same-digit numbers like (000)000-0000
 *    and (111)111-1111.
 *  - Format validation must run BEFORE duplicate check on the server.
 */

export const PHONE_MAX_LENGTH = 14 // "(NXX) NXX-XXXX"
export const PHONE_DIGITS = 10

/** NANP-compliant 10-digit US phone (area & exchange first digit must be 2-9). */
const NANP_PATTERN = /^[2-9]\d{2}[2-9]\d{6}$/

const PHONE_KEY_PATTERN = /(?:^|[_\s-])(?:phone|mobile|cell|fax|telephone|tel|cellphone)(?:$|[_\s-])/i
const PHONE_LABEL_PATTERN = /\b(?:phone|mobile|cell|fax|telephone)\b/i

/** Returns true if the given key/label/type indicates a phone field. */
export function isPhoneField(fieldKeyOrLabel: string, label?: string, fieldType?: string): boolean {
  if (fieldType && /^(?:phone|tel|phone_number)$/i.test(fieldType)) return true
  if (PHONE_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && PHONE_LABEL_PATTERN.test(label)) return true
  // Bare match fallback
  if (/^(?:phone|mobile|cell|fax)$/i.test(fieldKeyOrLabel)) return true
  if (PHONE_LABEL_PATTERN.test(fieldKeyOrLabel)) return true
  return false
}

/** Strip all non-digit characters. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Format a phone value as the user types: "(NXX) NXX-XXXX".
 * Accepts any input — strips non-digits and reformats. Caps at 10 digits.
 */
export function formatPhoneInput(value: string): string {
  const digits = digitsOnly(value).slice(0, PHONE_DIGITS)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Validate a phone value. Returns `true` if valid, otherwise an error message. */
export function validatePhone(
  raw: string | null | undefined,
  label = 'Phone',
  required = false,
): true | string {
  const digits = digitsOnly(raw == null ? '' : String(raw))
  if (!digits) {
    return required ? `${label} is required` : true
  }
  if (digits.length !== PHONE_DIGITS) {
    return `${label} must be exactly 10 digits`
  }
  if (!NANP_PATTERN.test(digits)) {
    return `${label} must be a valid US phone (area code and exchange cannot start with 0 or 1)`
  }
  return true
}

/** RHF `validate` function bound to a label. */
export function phoneRule(label: string, required = false) {
  return (val: string) => validatePhone(val, label, required)
}

/** Walk a payload object and reduce phone fields to digits-only on submit. */
export function normalizePhonesInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isPhoneField(key) && typeof out[key] === 'string' && out[key] !== '') {
      out[key] = digitsOnly(out[key] as string)
    }
  }
  return out
}
