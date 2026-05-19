/**
 * stateValidation.ts — Validation + normalization for US state fields
 * (state, home_state, business_state, owner_2_state, etc.) in CRM lead forms.
 *
 * Rules (per QA tickets ID_73–ID_78):
 *  - Letters and single spaces only.
 *  - Min 2 characters (covers state code "NY"), max 50 (covers full names
 *    like "District of Columbia").
 *  - Numbers, alphanumeric, special characters all rejected (this naturally
 *    blocks SQLi payloads like `' OR 1=1 --` and XSS like `<script>…</script>`).
 *  - 2-letter codes are upper-cased on save ("ny" → "NY"); full names are
 *    title-cased ("new york" → "New York").
 */

export const STATE_MAX_LENGTH = 50
export const STATE_MIN_LENGTH = 2

const STATE_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/
const REPEATED_CHAR_PATTERN = /([A-Za-z])\1{3,}/i

const STATE_KEY_PATTERN = /(?:^|[_\s-])state(?:$|[_\s-])/i
const STATE_LABEL_PATTERN = /\bstate\b/i

export function isStateField(fieldKeyOrLabel: string, label?: string): boolean {
  if (STATE_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && STATE_LABEL_PATTERN.test(label)) return true
  if (/^state$/i.test(fieldKeyOrLabel)) return true
  if (STATE_LABEL_PATTERN.test(fieldKeyOrLabel)) return true
  return false
}

export function normalizeState(value: string | null | undefined): string {
  if (value == null) return ''
  const trimmed = String(value).replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  // 2-letter code → upper-case ("ny" → "NY")
  if (trimmed.length === 2 && /^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }
  // Full name → title-case each word ("new york" → "New York")
  return trimmed
    .toLowerCase()
    .split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function sanitizeStateInput(value: string): string {
  return value.replace(/[^A-Za-z ]/g, '').slice(0, STATE_MAX_LENGTH)
}

export function validateState(
  raw: string | null | undefined,
  label = 'State',
  required = false,
): true | string {
  const value = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!value) {
    return required ? `${label} is required` : true
  }
  if (value.length < STATE_MIN_LENGTH) {
    return `${label} must be at least ${STATE_MIN_LENGTH} characters`
  }
  if (value.length > STATE_MAX_LENGTH) {
    return `${label} must not exceed ${STATE_MAX_LENGTH} characters`
  }
  if (!STATE_PATTERN.test(value)) {
    return `${label} must contain letters only`
  }
  if (REPEATED_CHAR_PATTERN.test(value)) {
    return `${label}: please enter a valid state`
  }
  return true
}

export function stateRule(label: string, required = false) {
  return (val: string) => validateState(val, label, required)
}

export function normalizeStatesInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isStateField(key) && typeof out[key] === 'string') {
      out[key] = normalizeState(out[key] as string)
    }
  }
  return out
}
