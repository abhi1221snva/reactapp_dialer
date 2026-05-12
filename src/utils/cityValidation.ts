/**
 * cityValidation.ts — Validation + normalization for city / town fields
 * (home_city, business_city, owner_2_city, etc.) in CRM lead forms.
 *
 * Rules (per QA ticket ID_53):
 *  - Letters only, plus space, hyphen, apostrophe, period
 *    (so "St. Louis", "O'Fallon", "Winston-Salem" pass).
 *  - Must contain at least one letter (rejects pure-numeric input).
 *  - Max length: 50 characters.
 *  - Rejects 4+ consecutive identical letters (keystroke-mash guard).
 */

export const CITY_MAX_LENGTH = 50

const CITY_PATTERN = /^[A-Za-z .\-']+$/
const HAS_LETTER_PATTERN = /[A-Za-z]/
const REPEATED_CHAR_PATTERN = /([A-Za-z])\1{3,}/i

const CITY_KEY_PATTERN = /(?:^|[_\s-])(?:city|town|locality)(?:$|[_\s-])/i
const CITY_LABEL_PATTERN = /\b(?:city|town|locality)\b/i

export function isCityField(fieldKeyOrLabel: string, label?: string): boolean {
  if (CITY_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && CITY_LABEL_PATTERN.test(label)) return true
  if (/^city$/i.test(fieldKeyOrLabel)) return true
  if (CITY_LABEL_PATTERN.test(fieldKeyOrLabel)) return true
  return false
}

export function normalizeCity(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

export function sanitizeCityInput(value: string): string {
  return value.replace(/[^A-Za-z .\-']/g, '').slice(0, CITY_MAX_LENGTH)
}

export function validateCity(
  raw: string | null | undefined,
  label = 'City',
  required = false,
): true | string {
  const value = normalizeCity(raw)
  if (!value) {
    return required ? `${label} is required` : true
  }
  if (value.length > CITY_MAX_LENGTH) {
    return `${label} must not exceed ${CITY_MAX_LENGTH} characters`
  }
  if (!HAS_LETTER_PATTERN.test(value)) {
    return `${label} must contain at least one letter`
  }
  if (!CITY_PATTERN.test(value)) {
    return `${label} contains invalid characters. Allowed: letters, spaces, hyphens, apostrophes, periods`
  }
  if (REPEATED_CHAR_PATTERN.test(value)) {
    return `${label}: please enter a valid city`
  }
  return true
}

export function cityRule(label: string, required = false) {
  return (val: string) => validateCity(val, label, required)
}

export function normalizeCitiesInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isCityField(key) && typeof out[key] === 'string') {
      out[key] = normalizeCity(out[key] as string)
    }
  }
  return out
}
