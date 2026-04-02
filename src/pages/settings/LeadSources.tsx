import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Globe, Save, X, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { leadSourceService } from '../../services/leadSource.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime } from '../../utils/format'
import { RowActions } from '../../components/ui/RowActions'

interface LeadSourceItem {
  id: number
  source_title: string
  url: string
  unique_id?: string | number
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function LeadSourceModal({
  source,
  onClose,
  onSaved,
}: {
  source: LeadSourceItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [sourceTitle, setSourceTitle] = useState(source?.source_title ?? '')
  const [url, setUrl] = useState(source?.url ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const saveMutation = useMutation({
    mutationFn: () =>
      source
        ? leadSourceService.update(source.id, { url: url.trim(), source_title: sourceTitle.trim() })
        : leadSourceService.create({ url: url.trim(), source_title: sourceTitle.trim() }),
    onSuccess: () => {
      toast.success(source ? 'Lead source updated' : 'Lead source created')
      onSaved()
    },
    onError: () => toast.error(source ? 'Failed to update lead source' : 'Failed to create lead source'),
  })

  const isValid = sourceTitle.trim().length > 0 && url.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">
            {source ? 'Edit Lead Source' : 'New Lead Source'}
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
            placeholder="e.g. Facebook, Google Ads, Referral"
            value={sourceTitle}
            onChange={e => setSourceTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">URL *</label>
          <input
            className="input"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && isValid) saveMutation.mutate() }}
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

// ─── Main page ────────────────────────────────────────────────────────────────
export function LeadSources() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showCreate, setShowCreate] = useState(false)
  const [editSource, setEditSource] = useState<LeadSourceItem | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lead-sources'] })

  const columns: Column<LeadSourceItem>[] = [
    {
      key: 'source_title',
      header: 'Source Title',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Globe size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{row.source_title}</span>
        </div>
      ),
    },
    {
      key: 'url',
      header: 'URL',
      render: (row) => (
        <span className="text-sm text-slate-600 truncate max-w-[300px] block">{row.url || '—'}</span>
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
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => setEditSource(row),
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      {(showCreate || editSource) && (
        <LeadSourceModal
          source={editSource}
          onClose={() => { setShowCreate(false); setEditSource(null) }}
          onSaved={() => { setShowCreate(false); setEditSource(null); invalidate() }}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate('/')} className="btn-ghost p-1.5 rounded-lg">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title">Lead Sources</h1>
              <p className="page-subtitle">Manage where your leads come from</p>
            </div>
          </div>
        </div>

        <ServerDataTable<LeadSourceItem>
          queryKey={['lead-sources']}
          queryFn={(params) => leadSourceService.list(params)}
          dataExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            const nested = r?.data?.data
            if (Array.isArray(nested)) return nested
            const flat = r?.data
            return Array.isArray(flat) ? flat : []
          }}
          totalExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.total ?? r?.data?.data?.length ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search lead sources…"
          emptyText="No lead sources found"
          emptyIcon={<Globe size={40} />}
          search={table.search}
          onSearchChange={table.setSearch}
          activeFilters={table.filters}
          onFilterChange={table.setFilter}
          onResetFilters={table.resetFilters}
          hasActiveFilters={table.hasActiveFilters}
          page={table.page}
          limit={table.limit}
          onPageChange={table.setPage}
          headerActions={
            <button onClick={() => { setEditSource(null); setShowCreate(true) }} className="btn-primary">
              <Plus size={15} /> Add Lead Source
            </button>
          }
        />
      </div>
    </>
  )
}
