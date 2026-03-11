import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, ToggleLeft, ToggleRight, Trash2, ArrowLeft, ListChecks, MessageSquare,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { dispositionService } from '../../services/disposition.service'
import { useServerTable } from '../../hooks/useServerTable'
import { CreateDispositionModal } from './CreateDispositionModal'
import { EditDispositionModal, type DispositionItem } from './EditDispositionModal'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'

const D_TYPE_LABELS: Record<string, string> = {
  '1': 'Standard',
  '2': 'Callback',
  '3': 'DNC',
}

export function DispositionList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<DispositionItem | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['dispositions'] })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      dispositionService.toggleStatus(id, Number(status) === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Status updated'); invalidate() },
    onError: (err: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message
      toast.error(msg || 'Failed to update status')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => dispositionService.delete(id),
    onSuccess: () => { toast.success('Disposition deleted'); invalidate() },
    onError: (err: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message
      toast.error(msg || 'Failed to delete disposition')
    },
  })

  const columns: Column<DispositionItem>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <ListChecks size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{row.title}</span>
        </div>
      ),
    },
    {
      key: 'd_type',
      header: 'Disposition Type',
      render: (row) => (
        <span className="text-sm text-slate-600">
          {D_TYPE_LABELS[String(row.d_type ?? '1')] ?? String(row.d_type ?? '—')}
        </span>
      ),
    },
    {
      key: 'enable_sms',
      header: 'SMS Enabled',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <MessageSquare
            size={13}
            className={Number(row.enable_sms) === 1 ? 'text-indigo-500' : 'text-slate-300'}
          />
          <span className={`text-sm ${Number(row.enable_sms) === 1 ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}>
            {Number(row.enable_sms) === 1 ? 'Yes' : 'No'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={Number(row.status) === 1 ? 'green' : 'red'}>
          {Number(row.status) === 1 ? 'Active' : 'Inactive'}
        </Badge>
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
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => setEditItem(row),
          },
          {
            label: Number(row.status) === 1 ? 'Disable' : 'Enable',
            icon: Number(row.status) === 1 ? <ToggleRight size={13} /> : <ToggleLeft size={13} />,
            variant: Number(row.status) === 1 ? 'warning' : 'success',
            onClick: () => toggleMutation.mutate({ id: row.id, status: Number(row.status ?? 0) }),
            disabled: toggleMutation.isPending,
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(row.title)) {
                deleteMutation.mutate(row.id)
              }
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
        <CreateDispositionModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); invalidate() }}
        />
      )}
      {editItem && (
        <EditDispositionModal
          disposition={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); invalidate() }}
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
                <h1 className="page-title">Disposition Management</h1>
                <p className="page-subtitle">Manage call dispositions used by agents</p>
              </div>
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus size={15} />
                New Disposition
              </button>
            </div>
          </div>
        </div>

        <ServerDataTable<DispositionItem>
          queryKey={['dispositions']}
          queryFn={(params) => dispositionService.list(params)}
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: DispositionItem[] } }
            return r?.data?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { total_rows?: number } }
            return r?.data?.total_rows ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search dispositions by name…"
          filters={[
            {
              key: 'status', label: 'All Status', options: [
                { value: '1', label: 'Active' },
                { value: '0', label: 'Inactive' },
              ],
            },
          ]}
          emptyText="No dispositions found"
          emptyIcon={<ListChecks size={40} />}
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
