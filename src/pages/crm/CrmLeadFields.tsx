import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, Search, X, Check,
  GripVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw,
  Settings2, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { RowActions } from '../../components/ui/RowActions'
import { Badge } from '../../components/ui/Badge'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import type { CrmLabel, FieldCondition, ConditionOperator } from '../../types/crm.types'

const PER_PAGE = 15

const FIELD_TYPES = [
  { value: 'text',         label: 'Text' },
  { value: 'number',       label: 'Number' },
  { value: 'email',        label: 'Email' },
  { value: 'phone_number', label: 'Phone' },
  { value: 'date',         label: 'Date' },
  { value: 'textarea',     label: 'Textarea' },
  { value: 'dropdown',     label: 'Dropdown' },
  { value: 'radio',        label: 'Radio' },
  { value: 'checkbox',     label: 'Checkbox' },
]

const CONDITION_OPERATORS: { value: ConditionOperator; label: string; needsValue: boolean }[] = [
  { value: 'equals',     label: 'equals',         needsValue: true },
  { value: 'not_equals', label: 'does not equal', needsValue: true },
  { value: 'contains',   label: 'contains',       needsValue: true },
  { value: 'not_empty',  label: 'is not empty',   needsValue: false },
  { value: 'empty',      label: 'is empty',       needsValue: false },
]

const DEFAULT_SECTIONS = ['owner', 'business', 'second_owner', 'other', 'general', 'contact', 'financial', 'address']

// Well-known field keys for quick selection
const KNOWN_FIELD_KEYS = [
  'first_name', 'last_name', 'email', 'phone_number', 'company_name',
  'gender', 'dob', 'address', 'city', 'state', 'country',
]

function toFieldKey(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function typeLabel(t: string) {
  return FIELD_TYPES.find(f => f.value === t)?.label ?? t
}

function humanizeSection(key: string): string {
  const known: Record<string, string> = {
    owner:        'Owner Information',
    business:     'Business Information',
    second_owner: 'Second Owner',
    other:        'Other',
    general:      'General Information',
    contact:      'Contact Details',
    financial:    'Financial Information',
    address:      'Address',
  }
  return known[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({
  page, totalPages, total, limit, onPageChange,
}: {
  page: number; totalPages: number; total: number; limit: number; onPageChange: (p: number) => void
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to   = Math.min(page * limit, total)
  const pages = (() => {
    const delta = 2; const range: (number | '...')[] = []; let prev = 0
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - delta && p <= page + delta)) {
        if (prev && p - prev > 1) range.push('...')
        range.push(p); prev = p
      }
    }
    return range
  })()
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
      <span className="text-xs text-slate-500">
        {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"><ChevronsLeft size={14} /></button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"><ChevronLeft size={14} /></button>
        {pages.map((p, i) =>
          p === '...' ? <span key={`dots-${i}`} className="px-2 py-1 text-xs text-slate-400">…</span> : (
            <button key={p} onClick={() => onPageChange(p as number)}
              className={cn('min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors',
                p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
            >{p}</button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"><ChevronRight size={14} /></button>
        <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
        enabled ? 'bg-indigo-600' : 'bg-slate-300'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
        enabled ? 'translate-x-4' : 'translate-x-0'
      )} />
    </button>
  )
}

// ── Conditions Builder ────────────────────────────────────────────────────────
interface ConditionsBuilderProps {
  conditions: FieldCondition[]
  onChange: (c: FieldCondition[]) => void
  availableFields: CrmLabel[]
  currentFieldId?: number
}

function ConditionsBuilder({ conditions, onChange, availableFields, currentFieldId }: ConditionsBuilderProps) {
  const [open, setOpen] = useState(conditions.length > 0)

  const fieldOptions = availableFields.filter(f =>
    f.id !== currentFieldId &&
    ['text', 'number', 'dropdown', 'radio', 'email', 'phone_number'].includes(f.field_type)
  )

  const addCondition = () =>
    onChange([...conditions, { field: fieldOptions[0]?.field_key ?? '', operator: 'equals', value: '' }])

  const removeCondition = (i: number) => onChange(conditions.filter((_, idx) => idx !== i))

  const updateCondition = (i: number, patch: Partial<FieldCondition>) =>
    onChange(conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c))

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/60 hover:bg-slate-100/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Visibility Conditions</span>
          {conditions.length > 0 && (
            <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
              {conditions.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-3.5 py-3 space-y-2.5 border-t border-slate-100">
          {conditions.length === 0 ? (
            <p className="text-xs text-slate-400">No conditions — field is always visible.</p>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 font-medium">Show this field only when ALL of:</p>
              {conditions.map((cond, i) => {
                const opDef = CONDITION_OPERATORS.find(o => o.value === cond.operator)
                return (
                  <div key={i} className="flex items-center gap-1.5 flex-wrap">
                    <select
                      className="input text-xs h-8 py-0 flex-1 min-w-[100px]"
                      value={cond.field}
                      onChange={e => updateCondition(i, { field: e.target.value })}
                    >
                      <option value="">— Field —</option>
                      {fieldOptions.map(f => (
                        <option key={f.id} value={f.field_key}>{f.label_name}</option>
                      ))}
                    </select>
                    <select
                      className="input text-xs h-8 py-0 w-36"
                      value={cond.operator}
                      onChange={e => updateCondition(i, { operator: e.target.value as ConditionOperator })}
                    >
                      {CONDITION_OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    {(opDef?.needsValue ?? true) && (
                      <input
                        className="input text-xs h-8 py-0 flex-1 min-w-[80px]"
                        placeholder="value"
                        value={cond.value}
                        onChange={e => updateCondition(i, { value: e.target.value })}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeCondition(i)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </>
          )}
          <button
            type="button"
            onClick={addCondition}
            disabled={fieldOptions.length === 0}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 disabled:opacity-40"
          >
            <Plus size={12} /> Add condition
          </button>
          {fieldOptions.length === 0 && (
            <p className="text-[11px] text-slate-400">Create other fields first to add conditions.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Field Modal ───────────────────────────────────────────────────────────────
interface FieldFormState {
  label_name: string
  field_key: string
  field_key_locked: boolean  // true once user manually edited field_key
  field_type: string
  section: string
  placeholder: string
  required: boolean
  status: boolean
  values: string             // textarea: one option per line
  conditions: FieldCondition[]
}

const EMPTY_FORM: FieldFormState = {
  label_name:       '',
  field_key:        '',
  field_key_locked: false,
  field_type:       'text',
  section:          'general',
  placeholder:      '',
  required:         false,
  status:           true,
  values:           '',
  conditions:       [],
}

function parseValuesToLines(v?: string | null): string {
  if (!v) return ''
  try {
    const arr = JSON.parse(v) as string[]
    return Array.isArray(arr) ? arr.join('\n') : v
  } catch { return v }
}

function buildOptionsArray(lines: string): string[] {
  return lines.split('\n').map(s => s.trim()).filter(Boolean)
}

interface FieldModalProps {
  editing?: CrmLabel | null
  allFields: CrmLabel[]
  sectionOptions: string[]
  onClose: () => void
  onSaved: () => void
}

function FieldModal({ editing, allFields, sectionOptions, onClose, onSaved }: FieldModalProps) {
  const qc = useQueryClient()
  const isEdit = !!editing

  const [form, setForm] = useState<FieldFormState>(EMPTY_FORM)

  useEffect(() => {
    if (editing) {
      setForm({
        label_name:       editing.label_name,
        field_key:        editing.field_key,
        field_key_locked: true,
        field_type:       editing.field_type,
        section:          editing.section || 'general',
        placeholder:      editing.placeholder ?? '',
        required:         editing.required === true || (editing.required as unknown) == 1,
        status:           editing.status === true || (editing.status as unknown) == 1,
        values:           parseValuesToLines(editing.options),
        conditions:       Array.isArray(editing.conditions) ? editing.conditions : [],
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [editing])

  const set = <K extends keyof FieldFormState>(k: K, v: FieldFormState[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  // Auto-generate field_key from label_name unless user has manually edited it
  const handleLabelNameChange = (val: string) => {
    setForm(f => ({
      ...f,
      label_name: val,
      field_key: f.field_key_locked ? f.field_key : toFieldKey(val),
    }))
  }

  const handleFieldKeyChange = (val: string) => {
    setForm(f => ({ ...f, field_key: val, field_key_locked: val.length > 0 }))
  }

  const hasOptions = ['dropdown', 'radio'].includes(form.field_type)

  const saveMutation = useMutation({
    mutationFn: () => {
      const optionsArr = hasOptions ? buildOptionsArray(form.values) : []
      const payload = {
        label_name:    form.label_name.trim(),
        field_key:     form.field_key.trim(),
        field_type:    form.field_type,
        section:       form.section.trim() || 'general',
        placeholder:   form.placeholder.trim() || undefined,
        required:      form.required,
        options:       optionsArr.length > 0 ? JSON.stringify(optionsArr) : undefined,
        conditions:    form.conditions.length > 0 ? form.conditions : null,
        ...(isEdit && { status: form.status }),
      }
      return isEdit
        ? crmService.updateLeadField(editing!.id, payload)
        : crmService.createLeadField(payload as Parameters<typeof crmService.createLeadField>[0])
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Field updated' : 'Field created')
      qc.invalidateQueries({ queryKey: ['crm-lead-fields'] })
      qc.invalidateQueries({ queryKey: ['crm-labels'] })
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to save field')
    },
  })

  const canSave = form.label_name.trim().length > 0 && form.field_key.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-indigo-600" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
                <Settings2 size={16} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {isEdit ? 'Edit Field' : 'New Lead Field'}
                </h2>
                {isEdit && (
                  <code className="text-[11px] text-slate-400 font-mono">{editing?.field_key}</code>
                )}
                {!isEdit && (
                  <p className="text-xs text-slate-400">Add a dynamic field to the lead form</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[72vh] overflow-y-auto">

          {/* Field Name */}
          <div>
            <label className="label">Field Name <span className="text-red-500">*</span></label>
            <input
              autoFocus
              className="input w-full"
              value={form.label_name}
              onChange={e => handleLabelNameChange(e.target.value)}
              placeholder="e.g. Business Revenue"
            />
          </div>

          {/* Field Key */}
          <div>
            <label className="label">
              Field Key <span className="text-red-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(unique identifier, auto-generated)</span>
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1 font-mono text-sm"
                value={form.field_key}
                onChange={e => handleFieldKeyChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="e.g. business_revenue"
                disabled={isEdit}
              />
            </div>
            {/* Common key suggestions (only on create) */}
            {!isEdit && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {KNOWN_FIELD_KEYS.map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, field_key: k, field_key_locked: true }))}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full border font-mono transition-colors',
                      form.field_key === k
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Field Type */}
            <div>
              <label className="label">Field Type <span className="text-red-500">*</span></label>
              <select
                className="input w-full"
                value={form.field_type}
                onChange={e => set('field_type', e.target.value)}
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="label">Section</label>
              <input
                list="section-options"
                className="input w-full"
                value={form.section}
                onChange={e => set('section', e.target.value)}
                placeholder="e.g. owner"
              />
              <datalist id="section-options">
                {sectionOptions.map(s => (
                  <option key={s} value={s}>{humanizeSection(s)}</option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Placeholder */}
          <div>
            <label className="label">
              Placeholder <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              className="input w-full"
              value={form.placeholder}
              onChange={e => set('placeholder', e.target.value)}
              placeholder="Hint text shown inside the empty field"
            />
          </div>

          {/* Options (Dropdown / Radio) */}
          {hasOptions && (
            <div>
              <label className="label">Options</label>
              <textarea
                className="input w-full resize-none font-mono text-sm"
                rows={4}
                value={form.values}
                onChange={e => set('values', e.target.value)}
                placeholder={"Option 1\nOption 2\nOption 3"}
              />
              <p className="text-[11px] text-slate-400 mt-1">One option per line</p>
            </div>
          )}

          {/* Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <p className="text-sm font-medium text-slate-700">Required field</p>
              <Toggle enabled={form.required} onToggle={() => set('required', !form.required)} />
            </div>
            {isEdit && (
              <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <p className="text-sm font-medium text-slate-700">Active</p>
                <Toggle enabled={form.status} onToggle={() => set('status', !form.status)} />
              </div>
            )}
          </div>

          {/* Conditions Builder */}
          <ConditionsBuilder
            conditions={form.conditions}
            onChange={c => set('conditions', c)}
            availableFields={allFields}
            currentFieldId={editing?.id}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Field'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CrmLeadFields() {
  const qc = useQueryClient()
  const { setDescription } = useCrmHeader()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CrmLabel | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [dragId, setDragId]         = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const dragItemRef                  = useRef<number | null>(null)
  const pendingOrder                 = useRef<number[] | null>(null)
  const [localOrder, setLocalOrder]  = useState<CrmLabel[] | null>(null)

  useEffect(() => {
    setDescription('Manage dynamic fields shown on the lead create / edit form')
    return () => setDescription(undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { setPage(1) }, [search])

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: allFields, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['crm-labels'],
    queryFn: async () => {
      const res = await crmService.getLeadFields()
      const raw: CrmLabel[] = res.data?.data ?? res.data ?? []
      return raw.sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
    },
    staleTime: 0,
  })

  const sectionOptions = useMemo(() => {
    const set = new Set(DEFAULT_SECTIONS)
    allFields?.forEach(f => { if (f.section) set.add(f.section) })
    return Array.from(set)
  }, [allFields])

  const baseList: CrmLabel[] = (allFields ?? []).slice()
  const sorted = localOrder ?? baseList

  const filtered = sorted.filter(f =>
    !search ||
    f.label_name.toLowerCase().includes(search.toLowerCase()) ||
    f.field_key.toLowerCase().includes(search.toLowerCase())
  )
  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['crm-lead-fields'] })
    qc.invalidateQueries({ queryKey: ['crm-labels'] })
  }

  const toggleMutation = useMutation({
    mutationFn: (f: CrmLabel) =>
      crmService.updateLeadField(f.id, { status: !f.status }),
    onSuccess: () => { toast.success('Field updated'); invalidate() },
    onError: () => toast.error('Failed to update field'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteLeadField(id),
    onSuccess: () => { toast.success('Field deleted'); setLocalOrder(null); invalidate() },
    onError: () => toast.error('Failed to delete field'),
  })

  const moveMutation = useMutation({
    mutationFn: (ids: number[]) => crmService.updateCrmLabelOrder(ids),
    onSuccess: () => { setLocalOrder(null); invalidate() },
    onError: () => {
      setLocalOrder(null)
      pendingOrder.current = null
      toast.error('Failed to reorder — order has been reset')
    },
  })

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: number) => {
    dragItemRef.current = id; setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(targetId)
    if (dragItemRef.current === null || dragItemRef.current === targetId) return
    setLocalOrder(prev => {
      const arr = [...(prev ?? baseList)]
      const fromIdx = arr.findIndex(f => f.id === dragItemRef.current)
      const toIdx   = arr.findIndex(f => f.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [moved] = arr.splice(fromIdx, 1); arr.splice(toIdx, 0, moved)
      pendingOrder.current = arr.map(f => f.id); return arr
    })
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (pendingOrder.current?.length) moveMutation.mutate(pendingOrder.current)
  }
  const handleDragEnd = () => {
    setDragId(null); setDragOverId(null); dragItemRef.current = null
  }

  const openAdd  = () => { setEditing(null); setShowModal(true) }
  const openEdit = (f: CrmLabel) => { setEditing(f); setShowModal(true) }

  const handleDelete = async (f: CrmLabel) => {
    if (await confirmDelete(f.label_name)) deleteMutation.mutate(f.id)
  }

  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 flex-wrap gap-2 items-center">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="input pl-9 pr-8 h-9 text-sm"
              placeholder="Search fields…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => refetch()} disabled={isFetching}
            className="btn-ghost btn-sm p-2 h-9 w-9" title="Refresh">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={15} /> Add Field
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-wrapper bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-2">
            {isLoading ? 'Loading…' : `${total} field${total !== 1 ? 's' : ''}`}
            <span className="text-slate-300">·</span>
            <GripVertical size={12} className="text-slate-300" />
            <span className="text-slate-400">Drag to reorder</span>
          </span>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Updating…
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10" />
                <th>Field</th>
                <th className="hidden md:table-cell">Type</th>
                <th className="hidden lg:table-cell">Section</th>
                <th className="hidden sm:table-cell">Required</th>
                <th className="hidden xl:table-cell">Conditions</th>
                <th>Status</th>
                <th className="w-px whitespace-nowrap !text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 0 ? 24 : '60%' }} /></td>
                  ))}</tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <Settings2 size={22} className="text-slate-300 opacity-60" />
                      </div>
                      <p className="font-medium text-slate-500">
                        {search ? 'No fields match your search' : 'No lead fields yet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {search ? 'Try a different search term' : 'Click "Add Field" to create your first dynamic lead field'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map(f => {
                const active     = f.status === true || (f.status as unknown) == 1
                const isDragging = dragId === f.id
                const isDragOver = dragOverId === f.id && dragId !== f.id
                const hasConditions = Array.isArray(f.conditions) && f.conditions.length > 0

                return (
                  <tr
                    key={f.id}
                    draggable
                    onDragStart={e => handleDragStart(e, f.id)}
                    onDragOver={e => handleDragOver(e, f.id)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'group select-none transition-colors duration-100',
                      isDragging ? 'opacity-40 bg-slate-50' : '',
                      isDragOver ? 'bg-indigo-50/70 outline outline-1 outline-indigo-300' : '',
                    )}
                  >
                    <td className="w-10">
                      <GripVertical size={16}
                        className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing transition-colors" />
                    </td>
                    <td>
                      <p className="text-sm font-semibold text-slate-900">{f.label_name}</p>
                      <code className="text-[11px] text-slate-400 font-mono">{f.field_key}</code>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                        {typeLabel(f.field_type)}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className="text-sm text-slate-500">{humanizeSection(f.section)}</span>
                    </td>
                    <td className="hidden sm:table-cell">
                      {(f.required === true || (f.required as unknown) == 1) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <Check size={11} /> Required
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Optional</span>
                      )}
                    </td>
                    <td className="hidden xl:table-cell">
                      {hasConditions ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {f.conditions!.length} rule{f.conditions!.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleMutation.mutate(f)}
                        disabled={toggleMutation.isPending}
                        title="Click to toggle"
                      >
                        <Badge variant={active ? 'green' : 'gray'}>
                          {active ? <><Check size={10} /> Active</> : 'Inactive'}
                        </Badge>
                      </button>
                    </td>
                    <td className="w-px whitespace-nowrap">
                      <RowActions actions={[
                        {
                          label: 'Edit', icon: <Pencil size={12} />, variant: 'edit',
                          onClick: () => openEdit(f),
                        },
                        {
                          label: 'Delete', icon: <Trash2 size={12} />, variant: 'delete',
                          onClick: () => handleDelete(f),
                          disabled: deleteMutation.isPending,
                        },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!isLoading && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={PER_PAGE} onPageChange={setPage} />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <FieldModal
          editing={editing}
          allFields={allFields ?? []}
          sectionOptions={sectionOptions}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
