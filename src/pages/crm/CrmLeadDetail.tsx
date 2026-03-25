import { useState, useRef, useEffect } from 'react'
import type { ReactNode, ChangeEvent, RefObject, ComponentType } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Pencil, Loader2, ChevronDown, ChevronUp, Upload, FileText,
  Trash2, Download, Building2, Send, AlertCircle, X, Eye,
  Settings2, Mail, Phone, MapPin, Calendar, User, Briefcase,
  Hash, UserCheck, Clock, FolderOpen, CheckSquare, MoreVertical, Tag,
  ClipboardList, Zap, MessageSquare, FileDown, Plus, ExternalLink, Printer,
  Check, DollarSign, ChevronRight, TrendingUp, FileCheck2, ShieldCheck,
  Activity, Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { ActivityTimeline } from '../../components/crm/ActivityTimeline'
import { ApprovalsSection } from '../../components/crm/ApprovalsSection'
import { MerchantPortalSection } from '../../components/crm/MerchantPortalSection'
import { OffersStipsTab } from '../../components/crm/OffersStipsTab'
import { DealTab } from '../../components/crm/DealTab'
import { ComplianceTab } from '../../components/crm/ComplianceTab'
import { DynamicFieldForm } from '../../components/crm/DynamicFieldForm'
import { CrmDocumentTypesManager, parseValues } from '../../components/crm/CrmDocumentTypesManager'
import { RichEmailEditor } from '../../components/crm/RichEmailEditor'
import type { RichEmailEditorRef } from '../../components/crm/RichEmailEditor'
import type { DocumentType } from '../../components/crm/CrmDocumentTypesManager'
import { confirmDelete } from '../../utils/confirmDelete'
import { formatPhoneNumber } from '../../utils/format'
import type { CrmLead, LeadStatus, CrmDocument, Lender, LenderSubmission, LenderResponseStatus, LenderSubmissionStatus, CrmLabel, EmailTemplate, SmsTemplate } from '../../types/crm.types'

// ── Tab System ─────────────────────────────────────────────────────────────────
type TabId = 'details' | 'activity' | 'documents' | 'lenders' | 'approvals' | 'merchant' | 'offers' | 'deal' | 'compliance'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'details',   label: 'Lead Info',       icon: Hash         },
  { id: 'activity',  label: 'Activity',        icon: Clock        },
  { id: 'documents', label: 'Documents',       icon: FolderOpen   },
  { id: 'lenders',   label: 'Lenders',         icon: Building2    },
  { id: 'approvals', label: 'Approvals',       icon: CheckSquare  },
  { id: 'merchant',  label: 'Merchant Portal', icon: ExternalLink },
  { id: 'offers',     label: 'Offers & Stips',  icon: DollarSign    },
  { id: 'deal',       label: 'Deal',             icon: TrendingUp    },
  { id: 'compliance', label: 'Compliance',       icon: ShieldCheck   },
]

// ── Constants ──────────────────────────────────────────────────────────────────
const AVATAR_BG = ['bg-emerald-600','bg-teal-600','bg-sky-600','bg-violet-600','bg-rose-600','bg-amber-600']

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png',
])
const ALLOWED_EXT  = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'
const MAX_FILE_MB  = 20
const MAX_FILES    = 10

// ── Helpers ────────────────────────────────────────────────────────────────────
function validateFiles(files: File[]): { valid: File[]; errors: string[] } {
  const valid: File[] = []; const errors: string[] = []
  if (files.length > MAX_FILES) { errors.push(`Maximum ${MAX_FILES} files allowed.`); return { valid, errors } }
  for (const f of files) {
    if (!ALLOWED_MIMES.has(f.type)) errors.push(`"${f.name}" — unsupported type.`)
    else if (f.size > MAX_FILE_MB * 1024 * 1024) errors.push(`"${f.name}" — exceeds ${MAX_FILE_MB} MB.`)
    else valid.push(f)
  }
  return { valid, errors }
}

function formatBytes(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

function getFileType(p: string | null | undefined): 'pdf' | 'image' | 'other' {
  if (!p) return 'other'
  const e = (p.split('.').pop() ?? '').toLowerCase()
  if (e === 'pdf') return 'pdf'
  if (['jpg','jpeg','png'].includes(e)) return 'image'
  return 'other'
}

function getFileIcon(p: string | null | undefined) {
  const t = getFileType(p)
  if (t === 'pdf') return { bg: 'bg-red-50', color: 'text-red-500' }
  if (t === 'image') return { bg: 'bg-sky-50', color: 'text-sky-500' }
  return { bg: 'bg-emerald-50', color: 'text-emerald-600' }
}

async function downloadFile(url: string, fileName: string) {
  try {
    const res = await fetch(url); const blob = await res.blob()
    const href = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href, download: fileName })
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(href)
  } catch {
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName, target: '_blank' })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

// ── KPI Bar ────────────────────────────────────────────────────────────────────
function KpiBar({
  leadId,
  daysInSystem,
  loanAmount,
  onTabSwitch,
}: {
  leadId: number
  daysInSystem: number
  loanAmount: string | number | null | undefined
  onTabSwitch: (tab: TabId) => void
}) {
  const { data: docs } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => (res => (res.data?.data ?? res.data ?? []) as CrmDocument[])(await crmService.getLeadDocuments(leadId)),
    staleTime: 60 * 1000,
  })
  const { data: submissions } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      const res = await crmService.getLenderSubmissions(leadId)
      return (res.data?.data ?? res.data ?? []) as LenderSubmission[]
    },
    staleTime: 60 * 1000,
  })

  const docCount  = docs?.length ?? 0
  const subCount  = submissions?.length ?? 0
  const approvedCount = submissions?.filter(s => s.response_status === 'approved').length ?? 0

  const formatted = loanAmount
    ? `$${Number(String(loanAmount).replace(/[^0-9.]/g, '')).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '—'

  const kpis = [
    {
      label: 'Loan Amount',
      value: formatted,
      icon: DollarSign,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueBold: true,
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: 'Days in Pipeline',
      value: `${daysInSystem}d`,
      icon: TrendingUp,
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      valueBold: false,
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: 'Documents',
      value: docCount,
      icon: FileCheck2,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      valueBold: false,
      onClick: () => onTabSwitch('documents'),
    },
    {
      label: 'Lender Responses',
      value: `${approvedCount}/${subCount}`,
      icon: Building2,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      valueBold: false,
      onClick: () => onTabSwitch('lenders'),
    },
  ]

  return (
    <div className="max-w-[1800px] mx-auto px-5 py-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          const Tag = kpi.onClick ? 'button' : 'div'
          return (
            <Tag
              key={i}
              onClick={kpi.onClick}
              className={[
                'bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3',
                kpi.onClick ? 'cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.98]' : '',
              ].join(' ')}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.iconBg}`}>
                <Icon size={18} className={kpi.iconColor} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none">{kpi.label}</p>
                <p className={`text-xl mt-0.5 leading-tight truncate ${kpi.valueBold ? 'font-extrabold text-slate-900' : 'font-bold text-slate-800'}`}>
                  {kpi.value}
                </p>
              </div>
            </Tag>
          )
        })}
      </div>
    </div>
  )
}

// ── PipelineProgress ───────────────────────────────────────────────────────────
function PipelineProgress({
  statuses,
  currentStatus,
  onStatusClick,
}: {
  statuses: LeadStatus[]
  currentStatus: string
  onStatusClick: (statusUrl: string) => void
}) {
  const display     = statuses.slice(0, 6)
  const currentIdx  = display.findIndex(s => s.lead_title_url === currentStatus)

  return (
    <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {display.map((s, i) => {
          const isActive    = i === currentIdx
          const isCompleted = currentIdx >= 0 && i < currentIdx
          const isLast      = i === display.length - 1

          return (
            <div key={s.id} className="flex items-center flex-shrink-0">
              <button
                title={s.lead_title}
                disabled={isActive}
                onClick={() => { if (!isActive) onStatusClick(s.lead_title_url) }}
                className={['flex flex-col items-center gap-1 focus:outline-none rounded px-1 py-0.5', isActive ? 'cursor-default' : 'cursor-pointer hover:opacity-80'].join(' ')}
              >
                <div className="relative flex items-center justify-center">
                  {isActive ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-600">
                      <span className="text-[9px] font-bold text-white">{i + 1}</span>
                    </div>
                  ) : isCompleted ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-100">
                      <Check size={11} className="text-emerald-600" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center border border-slate-200 bg-white">
                      <span className="text-[9px] font-medium text-slate-400">{i + 1}</span>
                    </div>
                  )}
                </div>
                <span className={['text-[9px] font-medium whitespace-nowrap max-w-[64px] text-center leading-tight', isActive ? 'text-emerald-700 font-semibold' : isCompleted ? 'text-emerald-600' : 'text-slate-400'].join(' ')}>
                  {s.lead_title}
                </span>
              </button>
              {!isLast && (
                <div className="mx-1 flex-shrink-0 h-px w-5" style={{ background: isCompleted ? '#10b981' : '#e2e8f0' }} />
              )}
            </div>
          )
        })}
        {statuses.length > 6 && (
          <span className="text-[10px] text-slate-400 ml-2">+{statuses.length - 6} more</span>
        )}
      </div>
    </div>
  )
}

// ── CollapsibleSection ─────────────────────────────────────────────────────────
function CollapsibleSection({
  title, icon: Icon, children, defaultOpen = true, count, headerRight,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
  defaultOpen?: boolean
  count?: number
  headerRight?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/70 border-b border-slate-100">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Icon size={14} className="text-emerald-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 flex-shrink-0">
              {count}
            </span>
          )}
          {open
            ? <ChevronUp size={14} className="text-slate-400 ml-1 flex-shrink-0" />
            : <ChevronDown size={14} className="text-slate-400 ml-1 flex-shrink-0" />
          }
        </button>
        {headerRight && <div className="flex-shrink-0 ml-3">{headerRight}</div>}
      </div>
      {open && <div className="p-5">{children}</div>}
    </div>
  )
}

// ── SidebarCard ────────────────────────────────────────────────────────────────
function SidebarCard({
  title, icon: Icon, children, iconColor = 'text-emerald-600', iconBg = 'bg-emerald-50',
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
  iconColor?: string
  iconBg?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={13} className={iconColor} />
        </div>
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// ── Doc viewer modal ───────────────────────────────────────────────────────────
function DocViewerModal({ doc, onClose }: { doc: CrmDocument; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const fileType = getFileType(doc.file_path)

  async function handleDownload() {
    setDownloading(true); await downloadFile(doc.file_path ?? '', doc.file_name); setDownloading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-slate-900 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={17} className="text-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{doc.file_name}</p>
            <p className="text-xs text-slate-400">{doc.document_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <button
            onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Download
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
        {fileType === 'pdf' && (
          <iframe src={doc.file_path ?? undefined} title={doc.file_name} className="w-full h-full rounded-xl" style={{ maxWidth: '960px', border: 'none', background: '#fff' }} />
        )}
        {fileType === 'image' && (
          <img src={doc.file_path ?? undefined} alt={doc.file_name} className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
        )}
        {fileType === 'other' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
              <FileText size={40} className="text-slate-400" />
            </div>
            <p className="text-white font-semibold">{doc.file_name}</p>
            <p className="text-sm text-slate-400">Preview not available for this file type.</p>
            <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download to view
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Documents Panel ────────────────────────────────────────────────────────────
function DocumentsPanel({ leadId }: { leadId: number }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [subValue, setSubValue] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [viewDoc, setViewDoc] = useState<CrmDocument | null>(null)
  const [showTypeManager, setShowTypeManager] = useState(false)

  const { data: typeData } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => (await crmService.getDocumentTypes()).data?.data ?? (await crmService.getDocumentTypes()).data ?? [] as DocumentType[],
    staleTime: 2 * 60 * 1000,
  })

  const activeTypes = (typeData ?? []).filter((t: DocumentType) => String(t.status) === '1')
  const selectedType = activeTypes.find((t: DocumentType) => String(t.id) === selectedTypeId) ?? null
  const subValues = parseValues(selectedType?.values)
  const computedDocType = selectedType ? (subValue ? `${selectedType.title} - ${subValue}` : selectedType.title) : ''

  const { data, isLoading } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => (res => (res.data?.data ?? res.data ?? []) as CrmDocument[])(await crmService.getLeadDocuments(leadId)),
  })
  const docs = data ?? []

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData()
      files.forEach(f => fd.append('files[]', f))
      fd.append('document_type', computedDocType)
      return crmService.uploadLeadDocuments(leadId, fd)
    },
    onSuccess: (res) => {
      const count: number = res.data?.data?.count ?? 1
      const failed: string[] = res.data?.data?.failed ?? []
      toast.success(`${count} file${count !== 1 ? 's' : ''} uploaded`)
      if (failed.length) toast.error(`Failed: ${failed.join(', ')}`)
      setSelectedFiles([]); setValidationErrors([]); setSubValue('')
      qc.invalidateQueries({ queryKey: ['lead-documents', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => crmService.deleteLeadDocument(leadId, docId),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['lead-documents', leadId] }) },
    onError: () => toast.error('Delete failed'),
  })

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = Array.from(e.target.files ?? []); e.target.value = ''
    if (!raw.length) return
    const { valid, errors } = validateFiles([...selectedFiles, ...raw])
    setValidationErrors(errors); setSelectedFiles(valid)
  }

  const canUpload = !!selectedTypeId && selectedFiles.length > 0

  return (
    <div className="flex gap-0 divide-x divide-slate-100 h-full">

      {/* ── Left: Document list ── */}
      <div className="flex-1 min-w-0 pr-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {isLoading ? 'Documents' : `${docs.length} Document${docs.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <FolderOpen size={22} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No documents yet</p>
            <p className="text-xs text-slate-400 mt-1">Upload files using the panel on the right</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {docs.map(doc => {
              const ic = getFileIcon(doc.file_path)
              return (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-emerald-200 hover:shadow-sm transition-all group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ic.bg}`}>
                    <FileText size={14} className={ic.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{doc.document_type}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">{doc.file_name}</span>
                      {doc.file_size ? <span className="text-[10px] text-slate-400">· {formatBytes(Number(doc.file_size))}</span> : null}
                      <span className="text-[10px] text-slate-400">· {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {doc.uploaded_by_name && <span className="text-[10px] text-slate-400">· {doc.uploaded_by_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setViewDoc(doc)} disabled={!doc.file_path} className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30" title="Preview"><Eye size={13} /></button>
                    <button onClick={() => doc.file_path && downloadFile(doc.file_path, doc.file_name)} disabled={!doc.file_path} className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30" title="Download"><Download size={13} /></button>
                    <button onClick={async () => { if (await confirmDelete()) deleteMutation.mutate(doc.id) }} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right: Upload panel ── */}
      <div className="w-72 flex-shrink-0 pl-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Upload</span>
          <button onClick={() => setShowTypeManager(true)} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-emerald-600 transition-colors">
            <Settings2 size={11} /> Manage Types
          </button>
        </div>

        {/* Type selects */}
        <div className="space-y-2 mb-3">
          <select value={selectedTypeId} onChange={e => { setSelectedTypeId(e.target.value); setSubValue('') }} className="input text-sm w-full">
            <option value="">— Document type —</option>
            {activeTypes.map((t: DocumentType) => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
          </select>
          {subValues.length > 0 && (
            <select value={subValue} onChange={e => setSubValue(e.target.value)} className="input text-sm w-full">
              <option value="">— Sub-type —</option>
              {subValues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
        </div>

        {/* Drop zone */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!selectedTypeId || uploadMutation.isPending}
          className="w-full rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 bg-slate-50/50 py-6 flex flex-col items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <Upload size={15} className="text-emerald-500" />
          </div>
          <span className="text-xs font-semibold text-slate-500">Choose files</span>
          <span className="text-[10px] text-slate-400">PDF, DOC, XLS, JPG, PNG</span>
        </button>
        <input ref={fileRef} type="file" multiple accept={ALLOWED_EXT} className="hidden" onChange={handleFileChange} />

        <p className="text-[10px] text-slate-400 mt-2 text-center">Max {MAX_FILE_MB} MB · up to {MAX_FILES} files</p>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-100 p-2.5 space-y-1">
            {validationErrors.map((err, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs text-red-600"><AlertCircle size={11} className="mt-0.5 flex-shrink-0" />{err}</p>
            ))}
          </div>
        )}

        {/* Staged files */}
        {selectedFiles.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {selectedFiles.map((f, i) => {
              const ic = getFileIcon(f.name)
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-2.5 py-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${ic.bg}`}><FileText size={11} className={ic.color} /></div>
                  <span className="flex-1 text-xs text-slate-700 truncate">{f.name}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
                  <button onClick={() => { setSelectedFiles(p => p.filter((_, j) => j !== i)); setValidationErrors([]) }} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"><X size={11} /></button>
                </div>
              )
            })}
            <button
              onClick={() => uploadMutation.mutate(selectedFiles)}
              disabled={!canUpload || uploadMutation.isPending}
              className="w-full mt-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {uploadMutation.isPending
                ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
                : <><Upload size={13} /> Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}</>}
            </button>
          </div>
        )}
      </div>

    </div>
  )
}

// ── Lender status helpers ───────────────────────────────────────────────────────
const SUBMISSION_STATUS_MAP: Record<LenderSubmissionStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:     { label: 'Pending',     bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400'   },
  submitted:   { label: 'Submitted',   bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'    },
  viewed:      { label: 'Viewed',      bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500'  },
  approved:    { label: 'Approved',    bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  declined:    { label: 'Declined',    bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500'     },
  no_response: { label: 'No Response', bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-400'   },
}
const RESPONSE_STATUS_MAP: Record<LenderResponseStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  pending:         { label: 'Awaiting',    bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-400',   border: 'border-l-slate-300'   },
  approved:        { label: 'Approved',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-l-emerald-400'  },
  declined:        { label: 'Declined',    bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     border: 'border-l-red-400'      },
  needs_documents: { label: 'Needs Docs', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   border: 'border-l-amber-400'    },
  no_response:     { label: 'No Reply',    bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-300',   border: 'border-l-slate-200'    },
}

function StatusDot({ status, map }: { status: string; map: Record<string, { label: string; bg: string; text: string; dot: string }> }) {
  const cfg = map[status] ?? { label: status, bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

const LENDER_COLORS = [
  ['bg-blue-100', 'text-blue-700'], ['bg-violet-100', 'text-violet-700'],
  ['bg-amber-100', 'text-amber-700'], ['bg-pink-100', 'text-pink-700'],
  ['bg-cyan-100', 'text-cyan-700'], ['bg-orange-100', 'text-orange-700'],
  ['bg-teal-100', 'text-teal-700'], ['bg-indigo-100', 'text-indigo-700'],
]

function LenderAvatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'
  const [bg, text] = LENDER_COLORS[name.charCodeAt(0) % LENDER_COLORS.length]
  return (
    <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold ${bg} ${text}`}>
      {initials}
    </div>
  )
}

// ── Inline Submission Row ────────────────────────────────────────────────────
const INLINE_STATUS_OPTIONS = [
  { value: 'pending',          label: 'Pending' },
  { value: 'approved',         label: 'Approved' },
  { value: 'declined',         label: 'Declined' },
  { value: 'needs_documents',  label: 'Missing Docs' },
] as const

// Parse stored note log: entries separated by "\n---\n"
function parseNoteLog(raw: string): { ts: string; text: string }[] {
  if (!raw.trim()) return []
  return raw.split('\n---\n').map(entry => {
    const nl = entry.indexOf('\n')
    if (nl === -1) return { ts: '', text: entry.trim() }
    const firstLine = entry.slice(0, nl).trim()
    const rest      = entry.slice(nl + 1).trim()
    // first line is timestamp if it matches [Mar 23, 2026 8:14 PM]
    if (/^\[.+\]$/.test(firstLine)) return { ts: firstLine.slice(1, -1), text: rest }
    return { ts: '', text: entry.trim() }
  }).filter(e => e.text)
}

function buildAppendedNote(existing: string, newText: string): string {
  const ts      = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const entry   = `[${ts}]\n${newText.trim()}`
  return existing.trim() ? `${existing.trim()}\n---\n${entry}` : entry
}

function SubmissionRow({ sub, leadId }: { sub: LenderSubmission; leadId: number }) {
  const qc = useQueryClient()
  const [editing,  setEditing]  = useState(false)
  const [status,   setStatus]   = useState<LenderResponseStatus>(sub.response_status ?? 'pending')
  const [newNote,  setNewNote]  = useState('')
  const existingNotes = sub.response_note ?? ''
  const noteLog       = parseNoteLog(existingNotes)

  const statusColors: Record<string, string> = {
    approved:        'text-white bg-emerald-500 border-emerald-500',
    declined:        'text-white bg-red-500 border-red-500',
    needs_documents: 'text-white bg-orange-400 border-orange-400',
    pending:         'text-slate-600 bg-slate-100 border-slate-300',
  }
  const statusLabel: Record<string, string> = {
    approved: 'Approved', declined: 'Declined', needs_documents: 'Missing Docs', pending: 'Pending',
  }

  const mutation = useMutation({
    mutationFn: () => {
      const combined = newNote.trim() ? buildAppendedNote(existingNotes, newNote) : existingNotes
      return crmService.updateSubmissionResponse(leadId, sub.id, {
        response_status:   status,
        submission_status: sub.submission_status ?? 'submitted',
        response_note:     combined || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Saved')
      setNewNote('')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-approvals', leadId] })
    },
    onError: () => toast.error('Failed to save'),
  })

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">
            {sub.lender_name ?? `Lender #${sub.lender_id}`}
          </p>
          {sub.submitted_at && (
            <p className="text-[10px] text-slate-400 tabular-nums">
              {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
            </p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[status] ?? statusColors.pending}`}>
          {statusLabel[status] ?? status}
        </span>
        <button
          onClick={() => setEditing(v => !v)}
          className={`p-1 rounded flex-shrink-0 transition-colors ${editing ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}
          title="Edit"
        >
          <Pencil size={12} />
        </button>
      </div>

      {/* Note log — always visible if notes exist */}
      {noteLog.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {[...noteLog].reverse().map((e, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-1.5 bg-slate-50">
              <span className="text-slate-300 mt-0.5 flex-shrink-0 text-[10px]">•</span>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-slate-700 font-medium">{e.text}</span>
                {e.ts && <span className="text-[10px] text-slate-500 ml-1.5">{e.ts}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit form — toggled by pencil */}
      {editing && (
        <div className="border-t border-slate-100 p-3 space-y-2 bg-white">
          <select
            className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white text-slate-700"
            value={status}
            onChange={e => setStatus(e.target.value as LenderResponseStatus)}
          >
            {INLINE_STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <textarea
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-400"
            rows={2}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Add a note…"
          />
          <div className="flex gap-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {mutation.isPending ? <><Loader2 size={11} className="animate-spin" /> Saving…</> : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="px-3 text-xs text-slate-500 border border-slate-200 rounded-lg hover:border-slate-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Submission notes (auto-tracked doc history) */}
      {sub.notes && (
        <div className="mt-2 px-3 pb-2">
          <div className="bg-slate-50 rounded-lg border border-slate-100 p-2.5 text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">
            {sub.notes}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Lenders Panel ──────────────────────────────────────────────────────────────
/** Replace [[field_key]] placeholders with actual lead values. */
function fillPlaceholders(html: string, lead: Record<string, unknown>): string {
  return html.replace(/\[\[(\w+)\]\]/g, (match, key: string) => {
    const val = lead[key]
    return val !== null && val !== undefined && val !== '' ? String(val) : match
  })
}

function LendersPanel({ leadId }: { leadId: number }) {
  const qc = useQueryClient()

  const [showForm, setShowForm]         = useState(false)
  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set())
  const [notes, setNotes]               = useState('')
  const [templateId, setTemplateId]     = useState<number | ''>('')
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Re-use cached lead data (already fetched by parent — no extra request)
  const { data: leadData } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => (r => (r.data?.data ?? r.data) as CrmLead)(await leadService.getById(leadId)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: submissions, isLoading: subsLoading } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      const res = await crmService.getLenderSubmissions(leadId)
      return (res.data?.data ?? res.data ?? []) as LenderSubmission[]
    },
  })

  const { data: lendersData } = useQuery({
    queryKey: ['lenders-all'],
    queryFn: async () => {
      const res = await crmService.getLenders({ per_page: 200 })
      return (res.data?.data?.data ?? res.data?.data ?? res.data?.records ?? res.data ?? []) as Lender[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await crmService.getEmailTemplates()
      return (res.data?.data ?? res.data ?? []) as EmailTemplate[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: leadDocs } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      const res = await crmService.getLeadDocuments(leadId)
      return (res.data?.data ?? res.data ?? []) as CrmDocument[]
    },
  })

  const activeLenders = (lendersData ?? []).filter(l => Number(l.status) === 1)
  // Deduplicate by lender_id — keep the latest submission per lender
  const subList = Object.values(
    (submissions ?? []).reduce<Record<number, LenderSubmission>>((acc, s) => {
      if (!acc[s.lender_id] || s.id > acc[s.lender_id].id) acc[s.lender_id] = s
      return acc
    }, {})
  )
  const docs          = leadDocs ?? []

  // Compute preview template + filled HTML at component scope so the mutation can use them
  const previewTemplate = templateId !== ''
    ? (emailTemplates ?? []).find(t => t.id === templateId) ?? null
    : null

  const previewHtml = previewTemplate
    ? (leadData
        ? fillPlaceholders(previewTemplate.template_html, leadData as Record<string, unknown>)
        : previewTemplate.template_html)
    : ''

  function toggleLender(id: number) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleDoc(id: number) {
    setSelectedDocIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const openForm = () => {
    setShowForm(true)
    // Pre-select only docs that have a file on disk (attachable=true / file_path set)
    setSelectedDocIds(new Set((leadDocs ?? []).filter(d => d.attachable !== false && d.file_path).map(d => d.id)))
  }

  const closeForm = () => {
    setShowForm(false); setSelectedIds(new Set()); setNotes('')
    setTemplateId(''); setSelectedDocIds(new Set())
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files[]', f))
    fd.append('document_type', 'Lender Submission')
    setUploadingDocs(true)
    try {
      const res = await crmService.uploadLeadDocuments(leadId, fd)
      const uploaded = (res.data?.data?.uploaded ?? res.data?.uploaded ?? []) as CrmDocument[]
      uploaded.forEach(d => setSelectedDocIds(prev => new Set([...prev, d.id])))
      qc.invalidateQueries({ queryKey: ['lead-documents', leadId] })
      toast.success(`${uploaded.length} file(s) uploaded`)
    } catch {
      toast.error('Upload failed')
    }
    setUploadingDocs(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submitMutation = useMutation({
    mutationFn: () => crmService.submitApplication(leadId, {
      lender_ids:   Array.from(selectedIds),
      notes:        notes || undefined,
      document_ids: selectedDocIds.size ? Array.from(selectedDocIds) : undefined,
      // Pass rendered template HTML + subject when a template is selected
      email_html:    previewHtml || undefined,
      email_subject: previewTemplate?.subject || undefined,
    }),
    onSuccess: (res) => {
      const { submitted = [], failed = [] } = res.data?.data ?? {}
      if (submitted.length) toast.success(`Sent to ${submitted.length} lender${submitted.length !== 1 ? 's' : ''}`)
      if (failed.length)    toast.error(`Failed for ${failed.length} lender${failed.length !== 1 ? 's' : ''}`)
      closeForm()
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Submission failed'),
  })

  return (
    <div className="space-y-4">

      {/* ── Submit Form ── */}
      {!showForm ? (
        <button onClick={openForm} className="btn-primary w-full justify-center gap-2">
          <Send size={13} /> Submit to Lenders
        </button>
      ) : (() => {
        return (
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <span className="text-sm font-semibold text-slate-700">Submit Application</span>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>

            {/* two-col when preview active */}
            <div className={previewTemplate ? 'flex divide-x divide-slate-100' : ''}>

              {/* ── Form fields ── */}
              <div className={previewTemplate ? 'w-72 flex-shrink-0 p-4 space-y-3' : 'p-4 space-y-3'}>

                {/* Lenders */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-600">Lenders</label>
                    {activeLenders.length > 0 && (
                      <button
                        onClick={() => setSelectedIds(selectedIds.size === activeLenders.length ? new Set() : new Set(activeLenders.map(l => l.id)))}
                        className="text-[11px] text-emerald-600 hover:underline"
                      >{selectedIds.size === activeLenders.length ? 'Deselect all' : 'Select all'}</button>
                    )}
                  </div>
                  {activeLenders.length === 0 ? (
                    <p className="text-xs text-slate-400">No active lenders configured.</p>
                  ) : (
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {activeLenders.map(l => {
                        const on = selectedIds.has(l.id)
                        return (
                          <label key={l.id} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg border cursor-pointer select-none transition-colors
                            border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40"
                            style={on ? { borderColor: '#6ee7b7', backgroundColor: 'rgb(240 253 244)' } : {}}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleLender(l.id)}
                              className="accent-emerald-600 w-3.5 h-3.5 flex-shrink-0"
                            />
                            <span className="text-xs text-slate-700 truncate">{l.lender_name}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Email Template */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email Template</label>
                  <select
                    className="input w-full text-sm"
                    value={templateId}
                    onChange={e => setTemplateId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">— Default —</option>
                    {(emailTemplates ?? []).map(t => (
                      <option key={t.id} value={t.id}>{t.template_name}</option>
                    ))}
                  </select>
                </div>

                {/* Documents */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600">Documents</label>
                      {docs.length > 0 && (() => {
                        const attachable = docs.filter(d => d.attachable !== false && !!d.file_path)
                        if (!attachable.length) return null
                        const allSelected = attachable.every(d => selectedDocIds.has(d.id))
                        return (
                          <button
                            type="button"
                            onClick={() => setSelectedDocIds(allSelected ? new Set() : new Set(attachable.map(d => d.id)))}
                            className="text-[10px] text-slate-400 hover:text-emerald-600 underline"
                          >
                            {allSelected ? 'Deselect all' : 'Select all'}
                          </button>
                        )
                      })()}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingDocs}
                      className="text-[11px] text-emerald-600 hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      {uploadingDocs ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                      Upload
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} />
                  </div>
                  {docs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No documents yet.</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {docs.map(d => {
                        const on = selectedDocIds.has(d.id)
                        const canAttach = d.attachable !== false && !!d.file_path
                        const docLabel = d.document_type || d.document_name || d.file_path?.split('/').pop() || `Doc #${d.id}`
                        return (
                          <label key={d.id} title={!canAttach ? 'File not on server — re-upload to attach' : undefined}
                            className={`flex items-center gap-2 py-1 px-2 rounded border select-none text-xs border-slate-200 ${canAttach ? 'cursor-pointer text-slate-700 hover:border-emerald-200' : 'cursor-not-allowed text-slate-400 opacity-60'}`}
                            style={on && canAttach ? { borderColor: '#6ee7b7', backgroundColor: 'rgb(240 253 244)' } : {}}
                          >
                            <input type="checkbox" checked={on} disabled={!canAttach} onChange={() => canAttach && toggleDoc(d.id)} className="accent-emerald-600 w-3 h-3 flex-shrink-0" />
                            <FileText size={10} className="flex-shrink-0 text-slate-400" />
                            <span className="truncate">{docLabel}</span>
                            {!canAttach && <span className="ml-auto text-[9px] text-amber-500 flex-shrink-0">re-upload</span>}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Note (optional)</label>
                  <textarea
                    className="input w-full resize-none text-sm"
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Additional notes for the lender…"
                  />
                </div>

                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={() => submitMutation.mutate()}
                    disabled={selectedIds.size === 0 || submitMutation.isPending}
                    className="btn-primary flex-1 justify-center disabled:opacity-50"
                  >
                    {submitMutation.isPending
                      ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                      : <><Send size={13} /> Send to {selectedIds.size || '…'} Lender{selectedIds.size !== 1 ? 's' : ''}</>
                    }
                  </button>
                  <button onClick={closeForm} className="btn-outline px-3">Cancel</button>
                </div>
              </div>

              {/* ── Email preview panel ── */}
              {previewTemplate && (
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

                  {/* macOS-style window chrome */}
                  <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ background: '#1e293b' }}>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-default" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 hover:bg-amber-500 transition-colors cursor-default" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-default" />
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-slate-400 text-[11px]" style={{ background: '#334155' }}>
                        <Mail size={10} />
                        <span>Email Preview</span>
                      </div>
                    </div>
                    <div className="w-[52px]" /> {/* balance spacer */}
                  </div>

                  {/* Email reading pane */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-white">

                    {/* Subject + meta header */}
                    <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug mb-3 truncate">
                        {previewTemplate.subject || previewTemplate.template_name}
                      </h3>

                      {/* Sender row */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                          <Mail size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-800">Submission Email</span>
                            <span className="text-[11px] text-slate-400 flex-shrink-0">Just now</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-500">to</span>
                            {selectedIds.size > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                                <Building2 size={9} className="text-slate-500" />
                                {selectedIds.size} lender{selectedIds.size !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">no lenders selected</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Template badge + attachments hint */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                          style={{ color: '#059669', borderColor: '#a7f3d0', background: '#f0fdf4' }}>
                          <Check size={9} />
                          {previewTemplate.template_name}
                        </span>
                        {selectedDocIds.size > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-slate-500 border-slate-200 bg-slate-50">
                            <FileText size={9} />
                            {selectedDocIds.size} attachment{selectedDocIds.size !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Email body iframe */}
                    <div className="flex-1 overflow-auto bg-slate-50" style={{ minHeight: 260 }}>
                      <div className="p-3 h-full">
                        <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden h-full" style={{ minHeight: 240 }}>
                          <iframe
                            key={previewTemplate.id}
                            srcDoc={previewHtml}
                            className="w-full border-0 block"
                            style={{ minHeight: 240, height: '100%' }}
                            sandbox="allow-same-origin"
                            title="Email body preview"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Submission History ── */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Submission History {subList.length > 0 && <span className="font-normal">({subList.length})</span>}
        </p>

        {subsLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
        ) : subList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {subList.map(s => (
              <SubmissionRow key={s.id} sub={s} leadId={leadId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Strip elements whose *text content* must not appear in TipTap
 * (style/script rules, head blocks) and unwrap html/body wrappers.
 * The resulting HTML is then safe to pass to TipTap's setContent().
 */
function cleanHtmlForEditor(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('style, script, head').forEach(el => el.remove())
  return doc.body.innerHTML
}

// ── Send Email Modal ───────────────────────────────────────────────────────────
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
      if (tplDropRef.current && !tplDropRef.current.contains(e.target as Node)) {
        setTplOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTemplateChange = async (tplId: number | '') => {
    setSelectedTplId(tplId)
    setTplOpen(false)
    setTplSearch('')
    if (tplId === '') {
      setSubject('')
      editorRef.current?.setContent('')
      return
    }
    setResolving(true)
    try {
      const res = await crmService.resolveEmailTemplate(leadId, tplId as number)
      const resolved = res.data?.data ?? res.data
      setSubject(resolved?.subject ?? '')
      editorRef.current?.setContent(cleanHtmlForEditor(resolved?.body ?? ''))
    } catch {
      toast.error('Failed to load template')
    } finally {
      setResolving(false)
    }
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
              <p className="font-semibold text-slate-800 text-sm leading-tight">Send Email to Merchant</p>
              {to && <p className="text-[11px] text-slate-400 mt-0.5">{to}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab toggle */}
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              {(['compose', 'preview'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all capitalize ${tab === t ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {tab === 'compose' ? (
            <div className="flex flex-col gap-4 p-6">
              {/* Template picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500">
                    Email Template <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <a href="/crm/email-templates" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 font-medium transition-colors">
                    <Plus size={11} /> New Template
                  </a>
                </div>
                <div className="relative" ref={tplDropRef}>
                  {/* Combobox trigger */}
                  <button
                    type="button"
                    onClick={() => !tplLoading && !resolving && setTplOpen(v => !v)}
                    disabled={tplLoading || resolving}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 disabled:opacity-60 transition-colors hover:border-slate-300"
                  >
                    <span className={selectedTplId === '' ? 'text-slate-400' : 'text-slate-700 font-medium'}>
                      {selectedTplId !== ''
                        ? (templates ?? []).find(t => t.id === selectedTplId)?.template_name ?? 'Selected template'
                        : 'Select Email Template (Optional)'}
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      {(resolving || tplLoading) && <Loader2 size={12} className="animate-spin text-sky-500" />}
                      {selectedTplId !== '' && !resolving && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => { e.stopPropagation(); handleTemplateChange('') }}
                          onKeyDown={e => e.key === 'Enter' && handleTemplateChange('')}
                          className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        ><X size={10} /></span>
                      )}
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${tplOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  {/* Dropdown panel */}
                  {tplOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {/* Search input */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                        <Search size={13} className="text-slate-400 flex-shrink-0" />
                        <input
                          autoFocus
                          type="text"
                          value={tplSearch}
                          onChange={e => setTplSearch(e.target.value)}
                          placeholder="Search templates…"
                          className="flex-1 text-xs outline-none text-slate-700 placeholder-slate-400 bg-transparent"
                        />
                        {tplSearch && (
                          <button onClick={() => setTplSearch('')} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={11} />
                          </button>
                        )}
                      </div>

                      {/* Options list */}
                      <div className="max-h-52 overflow-y-auto py-1">
                        {(() => {
                          const filtered = (templates ?? []).filter(t =>
                            !tplSearch ||
                            t.template_name.toLowerCase().includes(tplSearch.toLowerCase()) ||
                            (t.subject ?? '').toLowerCase().includes(tplSearch.toLowerCase())
                          )
                          if (filtered.length === 0) {
                            return (
                              <p className="px-3 py-4 text-xs text-slate-400 text-center">
                                {tplLoading ? 'Loading templates…' : tplSearch ? `No templates matching "${tplSearch}"` : 'No templates available'}
                              </p>
                            )
                          }
                          return filtered.map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleTemplateChange(t.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-sky-50 transition-colors ${selectedTplId === t.id ? 'bg-sky-50' : ''}`}
                            >
                              <div className="min-w-0">
                                <p className={`text-sm font-medium truncate ${selectedTplId === t.id ? 'text-sky-700' : 'text-slate-700'}`}>
                                  {t.template_name}
                                </p>
                                {t.subject && (
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.subject}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {t.email_type && (
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    t.email_type === 'online_application'
                                      ? 'bg-indigo-50 text-indigo-600'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {t.email_type === 'online_application' ? 'App' : 'General'}
                                  </span>
                                )}
                                {selectedTplId === t.id && <Check size={13} className="text-sky-600" />}
                              </div>
                            </button>
                          ))
                        })()}
                      </div>

                      {/* Footer link */}
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

              {/* To + Subject side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">To</label>
                  <input
                    type="email"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setSelectedTplId('') }}
                    placeholder="Enter subject..."
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Body — rich text editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Message</label>
                <RichEmailEditor ref={editorRef} onChange={setBody} />
              </div>
            </div>

          ) : (
            /* Preview tab — rendered email card */
            <div className="p-6 bg-slate-50 min-h-full">
              <div className="max-w-xl mx-auto">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Accent bar */}
                  <div className="h-1 bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400" />
                  {/* Email headers */}
                  <div className="px-6 py-4 border-b border-slate-100 space-y-2">
                    {[
                      { label: 'To',      value: to || '—' },
                      { label: 'Subject', value: subject || <span className="text-slate-400 italic">No subject</span> },
                    ].map(row => (
                      <div key={String(row.label)} className="flex items-start gap-3">
                        <span className="text-slate-400 text-[11px] w-14 text-right flex-shrink-0 mt-0.5 font-medium">{row.label}</span>
                        <span className={`text-sm ${row.label === 'Subject' ? 'font-semibold text-slate-900' : 'text-slate-600 font-mono text-[12px]'}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Email body rendered */}
                  <div className="px-8 py-6 text-sm text-slate-700 leading-relaxed min-h-32">
                    {body ? (
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    ) : (
                      <p className="text-slate-400 italic text-xs">No message content yet — go to Compose to write your email.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <p className="text-[11px] text-slate-400">
            {bodyIsEmpty ? 'No content yet' : `${body.replace(/<[^>]*>/g, '').length.toLocaleString()} chars`}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
            <button
              onClick={() => send.mutate()}
              disabled={send.isPending || !to || !subject || bodyIsEmpty}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {send.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Send Email
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── PDF Preview Modal ──────────────────────────────────────────────────────────
function PdfPreviewModal({ leadId, leadName, onClose }: { leadId: number; leadName: string; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['lead-pdf-render', leadId],
    queryFn: async () => {
      const res = await crmService.renderLeadPdf(leadId)
      return (res.data?.data ?? res.data) as { html: string; lead_name: string; template_name: string }
    },
    retry: false,
  })

  function handlePrint() {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
  }

  function handleDownload() {
    if (!data?.html) return
    const blob = new Blob([data.html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const rawName = data?.lead_name || leadName
    const safeName = rawName
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${safeName}_application.html` })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Downloaded as HTML — open in browser and print to PDF')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.88)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 flex items-center justify-center flex-shrink-0"><FileText size={14} className="text-white" /></div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{data?.template_name ?? 'Application PDF'}</p>
            <p className="text-xs text-slate-400">{data?.lead_name ?? leadName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {data && (
            <>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"><Printer size={13} /> Print / Save as PDF</button>
              <button onClick={handleDownload} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"><Download size={13} /> Download HTML</button>
            </>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex items-start justify-center p-6">
        {isLoading && <div className="flex flex-col items-center gap-3 text-center mt-20"><Loader2 size={32} className="animate-spin text-emerald-400" /><p className="text-slate-300 text-sm">Generating application…</p></div>}
        {error && (
          <div className="flex flex-col items-center gap-4 text-center mt-20 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center"><AlertCircle size={30} className="text-red-400" /></div>
            <div>
              <p className="text-white font-bold text-base">No Application Template Found</p>
              <p className="text-slate-400 text-sm mt-1">Go to <strong className="text-white">CRM → PDF Templates</strong>, create a template, and mark it as the <em>Application Template</em>.</p>
            </div>
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 transition-colors">Close</button>
          </div>
        )}
        {data?.html && <iframe ref={iframeRef} title="Application PDF Preview" srcDoc={data.html} className="w-full rounded-xl shadow-2xl bg-white" style={{ maxWidth: '880px', height: 'calc(100vh - 140px)', border: 'none' }} sandbox="allow-same-origin allow-modals" />}
      </div>
    </div>
  )
}

// ── PropertyRow — HubSpot-style label:value inline edit ───────────────────────
function PropertyRow({ fieldKey, label, value, type = 'text', fieldType, options, leadId, onUpdated, readOnly = false }: {
  fieldKey: string; label: string; value: string | null | undefined
  type?: 'text' | 'email' | 'tel' | 'textarea'
  fieldType?: string        // CRM label field_type (dropdown, date, number, etc.)
  options?: string | null   // JSON-encoded string[] for dropdown/radio
  leadId: number; onUpdated: () => void
  readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  const [saving,  setSaving]  = useState(false)

  // Derive input type from fieldType if not explicitly set
  const resolvedType: 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'date' | 'select' = (() => {
    if (fieldType === 'email')        return 'email'
    if (fieldType === 'phone_number') return 'tel'
    if (fieldType === 'number')       return 'number'
    if (fieldType === 'date')         return 'date'
    if (fieldType === 'textarea')     return 'textarea'
    if (fieldType === 'dropdown' || fieldType === 'radio') return 'select'
    return type
  })()

  const parsedOptions: string[] = (() => {
    if (!options) return []
    try { const o = JSON.parse(options); return Array.isArray(o) ? o.map(String) : [] }
    catch { return [] }
  })()

  function startEdit() { setDraft(value ?? ''); setEditing(true) }
  function cancel()    { setEditing(false) }

  async function save() {
    if (draft === (value ?? '')) { setEditing(false); return }
    setSaving(true)
    try {
      await leadService.update(leadId, { [fieldKey]: draft })
      onUpdated(); toast.success(`${label} updated`)
    } catch { toast.error(`Failed to update ${label}`) }
    finally { setSaving(false); setEditing(false) }
  }

  function renderDisplayValue() {
    if (!value) return <span className="text-slate-300 text-xs">—</span>
    if (resolvedType === 'date') {
      try { return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
      catch { return value }
    }
    return value
  }

  return (
    <div className="flex items-start py-1.5 border-b border-slate-50 last:border-0 group">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5 leading-tight">{label}</span>
      {readOnly ? (
        <span className="text-sm text-slate-800 flex-1 truncate leading-tight">{renderDisplayValue()}</span>
      ) : editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {resolvedType === 'textarea' ? (
            <textarea autoFocus rows={2} className="flex-1 text-xs border border-emerald-400 rounded-md px-2 py-1 outline-none resize-none bg-white" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') cancel() }} />
          ) : resolvedType === 'select' ? (
            <select autoFocus className="flex-1 text-xs border border-emerald-400 rounded-md px-2 py-1 outline-none bg-white min-w-0" value={draft} onChange={e => setDraft(e.target.value)}>
              <option value="">— select —</option>
              {parsedOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input autoFocus type={resolvedType} className="flex-1 text-xs border border-emerald-400 rounded-md px-2 py-1 outline-none bg-white min-w-0" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }} />
          )}
          <button onMouseDown={e => { e.preventDefault(); save() }} disabled={saving} className="p-1 rounded bg-emerald-600 text-white flex-shrink-0 disabled:opacity-50">
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          </button>
          <button onMouseDown={e => { e.preventDefault(); cancel() }} className="p-1 rounded bg-slate-100 text-slate-500 flex-shrink-0"><X size={10} /></button>
        </div>
      ) : (
        <button onClick={startEdit} className="flex items-center gap-1.5 flex-1 min-w-0 text-left hover:text-emerald-700 transition-colors">
          <span className="text-sm text-slate-800 flex-1 truncate leading-tight">
            {renderDisplayValue()}
          </span>
          <Pencil size={10} className="text-slate-200 group-hover:text-emerald-400 flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100" />
        </button>
      )}
    </div>
  )
}

// ── PropertyGroup — flat section label ─────────────────────────────────────────
function PropertyGroup({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 mt-4 first:mt-0">
        <Icon size={11} className="text-slate-400" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

// ── Lead Hero Card ─────────────────────────────────────────────────────────────
function LeadHeroCard({ lead, leadId, avatarBg, leadInits, statusColor, currentStatus, daysInSystem, fullName }: {
  lead: CrmLead
  leadId: number
  avatarBg: string
  leadInits: string
  statusColor: string
  currentStatus: LeadStatus | undefined
  daysInSystem: number
  fullName: string
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #059669, #10b981, #34d399)' }} />

      <div className="p-5">
        {/* Avatar + name row */}
        <div className="flex items-start gap-4">
          <div
            className={`w-16 h-16 rounded-2xl ${avatarBg} flex items-center justify-center flex-shrink-0`}
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.35), 0 0 0 3px rgba(255,255,255,0.1)' }}
          >
            <span className="text-xl font-bold text-white leading-none">{leadInits}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white leading-tight truncate">{fullName}</h2>
            {lead.company_name && (
              <p className="text-sm text-emerald-200/80 font-medium mt-0.5 truncate flex items-center gap-1.5">
                <Briefcase size={11} className="text-emerald-400/70 flex-shrink-0" />
                {String(lead.company_name)}
              </p>
            )}
            {/* Status badge */}
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: `${statusColor}28`, color: '#a7f3d0', border: `1px solid ${statusColor}45` }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: statusColor }} />
                {currentStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </div>

            {/* Business info — single row */}
            <p className="mt-2 text-[11px] text-slate-400 truncate">
              {[
                lead.company_name ? String(lead.company_name) : null,
                lead.phone_number ? formatPhoneNumber(String(lead.phone_number)) : null,
                lead.email        ? String(lead.email) : null,
              ].filter(Boolean).join('  ·  ')}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px my-4" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Key facts row */}
        <div className="grid grid-cols-2 gap-2">
          {lead.phone_number && (
            <a
              href={`tel:${String(lead.phone_number)}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <Phone size={11} className="text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-emerald-300/60 font-semibold uppercase tracking-wide leading-none">Phone</p>
                <p className="text-[11px] text-white font-medium truncate mt-0.5">{formatPhoneNumber(String(lead.phone_number))}</p>
              </div>
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${String(lead.email)}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="w-6 h-6 rounded-lg bg-sky-500/30 flex items-center justify-center flex-shrink-0">
                <Mail size={11} className="text-sky-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-sky-300/60 font-semibold uppercase tracking-wide leading-none">Email</p>
                <p className="text-[11px] text-white font-medium truncate mt-0.5">{String(lead.email)}</p>
              </div>
            </a>
          )}
          {(lead.assigned_name as string | undefined) && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="w-6 h-6 rounded-lg bg-violet-500/30 flex items-center justify-center flex-shrink-0">
                <UserCheck size={11} className="text-violet-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-violet-300/60 font-semibold uppercase tracking-wide leading-none">Assigned</p>
                <p className="text-[11px] text-white font-medium truncate mt-0.5">{lead.assigned_name as string}</p>
              </div>
            </div>
          )}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Clock size={11} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-amber-300/60 font-semibold uppercase tracking-wide leading-none">In Pipeline</p>
              <p className="text-[11px] text-white font-medium mt-0.5">{daysInSystem}d</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Lead Profile Panel ─────────────────────────────────────────────────────────
function LeadProfilePanel({ lead, leadId, onUpdated, onEditAll }: {
  lead: CrmLead; leadId: number; onUpdated: () => void; onEditAll: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">Lead Details</span>
        <button onClick={onEditAll} className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-medium transition-colors">
          <Pencil size={10} /> Edit all
        </button>
      </div>

      <div className="px-4 py-3">

        <PropertyGroup title="Contact" icon={User}>
          <PropertyRow fieldKey="first_name"   label="First name"  value={lead.first_name   as string | undefined} leadId={leadId} onUpdated={onUpdated} />
          <PropertyRow fieldKey="last_name"    label="Last name"   value={lead.last_name    as string | undefined} leadId={leadId} onUpdated={onUpdated} />
          <PropertyRow fieldKey="email"        label="Email"       value={lead.email        as string | undefined} type="email" leadId={leadId} onUpdated={onUpdated} />
          <PropertyRow fieldKey="phone_number" label="Phone"       value={lead.phone_number as string | undefined} type="tel"   leadId={leadId} onUpdated={onUpdated} />
        </PropertyGroup>

        <PropertyGroup title="Business" icon={Briefcase}>
          <PropertyRow fieldKey="company_name" label="Company"   value={lead.company_name as string | undefined} leadId={leadId} onUpdated={onUpdated} />
          <PropertyRow fieldKey="address"      label="Address"   value={lead.address      as string | undefined} leadId={leadId} onUpdated={onUpdated} />
          <PropertyRow fieldKey="city"         label="City"      value={lead.city         as string | undefined} leadId={leadId} onUpdated={onUpdated} />
          <PropertyRow fieldKey="state"        label="State"     value={lead.state        as string | undefined} leadId={leadId} onUpdated={onUpdated} />
          <PropertyRow fieldKey="zip"          label="ZIP"       value={(lead as Record<string, unknown>)['zip'] as string | undefined} leadId={leadId} onUpdated={onUpdated} />
        </PropertyGroup>


      </div>
    </div>
  )
}

// ── Compact Actions Panel ──────────────────────────────────────────────────────
function CompactActionsPanel({
  lead, statuses, updateStatus, showStatusDropdown, setShowStatusDropdown,
  onScrollToActivity, onGoToLenders, onGeneratePdf, onEditLead, onDeleteLead,
}: {
  lead: CrmLead; statuses: LeadStatus[] | undefined
  updateStatus: { mutate: (s: string) => void; isPending: boolean }
  showStatusDropdown: boolean; setShowStatusDropdown: (v: boolean) => void
  onScrollToActivity: () => void; onGoToLenders: () => void
  onGeneratePdf: () => void; onEditLead: () => void; onDeleteLead: () => void
}) {
  const actions: {
    icon: LucideIcon
    label: string
    iconColor: string
    borderColor: string
    hoverBorder: string
    hoverBg: string
    onClick: () => void
    isLink?: boolean
    href?: string
    isDanger?: boolean
  }[] = [
    {
      icon: Pencil,
      label: 'Edit Lead',
      iconColor: 'text-emerald-600',
      borderColor: 'border-slate-100',
      hoverBorder: 'hover:border-emerald-200',
      hoverBg: 'hover:bg-emerald-50',
      onClick: onEditLead,
    },
    {
      icon: Trash2,
      label: 'Delete',
      iconColor: 'text-red-500',
      borderColor: 'border-slate-100',
      hoverBorder: 'hover:border-red-200',
      hoverBg: 'hover:bg-red-50',
      onClick: onDeleteLead,
      isDanger: true,
    },
    {
      icon: MessageSquare,
      label: 'Add Note',
      iconColor: 'text-slate-600',
      borderColor: 'border-slate-100',
      hoverBorder: 'hover:border-emerald-200',
      hoverBg: 'hover:bg-emerald-50',
      onClick: onScrollToActivity,
    },
    {
      icon: Mail,
      label: 'Email',
      iconColor: 'text-sky-600',
      borderColor: 'border-slate-100',
      hoverBorder: 'hover:border-sky-200',
      hoverBg: 'hover:bg-sky-50',
      onClick: lead.email
        ? () => window.open(`mailto:${String(lead.email)}`, '_self')
        : () => toast('No email on file', { icon: '⚠️' }),
    },
    {
      icon: Phone,
      label: 'Call',
      iconColor: 'text-blue-600',
      borderColor: 'border-slate-100',
      hoverBorder: 'hover:border-blue-200',
      hoverBg: 'hover:bg-blue-50',
      onClick: lead.phone_number
        ? () => window.open(`tel:${String(lead.phone_number)}`, '_self')
        : () => toast('No phone on file', { icon: '⚠️' }),
    },
    {
      icon: Printer,
      label: 'Gen PDF',
      iconColor: 'text-violet-600',
      borderColor: 'border-slate-100',
      hoverBorder: 'hover:border-violet-200',
      hoverBg: 'hover:bg-violet-50',
      onClick: onGeneratePdf,
    },
    {
      icon: Send,
      label: 'Lenders',
      iconColor: 'text-amber-600',
      borderColor: 'border-slate-100',
      hoverBorder: 'hover:border-amber-200',
      hoverBg: 'hover:bg-amber-50',
      onClick: onGoToLenders,
    },
    {
      icon: ExternalLink,
      label: 'Merchant',
      iconColor: 'text-teal-600',
      borderColor: 'border-slate-100',
      hoverBorder: 'hover:border-teal-200',
      hoverBg: 'hover:bg-teal-50',
      onClick: () => toast('Scroll to Merchant Portal tab', { icon: 'ℹ️' }),
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
        <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Zap size={12} className="text-emerald-400" />
        </div>
        <span className="text-xs font-bold text-white/90 uppercase tracking-widest">Quick Actions</span>
      </div>

      {/* Actions list */}
      <div className="p-3">
        <div className="grid grid-cols-1 gap-1">
          {actions.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={i}
                onClick={action.onClick}
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left active:scale-95',
                  action.borderColor,
                  action.hoverBorder,
                  action.hoverBg,
                ].join(' ')}
              >
                <Icon size={13} className={`${action.iconColor} flex-shrink-0`} />
                <span className={`text-xs font-medium ${action.isDanger ? 'text-red-500' : 'text-slate-600'}`}>
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Status dropdown — full width below grid */}
        <div className="relative mt-3">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 hover:border-emerald-300 bg-slate-50 hover:bg-emerald-50/50 text-slate-700 transition-all"
          >
            <Zap size={14} className="text-emerald-600 flex-shrink-0" />
            <span className="flex-1 text-left">Change Status</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showStatusDropdown && statuses && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-30 py-1"
              onMouseLeave={() => setShowStatusDropdown(false)}
            >
              {statuses.map((s: LeadStatus) => {
                const isCurrent = s.lead_title_url === String(lead.lead_status)
                const dotColor = s.color_code ?? s.color ?? '#94a3b8'
                return (
                  <button
                    key={s.id}
                    onClick={() => { updateStatus.mutate(s.lead_title_url); setShowStatusDropdown(false) }}
                    disabled={isCurrent || updateStatus.isPending}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-white/50"
                      style={{ background: dotColor, boxShadow: `0 0 0 1px ${dotColor}50` }}
                    />
                    <span className="flex-1">{s.lead_title}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Current</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Quick Summary Card ─────────────────────────────────────────────────────────
function QuickSummaryCard({
  leadId,
  onTabSwitch,
}: {
  leadId: number
  onTabSwitch: (tab: TabId) => void
}) {
  const { data: docs } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => (res => (res.data?.data ?? res.data ?? []) as CrmDocument[])(await crmService.getLeadDocuments(leadId)),
    staleTime: 60 * 1000,
  })
  const { data: submissions } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      const res = await crmService.getLenderSubmissions(leadId)
      return (res.data?.data ?? res.data ?? []) as LenderSubmission[]
    },
    staleTime: 60 * 1000,
  })

  const docCount       = docs?.length ?? 0
  const subCount       = submissions?.length ?? 0
  const approvedCount  = submissions?.filter(s => s.response_status === 'approved').length ?? 0
  const pendingCount   = submissions?.filter(s => (s.response_status ?? 'pending') === 'pending').length ?? 0

  const rows = [
    {
      icon: FolderOpen,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      label: 'Documents',
      value: docCount,
      onClick: () => onTabSwitch('documents'),
    },
    {
      icon: Building2,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      label: 'Lender Submissions',
      value: subCount,
      onClick: () => onTabSwitch('lenders'),
    },
    {
      icon: Check,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      label: 'Lenders Approved',
      value: approvedCount,
      onClick: () => onTabSwitch('lenders'),
    },
    {
      icon: Clock,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-500',
      label: 'Awaiting Response',
      value: pendingCount,
      onClick: () => onTabSwitch('lenders'),
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Activity size={12} className="text-emerald-600" />
        </div>
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Quick Summary</span>
      </div>
      <div className="p-3 space-y-1.5">
        {rows.map((row, i) => {
          const Icon = row.icon
          return (
            <button
              key={i}
              onClick={row.onClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${row.iconBg}`}>
                <Icon size={13} className={row.iconColor} />
              </div>
              <span className="flex-1 text-sm text-slate-600 font-medium">{row.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-800">{row.value}</span>
                <ChevronRight size={12} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Send SMS Modal ─────────────────────────────────────────────────────────────
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
      return (res.data?.data ?? res.data?.numbers ?? res.data ?? []) as { phone_number: string; friendly_name?: string }[]
    },
    staleTime: 60 * 1000,
  })

  const { data: templates } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const res = await crmService.getSmsTemplates()
      return (res.data?.data ?? res.data ?? []) as SmsTemplate[]
    },
    staleTime: 60 * 1000,
  })

  // Auto-select first sender number
  useEffect(() => {
    if (!fromNumber && senderNumbers && senderNumbers.length > 0) {
      setFromNumber(senderNumbers[0].phone_number)
    }
  }, [senderNumbers, fromNumber])

  const handleTemplateChange = (tplId: number | '') => {
    setSelectedTpl(tplId)
    if (tplId === '') { setBody(''); return }
    const tpl = (templates ?? []).find(t => t.id === tplId)
    if (tpl) setBody(tpl.sms_template)
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
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 overflow-y-auto" style={{ maxHeight: '65vh' }}>

          {/* Template picker */}
          {(templates ?? []).length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Template <span className="text-slate-400">(optional)</span></label>
              <select
                value={selectedTpl}
                onChange={e => handleTemplateChange(e.target.value === '' ? '' : Number(e.target.value))}
                className="input w-full text-xs"
              >
                <option value="">— Select a template —</option>
                {(templates ?? []).map(t => (
                  <option key={t.id} value={t.id}>{t.sms_template_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* To / From row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To <span className="text-red-500">*</span></label>
              <input
                type="tel"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="e.g. +12025551234"
                className="input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              {numbersLoading ? (
                <div className="input w-full text-xs flex items-center gap-1.5 text-slate-400"><Loader2 size={12} className="animate-spin" /> Loading…</div>
              ) : (
                <select value={fromNumber} onChange={e => setFromNumber(e.target.value)} className="input w-full text-xs">
                  <option value="">— Auto-select —</option>
                  {(senderNumbers ?? []).map(n => (
                    <option key={n.phone_number} value={n.phone_number}>
                      {n.friendly_name ? `${n.friendly_name} (${n.phone_number})` : n.phone_number}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Message body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600">Message <span className="text-red-500">*</span></label>
              <span className={`text-[11px] font-mono ${charsLeft < 20 ? 'text-orange-500' : 'text-slate-400'}`}>
                {charsLeft} chars · {segments} {segments === 1 ? 'segment' : 'segments'}
              </span>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="Type your message…"
              className="input w-full text-sm resize-none"
              maxLength={1600}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-outline text-xs px-3 py-1.5 h-auto">Cancel</button>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => send.mutate()}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
          >
            {send.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Send Text
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Stat Chip ──────────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
      <Icon size={12} className="text-white/60 flex-shrink-0" />
      <span className="text-xs text-white/70 font-medium">{label}</span>
    </div>
  )
}

// ── Main Lead Detail — Command Center ──────────────────────────────────────────
export function CrmLeadDetail() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const leadId    = Number(id)

  const activityRef = useRef<HTMLDivElement>(null)
  const lendersRef  = useRef<HTMLDivElement>(null)
  const tabBarRef   = useRef<HTMLDivElement>(null)

  const [activeTab,          setActiveTab]          = useState<TabId>('details')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showMoreMenu,       setShowMoreMenu]       = useState(false)
  const [showPdfModal,       setShowPdfModal]       = useState(false)
  const [showEmailModal,     setShowEmailModal]     = useState(false)
  const [showSmsModal,       setShowSmsModal]       = useState(false)

  const { data: lead, isLoading } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => (res => (res.data?.data ?? res.data) as CrmLead)(await leadService.getById(leadId)),
    enabled: !!leadId,
  })

  const { data: statuses } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: () => crmService.getLeadStatuses(),
    staleTime: 5 * 60 * 1000,
  })

  // Counts for tab badges — read from query cache populated by KpiBar/QuickSummaryCard
  const { data: docsForBadge } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => (res => (res.data?.data ?? res.data ?? []) as CrmDocument[])(await crmService.getLeadDocuments(leadId)),
    staleTime: 60 * 1000,
    enabled: !!leadId,
  })
  const { data: subsForBadge } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      const res = await crmService.getLenderSubmissions(leadId)
      return (res.data?.data ?? res.data ?? []) as LenderSubmission[]
    },
    staleTime: 60 * 1000,
    enabled: !!leadId,
  })

  const { data: leadFields } = useQuery({
    queryKey: ['crm-lead-fields'],
    queryFn: async () => {
      const res = await crmService.getLeadFields()
      return (res.data?.data ?? res.data ?? []) as CrmLabel[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const docBadgeCount = docsForBadge?.length ?? 0
  const subBadgeCount = subsForBadge?.length ?? 0

  const updateStatus = useMutation({
    mutationFn: (status: string) => crmService.bulkStatusChange({ lead_ids: [leadId], lead_status: status }),
    onSuccess: () => {
      toast.success('Status updated')
      setShowStatusDropdown(false)
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 size={28} className="animate-spin text-emerald-500" />
      <p className="text-sm text-slate-400">Loading lead…</p>
    </div>
  )

  if (!lead) return (
    <div className="flex items-center gap-2 text-slate-400 p-6">
      <AlertCircle size={18} className="text-red-400" />
      <span className="text-sm">Lead not found.</span>
    </div>
  )

  const fullName      = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead #${lead.id}`
  const avatarBg      = AVATAR_BG[leadId % AVATAR_BG.length]
  const leadInits     = initials(fullName)
  const currentStatus = statuses?.find(s => s.lead_title_url === String(lead.lead_status))
  const statusColor   = currentStatus?.color_code ?? currentStatus?.color ?? '#059669'
  const daysInSystem  = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000)
  const loanAmount    = (lead as Record<string, unknown>)["loan_amount"] as string | number | null | undefined
  const leadTemp      = ((lead as Record<string, unknown>)["temperature"] as string | undefined)?.toLowerCase()
  const TEMP_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    hot:  { label: 'Hot',  bg: 'bg-red-100',   text: 'text-red-600',   dot: '#ef4444' },
    warm: { label: 'Warm', bg: 'bg-amber-100', text: 'text-amber-600', dot: '#f59e0b' },
    cold: { label: 'Cold', bg: 'bg-blue-100',  text: 'text-blue-500',  dot: '#3b82f6' },
  }
  const tempStyle = leadTemp ? TEMP_STYLES[leadTemp] : null

  async function handleDeleteLead() {
    if (!window.confirm(`Delete lead "${fullName}"? This cannot be undone.`)) return
    try {
      await leadService.delete(leadId)
      toast.success('Lead deleted')
      navigate('/crm/leads')
    } catch {
      toast.error('Failed to delete lead')
    }
  }

  function onLeadUpdated() {
    qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
    qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
  }

  return (
    <div className="min-h-screen bg-slate-50/40 -mx-5 -mt-5">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #059669, #10b981, #34d399)' }} />
        <div className="max-w-[1800px] mx-auto px-5 py-2 flex flex-col gap-1.5">

          {/* ── Row 1: nav + name + status + actions ── */}
          <div className="flex items-center gap-3">

          {/* Back */}
          <button onClick={() => navigate('/crm/leads')} className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-xs font-medium transition-colors flex-shrink-0">
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Leads</span>
          </button>
          <span className="text-slate-200 flex-shrink-0">/</span>

          {/* Avatar */}
          <div className={`w-8 h-8 rounded-lg ${avatarBg} flex items-center justify-center flex-shrink-0`}>
            <span className="text-xs font-bold text-white leading-none">{leadInits}</span>
          </div>

          {/* Name */}
          <h1 className="text-sm font-bold text-slate-900 truncate leading-tight flex-shrink-0 max-w-[180px] sm:max-w-xs">{fullName}</h1>

          {/* Status dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => { setShowStatusDropdown(s => !s); setShowMoreMenu(false) }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all hover:opacity-80"
              style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}35` }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
              {currentStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              <ChevronDown size={9} className="opacity-60" />
            </button>
            {showStatusDropdown && statuses && (
              <div className="absolute top-full left-0 mt-1 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-30 py-1 min-w-[200px]" onMouseLeave={() => setShowStatusDropdown(false)}>
                {statuses.map((s: LeadStatus) => {
                  const isCurrent = s.lead_title_url === String(lead.lead_status)
                  const dotColor  = s.color_code ?? s.color ?? '#94a3b8'
                  return (
                    <button key={s.id}
                      onClick={() => { updateStatus.mutate(s.lead_title_url); setShowStatusDropdown(false) }}
                      disabled={isCurrent || updateStatus.isPending}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                      <span className="flex-1">{s.lead_title}</span>
                      {isCurrent && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Current</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Temperature badge */}
          {tempStyle && (
            <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${tempStyle.bg} ${tempStyle.text}`}>
              <span className="w-1 h-1 rounded-full" style={{ background: tempStyle.dot }} />
              {tempStyle.label}
            </span>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
            >
              <Mail size={11} /> Send Email
            </button>
            <button
              onClick={() => setShowSmsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              <MessageSquare size={11} /> Send Text
            </button>
            <button
              onClick={() => navigate(`/crm/leads/${leadId}/edit`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              <Pencil size={11} /> Edit
            </button>
            <div className="relative">
              <button
                onClick={() => { setShowMoreMenu(s => !s); setShowStatusDropdown(false) }}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <MoreVertical size={15} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-20 py-1" onMouseLeave={() => setShowMoreMenu(false)}>
                  <button onClick={() => { setShowMoreMenu(false); setShowPdfModal(true) }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors"><Printer size={13} /> Generate PDF</button>
                  <button onClick={() => { setShowMoreMenu(false); setActiveTab('lenders') }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors"><Send size={13} /> Send to Lender</button>
                  <button onClick={() => toast('Export coming soon', { icon: 'ℹ️' })} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors"><FileDown size={13} /> Download Lead</button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button onClick={handleDeleteLead} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /> Delete Lead</button>
                </div>
              )}
            </div>
          </div>
          </div>{/* end row 1 */}

          {/* ── Row 2: contact info ── */}
          {(lead.company_name || lead.phone_number || lead.email) && (
            <div className="flex items-center gap-3 pl-1">
              {lead.company_name && (
                <span className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[180px]">
                  <Briefcase size={10} className="flex-shrink-0 text-slate-400" />
                  {String(lead.company_name)}
                </span>
              )}
              {lead.phone_number && (
                <a href={`tel:${lead.phone_number}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600 transition-colors whitespace-nowrap">
                  <Phone size={10} className="flex-shrink-0" />
                  {formatPhoneNumber(String(lead.phone_number))}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-600 transition-colors truncate max-w-[220px]">
                  <Mail size={10} className="flex-shrink-0" />
                  {String(lead.email)}
                </a>
              )}
            </div>
          )}

        </div>

        {/* ── Stat strip ── */}
        <div className="border-t border-slate-100">
          <div className="max-w-[1800px] mx-auto px-5 py-2 flex items-center gap-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {[
              { label: 'Lead type',   value: lead.lead_type ? String(lead.lead_type) : null },
              { label: 'Assigned to', value: (lead.assigned_name as string | undefined) || null },
              { label: 'Loan amount', value: loanAmount ? `$${Number(String(loanAmount).replace(/[^0-9.]/g,'')).toLocaleString('en-US')}` : null },
              { label: 'Created',     value: lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : null },
              { label: 'In pipeline', value: `${daysInSystem} day${daysInSystem === 1 ? '' : 's'}` },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className="flex items-center gap-5 flex-shrink-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{label}:</span>
                  <span className={`text-[11px] font-semibold whitespace-nowrap ${value ? 'text-slate-700' : 'text-slate-300'}`}>{value ?? '—'}</span>
                </div>
                {i < arr.length - 1 && <span className="text-slate-200 text-xs select-none">·</span>}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── SINGLE CARD ── */}
      <div className="max-w-[1800px] mx-auto px-5 py-4 pb-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 130px)' }}>

          {/* Unified tab bar */}
          <div className="relative flex-shrink-0">
            <div ref={tabBarRef} className="flex items-center border-b border-slate-100 bg-slate-50/40 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const badge = tab.id === 'documents' ? docBadgeCount : tab.id === 'lenders' ? subBadgeCount : 0
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex-shrink-0',
                    isActive
                      ? 'border-emerald-500 text-emerald-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60',
                  ].join(' ')}
                >
                  <Icon size={13} className="flex-shrink-0" />
                  {tab.label}
                  {badge > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{badge}</span>
                  )}
                </button>
              )
            })}
            <div className="flex-1" />
            </div>
            {/* Fade + scroll-right hint for overflowing tabs */}
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 flex items-center justify-end pr-1"
              style={{ background: 'linear-gradient(to right, transparent, rgba(248,250,252,0.95))' }}
            >
              <ChevronRight size={14} className="text-slate-400" />
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {activeTab === 'details' && (() => {
              const allFields = leadFields ?? []
              const CONTACT_KEYS  = new Set(['first_name','last_name','email','phone_number'])
              const BUSINESS_KEYS = new Set(['company_name','address','city','state','zip'])
              const extraContact  = allFields.filter(f => f.section === 'contact'  && !CONTACT_KEYS.has(f.field_key))
              const extraBusiness = allFields.filter(f => (f.section === 'business' || f.section === 'address') && !BUSINESS_KEYS.has(f.field_key))
              const extraOther    = allFields.filter(f => !['contact','business','address'].includes(f.section))

              return (
                <div className="px-6 py-5 h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 h-full">

                    {/* ── Col 1: Custom Fields ── */}
                    <div className="pr-6 pb-5 md:pb-0">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Hash size={11} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Information</span>
                      </div>
                      {extraOther.length > 0 ? extraOther.map(f => (
                        <PropertyRow key={f.field_key} fieldKey={f.field_key} label={f.label_name} fieldType={f.field_type} options={f.options} value={(lead as Record<string,unknown>)[f.field_key] as string|undefined} leadId={leadId} onUpdated={onLeadUpdated} readOnly />
                      )) : (
                        <p className="text-xs text-slate-300 mt-1">No custom fields defined.</p>
                      )}
                    </div>

                    {/* ── Col 2: Business ── */}
                    <div className="pt-5 md:pt-0 md:pl-6">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Briefcase size={11} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business</span>
                      </div>
                      <PropertyRow fieldKey="company_name" label="Company" value={lead.company_name as string|undefined} leadId={leadId} onUpdated={onLeadUpdated} readOnly />
                      <PropertyRow fieldKey="address"      label="Address" value={lead.address      as string|undefined} leadId={leadId} onUpdated={onLeadUpdated} readOnly />
                      <PropertyRow fieldKey="city"         label="City"    value={lead.city         as string|undefined} leadId={leadId} onUpdated={onLeadUpdated} readOnly />
                      <PropertyRow fieldKey="state"        label="State"   value={lead.state        as string|undefined} leadId={leadId} onUpdated={onLeadUpdated} readOnly />
                      <PropertyRow fieldKey="zip"          label="ZIP"     value={(lead as Record<string,unknown>)['zip'] as string|undefined} leadId={leadId} onUpdated={onLeadUpdated} readOnly />
                      {extraBusiness.map(f => (
                        <PropertyRow key={f.field_key} fieldKey={f.field_key} label={f.label_name} fieldType={f.field_type} options={f.options} value={(lead as Record<string,unknown>)[f.field_key] as string|undefined} leadId={leadId} onUpdated={onLeadUpdated} readOnly />
                      ))}
                    </div>

                  </div>
                </div>
              )
            })()}

            {activeTab === 'activity'  && <div ref={activityRef}  className="p-5"><ActivityTimeline leadId={leadId} /></div>}
            {activeTab === 'documents' && <div className="px-5 py-4 h-full"><DocumentsPanel leadId={leadId} /></div>}
            {activeTab === 'lenders'   && <div ref={lendersRef}   className="p-5"><LendersPanel leadId={leadId} /></div>}
            {activeTab === 'approvals' && <div className="p-5"><ApprovalsSection leadId={leadId} /></div>}
            {activeTab === 'merchant'  && <div className="p-5"><MerchantPortalSection leadId={leadId} /></div>}
            {activeTab === 'offers'     && <div className="p-5"><OffersStipsTab leadId={leadId} /></div>}
            {activeTab === 'deal'       && <div className="p-5"><DealTab leadId={leadId} /></div>}
            {activeTab === 'compliance' && <div className="p-5"><ComplianceTab leadId={leadId} /></div>}

          </div>

        </div>
      </div>

      {showPdfModal && (
        <PdfPreviewModal leadId={leadId} leadName={fullName} onClose={() => setShowPdfModal(false)} />
      )}
      {showEmailModal && (
        <SendEmailModal leadId={leadId} defaultTo={String(lead?.email ?? '')} onClose={() => setShowEmailModal(false)} />
      )}
      {showSmsModal && (
        <SendSmsModal leadId={leadId} defaultTo={String(lead?.phone_number ?? '')} onClose={() => setShowSmsModal(false)} />
      )}
    </div>
  )
}
