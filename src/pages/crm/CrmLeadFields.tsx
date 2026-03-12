import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, Search, X, Check,
  GripVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw,
  Settings2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { RowActions } from '../../components/ui/RowActions'
import { Badge } from '../../components/ui/Badge'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import type { CrmLabel } from '../../types/crm.types'

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

// ── Structured sections (Task 3) ───────────────────────────────────────────────
const STRUCTURED_SECTIONS = [
  { value: 'owner',     label: 'Owner Information' },
  { value: 'business',  label: 'Business Information' },
  { value: 'funding',   label: 'Funding Information' },
  { value: 'contact',   label: 'Contact Information' },
  { value: 'financial', label: 'Financial Information' },
  { value: 'documents', label: 'Documents / Verification' },
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

// ── Field Form State ───────────────────────────────────────────────────────────
interface FieldFormState {
  label_name:  string
  field_type:  string
  section:     string
  placeholder: string
  required:    boolean
  status:      boolean
  values:      string  // one option per line, for dropdown/radio
}

const EMPTY_FORM: FieldFormState = {
  label_name:  '',
  field_type:  'text',
  section:     'owner',
  placeholder: '',
  required:    false,
  status:      true,
  values:      '',
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

// ── Field Modal ───────────────────────────────────────────────────────────────
interface FieldModalProps {
  editing?: CrmLabel | null
  onClose: () => void
  onSaved: () => void
}

function FieldModal({ editing, onClose, onSaved }: FieldModalProps) {
  const qc = useQueryClient()
  const isEdit = !!editing

  const [form, setForm] = useState<FieldFormState>(EMPTY_FORM)

  useEffect(() => {
    if (editing) {
      setForm({
        label_name:  editing.label_name,
        field_type:  editing.field_type,
        section:     editing.section || 'owner',
        placeholder: editing.placeholder ?? '',
        required:    editing.required === true || (editing.required as unknown) == 1,
        status:      editing.status === true || (editing.status as unknown) == 1,
        values:      parseValuesToLines(editing.options),
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [editing])

  const set = <K extends keyof FieldFormState>(k: K, v: FieldFormState[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const hasOptions = ['dropdown', 'radio'].includes(form.field_type)

  const saveMutation = useMutation({
    mutationFn: () => {
      const optionsArr = hasOptions ? buildOptionsArray(form.values) : []
      const payload = {
        label_name:  form.label_name.trim(),
        field_type:  form.field_type,
        section:     form.section || 'owner',
        placeholder: form.placeholder.trim() || undefined,
        required:    form.required,
        options:     optionsArr.length > 0 ? JSON.stringify(optionsArr) : undefined,
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
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Field Name */}
          <div>
            <label className="label">Field Name <span className="text-red-500">*</span></label>
            <input
              autoFocus
              className="input w-full"
              value={form.label_name}
              onChange={e => set('label_name', e.target.value)}
              placeholder="e.g. Business Revenue"
            />
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
                {/* Show legacy section if editing a field that has one */}
                {isEdit && editing?.section && !STRUCTURED_SECTIONS.find(s => s.value === editing.section) && (
                  <option value={editing.section}>{humanizeSection(editing.section)}</option>
                )}
              </select>
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

          {/* Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <div>
                <p className="text-sm font-medium text-slate-700">Required field</p>
                <p className="text-xs text-slate-400">Agent must fill this before saving</p>
              </div>
              <Toggle enabled={form.required} onToggle={() => set('required', !form.required)} />
            </div>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CrmLeadFields() {
  const qc = useQueryClient()
  const { setDescription } = useCrmHeader()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CrmLabel | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sectionFilter, setSectionFilter] = useState('')

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
                <th className="hidden sm:table-cell">Required</th>
                <th>Status</th>
                <th className="w-px whitespace-nowrap !text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 0 ? 24 : '60%' }} /></td>
                  ))}</tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7}>
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
                    <td className="hidden sm:table-cell">
                      {(f.required === true || (f.required as unknown) == 1) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <Check size={11} /> Required
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Optional</span>
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
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
