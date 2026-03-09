import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X, Check, SlidersHorizontal, Search,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw,
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
function FieldModal({
  editing, onClose, onSaved,
}: {
  editing?: CrmLabel | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [name, setName] = useState(editing?.title ?? '')

  useEffect(() => { setName(editing?.title ?? '') }, [editing])

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? crmService.updateCrmLabel(editing!.id, { title: name.trim() })
        : crmService.createCrmLabel({
            title: name.trim(),
            data_type: 'text',
            heading_type: 'owner',
            required: 0,
            display_order: 0,
            edit_mode: 1,
          }),
    onSuccess: () => {
      toast.success(isEdit ? 'Field updated' : 'Field created')
      qc.invalidateQueries({ queryKey: ['crm-labels'] })
      onSaved()
    },
    onError: () => toast.error('Failed to save field'),
  })

  const canSave = name.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-indigo-600" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <SlidersHorizontal size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                {isEdit ? 'Edit Custom Field' : 'New Custom Field'}
              </h2>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="form-group">
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input
              autoFocus
              className="input w-full"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Business Revenue, Annual Income"
              onKeyDown={e => e.key === 'Enter' && canSave && saveMutation.mutate()}
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              This label will appear on every lead's detail panel.
            </p>
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
export function CrmCustomFields() {
  const qc = useQueryClient()
  const { setDescription } = useCrmHeader()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<CrmLabel | null>(null)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)

  useEffect(() => {
    setDescription('Build dynamic form fields that appear on every lead')
    return () => setDescription(undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { setPage(1) }, [search])

  const { data: rawData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['crm-labels'],
    queryFn: async () => {
      const res = await crmService.getCrmLabels()
      return (res.data?.data ?? res.data ?? []) as CrmLabel[]
    },
    staleTime: 0,
  })

  const allLabels: CrmLabel[] = (rawData ?? [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  const filtered   = allLabels.filter(l => !search || l.title.toLowerCase().includes(search.toLowerCase()))
  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // ── Mutations ──────────────────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: (l: CrmLabel) => {
      const current = l.status === 1 || l.status === '1' ? 1 : 0
      return crmService.toggleCrmLabel({ crm_label_id: l.id, status: current === 1 ? 0 : 1 })
    },
    onSuccess: () => { toast.success('Field updated'); qc.invalidateQueries({ queryKey: ['crm-labels'] }) },
    onError: () => toast.error('Failed to update field'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteCrmLabel(id),
    onSuccess: () => { toast.success('Field deleted'); qc.invalidateQueries({ queryKey: ['crm-labels'] }) },
    onError: () => toast.error('Failed to delete field'),
  })

  const handleDelete = async (l: CrmLabel) => {
    if (await confirmDelete(l.title)) deleteMutation.mutate(l.id)
  }

  const openAdd  = () => { setEditing(null); setShowModal(true) }
  const openEdit = (l: CrmLabel) => { setEditing(l); setShowModal(true) }

  return (
    <div className="space-y-3">

      {/* ── Toolbar (matches ServerDataTable layout) ── */}
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
        </div>

        {/* Right-side actions */}
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

      {/* ── Table wrapper ── */}
      <div className="table-wrapper bg-white">

        {/* Count bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
          <span className="text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading…' : `${total} record${total !== 1 ? 's' : ''}`}
          </span>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Updating…
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th className="w-px whitespace-nowrap !text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {[0, 1, 2].map(j => (
                        <td key={j}><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 0 ? '50%' : '30%' }} /></td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <SlidersHorizontal size={22} className="opacity-40" />
                      </div>
                      <p className="font-medium text-slate-500">
                        {search ? 'No fields match your search' : 'No custom fields yet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {search ? 'Try a different search term' : 'Click "Add Field" to create your first custom field'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(l => {
                  const active = l.status === 1 || l.status === '1'
                  return (
                    <tr key={l.id} className="group">
                      {/* Name */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <SlidersHorizontal size={13} className="text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-900">{l.title}</span>
                        </div>
                      </td>

                      {/* Status — display only, not editable */}
                      <td>
                        <Badge variant={active ? 'green' : 'gray'}>
                          {active ? <><Check size={10} /> Active</> : 'Inactive'}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="w-px whitespace-nowrap">
                        <RowActions actions={[
                          {
                            label: 'Edit',
                            icon: <Pencil size={12} />,
                            variant: 'edit',
                            onClick: () => openEdit(l),
                          },
                          {
                            label: 'Delete',
                            icon: <Trash2 size={12} />,
                            variant: 'delete',
                            onClick: () => handleDelete(l),
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
        <FieldModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
