import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, List, Save, X, Eye, RefreshCw, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { smsAiService } from '../../services/smsAi.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { useDialerHeader } from '../../layouts/DialerLayout'

interface ListItem {
  id: number
  title: string
  campaign_id?: number
  campaign_title?: string
  status?: string | number
  lead_report_count?: number
  sms_ai_lead_report_count?: number
  created_at?: string
  [key: string]: unknown
}

interface CampaignOption {
  id: number
  title: string
  [key: string]: unknown
}

interface ListHeader {
  id: number
  header_name?: string
  label_id?: number
  is_dialing?: number
  [key: string]: unknown
}

// ─── Create Modal ──────────────────────────────────────────────────────────────
function CreateListModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const { data: campaignsData } = useQuery({
    queryKey: ['smsai-campaigns-all'],
    queryFn: () => smsAiService.listAll(),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaigns: CampaignOption[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = campaignsData as any
    return r?.data?.data ?? r?.data ?? []
  })()

  const saveMutation = useMutation({
    mutationFn: () =>
      smsAiService.createList({
        title: title.trim(),
        campaign_id: Number(campaignId),
        file_name: fileName.trim(),
      }),
    onSuccess: () => {
      toast.success('List created')
      onSaved()
    },
    onError: () => toast.error('Failed to create list'),
  })

  const isValid = title.trim() && campaignId && fileName.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">New SMS AI List</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">List Title *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Q1 Leads"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Campaign *</label>
          <select className="input" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
            <option value="">Select campaign</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">File Name *</label>
          <input
            className="input"
            placeholder="uploaded_file.xlsx"
            value={fileName}
            onChange={e => setFileName(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Name of the pre-uploaded Excel file</p>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ListViewModal({
  list,
  onClose,
}: {
  list: ListItem
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['smsai-list', list.id],
    queryFn: () => smsAiService.showList(list.id),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detail = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = data as any
    return r?.data?.data ?? r?.data ?? null
  })()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headers: ListHeader[] = detail?.headers ?? detail?.list_headers ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: '70vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">{list.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">List details &amp; column mapping</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            ))
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-medium text-slate-500">Campaign</span>
                  <p className="text-sm text-slate-700 mt-0.5">{detail?.campaign_title ?? list.campaign_title ?? '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500">Status</span>
                  <p className="text-sm text-slate-700 mt-0.5 capitalize">{String(list.status ?? 'unknown')}</p>
                </div>
              </div>

              {headers.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-slate-500 mb-2 block">Column Headers</span>
                  <div className="space-y-1.5">
                    {headers.map((h, idx) => (
                      <div key={h.id ?? idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
                        <span className="text-sm text-slate-700 flex-1">{h.header_name || `Column ${idx + 1}`}</span>
                        {Number(h.is_dialing) === 1 && (
                          <Badge variant="blue">Dialing</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline text-sm px-5">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function SmsAiLists() {

  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showCreate, setShowCreate] = useState(false)
  const [viewList, setViewList] = useState<ListItem | null>(null)
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search lists\u2026" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => setShowCreate(true)} className="lt-b lt-p">
            <Plus size={13} /> Add List
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['smsai-lists'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => smsAiService.deleteList(id),
    onSuccess: () => { toast.success('List deleted'); invalidate() },
    onError: () => toast.error('Failed to delete list'),
  })

  const recycleMutation = useMutation({
    mutationFn: (id: number) => smsAiService.recycleList(id),
    onSuccess: () => { toast.success('List recycled'); invalidate() },
    onError: () => toast.error('Failed to recycle list'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      smsAiService.updateListStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); invalidate() },
    onError: () => toast.error('Failed to update status'),
  })

  const columns: Column<ListItem>[] = [
    {
      key: 'title',
      header: 'List Title',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <List size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{row.title}</span>
        </div>
      ),
    },
    {
      key: 'campaign',
      header: 'Campaign',
      render: (row) => (
        <span className="text-sm text-slate-600">{row.campaign_title || `#${row.campaign_id ?? '—'}`}</span>
      ),
    },
    {
      key: 'leads',
      header: 'Leads',
      render: (row) => (
        <span className="text-sm font-semibold text-slate-700">
          {row.lead_report_count ?? row.sms_ai_lead_report_count ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const isActive = String(row.status) === '1' || String(row.status) === 'active'
        return (
          <button
            onClick={() => statusMutation.mutate({
              id: row.id,
              status: isActive ? '0' : '1',
            })}
            disabled={statusMutation.isPending}
            className="cursor-pointer hover:opacity-75 transition-opacity"
          >
            <Badge variant={isActive ? 'green' : 'gray'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </button>
        )
      },
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
            label: 'View',
            icon: <Eye size={13} />,
            variant: 'view',
            onClick: () => setViewList(row),
          },
          {
            label: 'Recycle',
            icon: <RefreshCw size={13} />,
            variant: 'view',
            onClick: async () => {
              if (await confirmDelete(`recycle list "${row.title}"`)) recycleMutation.mutate(row.id)
            },
            disabled: recycleMutation.isPending,
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
      {showCreate && (
        <CreateListModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); invalidate() }}
        />
      )}
      {viewList && (
        <ListViewModal
          list={viewList}
          onClose={() => setViewList(null)}
        />
      )}

      <div className="space-y-5">
        <ServerDataTable<ListItem>
          queryKey={['smsai-lists']}
          queryFn={(params) => smsAiService.listLists(params)}
          dataExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.data ?? r?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.total ?? r?.data?.data?.length ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search lists…"
          emptyText="No SMS AI lists found"
          emptyIcon={<List size={40} />}
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
