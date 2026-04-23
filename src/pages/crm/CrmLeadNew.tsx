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
  ArrowUpRight, PhoneCall, Star, LayoutDashboard, ChevronDown, Plus,
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
import { RichEmailEditor }       from '../../components/crm/RichEmailEditor'
import type { RichEmailEditorRef } from '../../components/crm/RichEmailEditor'
import { confirmDelete }         from '../../utils/confirmDelete'
import { formatPhoneNumber }    from '../../utils/format'
import type { CrmLead, LeadStatus, CrmDocument, CrmLabel, EmailTemplate, SmsTemplate } from '../../types/crm.types'
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
function OverviewTab({ lead, leadId, leadFields, onUpdated, editingProp, setEditingProp, activeTab, onSendEmail, onSendSms }: {
  lead: CrmLead; leadId: number; leadFields: CrmLabel[]; onUpdated: () => void
  editingProp?: boolean; setEditingProp?: (v: boolean) => void
  activeTab?: string; onSendEmail?: () => void; onSendSms?: () => void
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
  const [showOwner2Confirm, setShowOwner2Confirm] = useState(false)
  useEffect(() => {
    if (!hasOwner2Fields) { setShowOwner2(false); return }
    const hasData = secondOwner.some(f => {
      const val = lr[f.field_key]
      return val !== null && val !== undefined && String(val).trim() !== ''
    })
    setShowOwner2(hasData)
  }, [lead, leadFields])

  // Remove Owner 2 mutation — clears all second_owner EAV fields
  const removeOwner2Mut = useMutation({
    mutationFn: () => {
      const clearData: Record<string, unknown> = {}
      secondOwner.forEach(f => { clearData[f.field_key] = '' })
      return leadService.update(leadId, clearData)
    },
    onSuccess: () => {
      toast.success('Second owner removed')
      setShowOwner2(false)
      setShowOwner2Confirm(false)
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
      onUpdated()
    },
    onError: () => { toast.error('Failed to remove second owner'); setShowOwner2Confirm(false) },
  })

  /** When unchecking Owner 2 — if data exists, confirm before removing */
  function handleOwner2Toggle(checked: boolean) {
    if (checked) { setShowOwner2(true); return }
    // Check if any Owner 2 fields have data
    const hasData = secondOwner.some(f => {
      const val = lr[f.field_key]
      return val !== null && val !== undefined && String(val).trim() !== ''
    })
    if (hasData) {
      setShowOwner2Confirm(true)
    } else {
      setShowOwner2(false)
    }
  }

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
          {(key === 'phone_number' || type === 'phone' || type === 'phone_number') && displayVal && onSendSms && (
            <button onClick={onSendSms} title="Send SMS"
              className="p-1 rounded text-violet-400 hover:bg-violet-50 hover:text-violet-600 transition-colors">
              <MessageSquare size={10} />
            </button>
          )}
          {(key === 'email' || type === 'email') && displayVal && onSendEmail && (
            <button onClick={onSendEmail} title="Send Email"
              className="p-1 rounded text-sky-400 hover:bg-sky-50 hover:text-sky-600 transition-colors">
              <Mail size={10} />
            </button>
          )}
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
      {hasOwner2Fields && (showOwner2 || editing) && (
        <div className="rounded-xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50/40">
            {editing ? (
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={showOwner2}
                  onChange={e => handleOwner2Toggle(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-violet-500 focus:ring-violet-400 cursor-pointer"
                />
                <Users size={12} className="text-violet-500" />
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Owner 2 Information</h3>
                <span className="text-[10px] font-bold text-slate-400">{secondOwner.length}</span>
              </label>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <Users size={12} className="text-violet-500" />
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Owner 2 Information</h3>
                <span className="text-[10px] font-bold text-slate-400">{secondOwner.length}</span>
              </div>
            )}
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

      {/* ── Remove Owner 2 Confirmation Modal ── */}
      {showOwner2Confirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setShowOwner2Confirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 pt-5 pb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Remove Second Owner</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <div className="px-5 py-3">
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Do you want to remove the Second Owner? All owner 2 information will be permanently deleted from this lead.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setShowOwner2Confirm(false)}
                className="inline-flex items-center gap-1 h-8 px-4 rounded-lg text-[12px] font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => removeOwner2Mut.mutate()} disabled={removeOwner2Mut.isPending}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[12px] font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                {removeOwner2Mut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Yes, Remove
              </button>
            </div>
          </div>
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
  const [showEmailModal,  setShowEmailModal]  = useState(false)
  const [showSmsModal,    setShowSmsModal]    = useState(false)
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

  const handleMerchantPortal = () => {
    if (merchantPortal?.url) {
      navigator.clipboard.writeText(String(merchantPortal.url)).then(() => toast.success('Merchant link copied!'))
    } else {
      genPortal.mutate()
    }
  }

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
      <div className="flex-shrink-0 flex items-center gap-3 bg-white border-b border-slate-200/80 shadow-sm"
        style={{ padding: '12px 20px' }}>
        {/* Back */}
        <button onClick={() => navigate('/crm/leads')} title="Back"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex-shrink-0">
          <ArrowLeft size={16} />
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
          <p className="text-[12px] text-slate-500 truncate mt-0.5">
            {lead.email && <span className="font-medium text-slate-600">{String(lead.email)}</span>}
            {lead.email && lead.phone_number && <span className="mx-1.5 text-slate-300">·</span>}
            {lead.phone_number && <span>{formatPhoneNumber(String(lead.phone_number))}</span>}
          </p>
        </div>

        {/* Temperature */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Thermometer size={13} className={temp === 'hot' ? 'text-red-500' : temp === 'warm' ? 'text-amber-500' : temp === 'cold' ? 'text-blue-500' : 'text-slate-400'} />
          <select
            value={temp ?? ''}
            onChange={e => tempMut.mutate(e.target.value)}
            disabled={tempMut.isPending}
            className={`text-[11px] font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer disabled:opacity-50 border ${
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
          <UserCheck size={13} className="text-violet-500" />
          <select
            value={lr['assigned_to'] != null ? String(lr['assigned_to']) : ''}
            onChange={e => assignMut.mutate(e.target.value ? Number(e.target.value) : null)}
            disabled={assignMut.isPending}
            className="text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-violet-400 cursor-pointer disabled:opacity-50"
          >
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Email */}
          <button onClick={() => setShowEmailModal(true)} title="Send Email"
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-semibold text-sky-700 transition-all hover:shadow-sm"
            style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <Mail size={13} /> Email
          </button>
          {/* SMS */}
          <button onClick={() => setShowSmsModal(true)} title="Send SMS"
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-semibold text-violet-700 transition-all hover:shadow-sm"
            style={{ background: '#f5f3ff', border: '1px solid #c4b5fd' }}>
            <MessageSquare size={13} /> SMS
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <button
            onClick={handleMerchantPortal}
            disabled={genPortal.isPending}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-semibold text-amber-700 transition-all hover:shadow-sm disabled:opacity-50"
            style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}
            title={merchantPortal?.url ? 'Copy merchant portal link' : 'Generate merchant portal link'}
          >
            {genPortal.isPending ? <Loader2 size={12} className="animate-spin" /> : merchantPortal?.url ? <Copy size={12} /> : <ExternalLink size={12} />}
            <span className="hidden xl:inline">{merchantPortal?.url ? 'Copy Link' : 'Merchant'}</span>
          </button>
          <div className="w-px h-5 bg-slate-200" />
          {!overviewEditing ? (
            <button onClick={() => setOverviewEditing(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300">
              <Pencil size={11} /> Edit
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
              Editing Overview…
            </span>
          )}

          <button onClick={handleDelete}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
            title="Delete Lead"
          >
            <Trash2 size={13} />
          </button>
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
              <OverviewTab lead={lead} leadId={leadId} leadFields={leadFields} onUpdated={() => qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })} editingProp={overviewEditing} setEditingProp={setOverviewEditing} activeTab={activeTab} onSendEmail={() => setShowEmailModal(true)} onSendSms={() => setShowSmsModal(true)} />
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

      {/* ── Email Modal ── */}
      {showEmailModal && (
        <SendEmailModal leadId={leadId} defaultTo={String(lead?.email ?? '')} onClose={() => setShowEmailModal(false)} />
      )}

      {/* ── SMS Modal ── */}
      {showSmsModal && (
        <SendSmsModal leadId={leadId} defaultTo={String(lead?.phone_number ?? '')} onClose={() => setShowSmsModal(false)} />
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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Replace [[field_key]] placeholders with actual lead values. */
function fillPlaceholders(html: string, lead: Record<string, unknown>): string {
  const resolve = (_match: string, key: string) => {
    const val = lead[key]
    return val !== null && val !== undefined && val !== '' ? String(val) : _match
  }
  return html
    .replace(/\[\[(\w+)\]\]/g, resolve)
    .replace(/\{\{(\w+)\}\}/g, resolve)
}

/** Strip style/script/head tags so HTML is safe for TipTap editor */
function cleanHtmlForEditor(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('style, script, head').forEach(el => el.remove())
  return doc.body.innerHTML
}

// ── Send Email Modal ─────────────────────────────────────────────────────────

function SendEmailModal({ leadId, defaultTo, onClose }: { leadId: number; defaultTo: string; onClose: () => void }) {
  const [to,            setTo]            = useState(defaultTo)
  const [subject,       setSubject]       = useState('')
  const [body,          setBody]          = useState('')
  const [selectedTplId, setSelectedTplId] = useState<number | ''>('')
  const [resolving,     setResolving]     = useState(false)
  const [tab,           setTab]           = useState<'compose' | 'preview'>('compose')
  const editorRef = useRef<RichEmailEditorRef>(null)
  const [tplSearch,     setTplSearch]     = useState('')
  const [tplOpen,       setTplOpen]       = useState(false)
  const tplDropRef = useRef<HTMLDivElement>(null)

  const { data: templates, isLoading: tplLoading } = useQuery({
    queryKey: ['email-templates', 'all'],
    queryFn: async () => {
      const res = await crmService.getEmailTemplates()
      return (res.data?.data ?? res.data ?? []) as EmailTemplate[]
    },
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tplDropRef.current && !tplDropRef.current.contains(e.target as Node)) setTplOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTemplateChange = async (tplId: number | '') => {
    setSelectedTplId(tplId)
    setTplOpen(false)
    setTplSearch('')
    if (tplId === '') { setSubject(''); editorRef.current?.setContent(''); return }
    setResolving(true)
    try {
      const res = await crmService.resolveEmailTemplate(leadId, tplId as number)
      const resolved = res.data?.data ?? res.data
      setSubject(resolved?.subject ?? '')
      editorRef.current?.setContent(cleanHtmlForEditor(resolved?.body ?? ''))
    } catch { toast.error('Failed to load template') }
    finally { setResolving(false) }
  }

  const send = useMutation({
    mutationFn: () => {
      const html = editorRef.current?.getContent() ?? body
      return crmService.sendMerchantEmail(leadId, { to, subject, body: html, is_html: true })
    },
    onSuccess: () => { toast.success('Email sent'); onClose() },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send email'
      toast.error(msg)
    },
  })

  const bodyIsEmpty = !body || body.replace(/<[^>]*>/g, '').trim() === ''
  const previewHtml = body

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: 760, maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
              <Mail size={16} className="text-sky-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm leading-tight">Send Email</p>
              {to && <p className="text-[11px] text-slate-400 mt-0.5">{to}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              {(['compose', 'preview'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all capitalize ${tab === t ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >{t}</button>
              ))}
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X size={15} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === 'compose' ? (
            <div className="flex flex-col gap-4 p-6">
              {/* Template picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500">Email Template</label>
                  <a href="/crm/email-templates" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 font-medium transition-colors">
                    <Plus size={11} /> New Template
                  </a>
                </div>
                <div className="relative" ref={tplDropRef}>
                  <button type="button" onClick={() => !tplLoading && !resolving && setTplOpen(v => !v)} disabled={tplLoading || resolving}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 disabled:opacity-60 transition-colors hover:border-slate-300">
                    <span className={selectedTplId === '' ? 'text-slate-400' : 'text-slate-700 font-medium'}>
                      {selectedTplId !== '' ? (templates ?? []).find(t => t.id === selectedTplId)?.template_name ?? 'Selected template' : 'Select Email Template'}
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      {(resolving || tplLoading) && <Loader2 size={12} className="animate-spin text-sky-500" />}
                      {selectedTplId !== '' && !resolving && (
                        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); handleTemplateChange('') }} onKeyDown={e => e.key === 'Enter' && handleTemplateChange('')}
                          className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X size={10} /></span>
                      )}
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${tplOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  {tplOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                        <Search size={13} className="text-slate-400 flex-shrink-0" />
                        <input autoFocus type="text" value={tplSearch} onChange={e => setTplSearch(e.target.value)} placeholder="Search templates…"
                          className="flex-1 text-xs outline-none text-slate-700 placeholder-slate-400 bg-transparent" />
                        {tplSearch && <button onClick={() => setTplSearch('')} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={11} /></button>}
                      </div>
                      <div className="max-h-52 overflow-y-auto py-1">
                        {(() => {
                          const filtered = (templates ?? []).filter(t => !tplSearch || t.template_name.toLowerCase().includes(tplSearch.toLowerCase()) || (t.subject ?? '').toLowerCase().includes(tplSearch.toLowerCase()))
                          if (!filtered.length) return <p className="px-3 py-4 text-xs text-slate-400 text-center">{tplLoading ? 'Loading…' : tplSearch ? `No match for "${tplSearch}"` : 'No templates available'}</p>
                          return filtered.map(t => (
                            <button key={t.id} type="button" onClick={() => handleTemplateChange(t.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-sky-50 transition-colors ${selectedTplId === t.id ? 'bg-sky-50' : ''}`}>
                              <div className="min-w-0">
                                <p className={`text-sm font-medium truncate ${selectedTplId === t.id ? 'text-sky-700' : 'text-slate-700'}`}>{t.template_name}</p>
                                {t.subject && <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.subject}</p>}
                              </div>
                              {selectedTplId === t.id && <Check size={13} className="text-sky-600 flex-shrink-0 ml-2" />}
                            </button>
                          ))
                        })()}
                      </div>
                      <div className="border-t border-slate-100 px-3 py-2">
                        <a href="/crm/email-templates" target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11px] text-sky-600 hover:text-sky-700 font-medium transition-colors">
                          <ExternalLink size={11} /> Manage all email templates
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* To + Subject */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">To</label>
                  <input type="email" value={to} onChange={e => setTo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Subject</label>
                  <input type="text" value={subject} onChange={e => { setSubject(e.target.value); setSelectedTplId('') }} placeholder="Enter subject..."
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400" />
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Message</label>
                <RichEmailEditor ref={editorRef} onChange={setBody} />
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 min-h-full">
              <div className="max-w-xl mx-auto">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400" />
                  <div className="px-6 py-4 border-b border-slate-100 space-y-2">
                    {[{ label: 'To', value: to || '—' }, { label: 'Subject', value: subject || '—' }].map(row => (
                      <div key={row.label} className="flex items-start gap-3">
                        <span className="text-slate-400 text-[11px] w-14 text-right flex-shrink-0 mt-0.5 font-medium">{row.label}</span>
                        <span className={`text-sm ${row.label === 'Subject' ? 'font-semibold text-slate-900' : 'text-slate-600 font-mono text-[12px]'}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-8 py-6 text-sm text-slate-700 leading-relaxed min-h-32">
                    {body ? <div dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <p className="text-slate-400 italic text-xs">No message content yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <p className="text-[11px] text-slate-400">{bodyIsEmpty ? 'No content yet' : `${body.replace(/<[^>]*>/g, '').length.toLocaleString()} chars`}</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
            <button onClick={() => send.mutate()} disabled={send.isPending || !to || !subject || bodyIsEmpty}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {send.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Email
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Send SMS Modal ───────────────────────────────────────────────────────────

function SendSmsModal({ leadId, defaultTo, onClose }: { leadId: number; defaultTo: string; onClose: () => void }) {
  const [to,          setTo]          = useState(defaultTo)
  const [body,        setBody]        = useState('')
  const [fromNumber,  setFromNumber]  = useState('')
  const [selectedTpl, setSelectedTpl] = useState<number | ''>('')

  const MAX_SEGMENT = 160
  const segments = Math.ceil((body.length || 1) / MAX_SEGMENT)
  const charsLeft = segments * MAX_SEGMENT - body.length

  const { data: senderNumbers, isLoading: numbersLoading } = useQuery({
    queryKey: ['sms-sender-numbers'],
    queryFn: async () => {
      const res = await crmService.getSmsSenderNumbers()
      const arr = res.data?.data?.numbers ?? res.data?.numbers ?? res.data?.data ?? []
      return (Array.isArray(arr) ? arr : []) as { phone_number: string; friendly_name?: string }[]
    },
    staleTime: 60 * 1000,
  })

  const { data: templates } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const res  = await crmService.getSmsTemplates()
      const rows = (res.data?.data ?? res.data ?? []) as Record<string, unknown>[]
      return rows.map(r => ({
        ...r,
        sms_template_name: r.template_name ?? r.sms_template_name ?? '',
        sms_template:      r.template_html  ?? r.sms_template      ?? '',
        status: Number(r.status) as 0 | 1,
      })) as SmsTemplate[]
    },
    staleTime: 60 * 1000,
  })

  const { data: leadData } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => (r => (r.data?.data ?? r.data) as CrmLead)(await leadService.getById(leadId)),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!fromNumber && senderNumbers && senderNumbers.length > 0) setFromNumber(senderNumbers[0].phone_number)
  }, [senderNumbers, fromNumber])

  const handleTemplateChange = (tplId: number | '') => {
    setSelectedTpl(tplId)
    if (tplId === '') { setBody(''); return }
    const tpl = (templates ?? []).find(t => t.id === tplId)
    if (tpl) {
      const resolved = leadData ? fillPlaceholders(tpl.sms_template, leadData as Record<string, unknown>) : tpl.sms_template
      setBody(resolved)
    }
  }

  const send = useMutation({
    mutationFn: () => crmService.sendLeadSms(leadId, { to, body, from_number: fromNumber || undefined }),
    onSuccess: () => { toast.success('SMS sent successfully'); onClose() },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send SMS'
      toast.error(msg)
    },
  })

  const canSend = to.trim().length > 0 && body.trim().length > 0 && !send.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: 520 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
              <MessageSquare size={15} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Send Text Message</h2>
              <p className="text-xs text-slate-400 mt-0.5">SMS via connected number</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 overflow-y-auto" style={{ maxHeight: '65vh' }}>
          {(templates ?? []).length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Template <span className="text-slate-400">(optional)</span></label>
              <select value={selectedTpl} onChange={e => handleTemplateChange(e.target.value === '' ? '' : Number(e.target.value))} className="input w-full text-xs">
                <option value="">— Select a template —</option>
                {(templates ?? []).map(t => <option key={t.id} value={t.id}>{t.sms_template_name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To <span className="text-red-500">*</span></label>
              <input type="tel" value={to} onChange={e => setTo(e.target.value)} placeholder="e.g. +12025551234" className="input w-full text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              {numbersLoading ? (
                <div className="input w-full text-xs flex items-center gap-1.5 text-slate-400"><Loader2 size={12} className="animate-spin" /> Loading…</div>
              ) : (
                <select value={fromNumber} onChange={e => setFromNumber(e.target.value)} className="input w-full text-xs">
                  <option value="">— Auto-select —</option>
                  {(senderNumbers ?? []).map(n => <option key={n.phone_number} value={n.phone_number}>{n.friendly_name ? `${n.friendly_name} (${n.phone_number})` : n.phone_number}</option>)}
                </select>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600">Message <span className="text-red-500">*</span></label>
              <span className={`text-[11px] font-mono ${charsLeft < 20 ? 'text-orange-500' : 'text-slate-400'}`}>{charsLeft} chars · {segments} {segments === 1 ? 'segment' : 'segments'}</span>
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Type your message…" className="input w-full text-sm resize-none" maxLength={1600} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
          <button type="button" disabled={!canSend} onClick={() => send.mutate()}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50">
            {send.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Text
          </button>
        </div>

      </div>
    </div>
  )
}
