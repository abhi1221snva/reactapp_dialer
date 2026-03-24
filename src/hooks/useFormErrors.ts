/**
 * useFormErrors — React state hook for inline field-level validation errors.
 *
 * Use this in forms that manage state with useState (not React Hook Form).
 * For React Hook Form forms, use the built-in setError() instead.
 *
 * ─── Basic usage ─────────────────────────────────────────────────────────────
 *
 *   const { setApiErrors, clearError, getError, inputClass, hasAnyError } = useFormErrors()
 *
 *   // Parse + store backend 422 errors:
 *   onError: (err) => setApiErrors(err)
 *
 *   // Clear a field error as the user types:
 *   onChange={e => { setField('email', e.target.value); clearError('email') }}
 *
 *   // Apply red-border class conditionally:
 *   <input className={inputClass('email')} />
 *
 *   // Render error message below the input:
 *   <FormError message={getError('email')} />
 *
 * ─── Full integration example ────────────────────────────────────────────────
 *
 *   const fm = useFormErrors()
 *
 *   const handleSubmit = () => {
 *     fm.clearAll()           // wipe stale errors before every submit
 *     submitMutation.mutate()
 *   }
 *
 *   const mutation = useMutation({
 *     mutationFn: api.create,
 *     onError: (err) => fm.setApiErrors(err),
 *   })
 */

import { useState, useCallback, useRef } from 'react'
import { extractApiErrors, type FlatErrors } from '../utils/formErrors'

export interface UseFormErrorsReturn {
  /** Current field errors keyed by field name */
  errors: FlatErrors

  /**
   * Parse a 422 Axios error and store all field messages in React state.
   * Also scrolls to and focuses the first field that has a matching
   * <input name="…"> in the given form element (optional).
   */
  setApiErrors: (error: unknown, formEl?: HTMLElement | null) => void

  /** Clear the error for a single field — call in onChange handlers */
  clearError: (field: string) => void

  /** Clear ALL errors — call before each form submission */
  clearAll: () => void

  /** Returns the error message for `field`, or undefined if none */
  getError: (field: string) => string | undefined

  /** Returns true when `field` has an error */
  hasError: (field: string) => boolean

  /**
   * Returns the CSS class string for an input element.
   *
   *   hasError  → 'input input-error [extra]'
   *   no error  → 'input [extra]'
   *
   * The `.input` and `.input-error` classes are defined in index.css.
   */
  inputClass: (field: string, extra?: string) => string

  /** True when at least one field has an error */
  hasAnyError: boolean

  /**
   * A ref you can attach to your <form> element.
   * When provided, setApiErrors will scope its DOM scroll/focus to that form.
   *
   *   <form ref={fm.formRef}>…</form>
   */
  formRef: React.RefObject<HTMLFormElement>
}

export function useFormErrors(): UseFormErrorsReturn {
  const [errors, setErrors] = useState<FlatErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  // ── setApiErrors ─────────────────────────────────────────────────────────
  const setApiErrors = useCallback(
    (error: unknown, formEl?: HTMLElement | null) => {
      const flat = extractApiErrors(error)
      if (!flat || Object.keys(flat).length === 0) return

      setErrors(flat)

      // Scroll to + focus first matching input in the form
      const root: HTMLElement | null = formEl ?? formRef.current
      if (!root) return

      const [firstField] = Object.keys(flat)
      const firstInput = root.querySelector<HTMLElement>(
        `input[name="${CSS.escape(firstField)}"],` +
        `select[name="${CSS.escape(firstField)}"],` +
        `textarea[name="${CSS.escape(firstField)}"]`
      )
      if (firstInput) {
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        requestAnimationFrame(() => {
          if (
            firstInput instanceof HTMLInputElement   ||
            firstInput instanceof HTMLSelectElement  ||
            firstInput instanceof HTMLTextAreaElement
          ) {
            firstInput.focus({ preventScroll: true })
          }
        })
      }
    },
    []
  )

  // ── clearError ────────────────────────────────────────────────────────────
  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  // ── clearAll ──────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => setErrors({}), [])

  // ── Selectors ─────────────────────────────────────────────────────────────
  const getError  = useCallback((f: string) => errors[f],   [errors])
  const hasError  = useCallback((f: string) => !!errors[f], [errors])

  const inputClass = useCallback(
    (field: string, extra = '') => {
      const base = extra ? `input ${extra}` : 'input'
      return errors[field] ? `${base} input-error` : base
    },
    [errors]
  )

  const hasAnyError = Object.keys(errors).length > 0

  return {
    errors,
    setApiErrors,
    clearError,
    clearAll,
    getError,
    hasError,
    inputClass,
    hasAnyError,
    formRef,
  }
}
