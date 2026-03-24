/**
 * formErrors.ts — Reusable DOM-based validation error utilities
 *
 * Works with ANY form regardless of framework (React Hook Form, plain state,
 * vanilla JS).  Finds inputs by their `name` attribute and renders error
 * messages directly in the DOM below each field.
 *
 * Quick-start:
 *   import { extractApiErrors, showValidationErrors, clearValidationErrors } from '@/utils/formErrors'
 *
 *   onError: (err) => {
 *     const errs = extractApiErrors(err)
 *     if (errs) showValidationErrors(errs)
 *   }
 *
 * The `.input-error` class is defined in index.css and applies a red border
 * + red focus ring matching the existing design system.
 */

/** Backend 422 shape:  { field: ["message 1", "message 2"] } */
export type BackendErrors = Record<string, string[]>

/** Flat parsed form:   { field: "first message" } */
export type FlatErrors = Record<string, string>

// ─── Internal constants ───────────────────────────────────────────────────────
const ERROR_ATTR   = 'data-ve-for'    // attribute placed on each injected error <p>
const INVALID_CLS  = 'input-error'    // matches .input-error in index.css

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract a flat { field: firstMessage } map from an Axios 422 error response.
 * Returns null for any non-422 response or missing `errors` key.
 */
export function extractApiErrors(error: unknown): FlatErrors | null {
  if (!error || typeof error !== 'object') return null

  const res = (error as {
    response?: { status?: number; data?: { errors?: BackendErrors } }
  }).response

  if (res?.status !== 422 || !res.data?.errors) return null

  const flat: FlatErrors = {}
  for (const [field, msgs] of Object.entries(res.data.errors)) {
    const first = Array.isArray(msgs) ? msgs[0] : String(msgs)
    if (first) flat[field] = first
  }

  return Object.keys(flat).length > 0 ? flat : null
}

/**
 * Show backend validation errors under their respective input fields.
 *
 * For each entry in `errors`:
 *  1. Locates the <input|select|textarea name="field"> inside `container`
 *  2. Adds the `.input-error` CSS class (red border)
 *  3. Inserts a styled error <p> immediately after the input's wrapper element
 *  4. Attaches a one-time input/change listener to auto-clear the error on edit
 *
 * After all errors are placed, scrolls to and focuses the first invalid field.
 *
 * @param errors    Flat { field: message } map (use extractApiErrors() to build)
 * @param container Scope the search to a specific form element (default: document)
 * @returns         Number of input fields that were actually found and annotated
 */
export function showValidationErrors(
  errors: FlatErrors,
  container: HTMLElement | Document = document
): number {
  // Always start clean so we never stack duplicate errors on re-submit
  clearValidationErrors(container)

  const entries = Object.entries(errors)
  if (entries.length === 0) return 0

  let firstInput: HTMLElement | null = null
  let matched = 0

  for (const [field, message] of entries) {
    if (!message) continue

    // Match input / select / textarea by name attribute.
    // CSS.escape handles field keys containing dots, brackets, etc.
    const input = container.querySelector<HTMLElement>(
      `input[name="${CSS.escape(field)}"],` +
      `select[name="${CSS.escape(field)}"],` +
      `textarea[name="${CSS.escape(field)}"]`
    )
    if (!input) continue

    matched++
    if (!firstInput) firstInput = input

    // ── Red border via existing .input-error design-system class ─────────────
    input.classList.add(INVALID_CLS)

    // ── Inject error message element ─────────────────────────────────────────
    const errorEl = document.createElement('p')
    errorEl.setAttribute(ERROR_ATTR, field)
    // Inline styles used intentionally so the element works even before
    // the Tailwind stylesheet has loaded (e.g. during lazy-loaded chunks).
    errorEl.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:4px',
      'font-size:11px',
      'color:#ef4444',
      'margin-top:2px',
      'line-height:1.4',
    ].join(';')
    errorEl.textContent = message

    // Insert right after the input's immediate parent so it lands below
    // any surrounding label/wrapper <div>, not mid-way inside it.
    const insertAfter = input.parentElement ?? input
    insertAfter.insertAdjacentElement('afterend', errorEl)

    // ── Auto-clear on user interaction ───────────────────────────────────────
    const handleInteraction = () => {
      clearFieldError(field, container)
      input.removeEventListener('input',  handleInteraction)
      input.removeEventListener('change', handleInteraction)
    }
    input.addEventListener('input',  handleInteraction)
    input.addEventListener('change', handleInteraction)
  }

  // ── Scroll to and focus the first invalid field ───────────────────────────
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

  return matched
}

/**
 * Remove error styling and message for a single named field.
 * Called automatically by showValidationErrors' input listener,
 * but can also be invoked manually from onChange handlers.
 */
export function clearFieldError(
  field: string,
  container: HTMLElement | Document = document
): void {
  // Remove the injected error element
  container
    .querySelector(`[${ERROR_ATTR}="${CSS.escape(field)}"]`)
    ?.remove()

  // Remove red-border class from the input
  const input = container.querySelector<HTMLElement>(
    `input[name="${CSS.escape(field)}"],` +
    `select[name="${CSS.escape(field)}"],` +
    `textarea[name="${CSS.escape(field)}"]`
  )
  input?.classList.remove(INVALID_CLS)
}

/**
 * Remove ALL validation errors previously injected by showValidationErrors.
 * Call this at the start of a new form submission attempt.
 */
export function clearValidationErrors(
  container: HTMLElement | Document = document
): void {
  container.querySelectorAll(`[${ERROR_ATTR}]`).forEach(el => el.remove())
  container.querySelectorAll<HTMLElement>(`.${INVALID_CLS}`).forEach(el => {
    el.classList.remove(INVALID_CLS)
  })
}
