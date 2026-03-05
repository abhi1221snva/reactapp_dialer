import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  GripVertical, Tag, Save, X, Check, ArrowLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { labelService } from '../../services/label.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime } from '../../utils/format'

interface LabelItem {
  id: number
  title: string
  status: number | null
  display_order: number | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

// ─── Inline modal for create / edit ───────────────────────────────────────────
function LabelModal({
  label,
  onClose,
  onSaved,
}: {
  label: LabelItem | null   // null = create mode
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(label?.title ?? '')
  // Default to Active (1) for new labels; use current status for edits (null treated as 1)
  const [status, setStatus] = useState<number>(label ? (Number(label.status ?? 1) === 1 ? 1 : 0) : 1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const saveMutation = useMutation({
    mutationFn: () =>
      label
        ? labelService.update(label.id, title.trim(), status, Number(label.status ?? 1) === 1 ? 1 : 0)
        : labelService.create(title.trim(), status),
    onSuccess: () => {
      toast.success(label ? 'Label updated' : 'Label created')
      onSaved()
    },
    onError: () => toast.error(label ? 'Failed to update label' : 'Failed to create label'),
  })

  const isValid = title.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">
            {label ? 'Edit Label' : 'New Label'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">Label Name *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Hot Lead, Callback, Not Interested"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && isValid) saveMutation.mutate() }}
          />
        </div>

        <div className="form-group">
          <label className="label">Status</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus(1)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors ${
                status === 1
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatus(0)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors ${
                status === 0
                  ? 'bg-slate-500 text-white border-slate-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
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

// ─── Drag-and-drop reorder panel ───────────────────────────────────────────────
function ReorderPanel({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [items, setItems] = useState<LabelItem[]>([])
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['labels-all'],
    queryFn: () => labelService.listAll(),
  })

  useEffect(() => {
    const raw = (data as { data?: { data?: LabelItem[] } })?.data?.data
    if (Array.isArray(raw)) {
      setItems([...raw].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)))
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => labelService.updateDisplayOrder(items.map(i => i.id)),
    onSuccess: () => {
      toast.success('Display order saved')
      onSaved()
    },
    onError: () => toast.error('Failed to save order'),
  })

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(targetId)
    if (dragId === null || dragId === targetId) return
    setItems(prev => {
      const arr = [...prev]
      const fromIdx = arr.findIndex(i => i.id === dragId)
      const toIdx = arr.findIndex(i => i.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr
    })
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">Reorder Labels</h3>
            <p className="text-xs text-slate-500 mt-0.5">Drag to change display order</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No labels found</p>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={e => handleDragStart(e, item.id)}
                onDragOver={e => handleDragOver(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none ${
                  dragId === item.id
                    ? 'opacity-40 bg-slate-50 border-slate-200'
                    : dragOverId === item.id
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <GripVertical size={16} className="text-slate-300 flex-shrink-0" />
                <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm text-slate-800 font-medium truncate">{item.title}</span>
                <Badge variant={Number(item.status) === 1 ? 'green' : 'gray'} className="flex-shrink-0">
                  {Number(item.status) === 1 ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={isLoading || items.length === 0 || saveMutation.isPending}
            className="btn-primary flex-1"
          >
            <Check size={14} />
            {saveMutation.isPending ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Labels page ──────────────────────────────────────────────────────────
export function Labels() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showCreate, setShowCreate] = useState(false)
  const [editLabel, setEditLabel] = useState<LabelItem | null>(null)
  const [showReorder, setShowReorder] = useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['labels'] })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      labelService.toggleStatus(id, Number(status) === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Status updated'); invalidate() },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => labelService.delete(id),
    onSuccess: () => { toast.success('Label deleted'); invalidate() },
    onError: () => toast.error('Failed to delete label'),
  })

  const columns: Column<LabelItem>[] = [
    {
      key: 'title',
      header: 'Label Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Tag size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{row.title}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={Number(row.status) === 1 ? 'green' : 'gray'}>
          {Number(row.status) === 1 ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'display_order',
      header: 'Order',
      render: (row) => (
        <span className="text-sm text-slate-500">
          {row.display_order ?? '—'}
        </span>
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
      header: '',
      headerClassName: 'w-px',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => setEditLabel(row)}
            className="btn-ghost btn-sm p-1.5"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => toggleMutation.mutate({ id: row.id, status: Number(row.status ?? 0) })}
            disabled={toggleMutation.isPending}
            className="btn-ghost btn-sm p-1.5 text-slate-500 hover:text-indigo-600"
            title={Number(row.status) === 1 ? 'Disable' : 'Enable'}
          >
            {Number(row.status) === 1
              ? <ToggleRight size={16} className="text-emerald-500" />
              : <ToggleLeft size={16} />}
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete label "${row.title}"?`)) deleteMutation.mutate(row.id)
            }}
            disabled={deleteMutation.isPending}
            className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      {/* Modals */}
      {(showCreate || editLabel) && (
        <LabelModal
          label={editLabel}
          onClose={() => { setShowCreate(false); setEditLabel(null) }}
          onSaved={() => { setShowCreate(false); setEditLabel(null); invalidate() }}
        />
      )}
      {showReorder && (
        <ReorderPanel
          onClose={() => setShowReorder(false)}
          onSaved={() => { setShowReorder(false); invalidate() }}
        />
      )}

      <div className="space-y-5">
        {/* Page header */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/settings')} className="btn-ghost p-2 rounded-lg mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="page-header">
              <div>
                <h1 className="page-title">Label Management</h1>
                <p className="page-subtitle">Manage lead labels and their display order</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReorder(true)}
                  className="btn-outline"
                >
                  <GripVertical size={15} />
                  Reorder
                </button>
                <button
                  onClick={() => { setEditLabel(null); setShowCreate(true) }}
                  className="btn-primary"
                >
                  <Plus size={15} />
                  New Label
                </button>
              </div>
            </div>
          </div>
        </div>

        <ServerDataTable<LabelItem>
          queryKey={['labels']}
          queryFn={(params) => labelService.list(params)}
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: LabelItem[] } }
            return r?.data?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { total?: number } }
            return r?.data?.total ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search labels by name…"
          filters={[
            {
              key: 'status', label: 'All Status', options: [
                { value: '1', label: 'Active' },
                { value: '0', label: 'Inactive' },
              ],
            },
          ]}
          emptyText="No labels found"
          emptyIcon={<Tag size={40} />}
          search={table.search}
          onSearchChange={table.setSearch}
          activeFilters={table.filters}
          onFilterChange={table.setFilter}
          onResetFilters={table.resetFilters}
          hasActiveFilters={table.hasActiveFilters}
          page={table.page}
          limit={table.limit}
          onPageChange={table.setPage}
        />
      </div>
    </>
  )
}
