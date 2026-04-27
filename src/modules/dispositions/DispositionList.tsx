import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, ListChecks, MessageSquare, Search, X, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { dispositionService } from '../../services/disposition.service'
import { useServerTable } from '../../hooks/useServerTable'
import { CreateDispositionModal } from './CreateDispositionModal'
import { EditDispositionModal, type DispositionItem } from './EditDispositionModal'
import { confirmDelete, showConfirm } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { useDialerHeader } from '../../layouts/DialerLayout'

const D_TYPE_LABELS: Record<string, { label: string; variant: 'blue' | 'red' | 'green' }> = {
  '1': { label: 'Status', variant: 'green' },
  '2': { label: 'Callback', variant: 'blue' },
  '3': { label: 'DNC', variant: 'red' },
}

export function DispositionList() {
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<DispositionItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { setToolbar } = useDialerHeader()

  // Clear selection on page/search/filter change
  useEffect(() => { setSelectedIds([]) }, [table.page, table.search, table.filters])

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search dispositions…" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => setShowCreate(true)} className="lt-b lt-p">
            <Plus size={13} /> Add Disposition
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map(id => dispositionService.delete(id)))
      const failedResults = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      return { total: ids.length, failed: failedResults.length, failedResults }
    },
    onSuccess: ({ total, failed, failedResults }) => {
      const deleted = total - failed
      if (failed === 0) {
        toast.success(`Deleted ${total} disposition(s)`)
      } else if (deleted > 0) {
        toast.success(`Deleted ${deleted} disposition(s)`)
        const reason = failedResults[0]?.reason?.message || 'Could not delete'
        toast.error(`${failed} failed: ${reason}`)
      } else {
        const reason = failedResults[0]?.reason?.message || 'Could not delete'
        toast.error(`${reason}`)
      }
      setSelectedIds([])
      invalidate()
    },
    onError: () => toast.error('Bulk delete failed'),
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

      <div className="space-y-2">
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
          hideToolbar
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* Bulk delete bar */}
      {selectedIds.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
        >
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
            {selectedIds.length} selected
          </span>
          <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <button
            onClick={async () => {
              if (await showConfirm({
                title: `Delete ${selectedIds.length} Disposition${selectedIds.length > 1 ? 's' : ''}?`,
                message: `${selectedIds.length} disposition${selectedIds.length > 1 ? 's' : ''} will be permanently deleted. This cannot be undone.`,
                confirmText: 'Yes, delete',
              })) bulkDeleteMutation.mutate(selectedIds)
            }}
            disabled={bulkDeleteMutation.isPending}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {bulkDeleteMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            Delete
          </button>
          <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <button onClick={() => setSelectedIds([])} className="p-1 rounded-md hover:bg-white/10 transition-colors flex-shrink-0" title="Clear selection">
            <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>
      )}
    </>
  )
}
