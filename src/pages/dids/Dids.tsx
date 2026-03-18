import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Phone, MessageSquare, Star,
  User, GitBranch, Users, Voicemail, ExternalLink,
  ArrowRight, Hash,
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

// Map numeric dest_type from DB (0=ivr,1=ext,2=vm,4=external,8=queue) to string key
const DEST_NUM_MAP: Record<number, string> = {
  0: 'ivr', 1: 'extension', 2: 'voicemail', 4: 'external', 5: 'conference', 8: 'queue',
}

function toDestKey(raw: string | number | undefined | null): string {
  if (raw === null || raw === undefined) return 'extension'
  if (typeof raw === 'string') {
    const lower = raw.toLowerCase()
    if (lower === 'extension' || lower === 'ivr' || lower === 'queue' || lower === 'voicemail' || lower === 'external') return lower
    const n = Number(lower)
    if (!isNaN(n) && DEST_NUM_MAP[n]) return DEST_NUM_MAP[n]
    return 'extension'
  }
  return DEST_NUM_MAP[raw] ?? 'extension'
}

const DEST_CFG: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string; gradient: string }> = {
  extension: { label: 'Extension', Icon: User,         color: 'text-blue-600',    bg: 'bg-blue-50',    gradient: 'from-blue-500 to-indigo-600' },
  ivr:       { label: 'IVR',       Icon: GitBranch,    color: 'text-purple-600',  bg: 'bg-purple-50',  gradient: 'from-purple-500 to-violet-600' },
  queue:     { label: 'Queue',     Icon: Users,        color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-teal-600' },
  voicemail: { label: 'Voicemail', Icon: Voicemail,    color: 'text-amber-600',   bg: 'bg-amber-50',   gradient: 'from-amber-500 to-orange-600' },
  external:  { label: 'External',  Icon: ExternalLink, color: 'text-rose-600',    bg: 'bg-rose-50',    gradient: 'from-rose-500 to-pink-600' },
}

const OP_PILL: Record<string, string> = {
  twilio: 'bg-red-50    text-red-700    ring-red-200',
  plivo:  'bg-orange-50 text-orange-700 ring-orange-200',
  telnyx: 'bg-sky-50    text-sky-700    ring-sky-200',
  vonage: 'bg-violet-50 text-violet-700 ring-violet-200',
}
const OP_DOT: Record<string, string> = {
  twilio: 'bg-red-400', plivo: 'bg-orange-400', telnyx: 'bg-sky-400', vonage: 'bg-violet-400',
}

type RingItem = { id: number; title?: string; name?: string }

// ─── Main page ────────────────────────────────────────────────────────────────

export function Dids() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const table    = useServerTable({ defaultLimit: 15 })

  const { data: extensionsData } = useQuery({
    queryKey: ['extensions'],
    queryFn: () => didService.getExtensions(),
  })
  const extRaw2    = (extensionsData as { data?: unknown })?.data
  const extensions: ExtItem[] = Array.isArray(extRaw2)
    ? (extRaw2 as ExtItem[])
    : ((extRaw2 as { data?: ExtItem[] })?.data ?? [])

  const { data: ringGroupData } = useQuery({
    queryKey: ['ringgroup-list-dropdown'],
    queryFn: () => didService.getRingGroups(),
  })
  const rgRaw2 = (ringGroupData as { data?: unknown })?.data
  const ringGroups: RingItem[] = Array.isArray(rgRaw2)
    ? (rgRaw2 as RingItem[])
    : ((rgRaw2 as { data?: RingItem[] })?.data ?? [])

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
      // Phone number + CNAM + SMS/Default badges — all in one cell
      key: 'cli', header: 'Phone Number',
      render: (did) => {
        const destKey = toDestKey(did.dest_type as string | number | undefined)
        const dest    = DEST_CFG[destKey] ?? DEST_CFG.extension
        const isDefault = Number(did.default_did) === 1
        const hasSms    = Number(did.sms) === 1
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
        const destKey   = toDestKey(did.dest_type as string | number | undefined)
        const dest      = DEST_CFG[destKey] ?? DEST_CFG.extension
        const d = did as Record<string, unknown>
        const destName = (() => {
          if (destKey === 'extension') {
            const extVal = String(did.extension ?? '')
            if (!extVal) return null
            // Try by extension number first, then by user ID (backend may store user_id)
            const ext = extensions.find(e => String(e.extension) === extVal)
              ?? extensions.find(e => String(e.id) === extVal)
            if (ext) {
              const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
              return name ? `${name} (Ext ${ext.extension})` : `Ext ${ext.extension}`
            }
            return `Ext ${extVal}`
          }
          if (destKey === 'voicemail') {
            const vmVal = String(d.voicemail_id ?? did.extension ?? '')
            if (vmVal) {
              const ext = extensions.find(e => String(e.extension) === vmVal)
                ?? extensions.find(e => String(e.id) === vmVal)
              if (ext) {
                const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
                return (name ? `${name}` : `Ext ${ext.extension}`) + ' (VM)'
              }
              return `Ext ${vmVal} (VM)`
            }
          }
          if (destKey === 'queue') {
            // ingroup is stored as ring group numeric ID
            const ingroupVal = String(d.ingroup ?? '')
            if (ingroupVal) {
              const rg = ringGroups.find(r => String(r.id) === ingroupVal)
                ?? ringGroups.find(r => String(r.title || r.name || '') === ingroupVal)
              if (rg) return rg.title || rg.name || `Group #${rg.id}`
            }
          }
          if (destKey === 'external') {
            const fwd = String(d.forward_number ?? '')
            if (fwd) return fwd
          }
          // IVR and fallback — use backend-provided destination_name
          const dn = String(did.destination_name ?? '')
          return (dn && dn !== 'Unknown Extension') ? dn : null
        })()
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Phone Numbers</h1>
          <p className="page-subtitle">Manage DIDs, caller IDs, and inbound call routing</p>
        </div>
      </div>

      {/* ── Data table ── */}
      <ServerDataTable<Did>
        queryKey={['dids']}
        queryFn={(params) => didService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: Did[] } }
          const rows = r?.data?.data ?? []
          if (!table.search) return rows
          const q = table.search.toLowerCase()
          return rows.filter(did =>
            (did.cli  || '').toLowerCase().includes(q) ||
            (did.cnam || '').toLowerCase().includes(q)
          )
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total_rows?: number } }
          return r?.data?.total_rows ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search numbers or caller ID…"
        emptyText="No phone numbers found"
        emptyIcon={<Hash size={40} />}
        search={table.search} onSearchChange={table.setSearch}
        page={table.page} limit={table.limit} onPageChange={table.setPage}
        headerActions={
          <button onClick={() => navigate('/dids/create')} className="btn-primary">
            <Plus size={15} /> Add Number
          </button>
        }
      />
    </div>
  )
}
