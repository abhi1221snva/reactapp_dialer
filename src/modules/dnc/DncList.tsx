import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ArrowLeft, PhoneOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { dncService } from '../../services/dnc.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { AddDncModal } from './AddDncModal'
import { EditDncModal, type DncItem } from './EditDncModal'

export function DncList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<DncItem | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['dnc'] })

  const deleteMutation = useMutation({
    mutationFn: (number: string) => dncService.delete(number),
    onSuccess: () => { toast.success('Number removed from DNC list'); invalidate() },
    onError: () => toast.error('Failed to remove number'),
  })

  const columns: Column<DncItem>[] = [
    {
      key: 'number',
      header: 'Phone Number',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <PhoneOff size={13} className="text-red-500" />
          </div>
          <span className="text-sm font-medium text-slate-900 font-mono">
            {String(row.number)}
          </span>
        </div>
      ),
    },
    {
      key: 'extension',
      header: 'Extension',
      render: (row) => (
        <span className="text-sm text-slate-600">{row.extension || '—'}</span>
      ),
    },
    {
      key: 'comment',
      header: 'Comment',
      render: (row) => (
        <span className="text-sm text-slate-500 truncate max-w-xs block">
          {row.comment || '—'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      render: (row) => (
        <span className="text-xs text-slate-400">
          {row.updated_at ? formatDateTime(row.updated_at as string) : '—'}
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
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => setEditItem(row),
          },
          {
            label: 'Remove',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(String(row.number))) {
                deleteMutation.mutate(String(row.number))
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
      {showAdd && (
        <AddDncModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); invalidate() }}
        />
      )}
      {editItem && (
        <EditDncModal
          item={editItem}
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
                <h1 className="page-title">DNC List</h1>
                <p className="page-subtitle">Do Not Call registry — numbers blocked from outbound dialing</p>
              </div>
              <button onClick={() => setShowAdd(true)} className="btn-primary">
                <Plus size={15} />
                Add Number
              </button>
            </div>
          </div>
        </div>

        <ServerDataTable<DncItem>
          queryKey={['dnc']}
          queryFn={(params) => dncService.list(params)}
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: DncItem[] } }
            return r?.data?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { record_count?: number } }
            return r?.data?.record_count ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search by phone number or extension…"
          emptyText="No numbers in DNC list"
          emptyIcon={<PhoneOff size={40} />}
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
