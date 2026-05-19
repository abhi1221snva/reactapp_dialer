/**
 * zipValidation.ts — Validation + normalization for US ZIP code fields
 * (zip, postal_code, owner_zip, business_zip, owner_2_zip, etc.) in CRM lead forms.
 *
 * Rules (per QA tickets ID_79, ID_80, ID_114–ID_116, ID_154):
 *  - Either 5 digits (XXXXX) or 5+4 (XXXXX-XXXX) format.
 *  - Rejects all-zero (00000, 00000-0000).
 *  - Rejects shorter/longer than these formats.
 *  - Replaces the previous vague "Please enter the number" message with
 *    a specific length error.
 */

const ZIP_KEY_PATTERN = /(?:^|[_\s-])(?:zip|zipcode|zip[_\s-]?code|postal[_\s-]?code|postcode)(?:$|[_\s-])/i
const ZIP_LABEL_PATTERN = /\b(?:zip|postal\s*code|postcode|zipcode)\b/i

export function isZipField(fieldKeyOrLabel: string, label?: string): boolean {
  if (ZIP_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && ZIP_LABEL_PATTERN.test(label)) return true
  if (/^zip$/i.test(fieldKeyOrLabel)) return true
  return false
}

/** Strip everything except digits and hyphen; cap at 10 chars (XXXXX-XXXX). */
export function sanitizeZipInput(value: string): string {
  return value.replace(/[^0-9-]/g, '').slice(0, 10)
}

/** Trim whitespace and remove internal spaces. */
export function normalizeZip(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/\s+/g, '').trim()
}

export function validateZip(
  raw: string | null | undefined,
  label = 'ZIP',
  required = false,
): true | string {
  const value = normalizeZip(raw)
  if (!value) {
    return required ? `${label} is required` : true
  }
  if (!/^\d{5}(-\d{4})?$/.test(value)) {
    return `${label} must be 5 digits (e.g. 90210) or 5+4 (e.g. 90210-1234)`
  }
  // Reject all-zero ZIPs (00000 or 00000-0000)
  if (/^0{5}(-0{4})?$/.test(value)) {
    return `${label} cannot be all zeros`
  }
  return true
}

export function zipRule(label: string, required = false) {
  return (val: string) => validateZip(val, label, required)
}

export function normalizeZipsInPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const key of Object.keys(out)) {
    if (isZipField(key) && typeof out[key] === 'string') {
      out[key] = normalizeZip(out[key] as string)
    }
  }
  return out
}
