/**
 * currencyValidation.ts — Validation + normalization for currency / money
 * fields (average_balance, monthly_revenue, requested_amount, etc.) in CRM
 * lead forms.
 *
 * Rules (per QA tickets ID_28–ID_38):
 *  - Numeric only — alphabetic, alphanumeric, and special characters rejected
 *    (also blocks SQLi / XSS payloads like `' OR 1=1 --`, `<script>...`).
 *  - At most one decimal point.
 *  - Max 2 decimal places — extra digits rounded half-up on submit.
 *  - Non-negative (0 or positive only).
 *  - Max value: 9,999,999,999.99 (fits DECIMAL(15,2) DB column).
 */

/** Max value matches DECIMAL(15,2) on crm_lead_data currency columns. */
export const CURRENCY_MAX_VALUE = 9_999_999_999.99

/** Max raw string length: 13 chars covers "9999999999.99". */
export const CURRENCY_MAX_LENGTH = 13

/** Valid currency: digits with at most one decimal point and up to 2 dp. */
const CURRENCY_PATTERN = /^\d+(?:\.\d{1,2})?$/

/**
 * Pattern-based detection of currency / money fields. Matches both the
 * field key (e.g. `average_balance`, `monthly_revenue`, `requested_amount`,
 * `funded_amount`, `daily_payment`) and the human label.
 *
 * Pattern-based so tenant-customized labels (e.g. `monthly_deposit_amount`,
 * `cash_funded`) inherit the same rules automatically.
 */
const CURRENCY_KEY_PATTERN = /(?:^|[_\s-])(?:balance|amount|revenue|deposit|deposits|salary|income|funding|requested|approved|funded|payback|payment|commission|outstanding|earnings|profit|loss|fee|cost|price|value|sum|total)(?:$|[_\s-])/i
const CURRENCY_LABEL_PATTERN = /\b(?:balance|amount|revenue|deposit|deposits|salary|income|funding|requested|approved|funded|payback|payment|commission|outstanding|earnings|profit|loss|fee|cost|price|value|sum|total)\b/i

/**
 * Returns true if the given field key/label looks like a currency field.
 * Note: percentage fields (e.g. ownership_percentage, factor_rate) are
 * intentionally excluded — they go through the existing `percentage` type.
 */
export function isCurrencyField(fieldKeyOrLabel: string, label?: string): boolean {
  // Skip clearly non-currency tokens that share a substring
  const lower = fieldKeyOrLabel.toLowerCase()
  if (/\b(?:percent|percentage|rate|score|count|number|days?|months?|years?|term|positions?)\b/.test(lower)) return false
  if (label) {
    const llower = label.toLowerCase()
    if (/\b(?:percent|percentage|rate|score|count|days?|months?|years?|term|positions?)\b/.test(llower)) return false
  }
  if (CURRENCY_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && CURRENCY_LABEL_PATTERN.test(label)) return true
  return false
}

/**
 * Strip non-numeric characters at input time, allowing only digits and at
 * most one decimal point. Used in onChange handlers to prevent invalid
 * keystrokes (letters, special chars, multiple decimals).
 */
export function sanitizeCurrencyInput(value: string): string {
  // Keep digits and dots only
  let cleaned = value.replace(/[^\d.]/g, '')
  // Collapse multiple decimal points — keep only the first one
  const firstDot = cleaned.indexOf('.')
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
  }
  // Cap decimal places to 2 (truncate extras during typing — rounding happens on submit)
  if (firstDot !== -1) {
    const [intPart, decPart = ''] = cleaned.split('.')
    cleaned = decPart.length > 2 ? `${intPart}.${decPart.slice(0, 2)}` : cleaned
  }
  return cleaned.slice(0, CURRENCY_MAX_LENGTH)
}

/**
 * Round a numeric string to 2 decimal places (half-up). Returns a clean
 * string with no trailing whitespace. Used right before submit so values
 * like "100.129" become "100.13".
 */
export function normalizeCurrency(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value).trim()
  if (str === '') return ''
  const num = Number(str)
  if (!isFinite(num)) return str
  return (Math.round(num * 100) / 100).toFixed(2)
}

/**
 * Validate a currency value. Returns `true` if valid, otherwise an error
 * message suitable for display. `required` defaults to false.
 */
export function validateCurrency(
  raw: string | null | undefined,
  label = 'Amount',
  required = false,
): true | string {
  const value = raw == null ? '' : String(raw).trim()
  if (!value) {
    return required ? `${label} is required` : true
  }
  if (value.startsWith('-')) {
    return `${label} cannot be negative`
  }
  if (!CURRENCY_PATTERN.test(value)) {
    return `${label} must be a valid amount (numbers and up to 2 decimal places)`
  }
  const num = Number(value)
  if (!isFinite(num) || isNaN(num)) {
    return `${label} must be a valid number`
  }
  if (num < 0) {
    return `${label} cannot be negative`
  }
  if (num > CURRENCY_MAX_VALUE) {
    return `${label} must not exceed ${CURRENCY_MAX_VALUE.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }
  return true
}

/** RHF `validate` function bound to a label. */
export function currencyRule(label: string, required = false) {
  return (val: string) => validateCurrency(val, label, required)
}

/**
 * Walk a payload object and normalize known currency fields in place
 * (returns a new object). Used right before submitting to the API so
 * "100.129" is saved as "100.13".
 */
export function normalizeCurrencyInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isCurrencyField(key) && typeof out[key] === 'string' && out[key] !== '') {
      out[key] = normalizeCurrency(out[key] as string)
    }
  }
  return out
}
