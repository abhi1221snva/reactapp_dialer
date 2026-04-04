import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, AlertCircle } from 'lucide-react'
import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form'

import { crmService } from '../../services/crm.service'
import type { CrmLabel, FieldCondition } from '../../types/crm.types'
import { buildFieldRules, parseFieldOptions } from '../../utils/fieldValidation'
import AddressAutocomplete from '../ui/AddressAutocomplete'
import { isAddressAutocompleteKey, resolveAddressGroup, type ParsedPlace } from '../../utils/addressFieldMapping'

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
  /** Number of grid columns for field layout. Default 2. */
  columns?: 1 | 2 | 4
  /** @deprecated Use columns={1} instead */
  singleColumn?: boolean
  /** Hide section header labels above field groups */
  hideSectionHeaders?: boolean
}

// ── Section header humanizer ──────────────────────────────────────────────────
const KNOWN_SECTIONS: Record<string, string> = {
  owner:        'Owner Information',
  business:     'Business Information',
  funding:      'Funding Information',
  contact:      'Contact Information',
  financial:    'Financial Information',
  documents:    'Documents / Verification',
  custom:       'Custom Fields',
  // legacy aliases kept for backward compatibility
  second_owner: 'Second Owner',
  general:      'General Information',
  other:        'Other',
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

// ── Thin alias kept so renderInput() call-sites below are unchanged ──────────
const parseOptions = parseFieldOptions

// ── Input renderer ────────────────────────────────────────────────────────────
function renderInput(
  label: CrmLabel,
  register: Props['register'],
  defaultValue: unknown,
) {
  const { field_key, field_type, options, placeholder, label_name } = label
  const ph = placeholder || label_name
  const baseClass = 'crm-fi'

  const rules = buildFieldRules(label)

  // ── Dropdown / Select ──────────────────────────────────────────────────────
  if (field_type === 'select_option' || field_type === 'dropdown' || field_type === 'select') {
    const opts = parseOptions(options)
    return (
      <select {...register(field_key, rules)} className={baseClass} defaultValue={defaultValue as string ?? ''}>
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
              {...register(field_key, rules)}
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
          {...register(field_key, rules)}
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
        {...register(field_key, rules)}
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
        {...register(field_key, rules)}
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
        {...register(field_key, rules)}
        className={baseClass}
        placeholder={ph}
        defaultValue={defaultValue as string ?? ''}
        autoComplete="email"
      />
    )
  }

  // ── Phone ──────────────────────────────────────────────────────────────────
  if (field_type === 'phone_number' || field_type === 'phone') {
    return (
      <input
        type="tel"
        {...register(field_key, rules)}
        className={baseClass}
        placeholder={ph || '10-digit number'}
        defaultValue={defaultValue as string ?? ''}
        maxLength={15}
        inputMode="numeric"
      />
    )
  }

  // ── Textarea ───────────────────────────────────────────────────────────────
  if (field_type === 'textarea' || field_type === 'text_area') {
    return (
      <textarea
        {...register(field_key, rules)}
        className={baseClass}
        rows={3}
        placeholder={ph}
        defaultValue={defaultValue as string ?? ''}
        maxLength={500}
      />
    )
  }

  // ── Default: text ──────────────────────────────────────────────────────────
  return (
    <input
      type="text"
      {...register(field_key, rules)}
      className={baseClass}
      placeholder={ph}
      defaultValue={defaultValue as string ?? ''}
      maxLength={500}
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
  labels: labelsProp, formValues = {}, readOnly, columns, singleColumn, hideSectionHeaders,
}: Props) {
  // Resolve effective column count (singleColumn is deprecated alias for columns=1)
  const cols = columns ?? (singleColumn ? 1 : 2)
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
              <div className="space-y-3">
                {visible.map(label => (
                  <div key={label.id}>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">
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
      <style>{`
        .crm-fi{width:100%;padding:8px 11px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;background:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .12s,box-shadow .12s}
        .crm-fi:focus{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.1)}
        .crm-fi::placeholder{color:#94a3b8}
        select.crm-fi{appearance:none;cursor:pointer;padding-right:32px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;background-size:14px}
        textarea.crm-fi{resize:none;line-height:1.5}
        .field-has-error .crm-fi{border-color:#ef4444}
        .field-has-error .crm-fi:focus{box-shadow:0 0 0 3px rgba(239,68,68,.1)}
      `}</style>
      {Object.entries(groups).map(([section, fields]) => {
        const visible = fields.filter(f => isVisible(f.conditions, formValues))
        if (visible.length === 0) return null
        return (
          <div key={section}>
            {!hideSectionHeaders && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #16a34a', paddingLeft: 10, lineHeight: 1.3 }}>
                  {humanizeSection(section)}
                </h4>
                <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
              </div>
            )}
            <div className={[
              'grid grid-cols-1 gap-x-3 gap-y-2',
              cols >= 2 ? 'sm:grid-cols-2' : '',
              cols >= 4 ? 'xl:grid-cols-4' : '',
            ].join(' ')}>
              {visible.map(label => {
                const isRequired = label.required === true || (label.required as unknown) == 1
                const isCheckbox = label.field_type === 'checkbox'
                const fieldError = errors?.[label.field_key]
                const k = label.field_key.toLowerCase()
                const isWide = cols > 1 && (label.field_type === 'textarea' || label.field_type === 'text_area'
                  || (k.includes('address') && !k.includes('email'))
                  || k.includes('notes') || k.includes('description'))
                // Wide fields span 2 cols; on a 4-col grid that's half-width, on 2-col that's full-width
                const spanClass = isWide ? 'sm:col-span-2' : ''

                return (
                  <div key={label.id} className={`${spanClass}${fieldError ? ' field-has-error' : ''}`} data-field-key={label.field_key} id={`field-${label.field_key}`}>
                    {!isCheckbox && (
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: fieldError ? '#ef4444' : '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>
                        {label.label_name}
                        {isRequired && <span style={{ color: '#ef4444', fontSize: 13, marginLeft: 3 }}>*</span>}
                      </label>
                    )}
                    {isAddressAutocompleteKey(label.field_key, label.label_name) && setValue ? (
                      <AddressAutocomplete
                        value={String(formValues?.[label.field_key] ?? '')}
                        onChange={v => setValue(label.field_key, v)}
                        onPlaceSelect={(parsed: ParsedPlace) => {
                          const group = resolveAddressGroup(label.field_key, label.label_name)
                          if (group && setValue) {
                            setValue(group.cityKey, parsed.city)
                            setValue(group.stateKey, parsed.state)
                            setValue(group.zipKey, parsed.zip)
                            if (group.countryKey) setValue(group.countryKey, parsed.country)
                          }
                        }}
                        placeholder={label.placeholder || label.label_name}
                      />
                    ) : renderInput(label, register, defaultValues[label.field_key])}
                    {fieldError?.message && (
                      <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <AlertCircle size={11} />{String(fieldError.message)}
                      </span>
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
