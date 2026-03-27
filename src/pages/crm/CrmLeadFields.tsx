import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, Search, X, Check,
  GripVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw,
  Settings2, ListOrdered, Sparkles, ChevronDown, ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { RowActions } from '../../components/ui/RowActions'
import { Badge } from '../../components/ui/Badge'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import type { CrmLabel, ValidationRule } from '../../types/crm.types'

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
  { value: 'ssn',          label: 'SSN' },
]

// ── Structured sections ────────────────────────────────────────────────────────
// NOTE: 'Documents / Verification' intentionally excluded from the create/edit
// dropdown. Existing records that carry this section still display correctly via
// SECTION_MAP and humanizeSection() below.
const STRUCTURED_SECTIONS = [
  { value: 'owner',     label: 'Owner Information' },
  { value: 'business',  label: 'Business Information' },
  { value: 'funding',   label: 'Funding Information' },
  { value: 'contact',   label: 'Contact Information' },
  { value: 'financial', label: 'Financial Information' },
  { value: 'custom',    label: 'Custom Fields' },
]

const SECTION_MAP: Record<string, string> = {
  owner:        'Owner Information',
  business:     'Business Information',
  funding:      'Funding Information',
  contact:      'Contact Information',
  financial:    'Financial Information',
  documents:    'Documents / Verification',
  custom:       'Custom Fields',
  // legacy
  second_owner: 'Second Owner',
  general:      'General Information',
  other:        'Other',
  address:      'Address',
}

function typeLabel(t: string) {
  return FIELD_TYPES.find(f => f.value === t)?.label ?? t
}

function humanizeSection(key: string): string {
  return SECTION_MAP[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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

// ── Validation Rule Definitions ────────────────────────────────────────────────
interface RuleDef {
  value: string
  label: string
  hasValue: boolean
  hasValue2?: boolean
  valueLabel?: string
  value2Label?: string
  valueType?: 'number' | 'text'
}

// NOTE: 'required' is intentionally excluded — required status is controlled by
// the dedicated "Required field" toggle + "Apply To" scope, not inline rules.
const RULE_DEFINITIONS: RuleDef[] = [
  { value: 'nullable',       label: 'Nullable',          hasValue: false },
  { value: 'numeric',        label: 'Numeric',           hasValue: false },
  { value: 'integer',        label: 'Integer',           hasValue: false },
  { value: 'email',          label: 'Email',             hasValue: false },
  { value: 'url',            label: 'URL',               hasValue: false },
  { value: 'date',           label: 'Date',              hasValue: false },
  { value: 'alpha',          label: 'Letters Only',      hasValue: false },
  { value: 'alpha_num',      label: 'Letters & Numbers', hasValue: false },
  { value: 'alpha_spaces',   label: 'Letters & Spaces',  hasValue: false },
  { value: 'min',            label: 'Min Length',        hasValue: true,  valueLabel: 'Chars', valueType: 'number' },
  { value: 'max',            label: 'Max Length',        hasValue: true,  valueLabel: 'Chars', valueType: 'number' },
  { value: 'digits',         label: 'Exact Digits',      hasValue: true,  valueLabel: 'Count', valueType: 'number' },
  { value: 'digits_between', label: 'Digits Between',    hasValue: true, hasValue2: true, valueLabel: 'Min', value2Label: 'Max', valueType: 'number' },
  { value: 'min_value',      label: 'Min Value',         hasValue: true,  valueLabel: 'Value', valueType: 'number' },
  { value: 'max_value',      label: 'Max Value',         hasValue: true,  valueLabel: 'Value', valueType: 'number' },
  { value: 'before',         label: 'Before Date',       hasValue: true,  valueLabel: 'Date (e.g. today)', valueType: 'text' },
  { value: 'after',          label: 'After Date',        hasValue: true,  valueLabel: 'Date (e.g. today)', valueType: 'text' },
  { value: 'in',             label: 'In List',           hasValue: true,  valueLabel: 'Values (comma-sep)', valueType: 'text' },
  { value: 'regex',          label: 'Regex',             hasValue: true,  valueLabel: 'Pattern (e.g. /^[A-Z]+$/)', valueType: 'text' },
]

const RULE_DEF_MAP: Record<string, RuleDef> = Object.fromEntries(
  RULE_DEFINITIONS.map(r => [r.value, r])
)

// ── Apply To Options ──────────────────────────────────────────────────────────
const APPLY_TO_OPTIONS = [
  { value: '',          label: 'All Forms',      desc: 'Shown on affiliate, merchant, and system forms' },
  { value: 'affiliate', label: 'Affiliate Only', desc: 'Shown only on the affiliate apply form' },
  { value: 'merchant',  label: 'Merchant Only',  desc: 'Shown only on the merchant portal form' },
  { value: 'both',      label: 'Both',           desc: 'Shown on both affiliate and merchant forms' },
]

// ── Field Form State ───────────────────────────────────────────────────────────
interface FieldFormState {
  label_name:       string
  field_type:       string
  section:          string
  placeholder:      string
  required_in:      string[]  // per-context required: [] | ['system'] | ['affiliate'] | ['merchant'] | combinations
  apply_to:         string    // '' | 'affiliate' | 'merchant' | 'both'
  status:           boolean
  values:           string    // one option per line, for dropdown/radio
  validation_rules: ValidationRule[]
}

const EMPTY_FORM: FieldFormState = {
  label_name:       '',
  field_type:       'text',
  section:          'owner',
  placeholder:      '',
  required_in:      [],
  apply_to:         '',
  status:           true,
  values:           '',
  validation_rules: [],
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

// ── Validation Rule Row ────────────────────────────────────────────────────────
function RuleRow({
  rule, index, onChange, onRemove,
}: {
  rule: ValidationRule
  index: number
  onChange: (idx: number, updated: ValidationRule) => void
  onRemove: (idx: number) => void
}) {
  const def = RULE_DEF_MAP[rule.rule]
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg border border-slate-200 bg-white group hover:border-indigo-200">
      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md min-w-[90px]">
        {def?.label ?? rule.rule}
      </span>
      {def?.hasValue && (
        <input
          className="input h-7 text-xs w-24 flex-shrink-0 py-0"
          type={def.valueType === 'number' ? 'number' : 'text'}
          placeholder={def.valueLabel ?? 'value'}
          value={rule.value ?? ''}
          onChange={e => {
            const v = def.valueType === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
            onChange(index, { ...rule, value: v as string | number })
          }}
        />
      )}
      {def?.hasValue2 && (
        <input
          className="input h-7 text-xs w-20 flex-shrink-0 py-0"
          type="number"
          placeholder={def.value2Label ?? 'max'}
          value={rule.value2 ?? ''}
          onChange={e => {
            const v = e.target.value === '' ? '' : Number(e.target.value)
            onChange(index, { ...rule, value2: v as string | number })
          }}
        />
      )}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="ml-auto p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
        title="Remove rule"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ── Add Rule Dropdown ──────────────────────────────────────────────────────────
function AddRuleDropdown({ existing, onAdd }: {
  existing: ValidationRule[]
  onAdd: (rule: ValidationRule) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const existingRules = new Set(existing.map(r => r.rule))

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-400 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 transition-colors"
      >
        <Plus size={12} /> Add Rule <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[180px] max-h-56 overflow-y-auto">
          {RULE_DEFINITIONS.map(def => {
            const disabled = existingRules.has(def.value)
            return (
              <button
                key={def.value}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onAdd({ rule: def.value })
                  setOpen(false)
                }}
                className={cn(
                  'w-full text-left px-3.5 py-1.5 text-xs transition-colors',
                  disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700',
                )}
              >
                {def.label}
                {disabled && <span className="ml-1 text-[10px] text-slate-300">(added)</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Field Modal ───────────────────────────────────────────────────────────────
interface FieldModalProps {
  editing?: CrmLabel | null
  onClose: () => void
  onSaved: () => void
}

function parseValidationRules(raw?: ValidationRule[] | null): ValidationRule[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return []
}

function FieldModal({ editing, onClose, onSaved }: FieldModalProps) {
  const qc = useQueryClient()
  const isEdit = !!editing

  const [form, setForm] = useState<FieldFormState>(EMPTY_FORM)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a ref to the latest form so timer callbacks always read fresh state
  const formRef = useRef(form)
  formRef.current = form

  useEffect(() => {
    if (editing) {
      const parsed = parseValidationRules(editing.validation_rules)
      // Resolve required_in: use stored array if present, else derive from legacy required bool
      const storedRequiredIn = editing.required_in
      let resolvedRequiredIn: string[]
      if (Array.isArray(storedRequiredIn) && storedRequiredIn.length > 0) {
        resolvedRequiredIn = storedRequiredIn as string[]
      } else if (typeof (storedRequiredIn as unknown) === 'string' && (storedRequiredIn as unknown as string).trim() !== '') {
        // Backend returns required_in as a raw JSON string from the DB
        try {
          const parsed = JSON.parse(storedRequiredIn as unknown as string)
          resolvedRequiredIn = Array.isArray(parsed) ? parsed : []
        } catch {
          resolvedRequiredIn = []
        }
      } else if (storedRequiredIn === null || storedRequiredIn === undefined) {
        // Legacy fallback: if required=true and no required_in, treat as "all contexts"
        const legacyRequired = editing.required === true || (editing.required as unknown) == 1
        resolvedRequiredIn = legacyRequired ? ['system', 'affiliate', 'merchant'] : []
      } else {
        resolvedRequiredIn = []
      }

      setForm({
        label_name:       editing.label_name,
        field_type:       editing.field_type,
        section:          editing.section || 'owner',
        placeholder:      editing.placeholder ?? '',
        required_in:      resolvedRequiredIn,
        apply_to:         editing.apply_to ?? '',
        status:           editing.status === true || (editing.status as unknown) == 1,
        values:           parseValuesToLines(editing.options),
        validation_rules: parsed,
      })
      // Auto-suggest for existing fields that have no rules yet
      if (parsed.length === 0 && editing.label_name.trim()) {
        runSuggest(editing.label_name, editing.field_type, false)
      }
    } else {
      setForm(EMPTY_FORM)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const set = <K extends keyof FieldFormState>(k: K, v: FieldFormState[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  /** Core suggest logic — reads label/type args directly (no stale closure) */
  const runSuggest = async (labelName: string, fieldType: string, overwrite: boolean) => {
    if (!labelName.trim()) return
    const fieldKey = labelName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    try {
      setIsSuggesting(true)
      const res = await crmService.suggestValidation({ field_key: fieldKey, label_name: labelName, field_type: fieldType })
      const suggested: ValidationRule[] = res.data?.data ?? []
      if (suggested.length === 0) return
      setForm(f => ({
        ...f,
        validation_rules: (overwrite || f.validation_rules.length === 0) ? suggested : f.validation_rules,
      }))
      if (overwrite) toast.success(`${suggested.length} validation rule${suggested.length !== 1 ? 's' : ''} suggested`)
    } catch (err) {
      console.error('Validation suggest error:', err)
      if (overwrite) toast.error('Could not fetch suggestions')
    } finally {
      setIsSuggesting(false)
    }
  }

  // Debounced auto-suggest on label name change (300ms)
  const handleLabelChange = (value: string) => {
    set('label_name', value)
    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    suggestTimer.current = setTimeout(() => {
      runSuggest(value, formRef.current.field_type, false)
    }, 300)
  }

  // Manual "Auto-suggest" button — always overwrites
  const triggerSuggest = () => runSuggest(form.label_name, form.field_type, true)

  const updateRule = (idx: number, updated: ValidationRule) =>
    setForm(f => {
      const arr = [...f.validation_rules]; arr[idx] = updated; return { ...f, validation_rules: arr }
    })

  const removeRule = (idx: number) =>
    setForm(f => ({ ...f, validation_rules: f.validation_rules.filter((_, i) => i !== idx) }))

  const addRule = (rule: ValidationRule) =>
    setForm(f => ({ ...f, validation_rules: [...f.validation_rules, rule] }))

  const hasOptions = ['dropdown', 'radio'].includes(form.field_type)

  const saveMutation = useMutation({
    mutationFn: () => {
      const optionsArr = hasOptions ? buildOptionsArray(form.values) : []
      const payload = {
        label_name:       form.label_name.trim(),
        field_type:       form.field_type,
        section:          form.section || 'owner',
        placeholder:      form.placeholder.trim() || undefined,
        required_in:      form.required_in,
        apply_to:         (form.apply_to || null) as 'affiliate' | 'merchant' | 'both' | null,
        options:          optionsArr.length > 0 ? JSON.stringify(optionsArr) : undefined,
        validation_rules: form.validation_rules.length > 0 ? form.validation_rules : undefined,
        ...(isEdit && { status: form.status }),
      }
      return isEdit
        ? crmService.updateLeadField(editing!.id, payload)
        : crmService.createLeadField(payload)
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

  const canSave = form.label_name.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
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
                <p className="text-xs text-slate-400">
                  {isEdit ? `Editing "${editing!.label_name}"` : 'Add a dynamic field to the lead form'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[76vh] overflow-y-auto">

          {/* Field Name */}
          <div>
            <label className="label">Field Name <span className="text-red-500">*</span></label>
            <input
              autoFocus
              className="input w-full"
              value={form.label_name}
              onChange={e => handleLabelChange(e.target.value)}
              placeholder="e.g. Business Revenue"
            />
          </div>

          {/* ── Validation Rules ───────────────────────────────────────────── */}
          <div className="rounded-xl border border-indigo-200 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-indigo-500" />
                <span className="text-xs font-semibold text-slate-700">Validation Rules</span>
                {form.validation_rules.length > 0 && (
                  <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.5">
                    {form.validation_rules.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={triggerSuggest}
                disabled={isSuggesting || !form.label_name.trim()}
                className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-400 bg-amber-50 hover:bg-amber-100 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-40"
                title="Auto-suggest rules based on field name"
              >
                {isSuggesting
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Sparkles size={11} />
                }
                Auto-suggest
              </button>
            </div>

            {/* Rules list */}
            <div className="px-3 py-3 space-y-1.5">
              {form.validation_rules.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">
                  No rules set — type a field name to auto-suggest, or add manually
                </p>
              ) : (
                form.validation_rules.map((rule, idx) => (
                  <RuleRow
                    key={`${rule.rule}-${idx}`}
                    rule={rule}
                    index={idx}
                    onChange={updateRule}
                    onRemove={removeRule}
                  />
                ))
              )}
              {/* Add Rule button removed — use Auto-suggest to populate rules */}
            </div>
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
              <label className="label">Section <span className="text-red-500">*</span></label>
              <select
                className="input w-full"
                value={form.section}
                onChange={e => set('section', e.target.value)}
              >
                {STRUCTURED_SECTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
                {isEdit && editing?.section && !STRUCTURED_SECTIONS.find(s => s.value === editing.section) && (
                  <option value={editing.section}>{humanizeSection(editing.section)}</option>
                )}
              </select>
            </div>
          </div>

          {/* Apply To */}
          <div>
            <label className="label">
              Apply To
              <span className="text-slate-400 font-normal ml-1">(form visibility &amp; required scope)</span>
            </label>
            <select
              className="input w-full"
              value={form.apply_to}
              onChange={e => set('apply_to', e.target.value)}
            >
              {APPLY_TO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
              ))}
            </select>
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

          {/* Options (Dropdown / Radio only) */}
          {hasOptions && (
            <div>
              <label className="label">Options <span className="text-red-500">*</span></label>
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

          {/* Required In */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="px-3.5 pt-3 pb-2.5">
              <p className="text-sm font-medium text-slate-700">Required In</p>
              <p className="text-xs text-slate-400 mt-0.5">Select which forms must have this field filled in</p>
            </div>
            <div className="flex items-center gap-5 px-3.5 pb-3">
              {([ ['system', 'System (CRM)'], ['affiliate', 'Affiliate'], ['merchant', 'Merchant'] ] as [string, string][]).map(([ctx, lbl]) => (
                <label key={ctx} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.required_in.includes(ctx)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...form.required_in, ctx]
                        : form.required_in.filter(k => k !== ctx)
                      set('required_in', next)
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs font-medium text-slate-700">{lbl}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            {isEdit && (
              <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <div>
                  <p className="text-sm font-medium text-slate-700">Active</p>
                  <p className="text-xs text-slate-400">Inactive fields are hidden from forms</p>
                </div>
                <Toggle enabled={form.status} onToggle={() => set('status', !form.status)} />
              </div>
            )}
          </div>
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

// ── Reorder Modal ─────────────────────────────────────────────────────────────
// Shows ALL fields (no pagination) grouped by section, with drag-and-drop
// reordering within each section.  On save the new order is persisted via
// POST /crm/lead-fields/reorder which updates display_order for every field
// in one DB transaction — the same order is then used everywhere in the system.
interface ReorderModalProps {
  allFields: CrmLabel[]
  onClose: () => void
  onSaved: () => void
}

function ReorderModal({ allFields, onClose, onSaved }: ReorderModalProps) {
  const qc = useQueryClient()

  // Derive canonical section order from data: sort sections by the minimum
  // display_order of their fields so the list reflects the current sequence.
  const sectionKeys = useMemo(() => {
    const minOrder: Record<string, number> = {}
    allFields.forEach(f => {
      const key = f.section || 'general'
      const ord = Number(f.display_order) || 9999
      if (!(key in minOrder) || ord < minOrder[key]) minOrder[key] = ord
    })
    return Object.keys(minOrder).sort((a, b) => minOrder[a] - minOrder[b])
  }, [allFields])

  // Per-section ordered arrays — initialised from current display_order
  const [sections, setSections] = useState<Record<string, CrmLabel[]>>(() => {
    const map: Record<string, CrmLabel[]> = {}
    const sorted = [...allFields].sort(
      (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
    )
    sorted.forEach(f => {
      const key = f.section || 'general'
      if (!map[key]) map[key] = []
      map[key].push(f)
    })
    return map
  })

  const dragRef  = useRef<{ section: string; id: number } | null>(null)
  const [dragOver, setDragOver] = useState<{ section: string; id: number } | null>(null)

  const handleDragStart = (section: string, id: number, e: React.DragEvent) => {
    dragRef.current = { section, id }
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, section: string, targetId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver({ section, id: targetId })
    if (!dragRef.current || dragRef.current.section !== section) return
    if (dragRef.current.id === targetId) return
    setSections(prev => {
      const arr  = [...(prev[section] ?? [])]
      const from = arr.findIndex(f => f.id === dragRef.current!.id)
      const to   = arr.findIndex(f => f.id === targetId)
      if (from === -1 || to === -1) return prev
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return { ...prev, [section]: arr }
    })
  }

  const handleDragEnd = () => { dragRef.current = null; setDragOver(null) }

  const saveMutation = useMutation({
    mutationFn: () => {
      // Flatten all sections in canonical order → single ordered ID array
      const ids = sectionKeys.flatMap(s => (sections[s] ?? []).map(f => f.id))
      return crmService.reorderLeadFields(ids)
    },
    onSuccess: () => {
      toast.success('Field order saved')
      qc.invalidateQueries({ queryKey: ['crm-labels'] })
      qc.invalidateQueries({ queryKey: ['crm-lead-fields'] })
      onSaved()
    },
    onError: () => toast.error('Failed to save order'),
  })

  const totalFields = sectionKeys.reduce((n, s) => n + (sections[s]?.length ?? 0), 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* accent bar */}
        <div className="h-1 bg-indigo-600 flex-shrink-0" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
              <ListOrdered size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Reorder Fields</h2>
              <p className="text-xs text-slate-400">
                {totalFields} fields · {sectionKeys.length} sections · drag within a section to reorder
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body — all sections */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {sectionKeys.map(sKey => (
            <div key={sKey}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  {humanizeSection(sKey)}
                </span>
                <span className="text-xs text-slate-400">
                  ({sections[sKey]?.length ?? 0})
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Draggable field rows */}
              <div className="space-y-1">
                {(sections[sKey] ?? []).map(f => {
                  const isDragging = dragRef.current?.id === f.id
                  const isOver = dragOver?.section === sKey && dragOver?.id === f.id
                               && dragRef.current?.id !== f.id
                  return (
                    <div
                      key={f.id}
                      draggable
                      onDragStart={e => handleDragStart(sKey, f.id, e)}
                      onDragOver={e => handleDragOver(e, sKey, f.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border',
                        'cursor-grab active:cursor-grabbing select-none transition-colors',
                        isDragging ? 'opacity-40 bg-slate-50 border-slate-200'
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30',
                        isOver ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-300' : '',
                      )}
                    >
                      <GripVertical size={14} className="text-slate-300 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-800 flex-1 truncate">
                        {f.label_name}
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">
                        {typeLabel(f.field_type)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><Check size={14} /> Save Order</>}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <span className="ml-auto text-xs text-slate-400">
            Order is applied system-wide on save
          </span>
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
  const [sectionFilter, setSectionFilter] = useState('')

  const [showReorder, setShowReorder] = useState(false)

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

  useEffect(() => { setPage(1) }, [search, sectionFilter])

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

  const baseList: CrmLabel[] = (allFields ?? []).slice()
  const sorted = localOrder ?? baseList

  const filtered = sorted.filter(f => {
    const matchSearch = !search ||
      f.label_name.toLowerCase().includes(search.toLowerCase())
    const matchSection = !sectionFilter || f.section === sectionFilter
    return matchSearch && matchSection
  })

  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Distinct sections present in data (for filter dropdown)
  const presentSections = useMemo(() => {
    const seen = new Set<string>()
    allFields?.forEach(f => { if (f.section) seen.add(f.section) })
    return Array.from(seen)
  }, [allFields])

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
      setLocalOrder(null); pendingOrder.current = null
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
          {/* Search */}
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
          {/* Section filter */}
          {presentSections.length > 1 && (
            <select
              className="input h-9 text-sm min-w-[170px]"
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
            >
              <option value="">All Sections</option>
              {presentSections.map(s => (
                <option key={s} value={s}>{humanizeSection(s)}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => refetch()} disabled={isFetching}
            className="btn-ghost btn-sm p-2 h-9 w-9" title="Refresh">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowReorder(true)}
            disabled={!allFields?.length}
            className="btn-outline flex items-center gap-1.5 h-9 text-sm disabled:opacity-40"
            title="Reorder all fields section-by-section"
          >
            <ListOrdered size={15} /> Reorder Fields
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
                <th>Field Name</th>
                <th className="hidden md:table-cell">Type</th>
                <th className="hidden lg:table-cell">Section</th>
                <th className="hidden xl:table-cell">Validation</th>
                <th className="hidden sm:table-cell">Required</th>
                <th className="hidden lg:table-cell">Apply To</th>
                <th>Status</th>
                <th className="w-px whitespace-nowrap !text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 0 ? 24 : '60%' }} /></td>
                  ))}</tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <Settings2 size={22} className="text-slate-300 opacity-60" />
                      </div>
                      <p className="font-medium text-slate-500">
                        {search || sectionFilter ? 'No fields match your filters' : 'No lead fields yet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {search || sectionFilter ? 'Try a different search or section' : 'Click "Add Field" to create your first dynamic lead field'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map(f => {
                const active     = f.status === true || (f.status as unknown) == 1
                const isDragging = dragId === f.id
                const isDragOver = dragOverId === f.id && dragId !== f.id

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
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                        {typeLabel(f.field_type)}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {humanizeSection(f.section)}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell">
                      {(() => {
                        let vr = f.validation_rules
                        if (typeof (vr as unknown) === 'string' && (vr as unknown as string).trim() !== '') {
                          try { vr = JSON.parse(vr as unknown as string) } catch { vr = [] }
                        }
                        return Array.isArray(vr) && vr.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={10} />
                            {vr.length} rule{vr.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )
                      })()}
                    </td>
                    <td className="hidden sm:table-cell">
                      {(() => {
                        // required_in may come back from the API as a JSON string
                        // (raw DB value) instead of a parsed array — normalise it first.
                        let ri: string[] | null | undefined = f.required_in
                        if (typeof (ri as unknown) === 'string' && (ri as unknown as string).trim() !== '') {
                          try { ri = JSON.parse(ri as unknown as string) } catch { ri = [] }
                        }

                        if (Array.isArray(ri) && ri.length > 0) {
                          const labels: Record<string, string> = { system: 'CRM', affiliate: 'Aff', merchant: 'Mer' }
                          return (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                              <Check size={11} /> {ri.map(k => labels[k] ?? k).join(', ')}
                            </span>
                          )
                        }
                        if (ri === null || ri === undefined) {
                          // Legacy fallback: show based on required boolean
                          return (f.required === true || (f.required as unknown) == 1) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                              <Check size={11} /> All (legacy)
                            </span>
                          ) : <span className="text-xs text-slate-400">Optional</span>
                        }
                        return <span className="text-xs text-slate-400">Optional</span>
                      })()}
                    </td>
                    <td className="hidden lg:table-cell">
                      {f.apply_to === 'affiliate' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Affiliate
                        </span>
                      )}
                      {f.apply_to === 'merchant' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                          Merchant
                        </span>
                      )}
                      {f.apply_to === 'both' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Both
                        </span>
                      )}
                      {!f.apply_to && (
                        <span className="text-xs text-slate-400">All Forms</span>
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

      {/* Create / Edit modal */}
      {showModal && (
        <FieldModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}

      {/* Reorder modal — loads ALL fields, no pagination, section-wise D&D */}
      {showReorder && allFields && (
        <ReorderModal
          allFields={allFields}
          onClose={() => setShowReorder(false)}
          onSaved={() => setShowReorder(false)}
        />
      )}
    </div>
  )
}
