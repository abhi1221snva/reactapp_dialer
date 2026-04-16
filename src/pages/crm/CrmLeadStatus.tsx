import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, Search, Tag, X, Check,
  GripVertical, Globe, Zap, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { RowActions } from '../../components/ui/RowActions'
import { Badge } from '../../components/ui/Badge'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import type { LeadStatus } from '../../types/crm.types'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_COLOR = '#6366F1'
const PER_PAGE = 15

const PRESET_COLORS = [
  '#EF4444', // Red
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#F97316', // Orange
  '#8B5CF6', // Purple
  '#EAB308', // Yellow
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#64748B', // Gray
]

const WEBHOOK_METHODS = ['POST', 'GET', 'PUT', 'PATCH']

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

type LeadStatusExt = LeadStatus & {
  color_code?: string
  show_on_dashboard?: number | string
  vector_image?: string
  webhook_status?: number | string
  webhook_method?: string
  webhook_url?: string
  webhook_token?: string
}

function getColor(s: LeadStatusExt) {
  return s.color_code ?? s.color ?? '#E5E7EB'
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
    const delta = 2
    const range: (number | '...')[] = []
    let prev = 0
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - delta && p <= page + delta)) {
        if (prev && p - prev > 1) range.push('...')
        range.push(p)
        prev = p
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
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="First page">
          <ChevronsLeft size={14} />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="Previous page">
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 py-1 text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                'min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors',
                p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="Next page">
          <ChevronRight size={14} />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="Last page">
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
interface FormState {
  title: string
  lead_title_url: string
  color_code: string
  display_order: string
  vector_image: string
  webhook_status: string
  webhook_method: string
  webhook_url: string
  webhook_token: string
}

const EMPTY_FORM: FormState = {
  title: '', lead_title_url: '',
  color_code: DEFAULT_COLOR, display_order: '0',
  vector_image: 'fa-th',
  webhook_status: '0', webhook_method: 'POST',
  webhook_url: '', webhook_token: '',
}

function StatusModal({
  editing, onClose, onSaved,
}: {
  editing?: LeadStatusExt | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [autoSlug, setAutoSlug] = useState(!isEdit)
  const [form, setForm] = useState<FormState>(
    editing ? {
      title: editing.lead_title,
      lead_title_url: editing.lead_title_url,
      color_code: getColor(editing),
      display_order: String(editing.display_order ?? 0),
      vector_image: editing.vector_image ?? 'fa-th',
      webhook_status: String(editing.webhook_status ?? '0'),
      webhook_method: editing.webhook_method ?? 'POST',
      webhook_url: editing.webhook_url ?? '',
      webhook_token: editing.webhook_token ?? '',
    } : EMPTY_FORM
  )

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.lead_title,
        lead_title_url: editing.lead_title_url,
        color_code: getColor(editing),
        display_order: String(editing.display_order ?? 0),
        vector_image: editing.vector_image ?? 'fa-th',
        webhook_status: String(editing.webhook_status ?? '0'),
        webhook_method: editing.webhook_method ?? 'POST',
        webhook_url: editing.webhook_url ?? '',
        webhook_token: editing.webhook_token ?? '',
      })
      setAutoSlug(false)
    } else {
      setForm(EMPTY_FORM)
      setAutoSlug(true)
    }
  }, [editing])

  const set = (k: keyof FormState, v: string) =>
    setForm(f => {
      const u = { ...f, [k]: v }
      if (k === 'title' && autoSlug) u.lead_title_url = slugify(v)
      return u
    })

  const webhookEnabled = form.webhook_status === '1'

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        lead_title_url: form.lead_title_url.trim(),
        color_code: form.color_code,
        display_order: Number(form.display_order),
        vector_image: form.vector_image.trim() || 'fa-th',
        webhook_status: Number(form.webhook_status),
        webhook_method: form.webhook_method,
        webhook_url: form.webhook_url.trim(),
        webhook_token: form.webhook_token.trim(),
      }
      return isEdit
        ? crmService.updateLeadStatus(editing!.id, payload)
        : crmService.createLeadStatus({
            title: payload.title as string,
            lead_title_url: payload.lead_title_url as string,
            color_code: payload.color_code as string,
            display_order: payload.display_order as number,
            ...payload,
          })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Status updated' : 'Status created')
      qc.invalidateQueries({ queryKey: ['lead-statuses-all'] })
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to save status')
    },
  })

  const canSave = form.title.trim().length > 0 && form.lead_title_url.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1" style={{ background: form.color_code }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: form.color_code + '18', border: `2px solid ${form.color_code}33` }}
              >
                <span className="w-4 h-4 rounded-full" style={{ background: form.color_code }} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {isEdit ? 'Edit Lead Status' : 'New Lead Status'}
                </h2>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">
                  {form.title || 'Enter a status name below'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[68vh] overflow-y-auto">

          {/* Basic Info */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Basic Information</p>

            <div className="form-group">
              <label className="label">Lead Status Title <span className="text-red-500">*</span></label>
              <input
                autoFocus
                className="input w-full"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Qualified, Contacted, Closed Won"
              />
            </div>

            <div className="form-group">
              <label className="label">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color_code', c)} title={c}
                    className={`w-9 h-9 rounded-lg transition-transform hover:scale-110 ${
                      form.color_code === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-md' : 'shadow-sm border border-black/10'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* Webhook */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Webhook Configuration</p>

            <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Zap size={15} className="text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Webhook Status</p>
                  <p className="text-xs text-slate-400">Fire a webhook when this status is assigned</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => set('webhook_status', webhookEnabled ? '0' : '1')}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  webhookEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  webhookEnabled ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {webhookEnabled && (
              <div className="space-y-3 pl-1">
                <div className="form-group">
                  <label className="label">Webhook Method</label>
                  <div className="flex gap-2">
                    {WEBHOOK_METHODS.map(m => (
                      <button key={m} type="button" onClick={() => set('webhook_method', m)}
                        className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition-colors ${
                          form.webhook_method === m
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label"><Globe size={12} className="inline mr-1" />Webhook URL</label>
                  <input className="input w-full font-mono text-sm" value={form.webhook_url}
                    onChange={e => set('webhook_url', e.target.value)}
                    placeholder="https://your-endpoint.com/webhook" type="url" />
                </div>

                <div className="form-group">
                  <label className="label">Webhook Token</label>
                  <input className="input w-full font-mono text-sm" value={form.webhook_token}
                    onChange={e => set('webhook_token', e.target.value)}
                    placeholder="Optional bearer token / secret" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3">
          <button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}
            className="btn-success flex items-center gap-2 disabled:opacity-50">
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Status'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CrmLeadStatus() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<LeadStatusExt | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Drag state
  const [dragId, setDragId]       = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const dragItemRef  = useRef<number | null>(null)
  const pendingOrder = useRef<number[] | null>(null)   // always-current ordered IDs

  // Dashboard toggle state (local, optimistic)
  const [dashboardToggles, setDashboardToggles] = useState<Record<number, boolean>>({})

  useEffect(() => { setPage(1) }, [search])

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: allStatuses, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['lead-statuses-all'],
    queryFn: () => crmService.getAllLeadStatuses(),
    staleTime: 0,
  })

  // localOrder is used during active drag sessions; cleared after save
  const [localOrder, setLocalOrder] = useState<LeadStatusExt[] | null>(null)

  // baseList is always sorted by display_order from the server data
  const baseList: LeadStatusExt[] = ((allStatuses as LeadStatusExt[] | undefined) ?? [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  // During drag, use localOrder as-is (no re-sort) so rows stay in the dragged position
  const sorted = localOrder ?? baseList

  // Sync dashboard toggles once data arrives
  useEffect(() => {
    if (allStatuses) {
      setDashboardToggles(prev => {
        const next: Record<number, boolean> = { ...prev }
        allStatuses.forEach(s => {
          if (!(s.id in next)) {
            next[s.id] = Number((s as LeadStatusExt).show_on_dashboard ?? 1) === 1
          }
        })
        return next
      })
    }
  }, [allStatuses])

  const filtered = sorted.filter(s =>
    !search || s.lead_title.toLowerCase().includes(search.toLowerCase())
  )
  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['lead-statuses-all'] })

  const toggleStatusMutation = useMutation({
    mutationFn: (s: LeadStatus) => crmService.toggleLeadStatus(s.id, Number(s.status) === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Status updated'); invalidate() },
    onError: () => toast.error('Failed to update status'),
  })

  const toggleDashboardMutation = useMutation({
    mutationFn: ({ id, val }: { id: number; val: boolean }) => {
      const s = (allStatuses as LeadStatusExt[] | undefined)?.find(st => st.id === id)
      // Cast to raw so we can read the un-mapped fields preserved by getLeadStatuses
      const raw = s as Record<string, unknown> | undefined
      return crmService.updateLeadStatus(id, {
        // Mirror the exact same fields the StatusModal sends so the endpoint accepts it
        title:          raw?.title ?? s?.lead_title ?? '',
        lead_title_url: s?.lead_title_url ?? '',
        color_code:     s ? getColor(s as LeadStatusExt) : DEFAULT_COLOR,
        display_order:  s?.display_order ?? 0,
        vector_image:   (raw?.vector_image as string) ?? 'fa-th',
        webhook_status: Number(raw?.webhook_status ?? 0),
        webhook_method: (raw?.webhook_method as string) ?? 'POST',
        webhook_url:    (raw?.webhook_url as string) ?? '',
        webhook_token:  (raw?.webhook_token as string) ?? '',
        show_on_dashboard: val ? 1 : 0,
      })
    },
    onSuccess: () => { invalidate() },
    onError: (_, vars) => {
      // revert optimistic toggle
      setDashboardToggles(prev => ({ ...prev, [vars.id]: !vars.val }))
      toast.error('Failed to update')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteLeadStatus(id),
    onSuccess: () => { toast.success('Status deleted'); setLocalOrder(null); invalidate() },
    onError: () => toast.error('Failed to delete status'),
  })

  const moveMutation = useMutation({
    mutationFn: (ids: number[]) => crmService.updateLeadStatusOrder(ids),
    onSuccess: () => { setLocalOrder(null); invalidate() },
    onError: () => {
      setLocalOrder(null)
      pendingOrder.current = null
      toast.error('Failed to reorder — order has been reset')
    },
  })

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: number) => {
    dragItemRef.current = id
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(targetId)
    if (dragItemRef.current === null || dragItemRef.current === targetId) return

    setLocalOrder(prev => {
      const arr = [...(prev ?? baseList)]
      const fromIdx = arr.findIndex(s => s.id === dragItemRef.current)
      const toIdx   = arr.findIndex(s => s.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      // sync to ref so handleDrop always reads the latest
      pendingOrder.current = arr.map(s => s.id)
      return arr
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (pendingOrder.current && pendingOrder.current.length > 0) {
      moveMutation.mutate(pendingOrder.current)
    }
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
    dragItemRef.current = null
    // don't null pendingOrder — handleDrop might still need it
  }

  const handleDashboardToggle = (id: number) => {
    const next = !dashboardToggles[id]
    setDashboardToggles(prev => ({ ...prev, [id]: next }))
    toggleDashboardMutation.mutate({ id, val: next })
  }

  const openAdd  = () => { setEditing(null); setShowModal(true) }
  const openEdit = (s: LeadStatusExt) => { setEditing(s); setShowModal(true) }

  const handleDelete = async (s: LeadStatusExt) => {
    if (await confirmDelete(s.lead_title)) deleteMutation.mutate(s.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Header Toolbar ── */}
      <div className="lt">
        <div className="lt-title">
          <h1>Lead Status</h1>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, background: '#f1f5f9', padding: '1px 7px', borderRadius: 8, lineHeight: '16px' }}>
            {isLoading ? '…' : total}
          </span>
        </div>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input
            type="text"
            value={search}
            placeholder="Search statuses…"
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1) }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => refetch()} disabled={isFetching} className="lt-b" title="Refresh">
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="lt-b lt-g">
            <Plus size={13} /> Add Status
          </button>
        </div>
      </div>
      <div className="lt-accent lt-accent-green" />

      {/* ── Table wrapper ── */}
      <div className="table-wrapper bg-white" style={{ marginTop: 8 }}>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th className="w-8 px-2" />
                <th className="text-xs">Title</th>
                <th className="text-xs w-24">Status</th>
                <th className="text-xs w-16 !text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="py-1.5"><div className="h-3 bg-slate-200 rounded animate-pulse" style={{ width: j === 0 ? 16 : '50%' }} /></td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                        <Tag size={18} className="text-slate-300 opacity-60" />
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        {search ? 'No statuses match your search' : 'No statuses yet'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {search ? 'Try a different search term' : 'Click "Add Status" to create your first pipeline stage'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(s => {
                  const active    = Number(s.status) === 1
                  const color     = getColor(s)
                  const isDragging = dragId === s.id
                  const isDragOver = dragOverId === s.id && dragId !== s.id

                  return (
                    <tr
                      key={s.id}
                      draggable
                      onDragStart={e => handleDragStart(e, s.id)}
                      onDragOver={e => handleDragOver(e, s.id)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'group select-none transition-colors duration-100',
                        isDragging  ? 'opacity-40 bg-slate-50' : '',
                        isDragOver  ? 'bg-indigo-50/70 outline outline-1 outline-indigo-300' : '',
                      )}
                    >
                      {/* Drag handle */}
                      <td className="w-8 px-2">
                        <GripVertical size={14}
                          className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing transition-colors" />
                      </td>

                      {/* Title */}
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="text-xs font-semibold text-slate-900 truncate">{s.lead_title}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-1.5 w-24">
                        <button
                          onClick={() => toggleStatusMutation.mutate(s)}
                          disabled={toggleStatusMutation.isPending}
                          title="Click to toggle"
                        >
                          <Badge variant={active ? 'green' : 'gray'}>
                            {active ? <><Check size={9} /> Active</> : 'Inactive'}
                          </Badge>
                        </button>
                      </td>

                      {/* Action */}
                      <td className="w-16 py-1.5">
                        <RowActions actions={[
                          {
                            label: 'Edit',
                            icon: <Pencil size={12} />,
                            variant: 'edit',
                            onClick: () => openEdit(s),
                          },
                          {
                            label: 'Delete',
                            icon: <Trash2 size={12} />,
                            variant: 'delete',
                            onClick: () => handleDelete(s),
                            disabled: deleteMutation.isPending,
                          },
                        ]} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={PER_PAGE}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <StatusModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
