import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, PhoneOff, Upload, Download, Search, X, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
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
import { useDialerHeader } from '../../layouts/DialerLayout'

interface ExtItem {
  id: number
  first_name: string
  last_name: string
  extension: string
  [key: string]: unknown
}

export function DncList() {

  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const clientId = useAuthStore(s => s.user?.parent_id)

  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<DncItem | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search DNC list…" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => { dncService.download().catch(() => toast.error('Failed to download DNC list')) }} className="lt-b">
            <Download size={13} /> Download
          </button>
          <button onClick={() => setShowUpload(true)} className="lt-b">
            <Upload size={13} /> Upload Excel
          </button>
          <button onClick={() => setShowAdd(true)} className="lt-b lt-p">
            <Plus size={13} /> Add Number
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

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
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
            <PhoneOff size={14} className="text-indigo-600" />
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
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
              <UserRound size={13} className="text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 leading-tight truncate">{name || code}</p>
              {name && <p className="text-[11px] text-slate-400 mt-0.5">Ext {code}</p>}
            </div>
          </div>
        )
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

      <div className="space-y-2">
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
          hideToolbar
        />
      </div>
    </>
  )
}
