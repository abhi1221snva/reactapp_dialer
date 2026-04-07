import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Globe, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { RowActions } from '../../components/ui/RowActions'
import { leadSourceService } from '../../services/leadSource.service'
import { showConfirm } from '../../utils/confirmDelete'
import { formatDateTime } from '../../utils/format'
import { capFirst } from '../../utils/cn'
import { useDialerHeader } from '../../layouts/DialerLayout'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadSourceItem {
  id: number
  source_title: string
  url: string
  status: number
  unique_id: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function LeadSourceModal({
  source,
  onClose,
  onSaved,
}: {
  source: LeadSourceItem | null // null = create mode
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(source?.source_title ?? '')
  const [url, setUrl] = useState(source?.url ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { source_title: title.trim(), url: url.trim() }
      if (source) {
        return leadSourceService.update(source.id, payload)
      }
      return leadSourceService.create(payload)
    },
    onSuccess: () => {
      toast.success(source ? 'Lead source updated' : 'Lead source created')
      onSaved()
    },
    onError: () => toast.error(source ? 'Failed to update' : 'Failed to create'),
  })

  const isValid = title.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">
            {source ? 'Edit Lead Source' : 'Add Lead Source'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">Source Title *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Google Ads, Referral, Facebook"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">URL</label>
          <input
            className="input"
            placeholder="https://example.com (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export function LeadSources() {
  const qc = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [editSource, setEditSource] = useState<LeadSourceItem | null>(null)
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-right" style={{ marginLeft: 'auto' }}>
          <button onClick={() => { setEditSource(null); setShowModal(true) }} className="lt-b lt-p">
            <Plus size={13} /> Add Lead Source
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  // Fetch lead sources from crm_lead_source table
  const { data, isLoading } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => leadSourceService.list(),
  })

  const sources: LeadSourceItem[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = data as any
    const d = r?.data?.data
    return Array.isArray(d) ? d : []
  })()

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadSourceService.delete(id),
    onSuccess: () => {
      toast.success('Lead source deleted')
      qc.invalidateQueries({ queryKey: ['lead-sources'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleDelete = async (row: LeadSourceItem) => {
    if (!await showConfirm({
      title: 'Delete Lead Source?',
      message: `Are you sure you want to delete "${row.source_title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    })) return
    deleteMutation.mutate(row.id)
  }

  const handleSaved = () => {
    setShowModal(false)
    setEditSource(null)
    qc.invalidateQueries({ queryKey: ['lead-sources'] })
  }

  const columns: Column<LeadSourceItem>[] = [
    {
      key: 'source_title',
      header: 'Title',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Globe size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{capFirst(row.source_title)}</span>
        </div>
      ),
    },
    {
      key: 'url',
      header: 'URL',
      render: (row) => (
        <span className="text-sm text-slate-600 truncate max-w-[300px] block">
          {row.url || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 1 ? 'green' : 'gray'}>
          {row.status === 1 ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span className="text-sm text-slate-500">
          {row.created_at ? formatDateTime(row.created_at) : '—'}
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
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => { setEditSource(row); setShowModal(true) },
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: () => handleDelete(row),
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      {showModal && (
        <LeadSourceModal
          source={editSource}
          onClose={() => { setShowModal(false); setEditSource(null) }}
          onSaved={handleSaved}
        />
      )}

      <div className="space-y-2">
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
          <DataTable
            columns={columns}
            data={sources}
            loading={isLoading}
            keyField="id"
            emptyText="No lead sources yet. Click 'Add Lead Source' to create one."
          />
        </div>
      </div>
    </>
  )
}
