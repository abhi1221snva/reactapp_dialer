import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/auth.store'
import {
  Plus, Pencil, Trash2, Phone, MessageSquare, Star,
  User, GitBranch, Users, Voicemail, ExternalLink,
  ArrowRight, Hash, Search, ChevronLeft, ChevronRight,
  UserCheck, PhoneIncoming, Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { didService } from '../../services/did.service'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import { formatPhoneNumber } from '../../utils/format'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtItem  = { id: number; extension: string; first_name?: string; last_name?: string }
type RingItem = { id: number; title?: string; name?: string }

interface Did {
  id: number
  cli: string
  cnam?: string
  dest_type?: string | number
  destination_name?: string
  extension?: string
  ivr_id?: string | number
  ingroup?: string | number
  voicemail_id?: string | number
  forward_number?: string
  sms?: number | string
  sms_email?: string
  assigned_user_id?: number
  assigned_user_name?: string
  default_did?: number | string
  operator?: string
  voip_provider?: string
  call_time_department_id?: string | number
  call_time_holiday?: number | string
  call_screening_status?: number | string
  [key: string]: unknown
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DEST_NUM_MAP: Record<number, string> = {
  0: 'ivr', 1: 'extension', 2: 'voicemail', 4: 'external', 5: 'conference', 8: 'queue',
}

function toDestKey(raw: string | number | undefined | null): string {
  if (raw === null || raw === undefined) return 'extension'
  if (typeof raw === 'string') {
    const lower = raw.toLowerCase()
    if (['extension','ivr','queue','voicemail','external','conference'].includes(lower)) return lower
    const n = Number(lower)
    if (!isNaN(n) && DEST_NUM_MAP[n]) return DEST_NUM_MAP[n]
    return 'extension'
  }
  return DEST_NUM_MAP[raw] ?? 'extension'
}

const DEST_CFG: Record<string, {
  label: string; Icon: React.ElementType
  color: string; bg: string; gradient: string
}> = {
  extension:  { label: 'Extension',         Icon: User,         color: 'text-blue-600',    bg: 'bg-blue-100',    gradient: 'from-blue-500 to-indigo-600' },
  ivr:        { label: 'IVR',               Icon: GitBranch,    color: 'text-purple-600',  bg: 'bg-purple-100',  gradient: 'from-purple-500 to-violet-600' },
  queue:      { label: 'Ring Group',        Icon: Users,        color: 'text-emerald-600', bg: 'bg-emerald-100', gradient: 'from-emerald-500 to-teal-600' },
  voicemail:  { label: 'Voicemail',         Icon: Voicemail,    color: 'text-amber-600',   bg: 'bg-amber-100',   gradient: 'from-amber-500 to-orange-600' },
  external:   { label: 'External Fwd',      Icon: ExternalLink, color: 'text-rose-600',    bg: 'bg-rose-100',    gradient: 'from-rose-500 to-pink-600' },
  conference: { label: 'Conference',        Icon: Users,        color: 'text-indigo-600',  bg: 'bg-indigo-100',  gradient: 'from-indigo-500 to-blue-600' },
}

const OP_STYLE: Record<string, { pill: string; dot: string }> = {
  twilio: { pill: 'bg-red-50    text-red-700    ring-red-200',    dot: 'bg-red-400' },
  plivo:  { pill: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-400' },
  telnyx: { pill: 'bg-sky-50    text-sky-700    ring-sky-200',    dot: 'bg-sky-400' },
  vonage: { pill: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-400' },
}

// ─── Row component ────────────────────────────────────────────────────────────

function DidRow({
  did, extensions, ringGroups, onEdit, onDelete, deleting,
}: {
  did: Did
  extensions: ExtItem[]
  ringGroups: RingItem[]
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const d           = did as Record<string, unknown>
  const destKey     = toDestKey(did.dest_type)
  const dest        = DEST_CFG[destKey] ?? DEST_CFG.extension
  const opKey       = ((did.operator || did.voip_provider || '') as string).toLowerCase()
  const opStyle     = OP_STYLE[opKey]
  const isDefault   = Number(did.default_did) === 1
  const hasSms      = Number(did.sms) === 1
  const hasCallTimes = !!(did.call_time_department_id && String(did.call_time_department_id) !== '0')
  const hasHoliday  = Number(did.call_time_holiday) === 1
  const hasScreening = Number(did.call_screening_status) === 1

  // Resolve routing destination label
  const routingTarget = (() => {
    if (destKey === 'extension') {
      const val = String(did.extension ?? '')
      if (!val || val === '0') return null
      const ext = extensions.find(e => String(e.extension) === val) ?? extensions.find(e => String(e.id) === val)
      if (ext) {
        const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
        return name ? `${name} (${ext.extension})` : `Ext ${ext.extension}`
      }
      return `Ext ${val}`
    }
    if (destKey === 'voicemail') {
      const val = String(d.voicemail_id ?? did.extension ?? '')
      if (!val || val === '0') return null
      const ext = extensions.find(e => String(e.extension) === val) ?? extensions.find(e => String(e.id) === val)
      if (ext) {
        const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
        return (name || `Ext ${ext.extension}`) + ' VM'
      }
      return `Ext ${val} VM`
    }
    if (destKey === 'queue') {
      const val = String(d.ingroup ?? '')
      if (!val) return null
      const rg = ringGroups.find(r => String(r.id) === val) ?? ringGroups.find(r => (r.title || r.name || '') === val)
      return rg ? (rg.title || rg.name || `Group #${rg.id}`) : `Group #${val}`
    }
    if (destKey === 'external') {
      const fwd = String(d.forward_number ?? '')
      return fwd ? formatPhoneNumber(fwd) : null
    }
    const dn = String(did.destination_name ?? '')
    return (dn && dn !== 'Unknown Extension' && dn !== 'Unknown Type') ? dn : null
  })()

  // Resolve SMS assigned user
  const smsUser = (() => {
    if (did.assigned_user_name) return String(did.assigned_user_name)
    const uid = String(did.sms_email ?? '')
    if (!uid || uid === '0') return null
    const ext = extensions.find(e => String(e.id) === uid)
    if (ext) return [ext.first_name, ext.last_name].filter(Boolean).join(' ') || `User #${uid}`
    return null
  })()

  return (
    <tr className={cn(
      'group border-b border-slate-100 hover:bg-slate-50/70 transition-colors',
      isDefault && 'bg-amber-50/30 hover:bg-amber-50/50'
    )}>

      {/* ── Phone Number ── */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm',
            dest.gradient
          )}>
            <Phone size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-sm text-slate-900 tracking-tight">
                {formatPhoneNumber(did.cli)}
              </span>
              {isDefault && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                  <Star size={7} className="fill-amber-500" /> Default
                </span>
              )}
            </div>
            {did.cnam
              ? <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{did.cnam}</p>
              : <p className="text-[11px] text-slate-300 italic leading-tight mt-0.5">No caller ID</p>
            }
          </div>
        </div>
      </td>

      {/* ── Inbound Routing ── */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', dest.bg)}>
            <dest.Icon size={12} className={dest.color} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 leading-none">{dest.label}</p>
            {routingTarget ? (
              <div className="flex items-center gap-1 mt-1">
                <ArrowRight size={8} className="text-slate-300 flex-shrink-0" />
                <span className="text-[11px] text-slate-500 truncate max-w-[140px]">{routingTarget}</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-300 italic mt-0.5">No target</p>
            )}
          </div>
        </div>
      </td>

      {/* ── SMS ── */}
      <td className="px-4 py-3.5">
        {hasSms ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={12} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-700 leading-none">Enabled</p>
              {smsUser ? (
                <div className="flex items-center gap-1 mt-1">
                  <UserCheck size={8} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-500 truncate max-w-[110px]">{smsUser}</span>
                </div>
              ) : (
                <p className="text-[11px] text-amber-500 italic mt-0.5">Unassigned</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={12} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400">Off</p>
          </div>
        )}
      </td>

      {/* ── Provider ── */}
      <td className="px-4 py-3.5">
        {opKey && opStyle ? (
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold ring-1',
            opStyle.pill
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', opStyle.dot)} />
            <span className="capitalize">{opKey}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>

      {/* ── Actions ── */}
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Dids() {
  const navigate      = useNavigate()
  const qc            = useQueryClient()
  const clientId      = useAuthStore(s => s.user?.parent_id)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const limit = 15

  // ── Lookup lists ──────────────────────────────────────────────────────────
  const { data: extensionsData } = useQuery({
    queryKey: ['extensions', clientId],
    queryFn: () => didService.getExtensions(),
  })
  const extRaw = (extensionsData as { data?: unknown })?.data
  const extensions: ExtItem[] = Array.isArray(extRaw)
    ? (extRaw as ExtItem[])
    : ((extRaw as { data?: ExtItem[] })?.data ?? [])

  const { data: ringGroupData } = useQuery({
    queryKey: ['ringgroup-list-dropdown', clientId],
    queryFn: () => didService.getRingGroups(),
  })
  const rgRaw = (ringGroupData as { data?: unknown })?.data
  const ringGroups: RingItem[] = Array.isArray(rgRaw)
    ? (rgRaw as RingItem[])
    : ((rgRaw as { data?: RingItem[] })?.data ?? [])

  // ── DID list ──────────────────────────────────────────────────────────────
  const { data: listData, isLoading } = useQuery({
    queryKey: ['dids', page, limit, search],
    queryFn: () => didService.list({ page, limit, search, filters: {} }),
    placeholderData: (prev) => prev,
  })
  const raw       = (listData as { data?: { data?: Did[]; total_rows?: number } })?.data
  const rows: Did[] = raw?.data ?? []
  const totalRows  = raw?.total_rows ?? 0
  const totalPages = Math.max(1, Math.ceil(totalRows / limit))

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => didService.delete(id),
    onSuccess: (res) => {
      setDeletingId(null)
      const ok = res?.data?.success
      if (ok === false || ok === 'false' || ok === 0) { toast.error('Unable to delete DID.'); return }
      toast.success('DID deleted')
      qc.invalidateQueries({ queryKey: ['dids'] })
    },
    onError: () => { setDeletingId(null); toast.error('Failed to delete DID') },
  })

  const handleDelete = async (did: Did) => {
    if (await confirmDelete(did.cli)) {
      setDeletingId(did.id)
      deleteMutation.mutate(did.id)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Phone Numbers</h1>
          <p className="page-subtitle">Manage DIDs, call routing, and SMS assignments</p>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="input pl-9 h-9"
            placeholder="Search numbers or caller ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => navigate('/dids/create')} className="btn-primary">
            <Plus size={15} /> Add Number
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <Phone size={10} /> Phone Number
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <PhoneIncoming size={10} /> Inbound Routing
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <MessageSquare size={10} /> SMS
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Provider</div>
                </th>
                <th className="px-4 py-3 text-right">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <Loader2 size={24} className="animate-spin text-indigo-400 mx-auto" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Hash size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">No phone numbers found</p>
                      <p className="text-xs text-slate-400">
                        {search ? 'Try a different search term' : 'Add your first DID to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(did => (
                  <DidRow
                    key={did.id}
                    did={did}
                    extensions={extensions}
                    ringGroups={ringGroups}
                    onEdit={() => navigate(`/dids/${did.id}/edit`)}
                    onDelete={() => handleDelete(did)}
                    deleting={deletingId === did.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination (inside the card) ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              {((page - 1) * limit) + 1}–{Math.min(page * limit, totalRows)} of {totalRows} numbers
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1
                  : page <= 4 ? i + 1
                  : page >= totalPages - 3 ? totalPages - 6 + i
                  : page - 3 + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-7 h-7 rounded-lg border text-xs font-semibold transition-colors',
                      p === page
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
