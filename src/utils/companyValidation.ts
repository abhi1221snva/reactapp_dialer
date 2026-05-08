/**
 * companyValidation.ts — Validation + normalization for company / business
 * name fields (legal_company_name, company_name, business_name, dba) in
 * CRM lead forms.
 *
 * Rules (per QA tickets ID_21–ID_27):
 *  - Must contain at least one alphabetic character (rejects "12345").
 *  - Whitelist: letters, digits, single space, & . , ' - / ( ) #
 *    (rejects @, !, $, %, *, =, ;, <, >, etc. — also blocks SQLi / XSS).
 *  - Casing is preserved (so "iPhone", "eBay", "PayPal" stay as entered).
 *  - Max length: 100 characters.
 *  - Multiple consecutive spaces are normalized to a single space on save.
 *  - Rejects 3+ consecutive identical letters as a keystroke-mash guard.
 */

export const COMPANY_NAME_MAX_LENGTH = 100

const COMPANY_PATTERN     = /^[A-Za-z0-9 &.,'\-/()#]+$/
const HAS_LETTER_PATTERN  = /[A-Za-z]/
const REPEATED_CHAR_PATTERN = /([A-Za-z])\1{2,}/i

/** Canonical exact-match keys. */
const COMPANY_KEYS = new Set([
  'legal_company_name',
  'company_name',
  'business_name',
  'dba',
])

/** Pattern catches custom keys like legal_business_name, dba_name, business_legal_name, etc. */
const COMPANY_KEY_PATTERN = /(?:^|_)(company|business|dba|firm|organization|corporation|enterprise)(?:_|$)/i

export function isCompanyField(fieldKey: string): boolean {
  if (COMPANY_KEYS.has(fieldKey)) return true
  return COMPANY_KEY_PATTERN.test(fieldKey)
}

/** Trim leading/trailing whitespace and collapse multiple spaces to one. */
export function normalizeCompanyName(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

/**
 * Strip characters that aren't allowed in a company name. Used in input
 * onChange handlers to prevent invalid characters from being typed at all.
 * Preserves casing and multiple/leading/trailing spaces during typing —
 * spaces are collapsed only on submit via normalizeCompanyName().
 */
export function sanitizeCompanyInput(value: string): string {
  return value.replace(/[^A-Za-z0-9 &.,'\-/()#]/g, '').slice(0, COMPANY_NAME_MAX_LENGTH)
}

/**
 * Validate a normalized company name. Returns `true` if valid, otherwise
 * an error message suitable for display.
 *
 * `required` defaults to false — empty values pass unless explicitly required.
 */
export function validateCompanyName(
  raw: string | null | undefined,
  label = 'Company Name',
  required = false,
): true | string {
  const value = normalizeCompanyName(raw)
  if (!value) {
    return required ? `${label} is required` : true
  }
  if (value.length > COMPANY_NAME_MAX_LENGTH) {
    return `${label} must not exceed ${COMPANY_NAME_MAX_LENGTH} characters`
  }
  if (!HAS_LETTER_PATTERN.test(value)) {
    return `${label} must contain at least one letter`
  }
  if (!COMPANY_PATTERN.test(value)) {
    return `${label}: contains invalid characters`
  }
  if (REPEATED_CHAR_PATTERN.test(value)) {
    return `${label}: please enter a valid name`
  }
  return true
}

/** RHF `validate` function bound to a label. */
export function companyRule(label: string, required = false) {
  return (val: string) => validateCompanyName(val, label, required)
}

/**
 * Walk a payload object and normalize known company-name fields in place
 * (returns a new object). Used right before submitting to the API.
 */
export function normalizeCompanyNamesInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isCompanyField(key) && typeof out[key] === 'string') {
      out[key] = normalizeCompanyName(out[key] as string)
    }
  }
  return out
}
