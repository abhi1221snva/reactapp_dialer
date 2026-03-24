/**
 * FormError — displays a single field validation error message.
 *
 * Renders nothing when `message` is falsy, so it is safe to render
 * unconditionally below every input:
 *
 *   <input className={fm.inputClass('email')} name="email" />
 *   <FormError message={fm.getError('email')} />
 *
 * Visual matches the existing DynamicFieldForm error style:
 *   small red text + AlertCircle icon on the left.
 */
import { AlertCircle } from 'lucide-react'

interface FormErrorProps {
  /** Error message to display, or undefined/null/'' to render nothing */
  message?: string | null
  /** Extra Tailwind classes on the wrapper <p> */
  className?: string
}

export function FormError({ message, className = '' }: FormErrorProps) {
  if (!message) return null

  return (
    <p
      role="alert"
      className={`flex items-center gap-1 text-[11px] text-red-500 mt-0.5 ${className}`.trim()}
    >
      <AlertCircle size={10} className="flex-shrink-0" />
      {message}
    </p>
  )
}
