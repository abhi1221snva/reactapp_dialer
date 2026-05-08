/**
 * nameValidation.ts — Validation + normalization for person-name fields
 * (first_name, last_name) in CRM lead forms.
 *
 * Rules (per QA tickets ID_11–ID_20):
 *  - First character must be an alphabet.
 *  - Body may contain alphabets, spaces, apostrophes, hyphens.
 *  - Numbers, alphanumeric, and other special characters are rejected
 *    (this also blocks SQL-injection / XSS payloads such as
 *    `' OR 1=1 --`, `<script>...`, `@#$%`).
 *  - Max length: 25 characters.
 *  - Multiple consecutive spaces are normalized to a single space on save.
 */

export const NAME_MAX_LENGTH = 25

/** First char must be a letter; rest may be letters, single spaces, hyphens, apostrophes. */
const NAME_PATTERN = /^[A-Za-z][A-Za-z'-]*(?: [A-Za-z'-]+)*$/

/** Rejects 3+ consecutive identical letters (e.g. "eeee", "aaaa") — keystroke-mash guard. */
const REPEATED_CHAR_PATTERN = /([A-Za-z])\1{2,}/i

/** Set of field keys treated as person-name fields. */
const NAME_KEYS = new Set([
  'first_name',
  'last_name',
  'second_owner_first_name',
  'second_owner_last_name',
])

export function isNameField(fieldKey: string): boolean {
  return NAME_KEYS.has(fieldKey)
}

/** Trim leading/trailing whitespace and collapse multiple spaces to one. */
export function normalizeName(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

/**
 * Strip characters that aren't allowed in a name. Used in input onChange
 * handlers to prevent invalid characters from being typed at all.
 * Preserves multiple/leading/trailing spaces during typing — they're
 * collapsed only on submit via normalizeName().
 */
export function sanitizeNameInput(value: string): string {
  return value.replace(/[^A-Za-z '-]/g, '').slice(0, NAME_MAX_LENGTH)
}

/**
 * Validate a normalized name. Returns `true` if valid, otherwise an
 * error message suitable for display.
 *
 * `required` defaults to false — empty values pass unless explicitly required.
 */
export function validateName(
  raw: string | null | undefined,
  label = 'Name',
  required = false,
): true | string {
  const value = normalizeName(raw)
  if (!value) {
    return required ? `${label} is required` : true
  }
  if (value.length > NAME_MAX_LENGTH) {
    return `${label} must not exceed ${NAME_MAX_LENGTH} characters`
  }
  if (!NAME_PATTERN.test(value)) {
    return `${label}: only alphabets are allowed`
  }
  if (REPEATED_CHAR_PATTERN.test(value)) {
    return `${label}: please enter a valid name`
  }
  return true
}

/** RHF `validate` function bound to a label. */
export function nameRule(label: string, required = false) {
  return (val: string) => validateName(val, label, required)
}

/**
 * Walk a payload object and normalize known name fields in place
 * (returns a new object). Used right before submitting to the API so
 * "Test    T" is saved as "Test T".
 */
export function normalizeNamesInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isNameField(key) && typeof out[key] === 'string') {
      out[key] = normalizeName(out[key] as string)
    }
  }
  return out
}
