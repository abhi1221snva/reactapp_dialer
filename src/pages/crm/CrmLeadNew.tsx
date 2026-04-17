/**
 * CrmLeadNew.tsx  — Premium CRM Lead View  (Green Edition)
 * Route: /crm/leads-new/:id
 *
 * UI Principles:
 *   • Dense, information-rich layout — minimal scrolling
 *   • Green CRM theme (#059669 / emerald)
 *   • 4-column field grids, 2×2 KPI tiles, micro-table metadata
 *   • Pill-style compact tabs, inline editing, copy icons
 *   • No backend changes — same API, same services
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft, Loader2, X, AlertCircle, Phone, Mail, Briefcase,
  User, Users, Clock, DollarSign, FileText, FolderOpen, Building2,
  TrendingUp, ShieldCheck, CheckCircle, Send, FileBarChart,
  Pencil, Trash2, Download, Copy, ExternalLink, Upload, Search,
  Hash, MessageSquare, Activity, MoreVertical, UserCheck,
  Tag, Calendar, Check, Eye, SlidersHorizontal, Sparkles,
  Zap, MapPin, Globe, Thermometer,
  ArrowUpRight, PhoneCall, Star, LayoutDashboard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import toast from 'react-hot-toast'

import { leadService }          from '../../services/lead.service'
import { crmService }           from '../../services/crm.service'
import { ActivityTimeline }     from '../../components/crm/ActivityTimeline'
import { OffersStipsTab }       from '../../components/crm/OffersStipsTab'
import { DealTab }              from '../../components/crm/DealTab'
import { ComplianceTab }        from '../../components/crm/ComplianceTab'
import { BankStatementTab }     from '../../components/crm/BankStatementTab'
import { DripLeadPanel }        from '../../components/crm/DripLeadPanel'
import { ApprovalsSection }     from '../../components/crm/ApprovalsSection'
import { DynamicFieldForm }     from '../../components/crm/DynamicFieldForm'
import { DocumentsPanel }       from '../../components/crm/LeadDocumentsPanel'
import { LendersPanel }         from '../../components/crm/LeadLendersPanel'
import { confirmDelete }         from '../../utils/confirmDelete'
import { formatPhoneNumber }    from '../../utils/format'
import type { CrmLead, LeadStatus, CrmDocument, CrmLabel } from '../../types/crm.types'
import { useUIStore }           from '../../stores/ui.store'

// ─── Design tokens ────────────────────────────────────────────────────────────
const G = {
  600: '#059669',   // emerald-600 — primary accent
  500: '#10b981',   // emerald-500 — lighter
  700: '#047857',   // emerald-700 — darker
  50:  '#f0fdf4',   // emerald-50
  100: '#dcfce7',   // emerald-100
  HDR: 'linear-gradient(135deg, #043d2c 0%, #065f46 55%, #043d2c 100%)', // header bg
}

// ─── Tab system ───────────────────────────────────────────────────────────────
type TabId =
  | 'overview' | 'documents' | 'activity' | 'lenders'
  | 'offers' | 'deal' | 'compliance' | 'approvals'
  | 'bank-statements' | 'drip'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'activity',        label: 'Activity',    icon: Activity        },
  { id: 'documents',       label: 'Documents',   icon: FolderOpen      },
  { id: 'lenders',         label: 'Lenders',     icon: Building2       },
  { id: 'offers',          label: 'Offers',      icon: DollarSign      },
  { id: 'deal',            label: 'Deal',        icon: TrendingUp      },
  { id: 'compliance',      label: 'Compliance',  icon: ShieldCheck     },
  { id: 'drip',            label: 'Drip',        icon: Send            },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-cyan-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-slate-500 to-slate-700',
]

function initials(n: string) {
  const p = n.trim().split(/\s+/)
  return p.length === 1 ? (p[0][0] ?? '?').toUpperCase() : ((p[0][0] ?? '') + (p[p.length - 1][0] ?? '')).toUpperCase()
}

function formatBytes(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1_048_576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1_048_576).toFixed(1) + ' MB'
}

function getFileExt(p: string | null | undefined) {
  const e = (p?.split('.').pop() ?? '').toLowerCase()
  if (e === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e)) return 'image'
  return 'other'
}

function days(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function copyToClipboard(text: string, label = 'Copied') {
  navigator.clipboard.writeText(text).then(() => toast.success(label + ' copied'))
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Pulse({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md ${className}`} style={style} />
}

function PageSkeleton() {
  return (
    <div className="flex flex-col h-full" style={{ background: G.HDR }}>
      <div className="flex-shrink-0 px-5 py-2.5 flex items-center gap-3">
        <Pulse className="w-7 h-7 bg-white/10" />
        <Pulse className="w-9 h-9 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-1.5">
          <Pulse className="h-4 w-40 bg-white/10" />
          <Pulse className="h-3 w-64 bg-white/10" />
        </div>
        <div className="flex gap-1.5">
          {[72, 56, 56, 64].map((w, i) => <Pulse key={i} className={`h-7 bg-white/10`} style={{ width: w }} />)}
        </div>
      </div>
      <div className="grid grid-cols-12 flex-1 overflow-hidden bg-slate-50">
        <div className="col-span-8 p-4 space-y-3">
          <Pulse className="h-9 w-full bg-white border border-slate-100" />
          {[180, 140, 100].map((h, i) => <Pulse key={i} className="w-full bg-white border border-slate-100" style={{ height: h }} />)}
        </div>
      </div>
    </div>
  )
}



// ─── Overview Tab — section buckets (mirrors CrmLeadCreate.tsx) ──────────────
const OV_PERSONAL_SECTIONS  = new Set(['owner', 'contact', 'address', 'general', 'other'])
const OV_BUSINESS_SECTIONS  = new Set(['business', 'funding', 'financial', 'documents', 'custom'])
const OV_OWNER2_SECTIONS    = new Set(['second_owner'])

function bucketLeadFields(fields: CrmLabel[]) {
  const personal: CrmLabel[] = [], business: CrmLabel[] = [], secondOwner: CrmLabel[] = []
  for (const f of fields) {
    const sec = f.section || 'other'
    if (OV_OWNER2_SECTIONS.has(sec))      secondOwner.push(f)
    else if (OV_BUSINESS_SECTIONS.has(sec)) business.push(f)
    else                                    personal.push(f)
  }
  return { personal, business, secondOwner }
}

// Core owner fields (static, defined outside component so references stay stable)
const OV_CORE_FIELDS: { key: string; label: string; type?: string; isWide?: boolean }[] = [
  { key: 'first_name',   label: 'First Name'   },
  { key: 'last_name',    label: 'Last Name'     },
  { key: 'email',        label: 'Email',        type: 'email' },
  { key: 'phone_number', label: 'Phone',        type: 'tel'   },
  { key: 'city',         label: 'City'          },
  { key: 'state',        label: 'State'         },
]

// ─── Field icon map ───────────────────────────────────────────────────────────
const FIELD_ICON_MAP: Record<string, LucideIcon> = {
  first_name: User, last_name: User,
  email: Mail,
  phone_number: Phone,
  city: MapPin, state: MapPin,
  country: Globe,
}
function resolveFieldIcon(key: string, type?: string): LucideIcon {
  if (FIELD_ICON_MAP[key]) return FIELD_ICON_MAP[key]
  if (type === 'email') return Mail
  if (type === 'phone' || type === 'phone_number') return Phone
  if (type === 'url') return Globe
  return Sparkles
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ lead, leadId, leadFields, onUpdated, editingProp, setEditingProp, activeTab }: {
  lead: CrmLead; leadId: number; leadFields: CrmLabel[]; onUpdated: () => void
  editingProp?: boolean; setEditingProp?: (v: boolean) => void
  activeTab?: string
}) {
  const qc = useQueryClient()
  const [editingLocal, setEditingLocal] = useState(false)
  const editing    = editingProp    !== undefined ? editingProp    : editingLocal
  const setEditing = setEditingProp !== undefined ? setEditingProp : setEditingLocal

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<Record<string, unknown>>({
    defaultValues: lead as Record<string, unknown>,
  })

  useEffect(() => { reset(lead as Record<string, unknown>) }, [lead, reset])

  const saveMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => leadService.update(leadId, data),
    onSuccess: () => {
      toast.success('Saved')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
      onUpdated()
    },
    onError: () => toast.error('Update failed'),
  })

  const lr = lead as Record<string, unknown>

  // ALL field_keys (active + inactive) — used to suppress hardcoded core fields.
  // An inactive field in crm_labels must block its hardcoded fallback from appearing.
  const labelKeys = useMemo(() => new Set(leadFields.map(f => f.field_key)), [leadFields])

  // Active fields only — used for rendering.
  const activeLeadFields = useMemo(
    () => leadFields.filter(f => f.status === true || (f.status as unknown) == 1),
    [leadFields],
  )
  const { personal, business, secondOwner } = useMemo(() => bucketLeadFields(activeLeadFields), [activeLeadFields])
  const visibleCore = useMemo(() => OV_CORE_FIELDS.filter(f => !labelKeys.has(f.key)), [labelKeys])

  const hasOwnerSection    = visibleCore.length > 0 || personal.length > 0
  const hasBusinessSection = business.length > 0
  const hasOwner2Fields    = secondOwner.length > 0

  // Owner 2 toggle — auto-detect from existing data, user can toggle
  const [showOwner2, setShowOwner2] = useState(false)
  useEffect(() => {
    if (!hasOwner2Fields) { setShowOwner2(false); return }
    const hasData = secondOwner.some(f => {
      const val = lr[f.field_key]
      return val !== null && val !== undefined && String(val).trim() !== ''
    })
    setShowOwner2(hasData)
  }, [lead, leadFields])

  // Avatar for identity card
  const fullName   = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead #${leadId}`
  const avatarGrad = AVATAR_COLORS[leadId % AVATAR_COLORS.length]
  const leadInits  = initials(fullName)

  // ── Single bordered field card — view or edit ──────────────────────────────
  function fieldCard(key: string, label: string, type?: string) {
    const raw       = lr[key]
    const displayVal = key === 'phone_number' && raw
      ? formatPhoneNumber(String(raw))
      : raw != null && String(raw).trim() !== '' ? String(raw) : ''
    const FIcon     = resolveFieldIcon(key, type)
    const copyable  = /^(email|phone_number)$/.test(key) || type === 'email' || type === 'phone' || type === 'phone_number'
    const inputType = type === 'phone' || type === 'phone_number' ? 'tel'
      : type === 'email' ? 'email'
      : type === 'number' ? 'number'
      : type === 'date' ? 'date'
      : 'text'

    if (editing) {
      return (
        <div key={key} className="flex flex-col gap-1 transition-all">
          <label className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-500 uppercase tracking-wider leading-none pl-0.5">
            <FIcon size={9} className="text-indigo-400" />
            {label}
          </label>
          <input
            type={inputType}
            {...register(key)}
            className="w-full h-9 px-2.5 text-[12px] font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
            placeholder={label}
          />
        </div>
      )
    }

    return (
      <div key={key} className="group relative flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20 cursor-default">
        <FIcon size={11} className="shrink-0 transition-colors text-slate-400 group-hover:text-indigo-500" />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-none">{label}</p>
          {displayVal
            ? <p className="text-[12px] font-semibold text-slate-800 mt-0.5 truncate leading-tight transition-colors group-hover:text-indigo-700" title={displayVal}>{displayVal}</p>
            : <p className="text-[12px] font-semibold mt-0.5 leading-tight text-slate-300">Not set</p>
          }
        </div>
        {/* Hover actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {copyable && displayVal && (
            <button onClick={() => copyToClipboard(String(raw!), label)} title="Copy"
              className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <Copy size={10} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Edit / Cancel / Save in identity card ──────────────────────────────────
  const editBar = !editing ? (
    <button onClick={() => setEditing(true)}
      className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-semibold transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300">
      <Pencil size={11} /> Edit
    </button>
  ) : (
    <div className="flex items-center gap-1.5 shrink-0">
      <button onClick={() => { setEditing(false); reset(lr) }}
        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 transition-colors">
        <X size={11} /> Cancel
      </button>
      <button onClick={handleSubmit(data => saveMut.mutate(data))} disabled={saveMut.isPending || !isDirty}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50 transition-all"
        style={{ background: G[600] }}>
        {saveMut.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
      </button>
    </div>
  )

  // ── Section header bar ─────────────────────────────────────────────────────
  function sectionBar(Icon: LucideIcon, iconClass: string, title: string, count: number) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50/40">
        <Icon size={12} className={iconClass} />
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
        <span className="text-[10px] font-bold text-slate-400">{count}</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* ── Edit action bar (shown when editing) ── */}
      {editing && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200">
          <span className="text-[11px] font-semibold text-indigo-700">Editing lead info</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setEditing(false); reset(lr as Record<string, unknown>) }}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 transition-colors">
              <X size={10} /> Cancel
            </button>
            <button onClick={handleSubmit(data => saveMut.mutate(data))} disabled={saveMut.isPending || !isDirty}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: G[600] }}>
              {saveMut.isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Save
            </button>
          </div>
        </div>
      )}

      {/* ── Contact Information ── */}
      {hasOwnerSection && (
        <div className="rounded-xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">
          {sectionBar(User, 'text-indigo-500', 'Owner Information', visibleCore.length + personal.length)}
          <div className={editing ? 'p-3' : 'p-2'}>
            <div className={`grid gap-2 ${editing ? 'grid-cols-2 sm:grid-cols-3' : activeTab === 'lenders' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {visibleCore.map(f => fieldCard(f.key, f.label, f.type))}
              {personal.map(f => fieldCard(f.field_key, f.label_name, f.field_type))}
            </div>
          </div>
        </div>
      )}

      {/* ── Business Information ── */}
      {hasBusinessSection && (
        <div className="rounded-xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">
          {sectionBar(Building2, 'text-blue-500', 'Business Information', business.length)}
          <div className={editing ? 'p-3' : 'p-2'}>
            <div className={`grid gap-2 ${editing ? 'grid-cols-2 sm:grid-cols-3' : activeTab === 'lenders' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {business.map(f => fieldCard(f.field_key, f.label_name, f.field_type))}
            </div>
          </div>
        </div>
      )}

      {/* ── Owner 2 Information ── */}
      {hasOwner2Fields && (
        <div className="rounded-xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50/40">
            <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={showOwner2}
                onChange={e => setShowOwner2(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-violet-500 focus:ring-violet-400 cursor-pointer"
              />
              <Users size={12} className="text-violet-500" />
              <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Owner 2 Information</h3>
              <span className="text-[10px] font-bold text-slate-400">{secondOwner.length}</span>
            </label>
          </div>
          {showOwner2 && (
            <div className={editing ? 'p-3' : 'p-2'}>
              <div className={`grid gap-2 ${editing ? 'grid-cols-2 sm:grid-cols-3' : activeTab === 'lenders' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
                {secondOwner.map(f => fieldCard(f.field_key, f.label_name, f.field_type))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export function CrmLeadNew() {
  const { id }  = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const leadId    = Number(id)

  const [activeTab,       setActiveTab]       = useState<TabId>('documents')
  const [showMoreMenu,    setShowMoreMenu]    = useState(false)
  const [overviewEditing, setOverviewEditing] = useState(false)
  const [showComplianceModal, setShowComplianceModal] = useState(false)
  const tabContentRef = useRef<HTMLDivElement>(null)

  // ── Auto-collapse sidebar on this page only; restore on leave ───────────────
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  useEffect(() => {
    const prev = sidebarCollapsed
    if (!prev) setSidebarCollapsed(true)
    return () => {
      if (!prev) setSidebarCollapsed(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: lead, isLoading } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => {
      const r = await leadService.getById(leadId)
      return (r.data?.data ?? r.data) as CrmLead
    },
    enabled: !!leadId,
  })

  const { data: statuses = [] } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: () => crmService.getLeadStatuses(),
    staleTime: 5 * 60_000,
  })

  const { data: leadFields = [] } = useQuery({
    queryKey: ['crm-lead-fields'],
    queryFn: async () => (await crmService.getLeadFields()).data?.data ?? [] as CrmLabel[],
    staleTime: 5 * 60_000,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['crm-users'],
    queryFn: () => crmService.getUsers(),
    staleTime: 5 * 60_000,
  })

  const assignMut = useMutation({
    mutationFn: (userId: number | null) => leadService.update(leadId, { assigned_to: userId }),
    onSuccess: () => {
      toast.success('Lead assigned')
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to assign'),
  })

  const tempMut = useMutation({
    mutationFn: (val: string) => leadService.update(leadId, { temperature: val || null }),
    onSuccess: () => {
      toast.success('Temperature updated')
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to update temperature'),
  })

  const { data: docs = [] } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => (await crmService.getLeadDocuments(leadId)).data?.data ?? [] as CrmDocument[],
    staleTime: 60_000, enabled: !!leadId,
  })

  const { data: submissions = [] } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      const r = await crmService.getLenderSubmissions(leadId)
      return (r.data?.data ?? r.data ?? []) as { id: number; response_status?: string }[]
    },
    staleTime: 60_000, enabled: !!leadId,
  })

  const { data: merchantPortal } = useQuery({
    queryKey: ['merchant-portal', leadId],
    queryFn: async () => { try { return (await crmService.getMerchantPortal(leadId)).data?.data ?? null } catch { return null } },
    retry: false, staleTime: 60_000, enabled: !!leadId,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const genPortal = useMutation({
    mutationFn: () => crmService.generateMerchantPortal(leadId),
    onSuccess: () => { toast.success('Portal link generated'); qc.invalidateQueries({ queryKey: ['merchant-portal', leadId] }) },
    onError: () => toast.error('Failed'),
  })

  // ── Click-outside more menu ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (showMoreMenu && !(e.target as HTMLElement).closest('[data-more-menu]')) setShowMoreMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showMoreMenu])

  // ── ESC closes compliance modal ────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowComplianceModal(false)
    }
    if (showComplianceModal) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [showComplianceModal])

  function switchTab(tab: TabId) {
    setActiveTab(tab)
    tabContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete() {
    const lr = lead as Record<string, unknown>
    const fullName = [lr.first_name, lr.last_name].filter(Boolean).join(' ') || `Lead #${leadId}`
    if (!await confirmDelete(String(fullName))) return
    try { await leadService.delete(leadId); toast.success('Lead deleted'); navigate('/crm/leads') }
    catch { toast.error('Failed to delete') }
  }

  // ── States ─────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="-mx-5 -mt-5" style={{ height: 'calc(100vh - 64px)' }}><PageSkeleton /></div>
  )

  if (!lead) return (
    <div className="flex items-center gap-2 p-6 text-slate-400">
      <AlertCircle size={16} className="text-red-400" /><span className="text-sm">Lead not found.</span>
    </div>
  )

  // ── Derived values ─────────────────────────────────────────────────────────
  const lr            = lead as Record<string, unknown>
  const fullName      = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead #${leadId}`
  const avatarGrad    = AVATAR_COLORS[leadId % AVATAR_COLORS.length]
  const leadInits     = initials(fullName)
  const curStatus     = statuses.find((s: LeadStatus) => s.lead_title_url === String(lead.lead_status))
  const statusColor   = curStatus?.color_code ?? curStatus?.color ?? G[600]
  const daysInPipe    = days(lead.created_at)
  const loanAmount    = lr['loan_amount'] as string | number | undefined
  const loanFmt       = loanAmount ? `$${Number(String(loanAmount).replace(/[^0-9.]/g, '')).toLocaleString()}` : null
  const approvedCount = submissions.filter(s => s.response_status === 'approved').length

  const TAB_BADGES: Partial<Record<TabId, number>> = {
    documents: docs.length,
    lenders:   submissions.length,
  }

  // temperature pill
  const temp = (lr['temperature'] as string | undefined)?.toLowerCase()
  const TEMP: Record<string, { bg: string; text: string; dot: string }> = {
    hot:  { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
    warm: { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' },
    cold: { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6' },
  }
  const tempCfg = temp ? TEMP[temp] : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-5 -mt-5 flex flex-col"
      style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Full-width identity bar ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200/80 shadow-sm">
        {/* Back */}
        <button onClick={() => navigate('/crm/leads')} title="Back"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex-shrink-0">
          <ArrowLeft size={15} />
        </button>

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
            {leadInits}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        </div>

        {/* Name + email / phone */}
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-slate-900 leading-tight truncate">{fullName}</h2>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {lead.email && <span className="font-medium text-slate-600">{String(lead.email)}</span>}
            {lead.email && lead.phone_number && <span className="mx-1 text-slate-300">·</span>}
            {lead.phone_number && <span>{formatPhoneNumber(String(lead.phone_number))}</span>}
          </p>
        </div>

        {/* Temperature */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Thermometer size={12} className={temp === 'hot' ? 'text-red-500' : temp === 'warm' ? 'text-amber-500' : temp === 'cold' ? 'text-blue-500' : 'text-slate-400'} />
          <select
            value={temp ?? ''}
            onChange={e => tempMut.mutate(e.target.value)}
            disabled={tempMut.isPending}
            className={`text-[11px] font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer disabled:opacity-50 border ${
              temp === 'hot'  ? 'text-red-700 bg-red-50 border-red-200 focus:border-red-400' :
              temp === 'warm' ? 'text-amber-700 bg-amber-50 border-amber-200 focus:border-amber-400' :
              temp === 'cold' ? 'text-blue-700 bg-blue-50 border-blue-200 focus:border-blue-400' :
                                'text-slate-600 bg-slate-50 border-slate-200 focus:border-slate-400'
            }`}
          >
            <option value="">No Temp</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">🌤 Warm</option>
            <option value="cold">❄️ Cold</option>
          </select>
        </div>

        {/* Assigned To */}
        <div className="flex items-center gap-1.5 shrink-0">
          <UserCheck size={12} className="text-violet-500" />
          <select
            value={lr['assigned_to'] != null ? String(lr['assigned_to']) : ''}
            onChange={e => assignMut.mutate(e.target.value ? Number(e.target.value) : null)}
            disabled={assignMut.isPending}
            className="text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-2 py-1 outline-none focus:border-violet-400 cursor-pointer disabled:opacity-50"
          >
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!overviewEditing ? (
            <button onClick={() => setOverviewEditing(true)}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-semibold transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300">
              <Pencil size={11} /> Edit
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
              Editing Overview…
            </span>
          )}

          {/* More (delete / classic view / panel toggle) */}
          <div className="relative" data-more-menu>
            <button onClick={() => setShowMoreMenu(v => !v)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <MoreVertical size={15} />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1">
                <button onClick={() => { navigate(`/crm/leads/${leadId}`); setShowMoreMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  <ArrowUpRight size={13} className="text-slate-400" /> Classic View
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button onClick={() => { handleDelete(); setShowMoreMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                  <Trash2 size={13} /> Delete Lead
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BODY
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#f1f5f9' }}>

        {/* ── TAB BAR — full width col-12 ── */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center min-w-max">
            {TABS.map(t => {
              const Icon    = t.icon
              const badge   = TAB_BADGES[t.id]
              const isModal = t.id === 'compliance'
              const isAct   = activeTab === t.id && !isModal
              return (
                <button key={t.id}
                  onClick={() => {
                    if (t.id === 'compliance') setShowComplianceModal(true)
                    else switchTab(t.id)
                  }}
                  className={[
                    'relative flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-all',
                    isAct
                      ? 'text-emerald-700'
                      : 'text-slate-400 hover:text-slate-600',
                  ].join(' ')}>
                  <Icon size={13} className={isAct ? 'text-emerald-600' : ''} />
                  {t.label}
                  {badge !== undefined && badge > 0 && (
                    <span className={[
                      'text-[9px] font-bold min-w-[16px] text-center px-1 py-px rounded-full leading-tight',
                      isAct ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400',
                    ].join(' ')}>
                      {badge}
                    </span>
                  )}
                  {isAct && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-emerald-600" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── CONTENT ROW — col-8 Overview + col-4 Dynamic (col-5/col-7 on lenders) ── */}
        <div className="grid grid-cols-12 flex-1 overflow-hidden">

          {/* LEFT — Overview fixed, never changes */}
          <aside className={`${activeTab === 'lenders' ? 'col-span-4' : 'col-span-8'} bg-white border-r border-slate-100 overflow-y-auto transition-all duration-300`}>
            <div className="p-4">
              <OverviewTab lead={lead} leadId={leadId} leadFields={leadFields} onUpdated={() => qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })} editingProp={overviewEditing} setEditingProp={setOverviewEditing} activeTab={activeTab} />
            </div>
          </aside>

          {/* RIGHT — dynamic tab content */}
          <div ref={tabContentRef} className={`${activeTab === 'lenders' ? 'col-span-8' : 'col-span-4'} overflow-y-auto p-3 transition-all duration-300`} style={{ background: '#f8fafc' }}>
            <div key={activeTab} style={{ animation: 'fadeUp .15s ease-out' }}>
              {activeTab === 'activity'        && <ActivityTimeline leadId={leadId} />}
              {activeTab === 'documents'       && <DocumentsPanel leadId={leadId} />}
              {activeTab === 'lenders'         && <LendersPanel leadId={leadId} onTabChange={(tab) => switchTab(tab as TabId)} />}
              {activeTab === 'offers'          && <OffersStipsTab leadId={leadId} />}
              {activeTab === 'deal'            && <DealTab leadId={leadId} />}
              {activeTab === 'bank-statements' && <BankStatementTab leadId={leadId} />}
              {activeTab === 'drip'            && <DripLeadPanel leadId={leadId} />}
            </div>
          </div>

        </div>
      </div>

      {/* ── COMPLIANCE MODAL — true fullscreen ───────────────────────────── */}
      {showComplianceModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          style={{ animation: 'fadeUp .15s ease-out' }}
        >
          {/* Sticky header — full width, no radius */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 flex items-center justify-between px-6 py-3.5 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: G[100] }}>
                <ShieldCheck size={15} style={{ color: G[600] }} />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-slate-800">Compliance</h2>
                <p className="text-[11px] text-slate-400">Compliance checks and verification for this lead</p>
              </div>
            </div>
            <button
              onClick={() => setShowComplianceModal(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <X size={13} /> Close
            </button>
          </div>

          {/* Scrollable body — full width, no max-width */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#f8fafc' }}>
            <div className="w-full px-6 py-5">
              <ComplianceTab leadId={leadId} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
