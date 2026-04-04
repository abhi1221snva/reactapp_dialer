import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Globe, Save, X, Key, Copy, Check, List } from 'lucide-react'
import toast from 'react-hot-toast'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { RowActions } from '../../components/ui/RowActions'
import { leadSourceService } from '../../services/leadSource.service'
import { showConfirm } from '../../utils/confirmDelete'
import { useAuthStore } from '../../stores/auth.store'
import { formatDateTime } from '../../utils/format'
import { useDialerHeader } from '../../layouts/DialerLayout'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadSourceConfig {
  id: number
  api_key: string
  title: string
  description: string
  list_id: number
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

interface CrmList {
  id: number
  title?: string
  name?: string
  list_name?: string
  [key: string]: unknown
}

// ─── Generate UUID-like key ──────────────────────────────────────────────────

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = ''
  for (let i = 0; i < 30; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
  return key
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function LeadSourceModal({
  source,
  lists,
  onClose,
  onSaved,
}: {
  source: LeadSourceConfig | null // null = create mode
  lists: CrmList[]
  onClose: () => void
  onSaved: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const [title, setTitle] = useState(source?.title ?? '')
  const [description, setDescription] = useState(source?.description ?? '')
  const [listId, setListId] = useState<number | ''>(source?.list_id ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  const baseUrl = (import.meta.env.VITE_API_URL as string) || window.location.origin
  const apiKey = source?.api_key ?? ''
  const apiUrl = apiKey ? `${baseUrl}/insert-lead-source?token=${apiKey}` : ''

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (source) {
        return leadSourceService.update(source.id, {
          title: title.trim(),
          description: description.trim(),
          list_id: listId as number,
        })
      }
      const newKey = generateApiKey()
      return leadSourceService.create({
        title: title.trim(),
        description: description.trim(),
        list_id: listId as number,
        api_key: newKey,
        client_id: user?.parent_id ?? 0,
      })
    },
    onSuccess: () => {
      toast.success(source ? 'Lead source updated' : 'Lead source created')
      onSaved()
    },
    onError: () => toast.error(source ? 'Failed to update' : 'Failed to create'),
  })

  const isValid = title.trim().length > 0 && description.trim().length > 0 && listId !== ''

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
          <label className="label">Title *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Google Ads, Facebook"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Description *</label>
          <input
            className="input"
            placeholder="Brief description of this lead source"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Select List *</label>
          <select
            className="input"
            value={listId}
            onChange={(e) => setListId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Choose a list…</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title || l.name || l.list_name || `List #${l.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Show API URL only in edit mode (key already exists) */}
        {source && apiUrl && (
          <div className="form-group">
            <label className="label">API URL</label>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-xs font-mono bg-slate-50"
                value={apiUrl}
                readOnly
              />
              <button
                type="button"
                className="btn-outline px-2.5 flex-shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(apiUrl)
                  toast.success('API URL copied')
                }}
                title="Copy URL"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}

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
  const [editSource, setEditSource] = useState<LeadSourceConfig | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
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

  // Fetch lead source configs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['lead-source-configs'],
    queryFn: () => leadSourceService.list({ page: 1, limit: 500, search: '', filters: {} }),
  })

  const rawConfigs = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = data as any
    const nested = r?.data?.data?.data
    if (Array.isArray(nested)) return nested
    const d = r?.data?.data
    if (Array.isArray(d)) return d
    return []
  })() as LeadSourceConfig[]

  // Fetch CRM lists for the dropdown
  const { data: listsData } = useQuery({
    queryKey: ['crm-lists-dropdown'],
    queryFn: () => leadSourceService.getLists(),
    staleTime: 5 * 60_000,
  })

  const lists: CrmList[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = listsData as any
    const d = r?.data?.data
    return Array.isArray(d) ? d : []
  })()

  // Build list id → name map
  const listMap = new Map<number, string>()
  lists.forEach((l) => {
    listMap.set(l.id, l.title || l.name || l.list_name || `List #${l.id}`)
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadSourceService.delete(id),
    onSuccess: () => {
      toast.success('Lead source deleted')
      qc.invalidateQueries({ queryKey: ['lead-source-configs'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleDelete = async (row: LeadSourceConfig) => {
    if (!await showConfirm({
      title: 'Delete Lead Source?',
      message: `Are you sure you want to delete "${row.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    })) return
    deleteMutation.mutate(row.id)
  }

  const handleCopyKey = (row: LeadSourceConfig) => {
    navigator.clipboard.writeText(row.api_key)
    setCopiedId(row.id)
    toast.success('API key copied')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSaved = () => {
    setShowModal(false)
    setEditSource(null)
    qc.invalidateQueries({ queryKey: ['lead-source-configs'] })
  }

  const columns: Column<LeadSourceConfig>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Globe size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{row.title}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-sm text-slate-600 truncate max-w-[250px] block">
          {row.description || '—'}
        </span>
      ),
    },
    {
      key: 'api_key',
      header: 'API Key',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <code className="text-xs font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-600 truncate max-w-[180px]">
            {row.api_key}
          </code>
          <button
            onClick={() => handleCopyKey(row)}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Copy API key"
          >
            {copiedId === row.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </div>
      ),
    },
    {
      key: 'list_id',
      header: 'List',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <List size={12} className="text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-700">
            {listMap.get(row.list_id) || `#${row.list_id}`}
          </span>
        </div>
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
          lists={lists}
          onClose={() => { setShowModal(false); setEditSource(null) }}
          onSaved={handleSaved}
        />
      )}

      <div className="space-y-2">
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
          <DataTable
            columns={columns}
            data={rawConfigs}
            loading={isLoading}
            keyField="id"
            emptyText="No lead sources configured yet"
          />
        </div>
      </div>
    </>
  )
}
