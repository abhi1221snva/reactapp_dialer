import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, Search, Tag, X, Check, ChevronDown, ChevronUp, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { RowActions } from '../../components/ui/RowActions'
import { Badge } from '../../components/ui/Badge'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import type { DocumentType } from '../../components/crm/CrmDocumentTypesManager'
import { parseValues } from '../../components/crm/CrmDocumentTypesManager'

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function serializeValues(tags: string[]): string {
  return JSON.stringify(tags)
}

// ── Tag input ─────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')

  function add() {
    const val = input.trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }

  return (
    <div className="rounded-lg border border-slate-200 p-2 flex flex-wrap gap-1.5 min-h-[38px] bg-white focus-within:border-indigo-400 transition-colors">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:text-red-500 transition-colors">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={add}
        placeholder={tags.length === 0 ? 'Type and press Enter to add values (e.g. January, February…)' : 'Add more…'}
        className="flex-1 min-w-[140px] text-xs outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
      />
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
interface ModalProps {
  editing?: DocumentType | null
  onClose: () => void
  onSaved: () => void
}

function DocTypeModal({ editing, onClose, onSaved }: ModalProps) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [title, setTitle] = useState(editing?.title ?? '')
  const [tags,  setTags]  = useState<string[]>(parseValues(editing?.values))

  useEffect(() => {
    setTitle(editing?.title ?? '')
    setTags(parseValues(editing?.values))
  }, [editing])

  const saveMut = useMutation({
    mutationFn: () =>
      isEdit
        ? crmService.updateDocumentType(editing!.id, { title: title.trim(), values: serializeValues(tags) })
        : crmService.createDocumentType({ title: title.trim(), values: serializeValues(tags) }),
    onSuccess: () => {
      toast.success(isEdit ? 'Document type updated' : 'Document type added')
      qc.invalidateQueries({ queryKey: ['document-types'] })
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to save document type')
    },
  })

  const canSave = title.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 border-2 border-indigo-100">
                <Tag size={18} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{isEdit ? 'Edit Document Type' : 'New Document Type'}</h2>
                <p className="text-xs text-slate-400">{title || 'Enter a type name below'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="form-group">
            <label className="label">Type Name <span className="text-red-500">*</span></label>
            <input
              autoFocus
              className="input w-full"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Bank Statement"
              onKeyDown={e => e.key === 'Enter' && canSave && saveMut.mutate()}
            />
          </div>

          <div className="form-group">
            <label className="label">
              Sub-values{' '}
              <span className="text-slate-400 font-normal">(optional — e.g. months for Bank Statement)</span>
            </label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={() => saveMut.mutate()}
            disabled={!canSave || saveMut.isPending}
            className="btn-success flex items-center gap-2 disabled:opacity-50"
          >
            {saveMut.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Type'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CrmDocumentTypes() {
  const qc = useQueryClient()
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<DocumentType | null>(null)
  const [search, setSearch]         = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [page, setPage]             = useState(1)

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const res = await crmService.getDocumentTypes()
      return (res.data?.data ?? res.data ?? []) as DocumentType[]
    },
    staleTime: 0,
  })

  const types = data ?? []

  const filtered   = types.filter(dt =>
    !search || dt.title.toLowerCase().includes(search.toLowerCase())
  )
  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['document-types'] })

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 0 | 1 }) =>
      crmService.toggleDocumentTypeStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); invalidate() },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => crmService.deleteDocumentType(id),
    onSuccess: () => { toast.success('Document type deleted'); invalidate() },
    onError: () => toast.error('Failed to delete type'),
  })

  const openAdd  = () => { setEditing(null); setShowModal(true) }
  const openEdit = (dt: DocumentType) => { setEditing(dt); setShowModal(true) }
  const handleDelete = async (dt: DocumentType) => {
    if (await confirmDelete(dt.title)) deleteMut.mutate(dt.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── .lt Toolbar ── */}
      <div className="lt">
        <div className="lt-title">
          <h1>Document Types</h1>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, background: '#f1f5f9', padding: '1px 7px', borderRadius: 8, lineHeight: '16px' }}>
            {isLoading ? '…' : total}
          </span>
        </div>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input
            type="text"
            value={search}
            placeholder="Search document types…"
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
            <Plus size={13} /> Add Type
          </button>
        </div>
      </div>
      <div className="lt-accent lt-accent-green" />

      {/* ── Table ── */}
      <div className="table-wrapper bg-white" style={{ marginTop: 8 }}>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Type Name</th>
                <th className="hidden sm:table-cell">Sub-values</th>
                <th>Status</th>
                <th className="w-px whitespace-nowrap !text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j}><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 0 ? '50%' : '60%' }} /></td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : total === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                        <Tag size={20} className="text-slate-300 opacity-60" />
                      </div>
                      <p className="font-medium text-slate-500">
                        {search ? 'No types match your search' : 'No document types yet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {search ? 'Try a different search term' : 'Click "Add Type" to create your first document category'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(dt => {
                  const isActive = String(dt.status) === '1'
                  const tags     = parseValues(dt.values)
                  const expanded = expandedId === dt.id

                  return (
                    <tr key={dt.id} className={cn(!isActive && 'opacity-60')}>
                      {/* Type name */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-100">
                            <Tag size={14} className="text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{dt.title}</p>
                          </div>
                        </div>
                      </td>

                      {/* Sub-values */}
                      <td className="hidden sm:table-cell">
                        {tags.length === 0 ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap gap-1">
                              {(expanded ? tags : tags.slice(0, 3)).map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                                  {tag}
                                </span>
                              ))}
                              {!expanded && tags.length > 3 && (
                                <span className="text-xs text-slate-400">+{tags.length - 3} more</span>
                              )}
                            </div>
                            {tags.length > 3 && (
                              <button
                                onClick={() => setExpandedId(expanded ? null : dt.id)}
                                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 w-fit"
                              >
                                {expanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Show all {tags.length}</>}
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <button
                          onClick={() => toggleMut.mutate({ id: dt.id, status: isActive ? 0 : 1 })}
                          disabled={toggleMut.isPending}
                          title="Click to toggle"
                        >
                          <Badge variant={isActive ? 'green' : 'gray'}>
                            {isActive ? <><Check size={10} /> Active</> : 'Inactive'}
                          </Badge>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="w-px whitespace-nowrap">
                        <RowActions actions={[
                          {
                            label: 'Edit',
                            icon: <Pencil size={13} />,
                            variant: 'edit',
                            onClick: () => openEdit(dt),
                          },
                          {
                            label: 'Delete',
                            icon: <Trash2 size={13} />,
                            variant: 'delete',
                            onClick: () => handleDelete(dt),
                            disabled: deleteMut.isPending,
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
          <Pagination page={page} totalPages={totalPages} total={total} limit={PER_PAGE} onPageChange={setPage} />
        )}

        {/* Footer hint */}
        {!isLoading && total > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-400">
              Only <strong className="text-slate-600">active</strong> types appear in the upload dropdown on lead pages.
              Sub-values (e.g. months) show as a second selector when uploading.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <DocTypeModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
