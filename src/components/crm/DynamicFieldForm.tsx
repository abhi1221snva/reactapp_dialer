import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { crmService } from '../../services/crm.service'
import type { CrmLabel } from '../../types/crm.types'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue?: UseFormSetValue<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch?: UseFormWatch<any>
  defaultValues?: Record<string, unknown>
  readOnly?: boolean
}

const HEADING_LABELS: Record<string, string> = {
  owner:        'Owner Information',
  business:     'Business Information',
  second_owner: 'Second Owner',
}

function renderInput(label: CrmLabel, register: Props['register'], defaultValue: unknown) {
  const { column_name, data_type, values } = label
  const baseClass = 'input w-full'

  if (data_type === 'select_option' || data_type === 'dropdown') {
    let opts: string[] = []
    if (values) {
      try { opts = JSON.parse(values) } catch {
        opts = values.split('|').map(s => s.trim()).filter(Boolean)
      }
    }
    return (
      <select {...register(column_name)} className={baseClass} defaultValue={defaultValue as string ?? ''}>
        <option value="">-- Select --</option>
        {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }

  if (data_type === 'date') {
    return <input type="date" {...register(column_name)} className={baseClass} defaultValue={defaultValue as string ?? ''} />
  }

  if (data_type === 'number') {
    return <input type="number" {...register(column_name)} className={baseClass} defaultValue={defaultValue as string ?? ''} />
  }

  if (data_type === 'phone_number' || data_type === 'phone') {
    return <input type="tel" {...register(column_name)} className={baseClass} defaultValue={defaultValue as string ?? ''} />
  }

  if (data_type === 'textarea' || data_type === 'text_area') {
    return <textarea {...register(column_name)} className={baseClass + ' resize-none'} rows={3} defaultValue={defaultValue as string ?? ''} />
  }

  return <input type="text" {...register(column_name)} className={baseClass} defaultValue={defaultValue as string ?? ''} />
}

// ── Read-only plain-text display ──────────────────────────────────────────────
function DisplayValue({ value }: { value: unknown }) {
  const str = value !== null && value !== undefined && value !== '' ? String(value) : null
  return str
    ? <p className="text-sm font-medium text-slate-800 leading-snug">{str}</p>
    : <p className="text-sm text-slate-300">—</p>
}

export function DynamicFieldForm({ register, setValue, defaultValues = {}, readOnly }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['crm-labels'],
    queryFn: async () => {
      const res = await crmService.getCrmLabels()
      return (res.data?.data ?? res.data ?? []) as CrmLabel[]
    },
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!setValue || !data) return
    const activeLabels = data.filter(l => l.status == 1 || l.status === '1')
    activeLabels.forEach(label => {
      const val = defaultValues[label.column_name]
      if (val !== undefined && val !== null) {
        setValue(label.column_name, val !== '' ? String(val) : '')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, defaultValues])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-slate-400">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-sm">Loading fields…</span>
      </div>
    )
  }

  const labels = (data ?? []).filter(l => l.status == 1 || l.status === '1')
  const groups = labels.reduce<Record<string, CrmLabel[]>>((acc, label) => {
    const key = label.heading_type || 'owner'
    acc[key] = acc[key] ?? []
    acc[key].push(label)
    return acc
  }, {})

  if (Object.keys(groups).length === 0) {
    return <p className="text-sm text-slate-400 italic py-1">No custom fields configured.</p>
  }

  // ── Read-only: plain text grid, no inputs ─────────────────────────────────
  if (readOnly) {
    return (
      <div className="space-y-5">
        {Object.entries(groups).map(([heading, fields]) => (
          <div key={heading}>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {HEADING_LABELS[heading] ?? heading}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
              {fields.map(label => (
                <div key={label.id}>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">
                    {label.title}
                  </p>
                  <DisplayValue value={defaultValues[label.column_name]} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Edit mode: renders form inputs ────────────────────────────────────────
  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([heading, fields]) => (
        <div key={heading}>
          <h4 className="text-xs font-semibold uppercase mb-3" style={{ color: '#6B7280', letterSpacing: '0.06em' }}>
            {HEADING_LABELS[heading] ?? heading}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {fields.map(label => (
              <div key={label.id}>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  {label.title}
                </label>
                {renderInput(label, register, defaultValues[label.column_name])}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
