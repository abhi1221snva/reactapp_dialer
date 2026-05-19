/**
 * ownershipValidation.ts — Validation for ownership-percentage fields
 * (ownership_percentage, owner_2_ownership_percentage, ownership_pct, etc.).
 *
 * Rules (per QA tickets ID_93–ID_101, ID_140–ID_144):
 *  - Numeric, between 0 and 100 inclusive.
 *  - Up to 2 decimal places (50, 50.5, 50.55 all valid).
 *  - Rejects negatives, values &gt; 100, excessive lengths.
 *  - ID_96/97 fix: previous form used step=0.1 which rejected 50.0 and 100.
 *    This validator does not impose any step granularity.
 *  - Sum-of-owners cross-field check is handled separately at submit time
 *    (see validateOwnershipSum below).
 */

export const OWNERSHIP_MIN = 0
export const OWNERSHIP_MAX = 100

const OWNERSHIP_KEY_PATTERN = /(?:^|[_\s-])ownership(?:[_\s-]?(?:percent|percentage|pct))?(?:$|[_\s-])/i
const OWNERSHIP_LABEL_PATTERN = /\bownership\s*(?:percent|percentage|%|pct)\b/i

export function isOwnershipField(fieldKeyOrLabel: string, label?: string): boolean {
  if (OWNERSHIP_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && OWNERSHIP_LABEL_PATTERN.test(label)) return true
  return false
}

export function validateOwnership(
  raw: string | number | null | undefined,
  label = 'Ownership Percentage',
  required = false,
): true | string {
  const str = String(raw ?? '').trim()
  if (!str) {
    return required ? `${label} is required` : true
  }
  // Reject pure-non-numeric or scientific notation
  if (!/^-?\d+(\.\d{1,2})?$/.test(str)) {
    return `${label} must be a number with up to 2 decimal places`
  }
  const n = Number(str)
  if (!Number.isFinite(n)) {
    return `${label} must be a valid number`
  }
  if (n < OWNERSHIP_MIN) {
    return `${label} cannot be negative`
  }
  if (n > OWNERSHIP_MAX) {
    return `${label} must not exceed ${OWNERSHIP_MAX}`
  }
  return true
}

export function ownershipRule(label: string, required = false) {
  return (val: string) => validateOwnership(val, label, required)
}

/**
 * Cross-field validator: sum of all ownership-field values must not exceed 100.
 * Pass the entire form payload; returns true if all-good, else error message.
 */
export function validateOwnershipSum(
  payload: Record<string, unknown>,
): true | string {
  let sum = 0
  let count = 0
  for (const key of Object.keys(payload)) {
    if (!isOwnershipField(key)) continue
    const v = payload[key]
    if (v === '' || v == null) continue
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    if (!Number.isFinite(n)) continue
    sum += n
    count += 1
  }
  if (count === 0) return true
  // Allow a small epsilon for FP rounding
  if (sum > OWNERSHIP_MAX + 0.001) {
    return `Total ownership percentage cannot exceed ${OWNERSHIP_MAX}% (current total: ${sum.toFixed(2)}%)`
  }
  return true
}
