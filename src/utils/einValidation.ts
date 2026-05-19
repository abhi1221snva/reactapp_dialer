/**
 * einValidation.ts — Validation + normalization for US EIN fields
 * (ein, federal_ein, federal_tax_id, etc.) in CRM lead forms.
 *
 * Rules (per QA tickets ID_122–ID_126):
 *  - Exactly 9 digits.
 *  - Accepts XX-XXXXXXX or XXXXXXXXX (hyphens stripped on save).
 *  - Rejects alphabetic or special characters.
 *  - Rejects all-zero (000000000).
 */

export const EIN_DIGIT_COUNT = 9

const EIN_KEY_PATTERN = /(?:^|[_\s-])(?:ein|fein|federal[_\s-]?tax[_\s-]?id)(?:$|[_\s-])/i
const EIN_LABEL_PATTERN = /\b(?:ein|fein|federal\s*tax\s*id|employer\s*identification)\b/i

export function isEinField(fieldKeyOrLabel: string, label?: string): boolean {
  if (EIN_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && EIN_LABEL_PATTERN.test(label)) return true
  if (/^ein$/i.test(fieldKeyOrLabel)) return true
  return false
}

export function normalizeEin(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/[^0-9]/g, '')
}

/** Format 9 digits as XX-XXXXXXX. Returns input unchanged if not 9 digits. */
export function formatEin(value: string | null | undefined): string {
  const digits = normalizeEin(value)
  if (digits.length !== EIN_DIGIT_COUNT) return digits
  return `${digits.slice(0, 2)}-${digits.slice(2)}`
}

/** Strip everything except digits and hyphens; cap at 10 chars (XX-XXXXXXX). */
export function sanitizeEinInput(value: string): string {
  return value.replace(/[^0-9-]/g, '').slice(0, 10)
}

export function validateEin(
  raw: string | null | undefined,
  label = 'EIN',
  required = false,
): true | string {
  const digits = normalizeEin(raw)
  if (!digits) {
    return required ? `${label} is required` : true
  }
  if (digits.length !== EIN_DIGIT_COUNT) {
    return `${label} must be exactly ${EIN_DIGIT_COUNT} digits`
  }
  if (/^0{9}$/.test(digits)) {
    return `${label} cannot be all zeros`
  }
  return true
}

export function einRule(label: string, required = false) {
  return (val: string) => validateEin(val, label, required)
}

export function normalizeEinsInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isEinField(key) && typeof out[key] === 'string') {
      out[key] = normalizeEin(out[key] as string)
    }
  }
  return out
}
