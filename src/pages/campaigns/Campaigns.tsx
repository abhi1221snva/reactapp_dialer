import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Play, Pause, Copy, Trash2, Pencil, Radio } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { campaignService } from '../../services/campaign.service'
import { useServerTable } from '../../hooks/useServerTable'

interface Campaign {
  id: number
  title?: string
  campaign_name?: string
  dial_mode?: string
  status?: string
  dial_ratio?: number
  total_leads?: number
  lists_associated?: number
  [key: string]: unknown
}

const STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export function Campaigns() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const table = useServerTable({ defaultLimit: 15 })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      campaignService.toggle(id, status === 'active' ? 'inactive' : 'active'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: () => toast.error('Failed to update status'),
  })

  const copyMutation = useMutation({
    mutationFn: (id: number) => campaignService.copy(id),
    onSuccess: () => { toast.success('Campaign copied'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: () => toast.error('Failed to copy campaign'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => campaignService.delete(id),
    onSuccess: () => { toast.success('Campaign deleted'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: () => toast.error('Failed to delete campaign'),
  })

  const columns: Column<Campaign>[] = [
    {
      key: 'name', header: 'Campaign',
      render: (row) => {
        const name = row.title || row.campaign_name || '—'
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Radio size={15} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">{name}</p>
              {row.dial_mode && (
                <p className="text-xs text-slate-400 capitalize mt-0.5">
                  {String(row.dial_mode).replace(/_/g, ' ')}
                </p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'green' : 'gray'} className="capitalize">
          {row.status || 'inactive'}
        </Badge>
      ),
    },
    {
      key: 'lists_associated', header: 'Lists',
      render: (row) => (
        <span className="text-sm text-slate-600">{row.lists_associated ?? 0}</span>
      ),
    },
    {
      key: 'total_leads', header: 'Leads',
      render: (row) => (
        <div className="text-sm text-slate-600">
          {row.total_leads !== undefined ? (
            <div>
              <span>{row.total_leads}</span>
              {row.total_leads > 0 && (
                <div className="w-20 h-1 bg-slate-100 rounded-full mt-1">
                  <div className="h-full bg-indigo-400 rounded-full"
                    style={{ width: `${Math.min(100, ((row.called_leads as number ?? 0) / (row.total_leads as number)) * 100)}%` }} />
                </div>
              )}
            </div>
          ) : '—'}
        </div>
      ),
    },
    {
      key: 'actions', header: '',
      headerClassName: 'w-px',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => toggleMutation.mutate({ id: row.id, status: row.status || 'inactive' })}
            disabled={toggleMutation.isPending}
            className={`btn-sm ${row.status === 'active' ? 'btn-outline' : 'btn-success'}`}
            title={row.status === 'active' ? 'Pause' : 'Activate'}
          >
            {row.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button onClick={() => navigate(`/campaigns/${row.id}/edit`)} className="btn-ghost btn-sm p-1.5" title="Edit">
            <Pencil size={13} />
          </button>
          <button onClick={() => copyMutation.mutate(row.id)} disabled={copyMutation.isPending} className="btn-ghost btn-sm p-1.5" title="Copy">
            <Copy size={13} />
          </button>
          <button
            onClick={() => { if (confirm(`Delete campaign?`)) deleteMutation.mutate(row.id) }}
            disabled={deleteMutation.isPending}
            className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Manage your dialing campaigns</p>
        </div>
      </div>

      <ServerDataTable<Campaign>
        queryKey={['campaigns']}
        queryFn={(params) => campaignService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: Campaign[] } }
          return r?.data?.data ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total_rows?: number } }
          return r?.data?.total_rows ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search campaigns…"
        filters={[
          { key: 'status', label: 'All Status', options: STATUS_FILTERS },
        ]}
        emptyText="No campaigns found"
        emptyIcon={<Radio size={40} />}
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
          <button onClick={() => navigate('/campaigns/create')} className="btn-primary">
            <Plus size={15} /> New Campaign
          </button>
        }
      />
    </div>
  )
}
