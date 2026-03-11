import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Trash2, ArrowLeft, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { faxService } from '../../services/fax.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { CreateFaxModal } from './CreateFaxModal'
import { ViewFaxModal, type FaxItem } from './ViewFaxModal'

function FaxStatusBadge({ status }: { status: string | null }) {
  const s = String(status ?? '').toUpperCase()
  if (s === '1' || s === 'COMPLETE' || s === 'COMPLETED') {
    return <Badge variant="green">Completed</Badge>
  }
  if (s === 'TRYING' || s === 'SENDING') {
    return <Badge variant="yellow">Sending</Badge>
  }
  if (s === 'FAILED' || s === 'ERROR') {
    return <Badge variant="red">Failed</Badge>
  }
  if (s === '0' || s === 'PENDING') {
    return <Badge variant="yellow">Pending</Badge>
  }
  return <Badge variant="gray">{status ?? '—'}</Badge>
}

function DeliveryStatusBadge({ status }: { status: string | number | null }) {
  if (status === null || status === undefined || status === '') return <span className="text-slate-400 text-xs">—</span>
  const s = String(status).toUpperCase()
  if (s === 'DELIVERED' || s === 'COMPLETE') return <Badge variant="green">Delivered</Badge>
  if (s === 'TRYING' || s === 'PENDING') return <Badge variant="yellow">{s.charAt(0) + s.slice(1).toLowerCase()}</Badge>
  if (s === 'FAILED' || s === 'ERROR') return <Badge variant="red">Failed</Badge>
  return <Badge variant="gray">{String(status)}</Badge>
}

export function FaxList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showCreate, setShowCreate] = useState(false)
  const [viewItem, setViewItem] = useState<FaxItem | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['fax'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => faxService.delete(id),
    onSuccess: () => { toast.success('Fax deleted'); invalidate() },
    onError: () => toast.error('Failed to delete fax'),
  })

  const columns: Column<FaxItem>[] = [
    {
      key: 'id',
      header: 'Fax ID',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText size={13} className="text-blue-600" />
          </div>
          <span className="text-sm font-mono font-medium text-slate-700">#{row.id}</span>
        </div>
      ),
    },
    {
      key: 'dialednumber',
      header: 'Dialed Number',
      render: (row) => (
        <span className="text-sm text-slate-800 font-mono">{row.dialednumber ?? '—'}</span>
      ),
    },
    {
      key: 'callerid',
      header: 'Caller ID',
      render: (row) => (
        <span className="text-sm text-slate-600 font-mono">{row.callerid ?? '—'}</span>
      ),
    },
    {
      key: 'faxstatus',
      header: 'Fax Status',
      render: (row) => <FaxStatusBadge status={row.faxstatus} />,
    },
    {
      key: 'numofpages',
      header: 'Pages',
      render: (row) => (
        <span className="text-sm text-slate-600">{row.numofpages ?? '—'}</span>
      ),
    },
    {
      key: 'extension',
      header: 'Extension',
      render: (row) => (
        <span className="text-sm text-slate-600">{row.extension ?? '—'}</span>
      ),
    },
    {
      key: 'charge',
      header: 'Charge',
      render: (row) => (
        <span className="text-sm text-slate-600">
          {row.charge != null ? `$${Number(row.charge).toFixed(4)}` : '—'}
        </span>
      ),
    },
    {
      key: 'delivery_status',
      header: 'Delivery',
      render: (row) => <DeliveryStatusBadge status={row.delivery_status} />,
    },
    {
      key: 'start_time',
      header: 'Start Time',
      render: (row) => (
        <span className="text-xs text-slate-400">
          {row.start_time ? formatDateTime(row.start_time) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'View',
            icon: <Eye size={13} />,
            variant: 'view',
            onClick: () => setViewItem(row),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(`Fax #${row.id}`)) deleteMutation.mutate(row.id)
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
        <CreateFaxModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); invalidate() }}
        />
      )}
      {viewItem && (
        <ViewFaxModal
          fax={viewItem}
          onClose={() => setViewItem(null)}
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
                <h1 className="page-title">Fax Management</h1>
                <p className="page-subtitle">View and manage sent and received faxes</p>
              </div>
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus size={15} />
                Send Fax
              </button>
            </div>
          </div>
        </div>

        <ServerDataTable<FaxItem>
          queryKey={['fax']}
          queryFn={(params) => faxService.list(params)}
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: FaxItem[] } }
            return r?.data?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { total?: number } }
            return r?.data?.total ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search by number, caller ID, or ref ID…"
          filters={[
            {
              key: 'faxstatus', label: 'All Status', options: [
                { value: '1', label: 'Completed' },
                { value: '0', label: 'Pending' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'TRYING', label: 'Sending' },
              ],
            },
          ]}
          emptyText="No faxes found"
          emptyIcon={<FileText size={40} />}
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
