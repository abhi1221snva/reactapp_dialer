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

import type { PublicFormField } from '../services/publicApp.service'

export type SectionErrors = Record<string, string>

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

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

    case 'tel': {
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

    // Required check
    if (f.required && isEmpty) {
      errors[f.key] = `${f.label} is required`
      continue
    }

    // Skip type validation when empty (optional field)
    if (isEmpty) continue

    // Type-based validation
    const err = validateByType(f.type, val, f.label, f.options)
    if (err) errors[f.key] = err
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
