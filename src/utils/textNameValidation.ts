/**
 * textNameValidation.ts — Shared validation for "looks like an English name"
 * fields where the value should be letters + a handful of safe separators:
 *  - Country (home_country, business_country)
 *  - Industry / Industry Type
 *  - Entity Type (LLC, Corporation, Sole Proprietorship — note these can
 *    contain digits like "S-Corp" so we allow . , - and digits within)
 *  - Use of Funds (free-form description but must contain real text)
 *
 * Rules (per QA tickets ID_117, ID_118, ID_127, ID_128, ID_130, ID_131,
 * ID_133, ID_134):
 *  - Must contain at least one letter (rejects pure numeric/special).
 *  - Whitelisted character set varies per role (see below).
 *  - Strips XSS / SQLi payloads because &lt; and &gt; are not in any whitelist.
 */

// ── Country: letters + spaces, optional hyphen / apostrophe / period ────────
const COUNTRY_PATTERN = /^[A-Za-z][A-Za-z .\-']*$/
const COUNTRY_KEY_PATTERN = /(?:^|[_\s-])country(?:$|[_\s-])/i
const COUNTRY_LABEL_PATTERN = /\bcountry\b/i

export function isCountryField(fieldKeyOrLabel: string, label?: string): boolean {
  if (COUNTRY_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && COUNTRY_LABEL_PATTERN.test(label)) return true
  if (/^country$/i.test(fieldKeyOrLabel)) return true
  return false
}

export function validateCountry(
  raw: string | null | undefined,
  label = 'Country',
  required = false,
): true | string {
  const value = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!value) return required ? `${label} is required` : true
  if (value.length > 60) return `${label} must not exceed 60 characters`
  if (!COUNTRY_PATTERN.test(value)) {
    return `${label} must contain letters only`
  }
  return true
}

// ── Industry: letters + digits + safe separators, ≥1 letter ─────────────────
const INDUSTRY_PATTERN = /^[A-Za-z0-9 &.,'\-/()]+$/
const INDUSTRY_HAS_LETTER = /[A-Za-z]/
const INDUSTRY_KEY_PATTERN = /(?:^|[_\s-])industry(?:[_\s-]?type)?(?:$|[_\s-])/i
const INDUSTRY_LABEL_PATTERN = /\bindustry(?:\s*type)?\b/i

export function isIndustryField(fieldKeyOrLabel: string, label?: string): boolean {
  if (INDUSTRY_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && INDUSTRY_LABEL_PATTERN.test(label)) return true
  return false
}

export function validateIndustry(
  raw: string | null | undefined,
  label = 'Industry',
  required = false,
): true | string {
  const value = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!value) return required ? `${label} is required` : true
  if (value.length > 100) return `${label} must not exceed 100 characters`
  if (!INDUSTRY_HAS_LETTER.test(value)) {
    return `${label} must contain at least one letter`
  }
  if (!INDUSTRY_PATTERN.test(value)) {
    return `${label} contains invalid characters`
  }
  return true
}

// ── Entity Type: similar to industry but smaller (LLC, S-Corp, etc.) ────────
const ENTITY_PATTERN = /^[A-Za-z0-9 &.,'\-/()]+$/
const ENTITY_HAS_LETTER = /[A-Za-z]/
const ENTITY_KEY_PATTERN = /(?:^|[_\s-])entity(?:[_\s-]?type)?(?:$|[_\s-])/i
const ENTITY_LABEL_PATTERN = /\bentity(?:\s*type)?\b/i

export function isEntityTypeField(fieldKeyOrLabel: string, label?: string): boolean {
  if (ENTITY_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && ENTITY_LABEL_PATTERN.test(label)) return true
  return false
}

export function validateEntityType(
  raw: string | null | undefined,
  label = 'Entity Type',
  required = false,
): true | string {
  const value = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!value) return required ? `${label} is required` : true
  if (value.length > 50) return `${label} must not exceed 50 characters`
  if (!ENTITY_HAS_LETTER.test(value)) {
    return `${label} must contain at least one letter`
  }
  if (!ENTITY_PATTERN.test(value)) {
    return `${label} contains invalid characters`
  }
  return true
}

// ── Use of Funds: free-form text but must contain letters ───────────────────
const USE_OF_FUNDS_PATTERN = /^[A-Za-z0-9 &.,'\-/()!?":;]+$/
const USE_OF_FUNDS_HAS_LETTER = /[A-Za-z]/
const USE_OF_FUNDS_KEY_PATTERN = /(?:^|[_\s-])use[_\s-]?of[_\s-]?funds(?:$|[_\s-])/i
const USE_OF_FUNDS_LABEL_PATTERN = /\buse\s*of\s*funds\b/i

export function isUseOfFundsField(fieldKeyOrLabel: string, label?: string): boolean {
  if (USE_OF_FUNDS_KEY_PATTERN.test(fieldKeyOrLabel)) return true
  if (label && USE_OF_FUNDS_LABEL_PATTERN.test(label)) return true
  return false
}

export function validateUseOfFunds(
  raw: string | null | undefined,
  label = 'Use of Funds',
  required = false,
): true | string {
  const value = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!value) return required ? `${label} is required` : true
  if (value.length > 500) return `${label} must not exceed 500 characters`
  if (!USE_OF_FUNDS_HAS_LETTER.test(value)) {
    return `${label} must include a meaningful description`
  }
  if (!USE_OF_FUNDS_PATTERN.test(value)) {
    return `${label} contains invalid characters`
  }
  return true
}
