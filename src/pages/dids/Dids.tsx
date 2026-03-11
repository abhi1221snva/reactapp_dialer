import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Phone, MessageSquare, Star,
  User, GitBranch, Users, Voicemail, ExternalLink,
  PhoneCall, ArrowRight, Hash,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { RowActions } from '../../components/ui/RowActions'
import { didService } from '../../services/did.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import { formatPhoneNumber } from '../../utils/format'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Config ───────────────────────────────────────────────────────────────────

const DEST_CFG: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string; gradient: string }> = {
  extension: { label: 'Extension', Icon: User,         color: 'text-blue-600',   bg: 'bg-blue-50',    gradient: 'from-blue-500 to-indigo-600' },
  ivr:       { label: 'IVR',       Icon: GitBranch,    color: 'text-purple-600', bg: 'bg-purple-50',  gradient: 'from-purple-500 to-violet-600' },
  queue:     { label: 'Queue',     Icon: Users,         color: 'text-emerald-600',bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-teal-600' },
  voicemail: { label: 'Voicemail', Icon: Voicemail,    color: 'text-amber-600',  bg: 'bg-amber-50',   gradient: 'from-amber-500 to-orange-600' },
  external:  { label: 'External',  Icon: ExternalLink, color: 'text-rose-600',   bg: 'bg-rose-50',    gradient: 'from-rose-500 to-pink-600' },
}

const OP_DOT: Record<string, string> = {
  twilio: 'bg-red-400', plivo: 'bg-orange-400', telnyx: 'bg-sky-400', vonage: 'bg-violet-400',
}
const OP_PILL: Record<string, string> = {
  twilio: 'bg-red-50 text-red-700 ring-red-200',
  plivo:  'bg-orange-50 text-orange-700 ring-orange-200',
  telnyx: 'bg-sky-50 text-sky-700 ring-sky-200',
  vonage: 'bg-violet-50 text-violet-700 ring-violet-200',
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Dids() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const table    = useServerTable({ defaultLimit: 15 })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => didService.delete(id),
    onSuccess: (res) => {
      const succeeded = res?.data?.success
      if (succeeded === false || succeeded === 'false' || succeeded === 0) {
        toast.error('Unable to delete DID. Please try again.')
        return
      }
      toast.success('DID deleted')
      qc.invalidateQueries({ queryKey: ['dids'] })
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } }).response?.status
      if (!status || (status !== 403 && status !== 422 && status < 500)) {
        toast.error('Failed to delete DID')
      }
    },
  })

  const handleDelete = async (did: Did) => {
    if (await confirmDelete(did.cli)) deleteMutation.mutate(did.id)
  }

  const columns: Column<Did>[] = [
    {
      key: 'cli', header: 'Phone Number',
      render: (did) => {
        const destKey = String(did.dest_type || 'extension').toLowerCase()
        const dest = DEST_CFG[destKey] ?? DEST_CFG.extension
        const isDefault = Boolean(did.default_did)
        return (
          <div className="flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm', dest.gradient)}>
              <Phone size={13} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono font-semibold text-slate-900">{formatPhoneNumber(did.cli)}</span>
                {isDefault && <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
              </div>
              {did.cnam && <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">{did.cnam}</p>}
            </div>
          </div>
        )
      },
    },
    {
      key: 'dest_type', header: 'Routing',
      render: (did) => {
        const destKey = String(did.dest_type || 'extension').toLowerCase()
        const dest = DEST_CFG[destKey] ?? DEST_CFG.extension
        const destName = did.destination_name || did.extension?.toString()
        return (
          <div className="flex items-center gap-2">
            <div className={cn('w-5 h-5 rounded flex items-center justify-center flex-shrink-0', dest.bg)}>
              <dest.Icon size={10} className={dest.color} />
            </div>
            <span className="text-xs font-medium text-slate-600">{dest.label}</span>
            {destName && (
              <>
                <ArrowRight size={9} className="text-slate-300 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">{destName}</span>
              </>
            )}
          </div>
        )
      },
    },
    {
      key: 'operator', header: 'Operator',
      render: (did) => {
        const opKey = (did.operator || '').toLowerCase()
        return did.operator ? (
          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1', OP_PILL[opKey] ?? 'bg-slate-50 text-slate-500 ring-slate-200')}>
            <span className={cn('w-1.5 h-1.5 rounded-full', OP_DOT[opKey] ?? 'bg-slate-400')} />
            <span className="capitalize">{did.operator}</span>
          </span>
        ) : <span className="text-slate-300 text-xs">—</span>
      },
    },
    {
      key: 'sms', header: 'Status',
      render: (did) => {
        const isDefault = Boolean(did.default_did)
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {did.sms ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <MessageSquare size={9} /> SMS
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                <MessageSquare size={9} /> SMS Off
              </span>
            )}
            {isDefault && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                <Star size={9} className="fill-amber-500" /> Default
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (did) => (
        <RowActions actions={[
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => navigate(`/dids/${did.id}/edit`),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: () => handleDelete(did),
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Phone Numbers</h1>
          <p className="page-subtitle">Manage DIDs, caller IDs, and inbound call routing</p>
        </div>
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
        searchPlaceholder="Search numbers…"
        emptyText="No phone numbers found"
        emptyIcon={<Hash size={40} />}
        search={table.search} onSearchChange={table.setSearch}
        activeFilters={table.filters} onFilterChange={table.setFilter}
        onResetFilters={table.resetFilters} hasActiveFilters={table.hasActiveFilters}
        page={table.page} limit={table.limit} onPageChange={table.setPage}
        headerActions={
          <button onClick={() => navigate('/dids/create')} className="btn-primary">
            <Plus size={15} /> Add DID
          </button>
        }
      />
    </div>
  )
}
