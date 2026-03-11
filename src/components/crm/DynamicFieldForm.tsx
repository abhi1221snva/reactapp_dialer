import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, AlertCircle } from 'lucide-react'
import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { crmService } from '../../services/crm.service'
import type { CrmLabel, FieldCondition } from '../../types/crm.types'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue?: UseFormSetValue<any>
  defaultValues?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors?: FieldErrors<any>
  /** If provided, skips internal fetch and uses these labels directly */
  labels?: CrmLabel[]
  /**
   * Current form values — used to evaluate conditional field visibility.
   * Pass `watch() as Record<string, unknown>` from the parent form.
   */
  formValues?: Record<string, unknown>
  readOnly?: boolean
}

// ── Section header humanizer ──────────────────────────────────────────────────
const KNOWN_SECTIONS: Record<string, string> = {
  owner:        'Owner Information',
  business:     'Business Information',
  second_owner: 'Second Owner',
  other:        'Other',
  general:      'General Information',
  contact:      'Contact Details',
  financial:    'Financial Information',
  address:      'Address',
}

function humanizeSection(key: string): string {
  return (
    KNOWN_SECTIONS[key] ??
    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  )
}

// ── Conditional field evaluation ──────────────────────────────────────────────
function isVisible(
  conditions: FieldCondition[] | null | undefined,
  formValues: Record<string, unknown>,
): boolean {
  if (!conditions || conditions.length === 0) return true
  return conditions.every(cond => {
    const actual = String(formValues[cond.field] ?? '')
    switch (cond.operator) {
      case 'equals':     return actual === cond.value
      case 'not_equals': return actual !== cond.value
      case 'contains':   return actual.toLowerCase().includes(cond.value.toLowerCase())
      case 'not_empty':  return actual.trim().length > 0
      case 'empty':      return actual.trim().length === 0
      default:           return true
    }
  })
}

// ── Parse options (JSON string or array) ─────────────────────────────────────
function parseOptions(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch { /* fall through */ }
  return raw.split('|').map(s => s.trim()).filter(Boolean)
}

// ── Input renderer ────────────────────────────────────────────────────────────
function renderInput(
  label: CrmLabel,
  register: Props['register'],
  defaultValue: unknown,
) {
  const { field_key, field_type, options, placeholder, label_name } = label
  const ph = placeholder || label_name
  const baseClass = 'input w-full'

  // ── Dropdown / Select ──────────────────────────────────────────────────────
  if (field_type === 'select_option' || field_type === 'dropdown' || field_type === 'select') {
    const opts = parseOptions(options)
    return (
      <select {...register(field_key)} className={baseClass} defaultValue={defaultValue as string ?? ''}>
        <option value="">-- Select --</option>
        {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }

  // ── Radio ──────────────────────────────────────────────────────────────────
  if (field_type === 'radio') {
    const opts = parseOptions(options)
    return (
      <div className="flex flex-wrap gap-4 pt-1">
        {opts.map(opt => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              {...register(field_key)}
              value={opt}
              defaultChecked={defaultValue === opt}
              className="h-3.5 w-3.5 border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">{opt}</span>
          </label>
        ))}
        {opts.length === 0 && (
          <p className="text-xs text-slate-400 italic">No options defined</p>
        )}
      </div>
    )
  }

  // ── Checkbox ───────────────────────────────────────────────────────────────
  if (field_type === 'checkbox') {
    const isChecked = defaultValue === '1' || defaultValue === 1 || defaultValue === true
    return (
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id={field_key}
          {...register(field_key)}
          defaultChecked={isChecked}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
        <label htmlFor={field_key} className="text-sm text-slate-500 cursor-pointer select-none">
          {ph}
        </label>
      </div>
    )
  }

  // ── Date ───────────────────────────────────────────────────────────────────
  if (field_type === 'date') {
    return (
      <input
        type="date"
        {...register(field_key)}
        className={baseClass}
        defaultValue={defaultValue as string ?? ''}
      />
    )
  }

  // ── Number ─────────────────────────────────────────────────────────────────
  if (field_type === 'number') {
    return (
      <input
        type="number"
        {...register(field_key)}
        className={baseClass}
        placeholder={ph}
        defaultValue={defaultValue as string ?? ''}
      />
    )
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  if (field_type === 'email') {
    return (
      <input
        type="email"
        {...register(field_key)}
        className={baseClass}
        placeholder={ph}
        defaultValue={defaultValue as string ?? ''}
      />
    )
  }

  // ── Phone ──────────────────────────────────────────────────────────────────
  if (field_type === 'phone_number' || field_type === 'phone') {
    return (
      <input
        type="tel"
        {...register(field_key)}
        className={baseClass}
        placeholder={ph}
        defaultValue={defaultValue as string ?? ''}
      />
    )
  }

  // ── Textarea ───────────────────────────────────────────────────────────────
  if (field_type === 'textarea' || field_type === 'text_area') {
    return (
      <textarea
        {...register(field_key)}
        className={baseClass + ' resize-none'}
        rows={3}
        placeholder={ph}
        defaultValue={defaultValue as string ?? ''}
      />
    )
  }

  // ── Default: text ──────────────────────────────────────────────────────────
  return (
    <input
      type="text"
      {...register(field_key)}
      className={baseClass}
      placeholder={ph}
      defaultValue={defaultValue as string ?? ''}
    />
  )
}

// ── Read-only display ─────────────────────────────────────────────────────────
function DisplayValue({ value, dataType }: { value: unknown; dataType: string }) {
  if (dataType === 'checkbox') {
    const checked = value === '1' || value === 1 || value === true
    return (
      <div className="flex items-center gap-1.5">
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
          {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <span className="text-sm text-slate-600">{checked ? 'Yes' : 'No'}</span>
      </div>
    )
  }
  const str = value !== null && value !== undefined && value !== '' ? String(value) : null
  return str
    ? <p className="text-sm font-medium text-slate-800 leading-snug">{str}</p>
    : <p className="text-sm text-slate-300">—</p>
}

// ── Main component ────────────────────────────────────────────────────────────
export function DynamicFieldForm({
  register, setValue, defaultValues = {}, errors,
  labels: labelsProp, formValues = {}, readOnly,
}: Props) {
  // Only fetch if labels not provided by parent
  const { data: fetchedLabels, isLoading } = useQuery({
    queryKey: ['crm-lead-fields'],
    queryFn: async () => {
      const res = await crmService.getLeadFields()
      return (res.data?.data ?? res.data ?? []) as CrmLabel[]
    },
    staleTime: 5 * 60 * 1000,
    enabled: !labelsProp,
  })

  const allLabels = labelsProp ?? fetchedLabels ?? []

  // Populate existing values into the form (edit mode)
  useEffect(() => {
    if (!setValue || allLabels.length === 0) return
    const active = allLabels.filter(l => l.status === true || (l.status as unknown) == 1)
    active.forEach(label => {
      const val = defaultValues[label.field_key]
      if (val !== undefined && val !== null) {
        if (label.field_type === 'checkbox') {
          setValue(label.field_key, val === '1' || val === 1 || val === true)
        } else {
          setValue(label.field_key, val !== '' ? String(val) : '')
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLabels, defaultValues])

  if (!labelsProp && isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-slate-400">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-sm">Loading fields…</span>
      </div>
    )
  }

  // Filter to active labels
  const active = allLabels.filter(l => l.status === true || (l.status as unknown) == 1)

  // Group by section, preserving insertion order
  const groups = active.reduce<Record<string, CrmLabel[]>>((acc, label) => {
    const key = label.section || 'other'
    acc[key] = acc[key] ?? []
    acc[key].push(label)
    return acc
  }, {})

  if (Object.keys(groups).length === 0) {
    return <p className="text-sm text-slate-400 italic py-1">No fields configured.</p>
  }

  // ── Read-only: plain-text view ────────────────────────────────────────────
  if (readOnly) {
    return (
      <div className="space-y-5">
        {Object.entries(groups).map(([section, fields]) => {
          const visible = fields.filter(f =>
            isVisible(f.conditions, defaultValues as Record<string, unknown>)
          )
          if (visible.length === 0) return null
          return (
            <div key={section}>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {humanizeSection(section)}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
                {visible.map(label => (
                  <div key={label.id}>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">
                      {label.label_name}
                    </p>
                    <DisplayValue
                      value={defaultValues[label.field_key]}
                      dataType={label.field_type}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Edit mode: form inputs ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([section, fields]) => {
        const visible = fields.filter(f => isVisible(f.conditions, formValues))
        if (visible.length === 0) return null
        return (
          <div key={section}>
            <h4
              className="text-xs font-semibold uppercase mb-3"
              style={{ color: '#6B7280', letterSpacing: '0.06em' }}
            >
              {humanizeSection(section)}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visible.map(label => {
                const isRequired = label.required === true || (label.required as unknown) == 1
                const isCheckbox = label.field_type === 'checkbox'
                const fieldError = errors?.[label.field_key]

                return (
                  <div key={label.id}>
                    {!isCheckbox && (
                      <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                        {label.label_name}
                        {isRequired && <span className="ml-0.5 text-red-500">*</span>}
                      </label>
                    )}
                    {renderInput(label, register, defaultValues[label.field_key])}
                    {fieldError?.message && (
                      <p className="flex items-center gap-1 text-xs mt-1 text-red-500">
                        <AlertCircle size={11} />
                        {String(fieldError.message)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
