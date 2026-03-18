import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Phone, MessageSquare, Star,
  User, GitBranch, Users, Voicemail, ExternalLink,
  ArrowRight, Hash,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column, type FilterDef } from '../../components/ui/ServerDataTable'
import { RowActions } from '../../components/ui/RowActions'
import { didService } from '../../services/did.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import { formatPhoneNumber } from '../../utils/format'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtItem = { id: number; extension: string; first_name?: string; last_name?: string }

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
  extension: { label: 'Extension', Icon: User,         color: 'text-blue-600',    bg: 'bg-blue-50',    gradient: 'from-blue-500 to-indigo-600' },
  ivr:       { label: 'IVR',       Icon: GitBranch,    color: 'text-purple-600',  bg: 'bg-purple-50',  gradient: 'from-purple-500 to-violet-600' },
  queue:     { label: 'Queue',     Icon: Users,        color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-teal-600' },
  voicemail: { label: 'Voicemail', Icon: Voicemail,    color: 'text-amber-600',   bg: 'bg-amber-50',   gradient: 'from-amber-500 to-orange-600' },
  external:  { label: 'External',  Icon: ExternalLink, color: 'text-rose-600',    bg: 'bg-rose-50',    gradient: 'from-rose-500 to-pink-600' },
}

// Operator quick-filter tabs
const OPERATOR_TABS = [
  { value: '',       label: 'All',    dot: '',              activeClasses: 'bg-indigo-50  text-indigo-700  border-indigo-300' },
  { value: 'twilio', label: 'Twilio', dot: 'bg-red-400',    activeClasses: 'bg-red-50     text-red-700     border-red-300' },
  { value: 'plivo',  label: 'Plivo',  dot: 'bg-orange-400', activeClasses: 'bg-orange-50  text-orange-700  border-orange-300' },
  { value: 'telnyx', label: 'Telnyx', dot: 'bg-sky-400',    activeClasses: 'bg-sky-50     text-sky-700     border-sky-300' },
  { value: 'vonage', label: 'Vonage', dot: 'bg-violet-400', activeClasses: 'bg-violet-50  text-violet-700  border-violet-300' },
  { value: 'other',  label: 'Other',  dot: 'bg-slate-400',  activeClasses: 'bg-slate-100  text-slate-700   border-slate-300' },
]

const OP_PILL: Record<string, string> = {
  twilio: 'bg-red-50    text-red-700    ring-red-200',
  plivo:  'bg-orange-50 text-orange-700 ring-orange-200',
  telnyx: 'bg-sky-50    text-sky-700    ring-sky-200',
  vonage: 'bg-violet-50 text-violet-700 ring-violet-200',
}
const OP_DOT: Record<string, string> = {
  twilio: 'bg-red-400', plivo: 'bg-orange-400', telnyx: 'bg-sky-400', vonage: 'bg-violet-400',
}

const ROUTE_FILTERS: FilterDef[] = [
  {
    key: 'dest_type',
    label: 'Routing Type',
    options: [
      { value: 'extension', label: 'Extension' },
      { value: 'ivr',       label: 'IVR' },
      { value: 'queue',     label: 'Queue' },
      { value: 'voicemail', label: 'Voicemail' },
      { value: 'external',  label: 'External' },
    ],
  },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export function Dids() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const table    = useServerTable({ defaultLimit: 15 })

  const { data: extensionsData } = useQuery({
    queryKey: ['extensions'],
    queryFn: () => didService.getExtensions(),
  })
  const extensions: ExtItem[] = (extensionsData as { data?: { data?: ExtItem[] } })?.data?.data ?? []

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

  const activeOperator = table.filters.operator ?? ''

  const columns: Column<Did>[] = [
    {
      // Phone number + CNAM + SMS/Default badges — all in one cell
      key: 'cli', header: 'Phone Number',
      render: (did) => {
        const destKey = String(did.dest_type || 'extension').toLowerCase()
        const dest    = DEST_CFG[destKey] ?? DEST_CFG.extension
        const isDefault = Boolean(did.default_did)
        const hasSms    = Boolean(did.sms)
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm',
              dest.gradient
            )}>
              <Phone size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono font-bold text-slate-900 tracking-tight">
                  {formatPhoneNumber(did.cli)}
                </span>
                {isDefault && <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
              </div>
              {did.cnam && (
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">{did.cnam}</p>
              )}
              {(hasSms || isDefault) && (
                <div className="flex items-center gap-1 mt-1.5">
                  {hasSms && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                      <MessageSquare size={7} /> SMS
                    </span>
                  )}
                  {isDefault && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                      <Star size={7} className="fill-amber-500" /> Default
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'dest_type', header: 'Routing',
      render: (did) => {
        const destKey = String(did.dest_type || 'extension').toLowerCase()
        const dest    = DEST_CFG[destKey] ?? DEST_CFG.extension
        const destName = did.destination_name || did.extension?.toString()
        return (
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm',
              dest.bg
            )}>
              <dest.Icon size={12} className={dest.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 leading-none">{dest.label}</p>
              {destName && (
                <div className="flex items-center gap-1 mt-1">
                  <ArrowRight size={8} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-500 truncate max-w-[130px]">{destName}</span>
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'operator', header: 'Provider',
      render: (did) => {
        const opKey = (did.operator || '').toLowerCase()
        return did.operator ? (
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ring-1',
            OP_PILL[opKey] ?? 'bg-slate-50 text-slate-500 ring-slate-200'
          )}>
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', OP_DOT[opKey] ?? 'bg-slate-400')} />
            <span className="capitalize">{did.operator}</span>
          </span>
        ) : <span className="text-slate-300 text-xs">—</span>
      },
    },
    {
      key: 'actions', header: 'Actions',
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

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Phone Numbers</h1>
          <p className="page-subtitle">Manage DIDs, caller IDs, and inbound call routing</p>
        </div>
        <button onClick={() => navigate('/dids/create')} className="btn-primary flex-shrink-0">
          <Plus size={15} /> Add Number
        </button>
      </div>

      {/* ── Operator quick-filter tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mr-1">
          Provider
        </span>
        {OPERATOR_TABS.map(tab => {
          const isActive = activeOperator === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => table.setFilter('operator', tab.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                isActive
                  ? tab.activeClasses
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              {tab.dot && <span className={cn('w-1.5 h-1.5 rounded-full', tab.dot)} />}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Data table ── */}
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
        searchPlaceholder="Search numbers or caller ID…"
        emptyText="No phone numbers found"
        emptyIcon={<Hash size={40} />}
        filters={ROUTE_FILTERS}
        search={table.search}           onSearchChange={table.setSearch}
        activeFilters={table.filters}   onFilterChange={table.setFilter}
        onResetFilters={table.resetFilters} hasActiveFilters={table.hasActiveFilters}
        page={table.page} limit={table.limit} onPageChange={table.setPage}
      />
    </div>
  )
}
