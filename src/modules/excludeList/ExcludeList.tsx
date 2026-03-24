import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ArrowLeft, MinusCircle, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { excludeListService } from '../../services/excludeList.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime, formatPhoneUS } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { AddExcludeModal } from './AddExcludeModal'
import { EditExcludeModal, type ExcludeItem } from './EditExcludeModal'
import { UploadExcelModal } from '../../components/ui/UploadExcelModal'

export function ExcludeList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<ExcludeItem | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['exclude-list'] })

  const deleteMutation = useMutation({
    mutationFn: ({ number, campaign_id }: { number: string; campaign_id: number }) =>
      excludeListService.delete(number, campaign_id),
    onSuccess: () => { toast.success('Number removed from Exclude List'); invalidate() },
    onError: () => toast.error('Failed to remove number'),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => excludeListService.uploadExcel(file),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = res as any
      if (r?.data?.success === 'false' || r?.data?.success === false) {
        toast.error(r?.data?.message || 'Upload failed')
      } else {
        toast.success(r?.data?.message || 'Excel uploaded successfully')
        setShowUpload(false)
        invalidate()
      }
    },
    onError: () => toast.error('Failed to upload file'),
  })

  const columns: Column<ExcludeItem>[] = [
    {
      key: 'number',
      header: 'Phone Number',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <MinusCircle size={13} className="text-orange-500" />
          </div>
          <span className="text-sm font-medium text-slate-900 font-mono">{formatPhoneUS(row.number)}</span>
        </div>
      ),
    },
    {
      key: 'first_name',
      header: 'First Name',
      render: (row) => <span className="text-sm text-slate-600">{row.first_name || '—'}</span>,
    },
    {
      key: 'last_name',
      header: 'Last Name',
      render: (row) => <span className="text-sm text-slate-600">{row.last_name || '—'}</span>,
    },
    {
      key: 'company_name',
      header: 'Company',
      render: (row) => (
        <span className="text-sm text-slate-500 truncate max-w-xs block">{row.company_name || '—'}</span>
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
                deleteMutation.mutate({ number: String(row.number), campaign_id: Number(row.campaign_id) })
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
        <AddExcludeModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); invalidate() }} />
      )}
      {editItem && (
        <EditExcludeModal item={editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); invalidate() }} />
      )}
      {showUpload && (
        <UploadExcelModal
          title="Upload Exclude List"
          description="Upload an Excel or CSV file to bulk-import numbers into the Exclude List."
          onClose={() => setShowUpload(false)}
          onUpload={(file) => uploadMutation.mutateAsync(file)}
          isUploading={uploadMutation.isPending}
        />
      )}

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-2 rounded-lg mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="page-header">
              <div>
                <h1 className="page-title">Exclude From List</h1>
                <p className="page-subtitle">Numbers excluded from dialing campaigns</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowUpload(true)} className="btn-outline">
                  <Upload size={15} />
                  Upload Excel
                </button>
                <button onClick={() => setShowAdd(true)} className="btn-primary">
                  <Plus size={15} />
                  Add Number
                </button>
              </div>
            </div>
          </div>
        </div>

        <ServerDataTable<ExcludeItem>
          queryKey={['exclude-list']}
          queryFn={(params) => excludeListService.list(params)}
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: ExcludeItem[] } }
            return r?.data?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { record_count?: number } }
            return r?.data?.record_count ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search by phone, name, or company…"
          emptyText="No numbers in Exclude List"
          emptyIcon={<MinusCircle size={40} />}
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
