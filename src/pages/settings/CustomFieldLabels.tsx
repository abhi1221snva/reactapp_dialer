import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Settings2, Save, X, Eye, Link2, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { customFieldLabelService } from '../../services/customFieldLabel.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { capFirst } from '../../utils/cn'
import { useDialerHeader } from '../../layouts/DialerLayout'

interface FieldLabelItem {
  id: number
  title: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

interface FieldValueItem {
  id: number
  custom_id: number
  title_match: string
  title_links?: string
  user_id?: number
  created_at?: string
  [key: string]: unknown
}

// ─── Label Modal ──────────────────────────────────────────────────────────────
function FieldLabelModal({
  label,
  onClose,
  onSaved,
}: {
  label: FieldLabelItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(label?.title ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const saveMutation = useMutation({
    mutationFn: () =>
      label
        ? customFieldLabelService.update(label.id, { title: title.trim() })
        : customFieldLabelService.create({ title: title.trim() }),
    onSuccess: () => {
      toast.success(label ? 'Field label updated' : 'Field label created')
      onSaved()
    },
    onError: () => toast.error(label ? 'Failed to update' : 'Failed to create'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">
            {label ? 'Edit Field Label' : 'New Field Label'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">Title *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Phone Number, Address"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && title.trim()) saveMutation.mutate() }}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!title.trim() || saveMutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Values Panel ─────────────────────────────────────────────────────────────
function ValuesPanel({
  label,
  onClose,
}: {
  label: FieldLabelItem
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [newMatch, setNewMatch] = useState('')
  const [newLink, setNewLink] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editMatch, setEditMatch] = useState('')
  const [editLink, setEditLink] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['field-values', label.id],
    queryFn: () => customFieldLabelService.getValuesByLabel(label.id),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (data as any)?.data?.data ?? (data as any)?.data
  const values: FieldValueItem[] = Array.isArray(raw) ? raw : (raw ? [raw] : [])

  const addMutation = useMutation({
    mutationFn: () =>
      customFieldLabelService.createValue({
        custom_id: label.id,
        title_match: newMatch.trim(),
        title_links: newLink.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Value added')
      setNewMatch('')
      setNewLink('')
      refetch()
    },
    onError: () => toast.error('Failed to add value'),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      customFieldLabelService.updateValue(editId!, {
        title_match: editMatch.trim(),
        title_links: editLink.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Value updated')
      setEditId(null)
      refetch()
    },
    onError: () => toast.error('Failed to update value'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customFieldLabelService.deleteValue(id),
    onSuccess: () => { toast.success('Value deleted'); refetch() },
    onError: () => toast.error('Failed to delete value'),
  })

  const startEdit = (v: FieldValueItem) => {
    setEditId(v.id)
    setEditMatch(v.title_match)
    setEditLink(v.title_links || '')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">Values for "{label.title}"</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage field values</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Add new */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="Value name"
              value={newMatch}
              onChange={e => setNewMatch(e.target.value)}
            />
            <input
              className="input flex-1 text-sm"
              placeholder="Link (optional)"
              value={newLink}
              onChange={e => setNewLink(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newMatch.trim()) addMutation.mutate() }}
            />
            <button
              onClick={() => addMutation.mutate()}
              disabled={!newMatch.trim() || addMutation.isPending}
              className="btn-primary text-sm px-3"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))
          ) : values.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No values yet</p>
          ) : (
            values.map(v => (
              <div key={v.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 hover:border-slate-200 bg-white">
                {editId === v.id ? (
                  <>
                    <input
                      className="input flex-1 text-sm py-1"
                      value={editMatch}
                      onChange={e => setEditMatch(e.target.value)}
                    />
                    <input
                      className="input flex-1 text-sm py-1"
                      value={editLink}
                      onChange={e => setEditLink(e.target.value)}
                      placeholder="Link"
                    />
                    <button onClick={() => updateMutation.mutate()} disabled={!editMatch.trim()} className="text-emerald-600 hover:text-emerald-700 p-1">
                      <Save size={14} />
                    </button>
                    <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-800 font-medium truncate">{v.title_match}</span>
                    {v.title_links && (
                      <span className="text-xs text-indigo-500 truncate max-w-[150px] flex items-center gap-1">
                        <Link2 size={10} /> {v.title_links}
                      </span>
                    )}
                    <button onClick={() => startEdit(v)} className="text-slate-400 hover:text-indigo-600 p-1">
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirmDelete(v.title_match)) deleteMutation.mutate(v.id)
                      }}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline text-sm px-5">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function CustomFieldLabels() {
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showCreate, setShowCreate] = useState(false)
  const [editLabel, setEditLabel] = useState<FieldLabelItem | null>(null)
  const [viewValues, setViewValues] = useState<FieldLabelItem | null>(null)
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search field labels…" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => { setEditLabel(null); setShowCreate(true) }} className="lt-b lt-p">
            <Plus size={13} /> Add Field Label
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['custom-field-labels'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customFieldLabelService.delete(id),
    onSuccess: () => { toast.success('Field label deleted'); invalidate() },
    onError: () => toast.error('Failed to delete field label'),
  })

  const columns: Column<FieldLabelItem>[] = [
    {
      key: 'title',
      header: 'Label Title', sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Settings2 size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{capFirst(row.title)}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.created_at ? formatDateTime(row.created_at as string) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'Values',
            icon: <Eye size={13} />,
            variant: 'view',
            onClick: () => setViewValues(row),
          },
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => setEditLabel(row),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(row.title)) deleteMutation.mutate(row.id)
            },
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      {(showCreate || editLabel) && (
        <FieldLabelModal
          label={editLabel}
          onClose={() => { setShowCreate(false); setEditLabel(null) }}
          onSaved={() => { setShowCreate(false); setEditLabel(null); invalidate() }}
        />
      )}
      {viewValues && (
        <ValuesPanel
          label={viewValues}
          onClose={() => setViewValues(null)}
        />
      )}

      <div className="space-y-3">
        <ServerDataTable<FieldLabelItem>
          queryKey={['custom-field-labels']}
          queryFn={(params) => customFieldLabelService.list(params)}
          dataExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.data?.data ?? r?.data?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.data?.total_rows ?? r?.data?.total_rows ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search field labels…"
          emptyText="No custom field labels found"
          emptyIcon={<Settings2 size={40} />}
          search={table.search}
          onSearchChange={table.setSearch}
          activeFilters={table.filters}
          onFilterChange={table.setFilter}
          onResetFilters={table.resetFilters}
          hasActiveFilters={table.hasActiveFilters}
          page={table.page}
          limit={table.limit}
          onPageChange={table.setPage}
          hideToolbar
        />
      </div>
    </>
  )
}
