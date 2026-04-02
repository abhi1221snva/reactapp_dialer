import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, ArrowLeft, ListChecks, MessageSquare,
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

const D_TYPE_LABELS: Record<string, { label: string; variant: 'blue' | 'red' | 'green' }> = {
  '1': { label: 'Status', variant: 'green' },
  '2': { label: 'Callback', variant: 'blue' },
  '3': { label: 'DNC', variant: 'red' },
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
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['dispositions'] })
      const prev = qc.getQueriesData({ queryKey: ['dispositions'] })
      qc.setQueriesData({ queryKey: ['dispositions'] }, (old: unknown) => {
        if (!old) return old
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const o = old as any
        const data = o?.data?.data
        if (Array.isArray(data)) {
          const newStatus = Number(status) === 1 ? 0 : 1
          return { ...o, data: { ...o.data, data: data.map((d: DispositionItem) => d.id === id ? { ...d, status: newStatus } : d) } }
        }
        return old
      })
      return { prev }
    },
    onSuccess: () => { toast.success('Status updated'); invalidate() },
    onError: (err: unknown, _vars, context) => {
      if (context?.prev) {
        context.prev.forEach(([key, data]) => qc.setQueryData(key, data))
      }
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
      header: 'Type',
      render: (row) => {
        const cfg = D_TYPE_LABELS[String(row.d_type)]
        if (!cfg) return <span className="text-sm text-slate-400">—</span>
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
    {
      key: 'enable_sms',
      header: 'SMS',
      render: (row) => {
        const enabled = Number(row.enable_sms) === 1
        return (
          <Badge variant={enabled ? 'green' : 'gray'}>
            <MessageSquare size={11} className="mr-1" />
            {enabled ? 'Yes' : 'No'}
          </Badge>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <button
          onClick={() => toggleMutation.mutate({ id: row.id, status: Number(row.status ?? 0) })}
          disabled={toggleMutation.isPending}
          title={Number(row.status) === 1 ? 'Click to disable' : 'Click to enable'}
          className="cursor-pointer hover:opacity-75 transition-opacity"
        >
          <Badge variant={Number(row.status) === 1 ? 'green' : 'red'}>
            {Number(row.status) === 1 ? 'Active' : 'Inactive'}
          </Badge>
        </button>
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

      <div className="space-y-3">
        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate('/')} className="btn-ghost p-1.5 rounded-lg">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">Dispositions</h1>
              <p className="text-[11px] text-slate-400">Manage call dispositions used by agents</p>
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
          headerActions={
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={15} /> Add Disposition
            </button>
          }
        />
      </div>
    </>
  )
}
