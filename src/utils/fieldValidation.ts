/**
 * fieldValidation.ts — Centralized field_type → React Hook Form validation rules.
 *
 * Single source of truth for frontend validation, mirroring FieldValidationService.php.
 * Used by DynamicFieldForm and any other form that renders CRM dynamic fields.
 *
 * Usage:
 *   import { buildFieldRules } from '@/utils/fieldValidation'
 *   const rules = buildFieldRules(label)
 *   <input {...register(label.field_key, rules)} />
 */

import type { RegisterOptions } from 'react-hook-form'
import type { CrmLabel } from '../types/crm.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse JSON or pipe-delimited options string into a string array. */
export function parseFieldOptions(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch { /* fall through */ }
  return raw.split('|').map(s => s.trim()).filter(Boolean)
}

// ── Rule builders per type ────────────────────────────────────────────────────

type ValidateFn = (val: string) => true | string

function emailRule(label: string): ValidateFn {
  return (val) => {
    if (!val || val.trim() === '') return true
    return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(val.trim())
      || `${label} must be a valid email address`
  }
}

function phoneRule(label: string): ValidateFn {
  return (val) => {
    if (!val || val.trim() === '') return true
    const digits = val.replace(/\D/g, '')
    return digits.length === 10 || `${label} must be exactly 10 digits`
  }
}

function numberRule(label: string): ValidateFn {
  return (val) => {
    if (!val || val === '') return true
    return !isNaN(Number(val)) || `${label} must be a numeric value`
  }
}

function percentageRule(label: string): ValidateFn {
  return (val) => {
    if (!val || val === '') return true
    const n = Number(val)
    if (isNaN(n)) return `${label} must be a numeric value`
    if (n < 0 || n > 100) return `${label} must be between 0 and 100`
    return true
  }
}

function dateRule(label: string): ValidateFn {
  return (val) => {
    if (!val || val.trim() === '') return true
    return !isNaN(Date.parse(val)) || `${label} must be a valid date`
  }
}

function dropdownRule(label: string, options: string[]): ValidateFn {
  return (val) => {
    if (!val || val === '') return true
    return options.includes(val) || `${label} must be a valid option`
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Build React Hook Form RegisterOptions for a CRM dynamic field.
 *
 * Mirrors FieldValidationService.php::validate() on the backend.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildFieldRules(label: CrmLabel): RegisterOptions<any, any> {
  const isRequired = label.required === true || (label.required as unknown) == 1
  const isCheckbox = label.field_type === 'checkbox'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules: RegisterOptions<any, any> = {}

  if (isRequired && !isCheckbox) {
    rules.required = `${label.label_name} is required`
  }

  switch (label.field_type) {
    case 'email':
      rules.validate = emailRule(label.label_name)
      break

    case 'phone_number':
    case 'phone':
      rules.validate = phoneRule(label.label_name)
      break

    case 'number':
      rules.validate = numberRule(label.label_name)
      break

    case 'percentage':
      rules.validate = percentageRule(label.label_name)
      break

    case 'date':
      rules.validate = dateRule(label.label_name)
      break

    case 'text':
    case 'textarea':
    case 'text_area':
      rules.maxLength = {
        value: 500,
        message: `${label.label_name} must not exceed 500 characters`,
      }
      break

    case 'dropdown':
    case 'select':
    case 'select_option':
    case 'radio': {
      const opts = parseFieldOptions(label.options)
      if (opts.length > 0) {
        rules.validate = dropdownRule(label.label_name, opts)
      }
      break
    }

    // checkbox and file: no additional rules beyond required
    case 'checkbox':
    case 'file':
      break
  }

  return rules
}
