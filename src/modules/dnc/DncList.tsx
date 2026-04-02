import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ArrowLeft, PhoneOff, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { dncService } from '../../services/dnc.service'
import { useAuthStore } from '../../stores/auth.store'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime, formatPhoneUS } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { AddDncModal } from './AddDncModal'
import { EditDncModal, type DncItem } from './EditDncModal'
import { UploadExcelModal } from '../../components/ui/UploadExcelModal'

interface ExtItem {
  id: number
  first_name: string
  last_name: string
  extension: string
  [key: string]: unknown
}

export function DncList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const clientId = useAuthStore(s => s.user?.parent_id)

  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<DncItem | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const { data: extRes } = useQuery({
    queryKey: ['extensions', clientId],
    queryFn: () => dncService.getExtensions(),
    staleTime: 5 * 60_000,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions: ExtItem[] = (extRes as any)?.data?.data ?? []
  const extMap = new Map(extensions.map(e => [String(e.extension), `${e.first_name} ${e.last_name}`.trim()]))

  const invalidate = () => qc.invalidateQueries({ queryKey: ['dnc'] })

  const deleteMutation = useMutation({
    mutationFn: (number: string) => dncService.delete(number),
    onSuccess: () => { toast.success('Number removed from DNC list'); invalidate() },
    onError: () => toast.error('Failed to remove number'),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => dncService.uploadExcel(file),
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

  const columns: Column<DncItem>[] = [
    {
      key: 'number',
      header: 'Phone Number',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <PhoneOff size={13} className="text-red-500" />
          </div>
          <span className="text-sm font-medium text-slate-900 font-mono">{formatPhoneUS(row.number)}</span>
        </div>
      ),
    },
    {
      key: 'extension',
      header: 'Extension',
      render: (row) => {
        const code = String(row.extension || '')
        if (!code) return <span className="text-sm text-slate-400">—</span>
        const name = extMap.get(code)
        return <span className="text-sm text-slate-600">{name ? `${name} (${code})` : code}</span>
      },
    },
    {
      key: 'comment',
      header: 'Comment',
      render: (row) => (
        <span className="text-sm text-slate-500 truncate max-w-xs block">{row.comment || '—'}</span>
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
        <AddDncModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); invalidate() }} />
      )}
      {editItem && (
        <EditDncModal item={editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); invalidate() }} />
      )}
      {showUpload && (
        <UploadExcelModal
          title="Upload DNC Numbers"
          description="Upload an Excel or CSV file to bulk-import numbers into the DNC list."
          onClose={() => setShowUpload(false)}
          onUpload={(file) => uploadMutation.mutateAsync(file)}
          isUploading={uploadMutation.isPending}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate('/')} className="btn-ghost p-1.5 rounded-lg">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title">DNC List</h1>
              <p className="page-subtitle">Do Not Call registry — numbers blocked from outbound dialing</p>
            </div>
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
