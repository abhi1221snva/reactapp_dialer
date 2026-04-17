/**
 * publicFormValidation.ts — Dynamic section-wise validation for the public
 * application form (ApplyPage) and merchant portal (MerchantPage).
 *
 * Works with PublicFormField whose `type` is the NORMALIZED frontend type:
 *   text | email | tel | number | date | percentage | select | textarea | ssn | checkbox | file
 *
 * Mirrors FieldValidationService.php on the backend.  All rules are derived
 * from the field's `type` + `required` flag — no field names are hardcoded.
 *
 * Usage:
 *   const errors = validateSection(section.fields, formValues)
 *   if (Object.keys(errors).length) { setErrs(errors); scrollToFirstError(...) }
 */

import type { PublicFormField, FieldValidationRule } from '../services/publicApp.service'

export type SectionErrors = Record<string, string>

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

// ── DB-rule client-side validator ─────────────────────────────────────────────
// Mirrors LeadValidationService.php — runs stored validation_rules in the browser
// so users see errors immediately before the form ever hits the server.

export function validateWithDbRules(
  rules: FieldValidationRule[],
  val: string,
  label: string,
): string | null {
  for (const r of rules) {
    const v  = r.value  !== undefined ? Number(r.value)  : 0
    const v2 = r.value2 !== undefined ? Number(r.value2) : 0
    const trimmed = val.trim()

    switch (r.rule) {
      case 'required':
        if (!trimmed) return `${label} is required`
        break
      case 'numeric': {
        // Strip dashes/spaces for SSN-formatted values (XXX-XX-XXXX) before checking
        const cleaned = trimmed.replace(/[-\s]/g, '')
        if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return `${label} must be a numeric value`
        break
      }
      case 'integer':
        if (!/^-?\d+$/.test(trimmed)) return `${label} must be a whole number`
        break
      case 'email':
        if (!EMAIL_RE.test(trimmed)) return `${label} must be a valid email address`
        break
      case 'url':
        try { new URL(trimmed) } catch { return `${label} must be a valid URL` }
        break
      case 'date':
        if (isNaN(Date.parse(trimmed))) return `${label} must be a valid date`
        break
      case 'digits': {
        const digOnly = trimmed.replace(/\D/g, '')
        if (digOnly.length !== v) return `${label} must be exactly ${v} digit${v !== 1 ? 's' : ''}`
        break
      }
      case 'digits_between': {
        const digOnly = trimmed.replace(/\D/g, '')
        if (digOnly.length < v || digOnly.length > v2)
          return `${label} must be ${v}–${v2} digits`
        break
      }
      case 'min':
        if (trimmed.length < v) return `${label} must be at least ${v} character${v !== 1 ? 's' : ''}`
        break
      case 'max':
        if (trimmed.length > v) return `${label} must not exceed ${v} characters`
        break
      case 'min_value':
        if (Number(trimmed) < v) return `${label} must be at least ${v}`
        break
      case 'max_value':
        if (Number(trimmed) > v) return `${label} must not exceed ${v}`
        break
      case 'alpha':
        if (!/^[a-zA-Z]+$/.test(trimmed)) return `${label} may only contain letters`
        break
      case 'alpha_num':
        if (!/^[a-zA-Z0-9]+$/.test(trimmed)) return `${label} may only contain letters and numbers`
        break
      case 'alpha_spaces':
        if (!/^[a-zA-Z\s]+$/.test(trimmed)) return `${label} may only contain letters and spaces`
        break
      case 'before': {
        const d = r.value === 'today' ? new Date() : new Date(String(r.value ?? ''))
        if (new Date(trimmed) >= d) return `${label} must be before ${r.value === 'today' ? 'today' : r.value}`
        break
      }
      case 'after': {
        const d = r.value === 'today' ? new Date() : new Date(String(r.value ?? ''))
        if (new Date(trimmed) <= d) return `${label} must be after ${r.value === 'today' ? 'today' : r.value}`
        break
      }
      case 'in': {
        const opts = String(r.value ?? '').split(',').map(s => s.trim())
        if (opts.length && !opts.includes(trimmed)) return `${label} must be one of: ${opts.join(', ')}`
        break
      }
      case 'regex': {
        if (!r.value) break
        try {
          const m = String(r.value).match(/^\/(.+)\/([gimy]*)$/)
          const re = m ? new RegExp(m[1], m[2]) : new RegExp(String(r.value))
          if (!re.test(trimmed)) return `${label} format is invalid`
        } catch { /* invalid regex — skip */ }
        break
      }
      // nullable: always passes
    }
  }
  return null
}

// ── HTML input attributes derived from DB rules ───────────────────────────────
// Applied to <input> elements so the browser enforces basic constraints
// (maxLength, minLength, pattern, type=number) before JS validation fires.

export function rulestoHtmlAttrs(
  rules: FieldValidationRule[],
): React.InputHTMLAttributes<HTMLInputElement> {
  const attrs: React.InputHTMLAttributes<HTMLInputElement> = {}
  for (const r of rules) {
    switch (r.rule) {
      case 'required':    attrs.required  = true; break
      case 'min':         attrs.minLength = Number(r.value); break
      case 'max':         attrs.maxLength = Number(r.value); break
      case 'digits':
        // Only set pattern; skip maxLength because formatted inputs (e.g. SSN with
        // dashes: XXX-XX-XXXX = 11 chars) exceed the raw digit count.
        attrs.pattern   = `\\d{${r.value}}`
        break
      case 'digits_between':
        attrs.minLength = Number(r.value)
        attrs.maxLength = Number(r.value2)
        attrs.pattern   = `\\d{${r.value},${r.value2}}`
        break
      case 'numeric':
      case 'integer':
      case 'min_value':
      case 'max_value':
        attrs.inputMode = 'numeric'
        break
      case 'regex': {
        if (!r.value) break
        const m = String(r.value).match(/^\/(.+)\/[gimy]*$/)
        attrs.pattern = m ? m[1] : String(r.value)
        break
      }
    }
  }
  return attrs
}

// ── Per-type validators ───────────────────────────────────────────────────────

function validateByType(
  type: string,
  val: string,
  label: string,
  options?: string[],
): string | null {
  switch (type) {
    case 'email':
      if (!EMAIL_RE.test(val.trim())) return `${label} must be a valid email address`
      break

    case 'tel':
    case 'phone':
    case 'phone_number': {
      const digits = val.replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 15)
        return `${label} must be 10–15 digits`
      break
    }

    case 'number':
      if (isNaN(Number(val))) return `${label} must be a numeric value`
      break

    case 'percentage': {
      const n = Number(val)
      if (isNaN(n)) return `${label} must be a numeric value`
      if (n < 0 || n > 100) return `${label} must be between 0 and 100`
      break
    }

    case 'date':
      if (isNaN(Date.parse(val))) return `${label} must be a valid date`
      break

    case 'select':
      if (options && options.length > 0 && !options.includes(val))
        return `${label} must be a valid option`
      break

    case 'textarea':
      if (val.length > 500) return `${label} must not exceed 500 characters`
      break

    case 'text':
      if (val.length > 255) return `${label} must not exceed 255 characters`
      break

    case 'ssn': {
      const digits = val.replace(/\D/g, '')
      if (digits.length !== 9) return `${label} must be in XXX-XX-XXXX format`
      break
    }

    // checkbox, file: no additional type validation
  }
  return null
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Validate all fields in a section.
 *
 * Rules generated dynamically from each field's `type` and `required` flag.
 * No field names are hardcoded — works for any crm_labels configuration.
 *
 * @param fields   PublicFormField[] from the current section
 * @param values   Current form values keyed by field.key
 * @returns        Map of { fieldKey: errorMessage } — empty means valid
 */
export function validateSection(
  fields: PublicFormField[],
  values: Record<string, string>,
): SectionErrors {
  const errors: SectionErrors = {}

  for (const f of fields) {
    const raw = values[f.key] ?? ''
    const val = raw.trim()
    const isEmpty = val === ''

    // Treat fields as SSN if either the type is 'ssn' or the key contains 'ssn'
    // (handles legacy records stored as 'text' type with an ssn-keyed field)
    const effectiveType = (f.type === 'ssn' || /\bssn\b/i.test(f.key)) ? 'ssn' : f.type

    const hasDbRules = f.validation_rules && f.validation_rules.length > 0

    if (hasDbRules) {
      // ── DB-rule path: validation_rules column drives all checks ──────────
      // Check required from either the validation_rules JSON array OR the
      // top-level required column flag — whichever is set.
      const hasRequiredRule = f.validation_rules!.some(r => r.rule === 'required')
      if ((hasRequiredRule || f.required) && isEmpty) {
        errors[f.key] = `${f.label} is required`
        continue
      }
      if (isEmpty) continue   // optional + empty — nullable/no-required rule
      const err = validateWithDbRules(f.validation_rules!, val, f.label)
      if (err) errors[f.key] = err
    } else {
      // ── Legacy path: type-based fallback ─────────────────────────────────
      if (f.required && isEmpty) {
        errors[f.key] = `${f.label} is required`
        continue
      }
      if (isEmpty) continue
      const err = validateByType(effectiveType, val, f.label, f.options)
      if (err) errors[f.key] = err
    }
  }

  return errors
}

/**
 * Scroll to (and focus) the first field that has an error.
 *
 * Looks for elements with `data-field-key` attribute — add this attribute
 * to the wrapper div of each FormField so this utility can find them.
 *
 * @param errorKeys  Ordered list of keys from the errors map
 * @param container  The scrollable container element (default: document)
 */
export function scrollToFirstError(
  errorKeys: string[],
  container?: HTMLElement | null,
): void {
  const root = container ?? document.body
  for (const key of errorKeys) {
    const wrapper = root.querySelector<HTMLElement>(`[data-field-key="${CSS.escape(key)}"]`)
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = wrapper.querySelector<HTMLElement>('input,select,textarea')
      if (input) requestAnimationFrame(() => input.focus({ preventScroll: true }))
      break
    }
  }
}
