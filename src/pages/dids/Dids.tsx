import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Phone, Hash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { didService } from '../../services/did.service'
import { useServerTable } from '../../hooks/useServerTable'
import { cn } from '../../utils/cn'

interface Did {
  id: number
  cli: string
  cnam?: string
  dest_type?: string | number
  dest_type_name?: string
  destination_name?: string
  extension?: string
  sms?: number
  default_did?: number
  operator?: string
  [key: string]: unknown
}

export function Dids() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => didService.delete(id),
    onSuccess: () => { toast.success('DID deleted'); qc.invalidateQueries({ queryKey: ['dids'] }) },
    onError: () => toast.error('Failed to delete DID'),
  })

  const columns: Column<Did>[] = [
    {
      key: 'cli', header: 'Phone Number',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Phone size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-mono font-bold text-slate-900">{row.cli}</p>
            {row.cnam && <p className="text-xs text-slate-400">{row.cnam}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'dest_type', header: 'Destination',
      render: (row) => (
        <div className="text-sm">
          <span className="font-medium text-slate-700 capitalize">{row.dest_type_name || row.dest_type || 'extension'}</span>
          {row.destination_name && (
            <span className="text-slate-400 ml-1.5">→ {row.destination_name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'operator', header: 'Operator',
      render: (row) => (
        <span className="text-sm text-slate-600 capitalize">{(row.operator as string) || '—'}</span>
      ),
    },
    {
      key: 'sms', header: 'SMS',
      render: (row) => (
        <Badge variant={row.sms ? 'green' : 'gray'}>{row.sms ? 'Enabled' : 'Disabled'}</Badge>
      ),
    },
    {
      key: 'default_did', header: 'Default',
      render: (row) => row.default_did
        ? <Badge variant="blue">Default</Badge>
        : <span className="text-slate-300 text-sm">—</span>,
    },
    {
      key: 'actions', header: '',
      headerClassName: 'w-px',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => navigate(`/dids/${row.id}/edit`)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => { if (confirm(`Delete DID ${row.cli}?`)) deleteMutation.mutate(row.id) }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">DID Management</h1>
        <p className="page-subtitle">Configure phone numbers and call routing</p>
      </div>

      <ServerDataTable<Did>
        queryKey={['dids']}
        queryFn={(params) => didService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: Did[] } }
          return r?.data?.data ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total_rows?: number } }
          return r?.data?.total_rows ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search by phone number…"
        emptyText="No DIDs configured"
        emptyIcon={<Hash size={40} />}
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
          <button onClick={() => navigate('/dids/create')} className="btn-primary">
            <Plus size={15} /> Add DID
          </button>
        }
      />
    </div>
  )
}
