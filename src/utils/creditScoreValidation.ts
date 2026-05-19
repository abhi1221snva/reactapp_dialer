/**
 * creditScoreValidation.ts — Validation for FICO-style credit-score fields
 * (credit_score, owner_2_credit_score, fico_score, etc.) in CRM lead forms.
 *
 * Rules (per QA tickets ID_88–ID_92, ID_145–ID_147):
 *  - Integer between 300 and 900 inclusive (covers FICO 300-850 and
 *    VantageScore 300-900 — using the wider range for compatibility).
 *  - Rejects 0, negative, decimals, excessive numbers.
 */

export const CREDIT_SCORE_MIN = 300
export const CREDIT_SCORE_MAX = 900

const CREDIT_KEY_PATTERN = /(?:^|[_\s-])(?:credit[_\s-]?score|fico[_\s-]?score|fico)(?:$|[_\s-])/i
const CREDIT_LABEL_PATTERN = /\b(?:credit\s*score|fico\s*score|fico)\b/i

export function isCreditScoreField(fieldKeyOrLabel: string, label?: string): boolean {
  if (CREDIT_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && CREDIT_LABEL_PATTERN.test(label)) return true
  return false
}

export function validateCreditScore(
  raw: string | number | null | undefined,
  label = 'Credit Score',
  required = false,
): true | string {
  const str = String(raw ?? '').trim()
  if (!str) {
    return required ? `${label} is required` : true
  }
  if (!/^-?\d+$/.test(str)) {
    return `${label} must be a whole number`
  }
  const n = Number(str)
  if (!Number.isFinite(n)) {
    return `${label} must be a valid number`
  }
  if (n < CREDIT_SCORE_MIN || n > CREDIT_SCORE_MAX) {
    return `${label} must be between ${CREDIT_SCORE_MIN} and ${CREDIT_SCORE_MAX}`
  }
  return true
}

export function creditScoreRule(label: string, required = false) {
  return (val: string) => validateCreditScore(val, label, required)
}
