import { useState, useRef, useEffect } from 'react'
import type { ReactNode, ChangeEvent, RefObject, ComponentType } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Pencil, Loader2, ChevronDown, ChevronUp, Upload, FileText,
  Trash2, Download, Building2, Send, AlertCircle, X, Eye,
  Settings2, Mail, Phone, MapPin, Calendar, User, Briefcase,
  Hash, UserCheck, Clock, FolderOpen, MoreVertical, Tag,
  ClipboardList, Zap, MessageSquare, FileDown, Plus, ExternalLink, Printer,
  Check, DollarSign, ChevronRight, TrendingUp, FileCheck2, ShieldCheck,
  Activity, Search, Wrench, RefreshCw, AlertTriangle, CheckCircle,
  ArrowDownLeft, ArrowUpRight, Paperclip, Users, SlidersHorizontal, ArrowUpDown,
  Copy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { emailParserService, type LenderConversation } from '../../services/emailParser.service'
import { ActivityTimeline } from '../../components/crm/ActivityTimeline'
import { LenderErrorList, ErrorFixModal, describeApiError } from '../../components/crm/LenderApiFixModal'
import { LenderValidationPanel } from '../../components/crm/LenderValidationPanel'
import { SubmissionResultSummary } from '../../components/crm/SubmissionResultSummary'
import { ApiLogDrawer } from '../../components/crm/ApiLogDrawer'
import type { ApiLog as DrawerApiLog } from '../../components/crm/ApiLogDrawer'
import { MerchantPortalSection } from '../../components/crm/MerchantPortalSection'
import { OffersStipsTab } from '../../components/crm/OffersStipsTab'
import { DealTab } from '../../components/crm/DealTab'
import { ComplianceTab } from '../../components/crm/ComplianceTab'
import { ApprovalsSection } from '../../components/crm/ApprovalsSection'
import { OnDeckPanel } from '../../components/crm/OnDeckPanel'
import { DynamicFieldForm } from '../../components/crm/DynamicFieldForm'
import { CrmDocumentTypesManager, parseValues } from '../../components/crm/CrmDocumentTypesManager'
import { RichEmailEditor } from '../../components/crm/RichEmailEditor'
import type { RichEmailEditorRef } from '../../components/crm/RichEmailEditor'
import type { DocumentType } from '../../components/crm/CrmDocumentTypesManager'
import { ErrorBoundary } from '../../components/ui/ErrorBoundary'
import { confirmDelete } from '../../utils/confirmDelete'
import { formatPhoneNumber } from '../../utils/format'
import type { CrmLead, LeadStatus, CrmDocument, Lender, LenderSubmission, LenderResponseStatus, LenderSubmissionStatus, MappedApiError, CrmLabel, EmailTemplate, SmsTemplate, FixSuggestion, ApplyLenderFixPayload, GroupedValidationState, LenderValidationResult, LenderSubmissionOutcome, SubmissionStatusRow } from '../../types/crm.types'
import { CRM_FIELD_LABELS, COMPUTED_FIELDS, autoLabel as sharedAutoLabel } from '../../constants/crmFieldLabels'
import { useUIStore } from '../../stores/ui.store'

// ── Tab System ─────────────────────────────────────────────────────────────────
type TabId = 'details' | 'activity' | 'documents' | 'lenders' | 'ondeck' | 'merchant' | 'offers' | 'deal' | 'compliance' | 'approvals'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'details',   label: 'Lead Info',       icon: Hash         },
  { id: 'activity',  label: 'Activity',        icon: Clock        },
  { id: 'documents', label: 'Documents',       icon: FolderOpen   },
  { id: 'lenders',   label: 'Lenders',         icon: Building2    },
  // { id: 'ondeck',    label: 'OnDeck API',       icon: Zap          },
  // Merchant Portal moved to header action button
  { id: 'offers',     label: 'Offers & Stips',  icon: DollarSign    },
  { id: 'deal',       label: 'Deal',             icon: TrendingUp    },
  { id: 'compliance', label: 'Compliance',       icon: ShieldCheck   },
  { id: 'approvals',  label: 'Approvals',        icon: CheckCircle   },
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
  // Some browsers/OS report these for Office files
  'application/zip', 'application/octet-stream', 'application/x-cfb',
])
const ALLOWED_EXTS = new Set(['pdf','doc','docx','xls','xlsx','jpg','jpeg','png'])
const ALLOWED_EXT  = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'
const MAX_FILE_MB  = 20
const MAX_FILES    = 10

// ── Helpers ────────────────────────────────────────────────────────────────────
function getFileExt(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase()
}

function validateFiles(files: File[]): { valid: File[]; errors: string[] } {
  const valid: File[] = []; const errors: string[] = []
  if (files.length > MAX_FILES) { errors.push(`Maximum ${MAX_FILES} files allowed.`); return { valid, errors } }
  for (const f of files) {
    const ext = getFileExt(f.name)
    const mimeOk = ALLOWED_MIMES.has(f.type) || !f.type  // empty type = trust extension
    const extOk  = ALLOWED_EXTS.has(ext)
    if (!mimeOk && !extOk) errors.push(`"${f.name}" — unsupported type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG.`)
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

function toTitleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
function DocViewerModal({ doc, leadId, onClose }: { doc: CrmDocument; leadId: number; onClose: () => void }) {
  const [blobUrl, setBlobUrl]       = useState<string | null>(null)
  const [viewLoading, setViewLoading] = useState(true)
  const [viewError, setViewError]   = useState(false)
  const [downloading, setDownloading] = useState(false)
  const fileType = getFileType(doc.file_path)

  // Fetch the document via the authenticated proxy endpoint → blob URL for iframe/img
  useEffect(() => {
    if (fileType === 'other') { setViewLoading(false); return }
    let url: string | null = null
    crmService.viewLeadDocument(leadId, doc.id)
      .then(res => { url = URL.createObjectURL(res.data as Blob); setBlobUrl(url) })
      .catch(() => setViewError(true))
      .finally(() => setViewLoading(false))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [doc.id, leadId, fileType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await crmService.downloadLeadDocument(leadId, doc.id)
      const url = URL.createObjectURL(res.data as Blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: doc.file_name })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { toast.error('Download failed') }
    setDownloading(false)
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
        {viewLoading && (
          <Loader2 size={28} className="animate-spin text-white/60" />
        )}
        {!viewLoading && viewError && (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle size={32} className="text-slate-400" />
            <p className="text-slate-300 text-sm">Failed to load document preview.</p>
            <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download to view
            </button>
          </div>
        )}
        {!viewLoading && !viewError && blobUrl && fileType === 'pdf' && (
          <iframe src={blobUrl} title={doc.file_name} className="w-full h-full rounded-xl" style={{ maxWidth: '960px', border: 'none', background: '#fff' }} />
        )}
        {!viewLoading && !viewError && blobUrl && fileType === 'image' && (
          <img src={blobUrl} alt={doc.file_name} className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
        )}
        {!viewLoading && fileType === 'other' && (
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
    queryFn: async () => {
      const res = await crmService.getDocumentTypes()
      return (res.data?.data ?? res.data ?? []) as DocumentType[]
    },
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
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ? `Upload failed: ${msg}` : 'Upload failed — please try again.')
    },
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
    <>
      {viewDoc && <DocViewerModal doc={viewDoc} leadId={leadId} onClose={() => setViewDoc(null)} />}
      {showTypeManager && <CrmDocumentTypesManager onClose={() => setShowTypeManager(false)} />}

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
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setViewDoc(doc)} disabled={!doc.file_path} className="p-1.5 rounded-md bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors disabled:opacity-30" title="Preview"><Eye size={13} /></button>
                    <button
                      disabled={!doc.file_path}
                      className="p-1.5 rounded-md bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700 transition-colors disabled:opacity-30"
                      title="Download"
                      onClick={async () => {
                        if (!doc.file_path) return
                        try {
                          const res = await crmService.downloadLeadDocument(leadId, doc.id)
                          const url = URL.createObjectURL(res.data as Blob)
                          const a = Object.assign(document.createElement('a'), { href: url, download: doc.file_name })
                          document.body.appendChild(a); a.click(); document.body.removeChild(a)
                          setTimeout(() => URL.revokeObjectURL(url), 1000)
                        } catch { toast.error('Download failed') }
                      }}
                    ><Download size={13} /></button>
                    <button onClick={async () => { if (await confirmDelete()) deleteMutation.mutate(doc.id) }} className="p-1.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors" title="Delete"><Trash2 size={13} /></button>
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

        {/* Type + conditional sub-type */}
        <div className="space-y-2 mb-3">
          <select value={selectedTypeId} onChange={e => { setSelectedTypeId(e.target.value); setSubValue('') }} className="input text-sm w-full">
            <option value="">— Document type —</option>
            {activeTypes.map((t: DocumentType) => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
          </select>
          {subValues.length > 0 && (
            <select value={subValue} onChange={e => setSubValue(e.target.value)} className="input text-sm w-full">
              <option value="">Select {selectedType?.title} month</option>
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
          <span className="text-[10px] text-slate-400">
            {selectedTypeId ? 'PDF, DOC, XLS, JPG, PNG' : 'Select a document type first'}
          </span>
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
    </>
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
  failed:      { label: 'Failed',      bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500'     },
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

// Parse backend auto-submission notes: "[YYYY-MM-DD HH:mm] message" separated by "\n\n"
function parseSubmissionNotes(raw: string): { ts: string; text: string }[] {
  try {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return []
    return raw.split(/\n\n+/).map(entry => {
      entry = entry.trim()
      const m = entry.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s*(.+)$/s)
      if (m) return { ts: m[1], text: m[2].trim() }
      return { ts: '', text: entry }
    }).filter(e => e.text)
  } catch (err) {
    console.error('[parseSubmissionNotes] Failed to parse:', err)
    return []
  }
}

// Parse stored note log: entries separated by "\n---\n"
function parseNoteLog(raw: string): { ts: string; text: string }[] {
  try {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return []
    return raw.split('\n---\n').map(entry => {
      const nl = entry.indexOf('\n')
      if (nl === -1) return { ts: '', text: entry.trim() }
      const firstLine = entry.slice(0, nl).trim()
      const rest      = entry.slice(nl + 1).trim()
      // first line is timestamp if it matches [Mar 23, 2026 8:14 PM]
      if (/^\[.+\]$/.test(firstLine)) return { ts: firstLine.slice(1, -1), text: rest }
      return { ts: '', text: entry.trim() }
    }).filter(e => e.text)
  } catch (err) {
    console.error('[parseNoteLog] Failed to parse:', err)
    return []
  }
}

function buildAppendedNote(existing: string, newText: string): string {
  const ts      = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const entry   = `[${ts}]\n${newText.trim()}`
  return existing.trim() ? `${existing.trim()}\n---\n${entry}` : entry
}

/** Parse error_messages from submission (handles JSON string or array).
 *  Always returns a valid MappedApiError[] — never throws. */
function parseErrorMessages(raw: LenderSubmission['error_messages']): MappedApiError[] {
  try {
    if (!raw) return []
    let parsed: unknown = raw
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw) } catch { return [] }
    }
    // Must be an array
    if (!Array.isArray(parsed)) {
      console.warn('[parseErrorMessages] Expected array, got:', typeof parsed, parsed)
      return []
    }
    // Validate each entry has at minimum a field or message string
    return parsed.filter((item): item is MappedApiError =>
      item != null && typeof item === 'object' && (typeof item.field === 'string' || typeof item.message === 'string')
    ).map(item => ({
      label: typeof item.label === 'string' ? item.label : '',
      field: typeof item.field === 'string' ? item.field : '',
      message: typeof item.message === 'string' ? item.message : 'Unknown error',
      fix_type: typeof item.fix_type === 'string' ? item.fix_type : 'unknown',
      expected: typeof item.expected === 'string' ? item.expected : '',
    }))
  } catch (err) {
    console.error('[parseErrorMessages] Unexpected error parsing error_messages:', err, raw)
    return []
  }
}

// ── Quick Fix Modal — edit error fields in a popup ─────────────────────────────
function QuickFixModal({
  leadId,
  lenderId,
  lenderName,
  errors,
  leadData,
  onClose,
}: {
  leadId: number
  lenderId: number
  lenderName: string
  errors: MappedApiError[]
  leadData: Record<string, unknown>
  onClose: () => void
}) {
  const qc = useQueryClient()
  // Only include errors that have a field key AND exist in lead data (skip computed/synthetic lender fields)
  // Deduplicate by field key (multiple API errors can map to the same CRM field)
  const fixable = (() => {
    const seen = new Set<string>()
    return errors.filter(e => {
      if (!e.field || e.field === '') return false
      if (seen.has(e.field)) return false
      // Field must exist as a key in leadData (even if value is empty/null)
      if (!(e.field in leadData)) return false
      seen.add(e.field)
      return true
    })
  })()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const err of fixable) {
      init[err.field] = String(leadData[err.field] ?? '')
    }
    return init
  })

  const LABELS: Record<string, string> = {
    first_name: 'First Name', last_name: 'Last Name', email: 'Email',
    phone: 'Phone', phone_number: 'Phone Number', cell_phone: 'Cell Phone',
    dob: 'Date of Birth', date_of_birth: 'Date of Birth',
    ssn: 'SSN', home_state: 'Home State', home_address: 'Home Address',
    home_city: 'Home City', home_zip: 'Home ZIP', zip_code: 'ZIP Code',
    address: 'Address', city: 'City', state: 'State',
    company_name: 'Company Name', business_phone: 'Business Phone',
    business_address: 'Business Address', business_city: 'Business City',
    business_state: 'Business State', business_zip: 'Business ZIP',
    ein: 'EIN / Tax ID', tax_id: 'Tax ID', fein: 'Federal EIN',
    amount_requested: 'Amount Requested', monthly_revenue: 'Monthly Revenue',
    annual_revenue: 'Annual Revenue', credit_score: 'Credit Score',
    business_start_date: 'Business Start Date', industry: 'Industry',
    ownership_percentage: 'Ownership %', full_name: 'Full Name',
    option_34: 'Home State', option_37: 'Home Address', option_38: 'Business Phone',
    option_39: 'Amount Requested', option_44: 'SSN', option_45: 'Business ZIP',
    option_46: 'Home ZIP', option_724: 'Business Address', option_730: 'EIN / Tax ID',
    option_731: 'Business Start Date', option_733: 'Ownership %',
    option_749: 'Monthly Revenue', option_750: 'Avg Bank Balance',
  }
  const label = (key: string) => LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // Simple inline validation based on fix_type
  const validate = (val: string, fixType: string): string | null => {
    if (!val.trim()) return 'This field is required'
    const v = val.trim()
    if (fixType === 'zip' && !/^\d{5}$/.test(v)) return 'Must be exactly 5 digits'
    if ((fixType === 'ein' || fixType === 'ssn') && !/^\d{9}$/.test(v.replace(/[-\s]/g, ''))) return 'Must be exactly 9 digits'
    if (fixType === 'phone' && !/^\d{10,11}$/.test(v.replace(/[-\s().+]/g, ''))) return 'Must be 10-11 digits'
    return null
  }

  const getChangedFields = (): Record<string, string> => {
    const changed: Record<string, string> = {}
    for (const [k, v] of Object.entries(values)) {
      if (v !== String(leadData[k] ?? '')) changed[k] = v
    }
    return changed
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const changed = getChangedFields()
      if (Object.keys(changed).length === 0) throw new Error('No changes')
      return leadService.update(leadId, changed)
    },
    onSuccess: () => {
      toast.success('Lead updated — you can now resubmit')
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['lead-detail', leadId] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as Error)?.message === 'No changes'
        ? 'No fields were changed'
        : 'Failed to save'
      toast.error(msg)
    },
  })

  const resubmitMutation = useMutation({
    mutationFn: async () => {
      const changed = getChangedFields()
      if (Object.keys(changed).length === 0) throw new Error('No changes')
      return crmService.fixAndResubmit(leadId, {
        lender_id: lenderId,
        field_updates: changed,
      })
    },
    onSuccess: () => {
      toast.success('Lead updated & resubmission dispatched')
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['lead-detail', leadId] })
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['lead-api-logs', leadId] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as Error)?.message === 'No changes'
        ? 'No fields were changed'
        : 'Failed to save & resubmit'
      toast.error(msg)
    },
  })

  if (fixable.length === 0) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Wrench size={14} className="text-indigo-500" />
              Fix Fields — {lenderName}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Update the values below and save to fix the API errors
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          {fixable.length === 0 && errors.length > 0 && (
            <p className="text-xs text-slate-500 italic">
              The API errors reference fields that cannot be edited here (computed by the lender).
              Please update the lead data directly and resubmit.
            </p>
          )}
          {fixable.map(err => {
            const val = values[err.field] ?? ''
            const vErr = validate(val, err.fix_type)
            const changed = val !== String(leadData[err.field] ?? '')
            return (
              <div key={err.field}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {err.label || label(err.field)}
                  {err.expected && (
                    <span className="ml-1.5 text-[10px] font-normal text-amber-600">
                      ({err.expected})
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={val}
                  onChange={e => setValues(prev => ({ ...prev, [err.field]: e.target.value }))}
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
                    vErr
                      ? 'border-red-300 bg-red-50'
                      : changed
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200'
                  }`}
                  placeholder={err.expected || label(err.field)}
                />
                <div className="flex items-center justify-between mt-0.5">
                  {vErr ? (
                    <p className="text-[10px] text-red-500 font-medium">{vErr}</p>
                  ) : changed ? (
                    <p className="text-[10px] text-emerald-600 font-medium">Changed</p>
                  ) : (
                    <p className="text-[10px] text-amber-500">Needs correction</p>
                  )}
                  {String(leadData[err.field] ?? '') !== '' && (
                    <p className="text-[10px] text-slate-400">
                      Current: <span className="font-medium text-slate-500">{String(leadData[err.field])}</span>
                    </p>
                  )}
                </div>
                {err.message && (
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">{err.message}</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center gap-2.5 flex-shrink-0 bg-slate-50/80 rounded-b-2xl">
          <button
            onClick={() => resubmitMutation.mutate()}
            disabled={resubmitMutation.isPending || saveMutation.isPending}
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            {resubmitMutation.isPending
              ? <><Loader2 size={12} className="animate-spin" /> Resubmitting…</>
              : <><RefreshCw size={12} /> Save & Resubmit</>
            }
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || resubmitMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            {saveMutation.isPending
              ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
              : <><Check size={12} /> Save Only</>
            }
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function SubmissionRow({ sub, leadId, onViewLog, onResubmit, isResubmitting }: {
  sub: LenderSubmission; leadId: number
  onViewLog: (lenderId: number, lenderName: string) => void
  onResubmit?: (lenderId: number) => void
  isResubmitting?: boolean
}) {
  const qc = useQueryClient()
  const [editing,  setEditing]  = useState(false)
  const [errorsExpanded, setErrorsExpanded] = useState(sub.submission_status === 'failed')
  const [fixModalOpen, setFixModalOpen] = useState(false)
  const [status,   setStatus]   = useState<LenderResponseStatus>(sub.response_status ?? 'pending')
  const [newNote,  setNewNote]  = useState('')
  const existingNotes = sub.response_note ?? ''
  const noteLog       = parseNoteLog(existingNotes)
  const errorMessages = parseErrorMessages(sub.error_messages)
  const isFailed      = sub.submission_status === 'failed'

  // Fetch lead data for the fix modal
  const { data: leadDataForFix } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => {
      try {
        const r = await leadService.getById(leadId)
        return (r.data?.data ?? r.data) as CrmLead
      } catch (err) {
        console.error('[SubmissionRow] Failed to fetch lead data for fix modal:', err)
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: fixModalOpen,
  })

  const statusColors: Record<string, string> = {
    approved:        'text-white bg-emerald-500 border-emerald-500',
    declined:        'text-white bg-red-500 border-red-500',
    needs_documents: 'text-white bg-orange-400 border-orange-400',
    pending:         'text-slate-600 bg-slate-100 border-slate-300',
  }
  const statusLabel: Record<string, string> = {
    approved: 'Approved', declined: 'Declined', needs_documents: 'Missing Docs', pending: 'Pending',
  }

  // Submission status badges (separate from response status)
  const submissionBadge: Record<string, { color: string; label: string }> = {
    failed:    { color: 'text-white bg-red-500 border-red-500',       label: 'Failed' },
    submitted: { color: 'text-white bg-emerald-500 border-emerald-500', label: 'Sent' },
    pending:   { color: 'text-amber-700 bg-amber-100 border-amber-300', label: 'Processing' },
    partial:   { color: 'text-orange-700 bg-orange-100 border-orange-300', label: 'Partial' },
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
    },
    onError: () => toast.error('Failed to save'),
  })

  return (
    <div className={`border rounded-lg bg-white overflow-hidden ${isFailed ? 'border-red-300' : 'border-slate-200'}`}>
      {/* Summary row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {sub.lender_name ?? `Lender #${sub.lender_id}`}
            </p>
            {sub.submission_type === 'api' ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex-shrink-0">
                <Zap size={8} /> API
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200 flex-shrink-0">
                <Mail size={8} /> Email
              </span>
            )}
            {/* Submission status badge — clickable for API submissions */}
            {sub.submission_type === 'api' && submissionBadge[sub.submission_status] && (
              <button
                onClick={() => onViewLog(sub.lender_id, sub.lender_name ?? `Lender #${sub.lender_id}`)}
                className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 cursor-pointer hover:brightness-110 hover:scale-105 transition-all ${submissionBadge[sub.submission_status].color}`}
                title="Click to view API response"
              >
                {sub.submission_status === 'failed' && <AlertCircle size={8} />}
                {sub.submission_status === 'submitted' && <CheckCircle size={8} />}
                {submissionBadge[sub.submission_status].label}
              </button>
            )}
            {/* Email delivery status badge — for email submissions only */}
            {sub.submission_type !== 'api' && sub.email_status && (() => {
              const emailBadge: Record<string, { color: string; label: string; icon: ReactNode }> = {
                sent:      { color: 'text-blue-700 bg-blue-50 border-blue-200',       label: 'Sent',      icon: <Send size={8} /> },
                delivered: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Delivered', icon: <CheckCircle size={8} /> },
                opened:    { color: 'text-purple-700 bg-purple-50 border-purple-200',   label: 'Opened',    icon: <Eye size={8} /> },
                failed:    { color: 'text-red-700 bg-red-50 border-red-200',            label: 'Failed',    icon: <AlertCircle size={8} /> },
              }
              const badge = emailBadge[sub.email_status]
              if (!badge) return null
              return (
                <span
                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${badge.color}`}
                  title={`Email ${badge.label}${sub.email_status_at ? ` at ${new Date(sub.email_status_at).toLocaleString()}` : ''}`}
                >
                  {badge.icon} {badge.label}
                </span>
              )
            })()}
            {/* Doc upload status indicator */}
            {sub.doc_upload_status && sub.doc_upload_status !== 'none' && (
              <span
                className={`inline-flex items-center text-[9px] font-bold px-1 py-0.5 rounded-full flex-shrink-0 ${
                  sub.doc_upload_status === 'success' ? 'text-emerald-600' :
                  sub.doc_upload_status === 'partial' ? 'text-orange-500' : 'text-red-500'
                }`}
                title={`Docs: ${sub.doc_upload_status}${sub.doc_upload_notes ? ` — ${sub.doc_upload_notes}` : ''}`}
              >
                {sub.doc_upload_status === 'success' ? <CheckCircle size={9} /> :
                 sub.doc_upload_status === 'partial' ? <AlertTriangle size={9} /> :
                 <AlertCircle size={9} />}
              </span>
            )}
          </div>
          {sub.submitted_at && (
            <p className="text-[10px] text-slate-400 tabular-nums">
              {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
            </p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[status] ?? statusColors.pending}`}>
          {statusLabel[status] ?? status}
        </span>
        {isFailed && errorMessages.length > 0 && (
          <button
            onClick={() => setErrorsExpanded(v => !v)}
            className="p-1 rounded flex-shrink-0 text-red-500 hover:bg-red-50 transition-colors"
            title={errorsExpanded ? 'Hide errors' : 'Show errors'}
          >
            {errorsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        {sub.submission_type === 'api' && (
          <button
            onClick={() => onViewLog(sub.lender_id, sub.lender_name ?? `Lender #${sub.lender_id}`)}
            className="p-1 rounded flex-shrink-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View API log"
          >
            <Eye size={12} />
          </button>
        )}
        {onResubmit && (
          <button
            onClick={e => { e.stopPropagation(); onResubmit(sub.lender_id) }}
            disabled={isResubmitting}
            className="p-1 rounded flex-shrink-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors"
            title="Resubmit to this lender"
          >
            {isResubmitting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
        )}
        <button
          onClick={() => setEditing(v => !v)}
          className={`p-1 rounded flex-shrink-0 transition-colors ${editing ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}
          title="Edit"
        >
          <Pencil size={12} />
        </button>
      </div>

      {/* ── Error Messages Box (failed API submissions) ── */}
      {isFailed && errorsExpanded && errorMessages.length > 0 && (
        <div className="border-t border-red-200 bg-red-50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
            <p className="text-[11px] font-bold text-red-700">Submission Failed — Fix Required Fields</p>
          </div>
          <ul className="space-y-1">
            {errorMessages.map((err, i) => (
              <li
                key={i}
                data-field={err.field}
                className="flex items-start gap-2 text-[11px] text-red-700 cursor-pointer hover:text-red-900 hover:bg-red-100 rounded px-1.5 py-1 transition-colors"
                onClick={() => {
                  if (!err.field) return
                  // Try direct input first (DynamicFieldForm), then data-attr (PropertyRow), then id
                  const el = document.querySelector<HTMLElement>(
                    `[name="${err.field}"], [data-field-key="${err.field}"], #field-${err.field}`
                  )
                  if (!el) return
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  // If it's an input/select/textarea, focus directly
                  if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                    el.focus()
                    el.classList.add('field-error')
                    setTimeout(() => el.classList.remove('field-error'), 3000)
                  } else {
                    // PropertyRow: click the edit button inside to open inline edit
                    const btn = el.querySelector<HTMLElement>('button[data-field-key]') || el.querySelector<HTMLElement>('button')
                    if (btn) btn.click()
                    el.classList.add('field-error')
                    setTimeout(() => {
                      el.classList.remove('field-error')
                      // After edit mode opens, try to focus the input
                      const input = el.querySelector<HTMLElement>('input, select, textarea')
                      if (input) input.focus()
                    }, 150)
                  }
                }}
                title={err.message}
              >
                <span className="flex-shrink-0 w-1 h-1 rounded-full bg-red-400 mt-1.5" />
                <span>
                  <strong className="font-semibold">{err.label}</strong>
                  {err.expected && <span className="text-red-500 ml-1">— {err.expected}</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={() => setFixModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Wrench size={10} /> Fix Fields & Resubmit
            </button>
            {sub.api_error && (
              <p className="text-[10px] text-red-400 italic truncate flex-1" title={sub.api_error}>
                {sub.api_error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Fix Modal */}
      {fixModalOpen && leadDataForFix && (
        <ErrorBoundary fallbackTitle="Error loading fix modal">
          <QuickFixModal
            leadId={leadId}
            lenderId={sub.lender_id}
            lenderName={sub.lender_name ?? `Lender #${sub.lender_id}`}
            errors={errorMessages}
            leadData={leadDataForFix as unknown as Record<string, unknown>}
            onClose={() => setFixModalOpen(false)}
          />
        </ErrorBoundary>
      )}

      {/* Inline api_error banner for failed subs without structured errors */}
      {isFailed && !errorMessages.length && sub.api_error && (
        <div className="border-t border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
          <AlertCircle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700">{sub.api_error}</p>
        </div>
      )}

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

      {/* Submission log — one entry per send event */}
      {sub.notes && (() => {
        const entries = parseSubmissionNotes(sub.notes)
        if (!entries.length) return null
        return (
          <div className="border-t border-slate-100">
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Send Log ({entries.length})
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {entries.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1" />
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-700">{e.text}</span>
                      {e.ts && <span className="text-slate-400 ml-1.5 tabular-nums">{e.ts}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Lenders Panel ──────────────────────────────────────────────────────────────
/** Replace [[field_key]] placeholders with actual lead values. */
function fillPlaceholders(html: string, lead: Record<string, unknown>): string {
  const resolve = (match: string, key: string) => {
    const val = lead[key]
    return val !== null && val !== undefined && val !== '' ? String(val) : match
  }
  return html
    .replace(/\[\[(\w+)\]\]/g, resolve)
    .replace(/\{\{(\w+)\}\}/g, resolve)
}

interface LenderApiCfg { id: number; lender_name?: string; api_name: string; api_status: string | number; required_fields?: string[] | null; payload_mapping?: Record<string, string | string[]> | string | null }

// ── Extended ApiLog type (includes structured error analysis) ──────────────────
interface ApiLog {
  id: number; crm_lender_api_id: number; lender_id: number; lead_id: number
  request_url: string; request_method: string; response_code: number | null
  response_body: string | null; status: string; error_message: string | null
  duration_ms: number; attempt: number; created_at: string
  api_name?: string; lender_name?: string
  // Structured error analysis (populated by backend after enrichLog)
  error_json:      FixSuggestion[] | null
  fix_suggestions: FixSuggestion[] | null
  is_fixable:      boolean
}

// ErrorFixModal, LenderErrorList, describeApiError imported from LenderApiFixModal.tsx

// ── Lender Email History (inside LendersPanel) ────────────────────────────────
function LenderEmailHistory({ leadId }: { leadId: number }) {
  const [expanded, setExpanded] = useState(false)
  const [openEmailId, setOpenEmailId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['lead-lender-emails', leadId],
    queryFn: async () => {
      try {
        const res = await emailParserService.getLeadLenderConversations(leadId)
        const d = res.data?.data?.conversations ?? res.data?.data ?? []
        return Array.isArray(d) ? d as LenderConversation[] : []
      } catch {
        return []
      }
    },
    staleTime: 60_000,
  })

  const conversations = data ?? []
  if (conversations.length === 0 && !isLoading) return null

  // Group by lender_id
  const grouped: Record<number, LenderConversation[]> = {}
  for (const c of conversations) {
    if (!grouped[c.lender_id]) grouped[c.lender_id] = []
    grouped[c.lender_id].push(c)
  }

  const lenderIds = Object.keys(grouped).map(Number)

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Mail size={13} className="text-indigo-500" />
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          Email History
        </span>
        <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
          {conversations.length}
        </span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ml-auto ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-slate-400" /></div>
          ) : lenderIds.map(lid => {
            const items = grouped[lid]
            const lenderName = items[0]?.from_email?.split('<')[0]?.trim() || `Lender #${lid}`
            return (
              <div key={lid} className="rounded-lg border border-slate-100 bg-slate-50/50 overflow-hidden">
                <div className="px-3 py-2 bg-slate-100/50 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">{lenderName}</span>
                  <span className="ml-2 text-[10px] text-slate-400">{items.length} email{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map(c => (
                    <div key={c.id}>
                      <div
                        className={`px-3 py-2.5 flex items-start gap-2 cursor-pointer hover:bg-slate-100/50 transition-colors ${openEmailId === c.id ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => setOpenEmailId(openEmailId === c.id ? null : c.id)}
                      >
                        {c.direction === 'inbound' ? (
                          <ArrowDownLeft size={12} className="text-blue-500 mt-0.5 shrink-0" />
                        ) : (
                          <ArrowUpRight size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-700">{c.subject || '(no subject)'}</span>
                            {c.offer_detected && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-green-100 text-green-700">
                                <DollarSign size={8} /> Offer
                              </span>
                            )}
                            {c.has_attachments && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                                <Paperclip size={9} /> {c.attachment_count}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span>{c.from_email}</span>
                            <span>-</span>
                            <span>{c.conversation_date ? new Date(c.conversation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                          </div>
                        </div>
                        <ChevronDown size={12} className={`text-slate-400 transition-transform shrink-0 mt-1 ${openEmailId === c.id ? 'rotate-180' : ''}`} />
                      </div>
                      {/* Expanded full email content */}
                      {openEmailId === c.id && (
                        <div className="px-3 pb-3">
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            {/* Email header */}
                            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 space-y-1">
                              <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">From:</span> {c.from_email}</div>
                              <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">To:</span> {c.to_email || '—'}</div>
                              <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">Subject:</span> {c.subject || '(no subject)'}</div>
                              <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">Date:</span> {c.conversation_date ? new Date(c.conversation_date).toLocaleString() : '—'}</div>
                              {c.detected_merchant_name && (
                                <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">Matched Merchant:</span> {c.detected_merchant_name} <span className="text-slate-400">({c.detection_source})</span></div>
                              )}
                            </div>
                            {/* Offer details */}
                            {c.offer_detected && c.offer_details && (
                              <div className="px-4 py-2 bg-green-50 border-b border-green-200">
                                <span className="text-[10px] font-semibold text-green-700">Offer Detected: </span>
                                {c.offer_details.amount && <span className="text-[11px] text-green-800 mr-3">Amount: <strong>${Number(c.offer_details.amount).toLocaleString()}</strong></span>}
                                {c.offer_details.factor_rate && <span className="text-[11px] text-green-800 mr-3">Rate: <strong>{String(c.offer_details.factor_rate)}</strong></span>}
                                {c.offer_details.term && <span className="text-[11px] text-green-800 mr-3">Term: <strong>{String(c.offer_details.term)}</strong></span>}
                                {c.offer_details.daily_payment && <span className="text-[11px] text-green-800">Daily: <strong>${Number(c.offer_details.daily_payment).toLocaleString()}</strong></span>}
                              </div>
                            )}
                            {/* Attachments */}
                            {c.has_attachments && c.attachment_filenames && c.attachment_filenames.length > 0 && (
                              <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap">
                                <Paperclip size={10} className="text-slate-400" />
                                {c.attachment_filenames.map((f, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">{f}</span>
                                ))}
                              </div>
                            )}
                            {/* Full email body */}
                            <div className="px-4 py-3 max-h-[400px] overflow-y-auto">
                              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{c.body_preview || '(no content)'}</pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LendersPanel({ leadId }: { leadId: number }) {
  const qc = useQueryClient()

  const [selectedIds, setSelectedIds]       = useState<Set<number>>(new Set())
  const [notes, setNotes]                   = useState('')
  const [templateId, setTemplateId]         = useState<number | ''>('')
  const [uploadingDocs, setUploadingDocs]   = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [focusedLenderId, setFocusedLenderId] = useState<number | null>(null)
  const [lenderSearch, setLenderSearch]       = useState('')
  const [lenderStatusFilter, setLenderStatusFilter] = useState<string>('all')
  const [lenderSort, setLenderSort]           = useState<'latest' | 'az' | 'za'>('latest')
  const lenderSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Re-use cached lead data (already fetched by parent — no extra request)
  const { data: leadData } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => (r => (r.data?.data ?? r.data) as CrmLead)(await leadService.getById(leadId)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: submissions, isLoading: subsLoading } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      try {
        const res = await crmService.getLenderSubmissions(leadId)
        const data = res.data?.data ?? res.data ?? []
        return Array.isArray(data) ? data as LenderSubmission[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch lender submissions:', err)
        return []
      }
    },
  })

  const { data: lendersData } = useQuery({
    queryKey: ['lenders-all'],
    queryFn: async () => {
      try {
        const res = await crmService.getLenders({ per_page: 200 })
        const data = res.data?.data?.data ?? res.data?.data ?? res.data?.records ?? res.data ?? []
        return Array.isArray(data) ? data as Lender[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch lenders:', err)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      try {
        const res = await crmService.getEmailTemplates()
        const data = res.data?.data ?? res.data ?? []
        return Array.isArray(data) ? data as EmailTemplate[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch email templates:', err)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: leadDocs } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      try {
        const res = await crmService.getLeadDocuments(leadId)
        const data = res.data?.data ?? res.data ?? []
        return Array.isArray(data) ? data as CrmDocument[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch lead documents:', err)
        return []
      }
    },
  })

  const { data: apiConfigs } = useQuery({
    queryKey: ['lender-api-configs'],
    queryFn: async () => {
      try {
        const res = await crmService.getLenderApiConfigs()
        const data = res.data?.data ?? []
        return Array.isArray(data) ? data as LenderApiCfg[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch API configs:', err)
        return []
      }
    },
    staleTime: 60_000,
  })

  // Fix modal state
  const [fixModal, setFixModal] = useState<{ log: ApiLog; error: FixSuggestion } | null>(null)

  // Per-lender validation & submission result state
  const [validationState, setValidationState] = useState<GroupedValidationState | null>(null)
  const [submissionOutcomes, setSubmissionOutcomes] = useState<LenderSubmissionOutcome[] | null>(null)
  const [retryingLenderId, setRetryingLenderId] = useState<number | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // ── Submission Status Polling ─────────────────────────────────────────────────
  // After submitMutation succeeds, poll every 2s to update in-flight API submissions.
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Only poll when we have outcomes with at least one API submission in 'submitted' status
    const hasInFlight = submissionOutcomes?.some(
      o => o.submissionType === 'api' && o.success && !o.error
    )
    if (!hasInFlight || !submissionOutcomes) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      return
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await crmService.getSubmissionStatus(leadId)
        const rows: SubmissionStatusRow[] = res.data?.data ?? []
        if (!rows.length) return

        setSubmissionOutcomes(prev => {
          if (!prev) return prev
          return prev.map(o => {
            const row = rows.find(r => r.lender_id === o.lenderId)
            if (!row) return o
            const isTerminal = ['approved', 'declined', 'failed'].includes(row.submission_status)
            const isFailed = row.submission_status === 'failed' || row.submission_status === 'declined'
            return {
              ...o,
              success: !isFailed,
              error: isFailed ? (row.api_error ?? 'Submission failed') : undefined,
              submissionType: row.submission_type === 'api' ? 'api' : o.submissionType,
              _terminal: isTerminal,
            } as LenderSubmissionOutcome
          })
        })

        // Stop polling once all API submissions reached a terminal state
        const allTerminal = rows.every(r =>
          ['approved', 'declined', 'failed'].includes(r.submission_status) || r.submission_type !== 'api'
        )
        if (allTerminal && pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
          // Refresh submission history + logs
          qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
          qc.invalidateQueries({ queryKey: ['lead-api-logs', leadId] })
        }
      } catch {
        // Silently ignore polling errors — not critical
      }
    }, 2000)

    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
    }
  }, [submissionOutcomes, leadId, qc])

  // API logs query — only used when fix modal needs log context.
  // Disabled refetchInterval to prevent unnecessary re-renders of the entire panel.
  const { data: apiLogs } = useQuery({
    queryKey: ['lead-api-logs', leadId],
    queryFn: async () => {
      try {
        const res = await crmService.getLenderApiLogs({ lead_id: leadId, per_page: 50 })
        const data = res.data?.data?.data ?? res.data?.data ?? []
        return Array.isArray(data) ? data as ApiLog[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch API logs:', err)
        return []
      }
    },
    staleTime: 30_000,
  })

  // ── API Log Drawer state ──────────────────────────────────────────────────
  const [logDrawer, setLogDrawer] = useState<{ open: boolean; lenderId: number | null; lenderName: string }>({
    open: false, lenderId: null, lenderName: '',
  })
  const handleViewLog = (lenderId: number, lenderName: string) => {
    setLogDrawer({ open: true, lenderId, lenderName })
  }
  const drawerLog: DrawerApiLog | null = logDrawer.lenderId && apiLogs
    ? (apiLogs as DrawerApiLog[])
        .filter(l => l.lender_id === logDrawer.lenderId)
        .sort((a, b) => b.id - a.id)[0] ?? null
    : null

  const activeLenders = (lendersData ?? []).filter(l => Number(l.status) === 1)
  // Deduplicate by lender_id — keep the latest submission per lender
  const subList = Object.values(
    (submissions ?? []).reduce<Record<number, LenderSubmission>>((acc, s) => {
      if (!acc[s.lender_id] || s.id > acc[s.lender_id].id) acc[s.lender_id] = s
      return acc
    }, {})
  )
  // Map of lender_id → latest submission (for "already sent" indicators)
  const submittedLenderMap = subList.reduce<Record<number, LenderSubmission>>((acc, s) => {
    acc[s.lender_id] = s
    return acc
  }, {})
  const docs          = leadDocs ?? []

  // ── Debounced search for lender list ─────────────────────────────────────────
  useEffect(() => {
    if (lenderSearchTimer.current) clearTimeout(lenderSearchTimer.current)
    lenderSearchTimer.current = setTimeout(() => setDebouncedSearch(lenderSearch), 300)
    return () => { if (lenderSearchTimer.current) clearTimeout(lenderSearchTimer.current) }
  }, [lenderSearch])

  // ── Helper: compute combined status key for a lender ─────────────────────────
  function getLenderStatusKey(lenderId: number): string {
    const sub = submittedLenderMap[lenderId]
    if (!sub) return 'none'
    const ss = sub.submission_status
    const rs = sub.response_status
    if (ss === 'failed') return 'failed'
    if (rs === 'declined' || ss === 'declined') return 'declined'
    if (rs === 'needs_documents') return 'missing_docs'
    if (rs === 'approved' || ss === 'approved') return 'approved'
    if (ss === 'pending') return 'processing'
    if ((ss === 'submitted' || ss === 'viewed') && rs === 'pending') return 'pending'
    if (ss === 'submitted' || ss === 'viewed') return 'sent'
    if (ss === 'no_response') return 'no_response'
    return 'sent'
  }

  // ── Filtered + sorted lender list ────────────────────────────────────────────
  const displayLenders = (() => {
    let list = [...activeLenders]
    // Search filter (name + type)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(l => {
        const isApi = !!(l.api_status && l.api_status !== '0' && Number(l.api_status) !== 0)
        const typeLbl = isApi ? 'api' : 'email'
        return l.lender_name.toLowerCase().includes(q) || typeLbl.includes(q)
      })
    }
    // Status filter
    if (lenderStatusFilter !== 'all') {
      list = list.filter(l => getLenderStatusKey(l.id) === lenderStatusFilter)
    }
    // Sort
    if (lenderSort === 'az') {
      list.sort((a, b) => a.lender_name.localeCompare(b.lender_name))
    } else if (lenderSort === 'za') {
      list.sort((a, b) => b.lender_name.localeCompare(a.lender_name))
    } else {
      // latest activity — lenders with recent submissions first, then alphabetical
      list.sort((a, b) => {
        const aSub = submittedLenderMap[a.id]
        const bSub = submittedLenderMap[b.id]
        const aTime = aSub?.submitted_at ? new Date(aSub.submitted_at).getTime() : 0
        const bTime = bSub?.submitted_at ? new Date(bSub.submitted_at).getTime() : 0
        if (bTime !== aTime) return bTime - aTime
        return a.lender_name.localeCompare(b.lender_name)
      })
    }
    return list
  })()

  // Full submission list sorted newest first (for grouped "all" view)
  const allSubmissions = [...(submissions ?? [])].sort((a, b) => {
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : new Date(a.created_at).getTime()
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : new Date(b.created_at).getTime()
    return bTime - aTime
  })

  // Filtered submission list for right panel — uses ALL submissions (not deduplicated)
  const filteredSubList = focusedLenderId !== null
    ? allSubmissions.filter(s => s.lender_id === focusedLenderId)
    : allSubmissions
  const focusedLenderName = focusedLenderId !== null
    ? (activeLenders.find(l => l.id === focusedLenderId)?.lender_name
       ?? allSubmissions.find(s => s.lender_id === focusedLenderId)?.lender_name
       ?? `Lender #${focusedLenderId}`)
    : ''

  // Group submissions by lender for "all" view
  const groupedSubmissions = focusedLenderId === null
    ? (() => {
        const groups: { lenderId: number; lenderName: string; submissions: LenderSubmission[] }[] = []
        const map = new Map<number, LenderSubmission[]>()
        const nameMap = new Map<number, string>()
        for (const s of allSubmissions) {
          if (!map.has(s.lender_id)) {
            map.set(s.lender_id, [])
            nameMap.set(s.lender_id, s.lender_name ?? `Lender #${s.lender_id}`)
          }
          map.get(s.lender_id)!.push(s)
        }
        // Order groups by most recent submission first
        for (const [lenderId, subs] of map) {
          groups.push({ lenderId, lenderName: nameMap.get(lenderId)!, submissions: subs })
        }
        return groups
      })()
    : null

  // No auto-focus — show all submissions by default on page load

  // Scroll to focused lender's submission row
  useEffect(() => {
    if (focusedLenderId !== null) {
      setTimeout(() => {
        document.getElementById(`sub-row-${focusedLenderId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [focusedLenderId])

  // Compute preview template object (used for subject/name display)
  const previewTemplate = templateId !== ''
    ? (emailTemplates ?? []).find(t => t.id === templateId) ?? null
    : null

  // Server-side resolved HTML + subject (all [[field_key]] replaced with actual EAV values)
  const { data: resolvedTemplate } = useQuery({
    queryKey: ['resolve-email-template', leadId, templateId],
    queryFn: async () => {
      const res = await crmService.resolveEmailTemplate(leadId, templateId as number)
      const d = res.data?.data ?? res.data ?? {}
      return { body: (d.body ?? '') as string, subject: (d.subject ?? '') as string }
    },
    enabled: templateId !== '',
    staleTime: 30_000,
  })

  const previewHtml    = resolvedTemplate?.body    ?? previewTemplate?.template_html ?? ''
  const resolvedSubject = resolvedTemplate?.subject || previewTemplate?.subject || ''

  function toggleLender(id: number) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id) } else { n.add(id) }
      return n
    })
    // Clear validation state when selection changes
    if (validationState) setValidationState(null)
  }
  function toggleDoc(id: number) {
    setSelectedDocIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Auto-select attachable docs on initial load
  useEffect(() => {
    if (leadDocs?.length && selectedDocIds.size === 0) {
      setSelectedDocIds(new Set(leadDocs.filter(d => d.attachable !== false && d.file_path).map(d => d.id)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadDocs])

  const resetForm = () => {
    setSelectedIds(new Set()); setNotes('')
    setTemplateId(''); setSelectedDocIds(new Set()); setPreviewExpanded(false)
    setValidationState(null); setSubmissionOutcomes(null)
  }

  /** Safely normalize required_fields — handles string, JSON string, array, null */
  const normalizeRequiredFields = (raw: unknown): string[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter(f => typeof f === 'string')
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.filter((f: unknown) => typeof f === 'string')
      } catch { /* not JSON, ignore */ }
      return []
    }
    return []
  }

  /** Extract CRM field keys from a payload_mapping config */
  const extractMappingKeys = (cfg: LenderApiCfg): string[] => {
    try {
      if (!cfg.payload_mapping) return []
      let mapping: Record<string, unknown> = {}
      if (typeof cfg.payload_mapping === 'string') {
        try {
          const parsed = JSON.parse(cfg.payload_mapping)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) mapping = parsed
          else return []
        } catch { return [] }
      } else if (cfg.payload_mapping && typeof cfg.payload_mapping === 'object') {
        mapping = cfg.payload_mapping as Record<string, unknown>
      } else {
        return []
      }
      return Object.keys(mapping).filter(k => typeof k === 'string' && !k.startsWith('=') && !COMPUTED_FIELDS.has(k))
    } catch {
      return []
    }
  }

  /**
   * Per-lender validation: checks required fields for each selected lender independently.
   * First tries server-side validation, falls back to local validation.
   * Returns GroupedValidationState.
   */
  const validateBeforeSubmit = async (): Promise<GroupedValidationState> => {
    setIsValidating(true)
    try {
      // Try server-side validation first
      try {
        const res = await crmService.validateSubmission(leadId, Array.from(selectedIds))
        const data = res.data?.data ?? res.data ?? {}
        const serverResults = data.results ?? {}
        const results: LenderValidationResult[] = []
        for (const lenderId of selectedIds) {
          const sr = serverResults[lenderId]
          if (!sr) continue
          results.push({
            lenderId: sr.lender_id,
            lenderName: sr.lender_name,
            isApiLender: sr.is_api_lender,
            isValid: sr.valid,
            missingFields: sr.missing_fields ?? [],
            fieldLabels: sr.field_labels ?? {},
          })
        }
        const state: GroupedValidationState = {
          results,
          validLenderIds: results.filter(r => r.isValid || !r.isApiLender).map(r => r.lenderId),
          invalidLenderIds: results.filter(r => !r.isValid && r.isApiLender).map(r => r.lenderId),
          emailOnlyIds: results.filter(r => !r.isApiLender).map(r => r.lenderId),
          hasAnyErrors: results.some(r => !r.isValid && r.isApiLender),
        }
        setValidationState(state)
        return state
      } catch {
        // Server validation failed — fall back to local validation
      }

      // Local validation fallback
      const configs = apiConfigs ?? []
      const lead = leadData as Record<string, unknown> | undefined
      const results: LenderValidationResult[] = []

      for (const lenderId of selectedIds) {
        const lender = activeLenders.find(l => l.id === lenderId)
        if (!lender) continue

        const isApi = !!(lender.api_status && lender.api_status !== '0')
        const cfg = isApi ? configs.find(c => c.id === lenderId && (c.api_status === '1' || c.api_status === 1)) : null

        if (!isApi || !cfg) {
          results.push({ lenderId, lenderName: lender.lender_name, isApiLender: false, isValid: true, missingFields: [], fieldLabels: {} })
          continue
        }

        const requiredFields = normalizeRequiredFields(cfg.required_fields)
        const fieldsToCheck = requiredFields.length > 0 ? requiredFields : extractMappingKeys(cfg)
        const missing: string[] = []
        const labels: Record<string, string> = {}

        for (const key of fieldsToCheck) {
          if (typeof key !== 'string' || !key || COMPUTED_FIELDS.has(key)) continue
          labels[key] = sharedAutoLabel(key)
          const val = lead?.[key]
          if (val === undefined || val === null || String(val).trim() === '') {
            missing.push(key)
          }
        }

        results.push({ lenderId, lenderName: lender.lender_name, isApiLender: true, isValid: missing.length === 0, missingFields: missing, fieldLabels: labels })
      }

      const state: GroupedValidationState = {
        results,
        validLenderIds: results.filter(r => r.isValid || !r.isApiLender).map(r => r.lenderId),
        invalidLenderIds: results.filter(r => !r.isValid && r.isApiLender).map(r => r.lenderId),
        emailOnlyIds: results.filter(r => !r.isApiLender).map(r => r.lenderId),
        hasAnyErrors: results.some(r => !r.isValid && r.isApiLender),
      }
      setValidationState(state)
      return state
    } catch (err) {
      console.error('[validateBeforeSubmit] Unexpected error:', err)
      toast.error('Validation error — submitting anyway')
      const empty: GroupedValidationState = { results: [], validLenderIds: Array.from(selectedIds), invalidLenderIds: [], emailOnlyIds: [], hasAnyErrors: false }
      setValidationState(null)
      return empty
    } finally {
      setIsValidating(false)
    }
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

  // Only include doc IDs where the file actually exists on the server
  const attachableDocIds = Array.from(selectedDocIds).filter(id => {
    const doc = docs.find(d => d.id === id)
    return doc && doc.attachable !== false && !!doc.file_path
  })

  /** Build outcomes from the API response for the result summary */
  const buildOutcomes = (data: Record<string, unknown>): LenderSubmissionOutcome[] => {
    const outcomes: LenderSubmissionOutcome[] = []
    const records = (data.records ?? {}) as Record<string, Record<string, unknown>>
    for (const id of (Array.isArray(data.submitted) ? data.submitted : [])) {
      const rec = records[id] ?? {}
      outcomes.push({
        lenderId: Number(id),
        lenderName: String(rec.lender_name ?? `Lender #${id}`),
        success: true,
        submissionType: (rec.submission_type as 'api' | 'normal') ?? 'normal',
        submissionId: Number(rec.id ?? 0) || undefined,
      })
    }
    for (const id of (Array.isArray(data.failed) ? data.failed : [])) {
      const rec = records[id] ?? {}
      outcomes.push({
        lenderId: Number(id),
        lenderName: String(rec.lender_name ?? `Lender #${id}`),
        success: false,
        submissionType: (rec.submission_type as 'api' | 'normal') ?? 'normal',
        error: rec.error ? String(rec.error) : undefined,
      })
    }
    for (const id of (Array.isArray(data.skipped) ? data.skipped : [])) {
      const rec = records[id] ?? {}
      outcomes.push({
        lenderId: Number(id),
        lenderName: String(rec.lender_name ?? `Lender #${id}`),
        success: false,
        submissionType: 'api',
        error: rec.error ? String(rec.error) : 'Skipped due to validation',
        validationErrors: Array.isArray(rec.validation_errors) ? rec.validation_errors as string[] : undefined,
      })
    }
    return outcomes
  }

  const submitMutation = useMutation({
    mutationFn: (overrideLenderIds?: number[]) => crmService.submitApplication(leadId, {
      lender_ids:    overrideLenderIds ?? Array.from(selectedIds),
      notes:         notes || undefined,
      document_ids:  attachableDocIds.length ? attachableDocIds : undefined,
      email_html:    previewHtml || undefined,
      email_subject: resolvedSubject || undefined,
      skip_invalid:  true,
    }),
    onSuccess: (res) => {
      try {
        const data = (res?.data?.data ?? res?.data ?? {}) as Record<string, unknown>
        const outcomes = buildOutcomes(data)
        setSubmissionOutcomes(outcomes)
        setValidationState(null)

        const successCount = outcomes.filter(o => o.success).length
        const failCount = outcomes.filter(o => !o.success && !o.validationErrors?.length).length
        if (successCount) toast.success(`Sent to ${successCount} lender${successCount !== 1 ? 's' : ''}`)
        if (failCount) toast.error(`${failCount} failed`)
      } catch (parseErr) {
        console.error('[LendersPanel] Error parsing submit response:', parseErr, res)
        toast.success('Submission sent')
      }
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
      qc.invalidateQueries({ queryKey: ['lead-api-logs', leadId] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Submission failed'
      toast.error(msg)
    },
  })

  const retryMutation = useMutation({
    mutationFn: (lenderId: number) => {
      setRetryingLenderId(lenderId)
      return crmService.retryLenderSubmission(leadId, lenderId, {
        document_ids: attachableDocIds.length ? attachableDocIds : undefined,
        email_html: previewHtml || undefined,
        email_subject: resolvedSubject || undefined,
      })
    },
    onSuccess: (res, lenderId) => {
      setRetryingLenderId(null)
      const data = (res?.data?.data ?? res?.data ?? {}) as Record<string, unknown>
      const success = Array.isArray(data.submitted) && data.submitted.includes(lenderId)
      setSubmissionOutcomes(prev => prev?.map(o =>
        o.lenderId === lenderId ? { ...o, success, error: success ? undefined : o.error } : o
      ) ?? null)
      if (success) toast.success('Retry successful')
      else toast.error('Retry failed')
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
    },
    onError: () => {
      setRetryingLenderId(null)
      toast.error('Retry failed')
    },
  })

  const [isRetryingAll, setIsRetryingAll] = useState(false)
  const retryAllFailed = async () => {
    if (!submissionOutcomes) return
    const failedIds = submissionOutcomes
      .filter(o => !o.success && !o.validationErrors?.length)
      .map(o => o.lenderId)
    if (!failedIds.length) return
    setIsRetryingAll(true)
    try {
      await submitMutation.mutateAsync(failedIds)
    } catch {
      // Error handling is in submitMutation.onError
    } finally {
      setIsRetryingAll(false)
    }
  }

  // Quick resubmit from history row — reuses submitMutation with single lender
  const [quickResubmitId, setQuickResubmitId] = useState<number | null>(null)
  const handleQuickResubmit = async (lenderId: number) => {
    setQuickResubmitId(lenderId)
    try {
      await submitMutation.mutateAsync([lenderId])
    } catch {
      // Error already handled by submitMutation.onError
    } finally {
      setQuickResubmitId(null)
    }
  }

  const showPreview = previewExpanded && !!previewTemplate

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start" style={{ transition: 'all 0.3s ease' }}>

      {/* ═══ Col 1 — Submit Application (4/12) ═════════════════════════════ */}
      <div
        className="w-full lg:w-auto min-w-0 order-1"
        style={{ flex: '4 4 0%', transition: 'flex 0.3s ease' }}
      >
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden sticky top-4">

              {/* Gradient accent bar */}
              <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #059669, #10b981, #34d399)' }} />

              {/* Header */}
              <div className="px-5 pt-4 pb-3.5 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 12px rgba(5,150,105,0.35)' }}>
                  <Send size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">Submit Application</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Choose lenders, attach documents and send</p>
                </div>
              </div>

              {/* Scrollable form body */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <div className="py-4 px-5 space-y-4">

                  {/* ── Select Lenders ── */}
                  <div>
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Building2 size={11} className="text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Select Lenders</span>
                        {selectedIds.size > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white leading-none">
                            {selectedIds.size}
                          </span>
                        )}
                      </div>
                      {activeLenders.length > 0 && (
                        <button
                          onClick={() => setSelectedIds(prev => prev.size === displayLenders.length ? new Set() : new Set(displayLenders.map(l => l.id)))}
                          className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          {selectedIds.size === displayLenders.length && displayLenders.length > 0 ? 'Deselect all' : 'Select all'}
                        </button>
                      )}
                    </div>

                    {/* Search + Filter + Sort — compact single-row toolbar */}
                    {activeLenders.length > 0 && (
                      <div className="sticky top-0 z-10 bg-white pb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Search */}
                          <div className="relative flex-1 min-w-[110px]">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              value={lenderSearch}
                              onChange={e => setLenderSearch(e.target.value)}
                              placeholder="Search..."
                              className="w-full pl-6 pr-6 py-[5px] text-[11px] rounded-md border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-400"
                            />
                            {lenderSearch && (
                              <button
                                onClick={() => { setLenderSearch(''); setDebouncedSearch('') }}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                          {/* Status filter */}
                          <div className="relative flex-shrink-0">
                            <SlidersHorizontal size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <select
                              value={lenderStatusFilter}
                              onChange={e => setLenderStatusFilter(e.target.value)}
                              className={`pl-5 pr-4 py-[5px] text-[11px] font-medium rounded-md border bg-slate-50/80 outline-none appearance-none cursor-pointer transition-colors ${
                                lenderStatusFilter !== 'all'
                                  ? 'border-indigo-300 text-indigo-700 bg-indigo-50/60'
                                  : 'border-slate-200 text-slate-600'
                              }`}
                            >
                              <option value="all">All</option>
                              <option value="sent">Sent</option>
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="missing_docs">Docs</option>
                              <option value="declined">Declined</option>
                              <option value="failed">Failed</option>
                              <option value="no_response">No Reply</option>
                              <option value="none">New</option>
                            </select>
                          </div>
                          {/* Sort */}
                          <div className="relative flex-shrink-0">
                            <ArrowUpDown size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <select
                              value={lenderSort}
                              onChange={e => setLenderSort(e.target.value as 'latest' | 'az' | 'za')}
                              className="pl-5 pr-4 py-[5px] text-[11px] font-medium rounded-md border border-slate-200 bg-slate-50/80 text-slate-600 outline-none appearance-none cursor-pointer"
                            >
                              <option value="latest">Recent</option>
                              <option value="az">A–Z</option>
                              <option value="za">Z–A</option>
                            </select>
                          </div>
                          {/* Clear all — only when filters active */}
                          {(debouncedSearch || lenderStatusFilter !== 'all') && (
                            <button
                              onClick={() => { setLenderSearch(''); setDebouncedSearch(''); setLenderStatusFilter('all'); setLenderSort('latest') }}
                              className="flex-shrink-0 text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                              title={`${displayLenders.length} of ${activeLenders.length} shown — click to reset`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {activeLenders.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <Building2 size={20} className="text-slate-300 mb-1.5" />
                        <p className="text-xs font-medium text-slate-500">No active lenders configured</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Add lenders from the Lenders menu first</p>
                      </div>
                    ) : displayLenders.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <Search size={18} className="text-slate-300 mb-1.5" />
                        <p className="text-xs font-medium text-slate-500">No lenders found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search or filter</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                        {displayLenders.map(l => {
                          const on = selectedIds.has(l.id)
                          const prevSub = submittedLenderMap[l.id]
                          const alreadySent = !!prevSub
                          const isApiLender = !!(l.api_status && l.api_status !== '0' && Number(l.api_status) !== 0)
                          const vResult = validationState?.results.find(r => r.lenderId === l.id)
                          const hasErrors = vResult && !vResult.isValid && vResult.isApiLender

                          // Combined status badge — considers both submission_status AND response_status
                          const subStatusBadge = prevSub ? (() => {
                            const ss = prevSub.submission_status
                            const rs = prevSub.response_status
                            if (ss === 'failed')
                              return { icon: <AlertCircle size={8} />, label: 'Failed', cls: 'bg-red-100 text-red-600 border-red-200' }
                            if (rs === 'declined' || ss === 'declined')
                              return { icon: <AlertCircle size={8} />, label: 'Declined', cls: 'bg-red-100 text-red-600 border-red-200' }
                            if (rs === 'needs_documents')
                              return { icon: <FileText size={8} />, label: 'Missing Docs', cls: 'bg-orange-100 text-orange-700 border-orange-200' }
                            if (rs === 'approved' || ss === 'approved')
                              return { icon: <CheckCircle size={8} />, label: 'Approved', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                            if (ss === 'pending')
                              return { icon: <Clock size={8} />, label: 'Processing', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
                            if ((ss === 'submitted' || ss === 'viewed') && rs === 'pending')
                              return { icon: <Clock size={8} />, label: 'Pending', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
                            if (ss === 'submitted' || ss === 'viewed')
                              return { icon: <CheckCircle size={8} />, label: 'Sent', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                            if (ss === 'no_response')
                              return { icon: <Clock size={8} />, label: 'No Response', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
                            return { icon: <CheckCircle size={8} />, label: 'Sent', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                          })() : null

                          const isFocused = focusedLenderId === l.id

                          return (
                            <div
                              key={l.id}
                              tabIndex={0}
                              onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleLender(l.id) } }}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                hasErrors
                                  ? 'border-red-300 bg-red-50'
                                  : isFocused
                                    ? 'border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                                    : on
                                      ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {/* Checkbox zone — toggles selection */}
                              <div
                                role="checkbox"
                                aria-checked={on}
                                onClick={e => { e.stopPropagation(); toggleLender(l.id) }}
                                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                                  on ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white hover:border-emerald-400'
                                }`}
                              >
                                {on && <Check size={10} className="text-white" strokeWidth={3} />}
                              </div>
                              {/* Clickable body — sets focus for right panel */}
                              <div
                                className="flex items-center gap-3 flex-1 min-w-0"
                                onClick={() => setFocusedLenderId(isFocused ? null : l.id)}
                              >
                                {/* API / Email type indicator */}
                                {isApiLender ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 border border-indigo-200 flex-shrink-0" title="API submission">
                                    <Zap size={10} className="text-indigo-500" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-sky-50 border border-sky-200 flex-shrink-0" title="Email submission">
                                    <Mail size={10} className="text-sky-500" />
                                  </span>
                                )}
                                <span className={`text-sm font-medium truncate flex-1 ${isFocused ? 'text-indigo-700' : 'text-slate-700'}`}>{l.lender_name}</span>
                                {hasErrors && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 flex-shrink-0">
                                    {vResult.missingFields.length} missing
                                  </span>
                                )}
                                {alreadySent && !hasErrors && subStatusBadge && (
                                  <span
                                    title={`${subStatusBadge.label} — ${prevSub.submitted_at ? new Date(prevSub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : 'unknown date'}`}
                                    className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${subStatusBadge.cls}`}
                                  >
                                    {subStatusBadge.icon} {subStatusBadge.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {(() => {
                      const alreadySentSelected = Array.from(selectedIds).filter(id => !!submittedLenderMap[id])
                      if (!alreadySentSelected.length) return null
                      const names = alreadySentSelected.map(id => submittedLenderMap[id].lender_name ?? `Lender #${id}`).join(', ')
                      return (
                        <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            <strong className="font-semibold">{names}</strong>{' '}
                            {alreadySentSelected.length === 1 ? 'was' : 'were'} already submitted. This will resend the application.
                          </p>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── Email Template ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center">
                        <Mail size={11} className="text-sky-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Email Template</span>
                    </div>
                    <select
                      className="input w-full text-sm"
                      value={templateId}
                      onChange={e => {
                        const val: number | '' = e.target.value === '' ? '' : Number(e.target.value)
                        setTemplateId(val)
                        setPreviewExpanded(val !== '')
                      }}
                    >
                      <option value="">— Default template —</option>
                      {(emailTemplates ?? []).map(t => (
                        <option key={t.id} value={t.id}>{t.template_name}</option>
                      ))}
                    </select>
                    {previewTemplate && (
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1.5">
                        <Eye size={10} /> Preview visible in center column
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── Documents ── */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                          <FileText size={11} className="text-violet-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Documents</span>
                        {selectedDocIds.size > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500 text-white leading-none">
                            {selectedDocIds.size}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {docs.length > 0 && (() => {
                          const attachable = docs.filter(d => d.attachable !== false && !!d.file_path)
                          if (!attachable.length) return null
                          const allSelected = attachable.every(d => selectedDocIds.has(d.id))
                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedDocIds(allSelected ? new Set() : new Set(attachable.map(d => d.id)))}
                              className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 hover:underline"
                            >
                              {allSelected ? 'Deselect all' : 'Select all'}
                            </button>
                          )
                        })()}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingDocs}
                          className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          {uploadingDocs ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                          Upload
                        </button>
                        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} />
                      </div>
                    </div>

                    {docs.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <Upload size={12} className="text-slate-300" />
                        <p className="text-xs text-slate-400">No documents yet \u2014 click Upload to add files</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                        {docs.map(d => {
                          const on = selectedDocIds.has(d.id)
                          const canAttach = d.attachable !== false && !!d.file_path
                          const docLabel = d.document_type || d.document_name || d.file_path?.split('/').pop() || `Doc #${d.id}`
                          return (
                            <div
                              key={d.id}
                              title={!canAttach ? 'File not on server \u2014 re-upload to attach' : undefined}
                              onClick={() => canAttach && toggleDoc(d.id)}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs select-none transition-all ${
                                canAttach
                                  ? on
                                    ? 'cursor-pointer border-violet-200 bg-violet-50'
                                    : 'cursor-pointer border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50'
                                  : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                                on && canAttach ? 'bg-violet-500 border-violet-500' : 'border-slate-300 bg-white'
                              }`}>
                                {on && canAttach && <Check size={9} className="text-white" strokeWidth={3} />}
                              </div>
                              <FileText size={11} className={`flex-shrink-0 ${on && canAttach ? 'text-violet-500' : 'text-slate-400'}`} />
                              <span className={`truncate flex-1 ${on && canAttach ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>{docLabel}</span>
                              {!canAttach && (
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                                  className="ml-auto text-[10px] text-amber-500 hover:text-amber-700 flex-shrink-0 underline"
                                >
                                  re-upload
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {selectedDocIds.size > 0 && attachableDocIds.length < selectedDocIds.size && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                        <AlertTriangle size={11} className="flex-shrink-0" />
                        {selectedDocIds.size - attachableDocIds.length} file(s) need re-upload and will be skipped.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── Notes ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                        <MessageSquare size={11} className="text-slate-500" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Note</span>
                      <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                    </div>
                    <textarea
                      className="input w-full resize-none text-sm"
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Additional notes for the lender\u2026"
                    />
                  </div>

                </div>
              </div>

              {/* ── Per-Lender Validation Panel ── */}
              {validationState?.hasAnyErrors && !submissionOutcomes && (
                <div className="mx-5 mt-1">
                  <LenderValidationPanel
                    validationState={validationState}
                    leadId={leadId}
                    onDismiss={() => setValidationState(null)}
                    onSubmitValid={() => submitMutation.mutate(validationState.validLenderIds)}
                    onRetryValidation={() => { validateBeforeSubmit() }}
                    isSubmitting={submitMutation.isPending}
                    isValidating={isValidating}
                  />
                </div>
              )}

              {/* ── Submission Result Summary ── */}
              {submissionOutcomes && (
                <div className="mx-5 mt-1">
                  <SubmissionResultSummary
                    outcomes={submissionOutcomes}
                    onClose={() => { setSubmissionOutcomes(null); resetForm() }}
                    onRetry={(id) => retryMutation.mutate(id)}
                    onRetryAllFailed={retryAllFailed}
                    onViewLog={handleViewLog}
                    isRetrying={retryingLenderId}
                    isRetryingAll={isRetryingAll}
                  />
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2.5 flex-shrink-0">
                <button
                  onClick={async () => {
                    try {
                      const state = await validateBeforeSubmit()
                      if (!state.hasAnyErrors) {
                        submitMutation.mutate(undefined)
                      }
                      // If has errors, the validation panel is shown automatically
                    } catch (err) {
                      console.error('[LendersPanel] Submit click handler error:', err)
                      toast.error('An error occurred. Please try again.')
                    }
                  }}
                  disabled={selectedIds.size === 0 || submitMutation.isPending || isValidating}
                  className="btn-primary flex items-center gap-2 px-5 disabled:opacity-50 flex-1 justify-center"
                >
                  {submitMutation.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Sending…</>
                  ) : isValidating ? (
                    <><Loader2 size={14} className="animate-spin" /> Validating…</>
                  ) : (() => {
                    const allResend = selectedIds.size > 0 && Array.from(selectedIds).every(id => !!submittedLenderMap[id])
                    const count = selectedIds.size || '…'
                    return <><Send size={14} /> {allResend ? 'Resend' : 'Send'} to {count} Lender{selectedIds.size !== 1 ? 's' : ''}</>
                  })()}
                </button>
                <button onClick={resetForm} className="btn-outline px-4 flex-shrink-0">Reset</button>
              </div>


            </div>
      </div>

      {/* ═══ Col 2 — Email Preview (4/12, visible when template selected) ══ */}
      {showPreview && previewTemplate && (
        <div
          className="w-full lg:w-auto min-w-0 order-2"
          style={{ flex: '4 4 0%', transition: 'flex 0.3s ease', animation: 'fadeIn 0.25s ease' }}
        >
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden sticky top-4">

            {/* macOS-style chrome bar */}
            <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: '#1e293b' }}>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-slate-400 text-[11px]" style={{ background: '#334155' }}>
                  <Mail size={10} />
                  <span>Email Preview</span>
                </div>
              </div>
              <button
                onClick={() => { setTemplateId(''); setPreviewExpanded(false) }}
                className="text-slate-500 hover:text-slate-200 transition-colors text-[11px] flex-shrink-0"
                title="Close preview"
              >
                {'\u2715'}
              </button>
            </div>

            {/* Email meta */}
            <div className="px-4 pt-3 pb-2.5 border-b border-slate-200 bg-white">
              <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 truncate">
                {resolvedSubject || previewTemplate.template_name}
              </h3>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                  <Mail size={12} />
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
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                  style={{ color: '#059669', borderColor: '#a7f3d0', background: '#f0fdf4' }}>
                  <Check size={9} /> {previewTemplate.template_name}
                </span>
                {selectedDocIds.size > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-slate-500 border-slate-200 bg-slate-50">
                    <FileText size={9} /> {selectedDocIds.size} attachment{selectedDocIds.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Email iframe — scrollable */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <div className="p-3">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ minHeight: 420 }}>
                  <iframe
                    key={previewTemplate.id}
                    srcDoc={previewHtml}
                    className="w-full border-0 block"
                    style={{ minHeight: 420, height: '100%' }}
                    sandbox="allow-same-origin"
                    title="Email body preview"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ═══ Col 3 — Submission History & Logs (8/12 default, 4/12 with preview) */}
      <div
        className={`w-full lg:w-auto space-y-5 min-w-0 ${showPreview ? 'order-3' : 'order-2'}`}
        style={{ flex: showPreview ? '4 4 0%' : '8 8 0%', transition: 'flex 0.3s ease' }}
      >

        {/* ── Submission History ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Submission History {filteredSubList.length > 0 && <span className="font-normal">({filteredSubList.length}{focusedLenderId !== null ? ` of ${allSubmissions.length}` : ''})</span>}
            </p>
            <div className="flex items-center gap-1.5">
              {focusedLenderId !== null && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  <Building2 size={10} />
                  <span className="truncate max-w-[120px]">{focusedLenderName}</span>
                  <button
                    onClick={() => setFocusedLenderId(null)}
                    className="ml-0.5 hover:text-indigo-900 transition-colors"
                    title="Show all submissions"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              <button
                onClick={() => setFocusedLenderId(null)}
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
                  focusedLenderId === null
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                Show All
              </button>
            </div>
          </div>

          {/* Stats bar */}
          {filteredSubList.length > 0 && (() => {
            const total = filteredSubList.length
            const success = filteredSubList.filter(s => s.submission_status === 'submitted' || s.submission_status === 'approved' || s.submission_status === 'viewed').length
            const failed = filteredSubList.filter(s => s.submission_status === 'failed' || s.submission_status === 'declined').length
            const processing = filteredSubList.filter(s => s.submission_status === 'pending').length
            const lenderCount = groupedSubmissions?.length ?? 0
            return (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 mb-3">
                <span className="text-[11px] font-semibold text-slate-500">
                  {total} Total
                </span>
                <span className="w-px h-3.5 bg-slate-200" />
                {focusedLenderId === null && lenderCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                    <Building2 size={10} />
                    {lenderCount} Lender{lenderCount !== 1 ? 's' : ''}
                  </span>
                )}
                {success > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {success} Sent
                  </span>
                )}
                {failed > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {failed} Failed
                  </span>
                )}
                {processing > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {processing} Processing
                  </span>
                )}
              </div>
            )
          })()}

          {subsLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
          ) : filteredSubList.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              {focusedLenderId !== null ? 'No submissions for this lender yet.' : 'No submissions yet.'}
            </p>
          ) : groupedSubmissions && focusedLenderId === null ? (
            /* ── Grouped "All" view ── */
            <div className="space-y-4" style={{ transition: 'all 0.3s ease' }}>
              {groupedSubmissions.map(group => (
                <div key={group.lenderId} id={`sub-row-${group.lenderId}`}>
                  {/* Lender group header */}
                  <button
                    onClick={() => setFocusedLenderId(group.lenderId)}
                    className="flex items-center gap-2 mb-2 group cursor-pointer w-full text-left"
                  >
                    <Building2 size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-600 transition-colors truncate">
                      {group.lenderName}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 flex-shrink-0">
                      ({group.submissions.length})
                    </span>
                    <span className="flex-1 border-b border-dashed border-slate-200 min-w-[20px]" />
                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0">
                      Focus &rarr;
                    </span>
                  </button>
                  <div className="space-y-2 pl-0">
                    {group.submissions.map(s => (
                      <div key={s.id}>
                        <ErrorBoundary fallbackTitle={`Error rendering submission for ${s.lender_name ?? 'lender'}`} compact>
                          <SubmissionRow sub={s} leadId={leadId} onViewLog={handleViewLog} onResubmit={handleQuickResubmit} isResubmitting={quickResubmitId === s.lender_id} />
                        </ErrorBoundary>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Single-lender view ── */
            <div className="space-y-2" style={{ transition: 'all 0.3s ease' }}>
              {filteredSubList.map(s => (
                <div key={s.id} id={`sub-row-${s.lender_id}`}>
                  <ErrorBoundary fallbackTitle={`Error rendering submission for ${s.lender_name ?? 'lender'}`} compact>
                    <SubmissionRow sub={s} leadId={leadId} onViewLog={handleViewLog} onResubmit={handleQuickResubmit} isResubmitting={quickResubmitId === s.lender_id} />
                  </ErrorBoundary>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Error Fix Modal ── */}
        {fixModal && (
          <ErrorBoundary fallbackTitle="Error loading fix modal">
            <ErrorFixModal
              leadId={leadId}
              lenderId={fixModal.log.lender_id}
              error={fixModal.error}
              onClose={() => setFixModal(null)}
              onFixed={() => {
                setFixModal(null)
                qc.invalidateQueries({ queryKey: ['lead-api-logs', leadId] })
              }}
            />
          </ErrorBoundary>
        )}

        {/* ── Lender Email History ── */}
        <LenderEmailHistory leadId={leadId} />

      </div>

      {/* ── API Log Drawer ── */}
      <ApiLogDrawer
        open={logDrawer.open}
        onClose={() => setLogDrawer({ open: false, lenderId: null, lenderName: '' })}
        log={drawerLog}
        lenderName={logDrawer.lenderName}
        onFixError={(error) => {
          setLogDrawer(prev => ({ ...prev, open: false }))
          if (drawerLog) setFixModal({ log: drawerLog as unknown as ApiLog, error })
        }}
      />

    </div>
  )
}

// \u2500\u2500 Helpers ───────────────────────────────────────────────────────────────────
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
    if (resolvedType === 'tel') return formatPhoneNumber(value)
    if (resolvedType === 'date') {
      try { return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
      catch { return value }
    }
    return value
  }

  return (
    <div className="flex items-start py-1.5 border-b border-slate-50 last:border-0 group" data-field-key={fieldKey} id={`field-${fieldKey}`}>
      <span className="text-xs text-slate-500 w-28 flex-shrink-0 pt-0.5 leading-tight">{label}</span>
      {readOnly ? (
        <span className="text-sm font-medium text-slate-800 flex-1 truncate leading-tight">{renderDisplayValue()}</span>
      ) : editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {resolvedType === 'textarea' ? (
            <textarea autoFocus name={fieldKey} rows={2} className="flex-1 text-xs border border-emerald-400 rounded-md px-2 py-1 outline-none resize-none bg-white" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') cancel() }} />
          ) : resolvedType === 'select' ? (
            <select autoFocus name={fieldKey} className="flex-1 text-xs border border-emerald-400 rounded-md px-2 py-1 outline-none bg-white min-w-0" value={draft} onChange={e => setDraft(e.target.value)}>
              <option value="">— select —</option>
              {parsedOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input autoFocus name={fieldKey} type={resolvedType} className="flex-1 text-xs border border-emerald-400 rounded-md px-2 py-1 outline-none bg-white min-w-0" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }} />
          )}
          <button onMouseDown={e => { e.preventDefault(); save() }} disabled={saving} className="p-1 rounded bg-emerald-600 text-white flex-shrink-0 disabled:opacity-50">
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          </button>
          <button onMouseDown={e => { e.preventDefault(); cancel() }} className="p-1 rounded bg-slate-100 text-slate-500 flex-shrink-0"><X size={10} /></button>
        </div>
      ) : (
        <button onClick={startEdit} data-field-key={fieldKey} className="flex items-center gap-1.5 flex-1 min-w-0 text-left hover:text-emerald-700 transition-colors">
          <span className="text-sm font-medium text-slate-800 flex-1 truncate leading-tight">
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
      // API returns { success, message, data: { numbers: [...] } }
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
      // Normalise field names: backend returns template_name/template_html
      return rows.map(r => ({
        ...r,
        sms_template_name: r.template_name ?? r.sms_template_name ?? '',
        sms_template:      r.template_html  ?? r.sms_template      ?? '',
        status: Number(r.status) as 0 | 1,
      })) as SmsTemplate[]
    },
    staleTime: 60 * 1000,
  })

  // Reuse cached lead data for client-side merge tag preview
  const { data: leadData } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => (r => (r.data?.data ?? r.data) as CrmLead)(await leadService.getById(leadId)),
    staleTime: 5 * 60 * 1000,
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
    if (tpl) {
      // Apply client-side merge tag substitution for instant preview
      const resolved = leadData
        ? fillPlaceholders(tpl.sms_template, leadData as Record<string, unknown>)
        : tpl.sms_template
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
  const [showOwner2,         setShowOwner2]         = useState(false)

  // Auto-collapse sidebar on this page to maximise content width
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  useEffect(() => {
    const wasPreviouslyCollapsed = sidebarCollapsed
    if (!wasPreviouslyCollapsed) setSidebarCollapsed(true)
    return () => { if (!wasPreviouslyCollapsed) setSidebarCollapsed(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Click-outside handler for dropdowns
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (showStatusDropdown && !t.closest('[data-dropdown="status"]')) setShowStatusDropdown(false)
      if (showMoreMenu && !t.closest('[data-dropdown="more"]')) setShowMoreMenu(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showStatusDropdown, showMoreMenu])

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

  // ── Merchant Portal query ──────────────────────────────────────────────────
  const { data: merchantPortal } = useQuery({
    queryKey: ['merchant-portal', leadId],
    queryFn: async () => {
      try {
        const res = await crmService.getMerchantPortal(leadId)
        return (res.data?.data ?? null) as { url: string; status: number } | null
      } catch { return null }
    },
    retry: false,
    staleTime: 60_000,
    enabled: !!leadId,
  })

  const generatePortalMutation = useMutation({
    mutationFn: () => crmService.generateMerchantPortal(leadId),
    onSuccess: () => {
      toast.success('Portal link generated')
      qc.invalidateQueries({ queryKey: ['merchant-portal', leadId] })
    },
    onError: () => toast.error('Failed to generate portal link'),
  })

  const handleMerchantPortal = () => {
    if (merchantPortal?.url) {
      navigator.clipboard.writeText(merchantPortal.url).then(() => toast.success('Merchant link copied!'))
    } else {
      generatePortalMutation.mutate()
    }
  }

  const docBadgeCount = docsForBadge?.length ?? 0
  const subBadgeCount = subsForBadge?.length ?? 0

  // Auto-detect if lead has Owner 2 data populated
  useEffect(() => {
    if (!lead || !leadFields) return
    const owner2Fields = leadFields.filter(f => f.section === 'second_owner')
    if (owner2Fields.length === 0) { setShowOwner2(false); return }
    const leadData = lead as Record<string, unknown>
    const hasData = owner2Fields.some(f => {
      const val = leadData[f.field_key]
      return val !== null && val !== undefined && String(val).trim() !== ''
    })
    setShowOwner2(hasData)
  }, [lead, leadFields])

  const updateStatus = useMutation({
    mutationFn: (status: string) => leadService.update(leadId, { lead_status: status }),
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
    if (!await confirmDelete(fullName)) return
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
    <div className="min-h-screen bg-slate-50/40 -mx-5 -mt-5" style={{ WebkitFontSmoothing: 'antialiased' }}>

      {/* ── HEADER ── */}
      <div style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-5">

          {/* ── Row 1: Back + Avatar + Name/Status ── */}
          <div className="flex items-start gap-4">

            {/* Back button */}
            <button onClick={() => navigate('/crm/leads')} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-all flex-shrink-0 mt-1" style={{ border: '1px solid transparent' }} onMouseEnter={e => (e.currentTarget.style.border = '1px solid #e2e8f0')} onMouseLeave={e => (e.currentTarget.style.border = '1px solid transparent')} title="Back to Leads">
              <ArrowLeft size={15} />
            </button>

            {/* Avatar */}
            <div className={`w-12 h-12 rounded-2xl ${avatarBg} flex items-center justify-center flex-shrink-0`} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)' }}>
              <span className="text-[15px] font-bold text-white leading-none tracking-wide">{leadInits}</span>
            </div>

            {/* Name + Status + Meta — stacked */}
            <div className="flex-1 min-w-0">
              {/* Line 1: Name + Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1.25, letterSpacing: '-0.01em', maxWidth: 400 }} className="truncate">{fullName}</h1>
                <span
                  className="inline-flex items-center gap-1.5 h-[24px] px-3 rounded-full text-[11px] font-semibold flex-shrink-0 select-none"
                  style={{ background: `${statusColor}12`, color: statusColor, border: `1px solid ${statusColor}25`, backdropFilter: 'blur(4px)' }}
                >
                  <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}40` }} />
                  {currentStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                {tempStyle && (
                  <span className={`hidden sm:inline-flex items-center gap-1 h-[22px] px-2.5 rounded-full text-[10px] font-bold flex-shrink-0 ${tempStyle.bg} ${tempStyle.text}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: tempStyle.dot }} />
                    {tempStyle.label}
                  </span>
                )}
              </div>

              {/* Line 2: Contact chips */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {lead.company_name && (
                  <span className="inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-lg text-[12.5px] font-medium" style={{ background: '#f1f5f9', color: '#334155' }}>
                    <Briefcase size={12} className="text-slate-400" />
                    <span className="truncate max-w-[180px]">{String(lead.company_name)}</span>
                  </span>
                )}
                {lead.phone_number && (
                  <a href={`tel:${lead.phone_number}`} className="inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-lg text-[12.5px] font-medium hover:bg-emerald-50 transition-all" style={{ background: '#f1f5f9', color: '#334155' }}>
                    <Phone size={12} className="text-emerald-500" />
                    {formatPhoneNumber(String(lead.phone_number))}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-lg text-[12.5px] font-medium hover:bg-sky-50 transition-all truncate max-w-[260px]" style={{ background: '#f1f5f9', color: '#334155' }}>
                    <Mail size={12} className="text-sky-500" />
                    {String(lead.email)}
                  </a>
                )}
              </div>

              {/* Line 3: Meta pills */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {([
                  (lead.assigned_name as string | undefined) ? { icon: User, label: 'Agent', value: lead.assigned_name as string } : null,
                  lead.lead_type ? { icon: Tag, label: 'Type', value: toTitleCase(String(lead.lead_type)) } : null,
                  loanAmount ? { icon: DollarSign, label: 'Amount', value: `$${Number(String(loanAmount).replace(/[^0-9.]/g,'')).toLocaleString('en-US')}` } : null,
                  lead.created_at ? { icon: Calendar, label: 'Created', value: new Date(lead.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) } : null,
                  { icon: Clock, label: 'Pipeline', value: `${daysInSystem}d` },
                ].filter(Boolean) as { icon: LucideIcon; label: string; value: string }[]).map((item, i) => {
                  const Icon = item.icon
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ fontSize: 12 }}>
                      <Icon size={11} className="text-slate-300" />
                      <span style={{ color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em', fontSize: 10 }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{item.value}</span>
                      {i < 4 && <span className="ml-0.5 text-slate-200 select-none">|</span>}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 pt-1">
              <button
                onClick={() => setShowEmailModal(true)}
                className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-medium text-sky-700 transition-all hover:shadow-sm"
                style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <Mail size={13} /> <span className="hidden sm:inline">Email</span>
              </button>
              <button
                onClick={() => setShowSmsModal(true)}
                className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-medium text-violet-700 transition-all hover:shadow-sm"
                style={{ background: '#f5f3ff', border: '1px solid #c4b5fd' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <MessageSquare size={13} /> <span className="hidden sm:inline">SMS</span>
              </button>
              <button
                onClick={() => navigate(`/crm/leads/${leadId}/edit`)}
                className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-lg text-[12px] font-semibold text-white transition-all hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)', border: '1px solid #047857' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(5,150,105,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={handleMerchantPortal}
                disabled={generatePortalMutation.isPending}
                className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-medium text-amber-700 transition-all hover:shadow-sm disabled:opacity-50"
                style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.transform = 'translateY(0)' }}
                title={merchantPortal?.url ? 'Copy merchant portal link' : 'Generate merchant portal link'}
              >
                {generatePortalMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : merchantPortal?.url ? <Copy size={13} /> : <ExternalLink size={13} />}
                <span className="hidden sm:inline">{merchantPortal?.url ? 'Copy Link' : 'Merchant Link'}</span>
              </button>
              <div className="w-px h-5 bg-slate-200 mx-0.5" />
              <button
                onClick={handleDeleteLead}
                className="h-8 inline-flex items-center justify-center w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                style={{ border: '1px solid transparent' }}
                onMouseEnter={e => (e.currentTarget.style.border = '1px solid #fecaca')}
                onMouseLeave={e => (e.currentTarget.style.border = '1px solid transparent')}
                title="Delete Lead"
              >
                <Trash2 size={13} />
              </button>
            </div>

          </div>
        </div>

        {/* ── Accent separator ── */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent 5%, #86efac 35%, #4ade80 50%, #86efac 65%, transparent 95%)' }} />

      </div>

      {/* ── SINGLE CARD ── */}
      <div className="mx-auto px-3 pt-3 pb-8" style={{ maxWidth: '100%' }}>
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-x-hidden" style={{ minHeight: 'calc(100vh - 140px)' }}>

          {/* Unified tab bar */}
          <div className="relative flex-shrink-0">
            <div ref={tabBarRef} className="flex items-center border-b border-slate-200/60 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const badge = tab.id === 'documents' ? docBadgeCount : tab.id === 'lenders' ? subBadgeCount : 0
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'relative flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0',
                    isActive
                      ? 'text-emerald-700'
                      : 'text-slate-400 hover:text-slate-600',
                  ].join(' ')}
                >
                  <Icon size={12} className="flex-shrink-0" />
                  {tab.label}
                  {badge > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{badge}</span>
                  )}
                  {isActive && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-emerald-500" />}
                </button>
              )
            })}
            <div className="flex-1" />
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {activeTab === 'details' && (() => {

              // ── Internal field type ──────────────────────────────────────────
              type FieldDef = {
                field_key:     string
                label_name:    string
                field_type:    string
                display_order: number
              }

              // ── Build section map fully from leadFields (crm_labels) ─────────
              // Fields are sorted by display_order so section card order reflects
              // the order configured on the Lead Fields page.
              const configuredKeys = new Set((leadFields ?? []).map(f => f.field_key))
              const sectionMap = new Map<string, FieldDef[]>()

              const addToSection = (sec: string, f: FieldDef) => {
                const key = sec.toLowerCase().trim() || 'general'
                if (!sectionMap.has(key)) sectionMap.set(key, [])
                sectionMap.get(key)!.push(f)
              }

              // Primary: all active fields from crm_labels, sorted by display_order
              for (const f of [...(leadFields ?? [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))) {
                addToSection(f.section || 'general', {
                  field_key:     f.field_key,
                  label_name:    f.label_name,
                  field_type:    f.field_type || 'text',
                  display_order: f.display_order ?? 0,
                })
              }

              // Fallback: system cols that crm_labels does not cover are injected
              // at the top of their natural section so no lead data is ever hidden.
              const SYS_FALLBACKS: Array<FieldDef & { section: string }> = [
                { field_key: 'first_name',   label_name: 'First Name', field_type: 'text',         section: 'contact',  display_order: -40 },
                { field_key: 'last_name',    label_name: 'Last Name',  field_type: 'text',         section: 'contact',  display_order: -30 },
                { field_key: 'email',        label_name: 'Email',      field_type: 'email',        section: 'contact',  display_order: -20 },
                { field_key: 'phone_number', label_name: 'Phone',      field_type: 'phone_number', section: 'contact',  display_order: -10 },
                { field_key: 'company_name', label_name: 'Company',    field_type: 'text',         section: 'business', display_order: -50 },
                { field_key: 'address',      label_name: 'Address',    field_type: 'text',         section: 'business', display_order: -40 },
                { field_key: 'city',         label_name: 'City',       field_type: 'text',         section: 'business', display_order: -30 },
                { field_key: 'state',        label_name: 'State',      field_type: 'text',         section: 'business', display_order: -20 },
                { field_key: 'zip',          label_name: 'ZIP Code',   field_type: 'text',         section: 'business', display_order: -10 },
              ]
              for (const fb of SYS_FALLBACKS) {
                if (!configuredKeys.has(fb.field_key)) {
                  const { section, ...def } = fb
                  const list = sectionMap.get(section) ?? []
                  sectionMap.set(section, [def, ...list])
                }
              }

              // ── Preferred section rendering order ────────────────────────────
              const PREF_ORDER = ['owner', 'second_owner', 'contact', 'business', 'general', 'address', 'financial', 'legal', 'compliance', 'deal', 'marketing', 'custom']
              const orderedSections = [
                ...PREF_ORDER.filter(s => sectionMap.has(s)),
                ...[...sectionMap.keys()].filter(s => !PREF_ORDER.includes(s)),
              ]

              // ── Display value formatter ──────────────────────────────────────
              const fmtVal = (ft: string, val: unknown): string => {
                if (val === null || val === undefined || val === '') return ''
                const s = String(val)
                if (ft === 'phone_number') return formatPhoneNumber(s)
                if (ft === 'date') {
                  try {
                    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  } catch { return s }
                }
                return s
              }

              // ── Section icon map ─────────────────────────────────────────────
              const ICON_MAP: Record<string, LucideIcon> = {
                contact: User, business: Briefcase, address: MapPin,
                owner: UserCheck, second_owner: Users, general: ClipboardList,
                financial: DollarSign, legal: FileText,
                compliance: ShieldCheck, deal: TrendingUp,
                marketing: Tag, custom: Hash,
              }

              // ── Section label map ────────────────────────────────────────────
              const SECTION_LABELS: Record<string, string> = {
                owner:        'Owner Information',
                second_owner: 'Owner 2 Information',
                contact:      'Contact Information',
                business:   'Business Information',
                general:    'General Information',
                address:    'Address Information',
                financial:  'Financial Information',
                legal:      'Legal Information',
                compliance: 'Compliance Information',
                deal:       'Deal Information',
                marketing:  'Marketing Information',
                custom:     'Custom Information',
              }

              // ── Copy helper ───────────────────────────────────────────────────
              const copyToClipboard = (text: string) => {
                navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'))
              }

              // ── Render a single field value ────────────────────────────────────
              const renderFieldValue = (f: FieldDef, raw: unknown, display: string) => {
                const isEmpty = !display
                if (isEmpty) return <span style={{ fontSize: 13, color: '#cbd5e1', fontStyle: 'italic', fontWeight: 400 }}>—</span>

                const isPhone = f.field_type === 'phone_number' || f.field_type === 'phone'
                const isEmail = f.field_type === 'email'
                const isHighlight = isPhone || isEmail || f.field_key === 'amount_requested' || f.field_key === 'funding_amount'

                if (isPhone) {
                  return (
                    <span className="inline-flex items-center gap-2 group/val">
                      <a href={`tel:${String(raw)}`} style={{ fontSize: 14, fontWeight: isHighlight ? 700 : 600, color: '#0f172a', textDecoration: 'none' }} className="hover:text-emerald-700 transition-colors">{display}</a>
                      <button type="button" onClick={() => copyToClipboard(String(raw))} className="opacity-0 group-hover/val:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-100" title="Copy"><Copy size={12} className="text-slate-400" /></button>
                    </span>
                  )
                }
                if (isEmail) {
                  return (
                    <span className="inline-flex items-center gap-2 group/val">
                      <a href={`mailto:${String(raw)}`} style={{ fontSize: 14, fontWeight: isHighlight ? 700 : 600, color: '#0f172a', textDecoration: 'none' }} className="hover:text-emerald-700 transition-colors">{display}</a>
                      <button type="button" onClick={() => copyToClipboard(String(raw))} className="opacity-0 group-hover/val:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-100" title="Copy"><Copy size={12} className="text-slate-400" /></button>
                    </span>
                  )
                }
                return <span style={{ fontSize: 14, fontWeight: isHighlight ? 700 : 600, color: '#0f172a' }}>{display}</span>
              }

              // ── Derive a representative name for each section ────────────────
              const leadData = lead as Record<string, unknown>
              const NAME_KEYS: Record<string, string[]> = {
                owner:        ['first_name', 'last_name'],
                contact:      ['first_name', 'last_name'],
                business:     ['company_name'],
                second_owner: ['owner2_first_name', 'owner2_last_name', 'second_owner_first_name', 'second_owner_last_name'],
              }
              const sectionName = (secKey: string): string => {
                // Try known key patterns first
                const keys = NAME_KEYS[secKey]
                if (keys) {
                  const parts = keys.map(k => leadData[k]).filter(v => v && String(v).trim()).map(String)
                  if (parts.length > 0) return parts.join(' ')
                }
                // Fallback: scan section fields for first non-empty name-like field
                const fields = sectionMap.get(secKey) ?? []
                for (const f of fields) {
                  const k = f.field_key.toLowerCase()
                  if (k.includes('name') || k.includes('company')) {
                    const v = leadData[f.field_key]
                    if (v && String(v).trim()) return String(v)
                  }
                }
                return ''
              }

              // ── Section renderer ─────────────────────────────────────────────
              const renderSection = (secKey: string) => {
                const fields = sectionMap.get(secKey) ?? []
                if (fields.length === 0) return null
                const title = SECTION_LABELS[secKey]
                  ?? (secKey.charAt(0).toUpperCase() + secKey.slice(1) + ' Information')
                const name = sectionName(secKey)
                return (
                  <div key={secKey} style={{ minWidth: 0 }}>
                    {/* Heading */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #16a34a', paddingLeft: 10, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                        {title}
                      </h3>
                      {name && (
                        <>
                          <span style={{ color: '#d1d5db' }}>—</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{name}</span>
                        </>
                      )}
                    </div>
                    <div style={{ height: 1, background: '#e5e7eb', marginBottom: 16 }} />

                    {/* 2-col field grid inside each section */}
                    <div className="li-fields">
                      {fields.map(f => {
                        const raw     = leadData[f.field_key]
                        const display = fmtVal(f.field_type, raw)
                        return (
                          <div key={f.field_key} className="li-field">
                            <span className="li-label">{f.label_name}</span>
                            <span className="li-value">{renderFieldValue(f, raw, display)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              // Only include second_owner when it has populated data
              const hasOwner2 = showOwner2 && (sectionMap.get('second_owner') ?? []).length > 0

              const displaySections = showOwner2
                ? orderedSections
                : orderedSections.filter(s => s !== 'second_owner')

              // Primary: owner, business, second_owner
              const PRIMARY = ['owner', 'business', 'second_owner']
              const primarySections = PRIMARY.filter(s => displaySections.includes(s) && (sectionMap.get(s) ?? []).length > 0)
              const remainingSections = displaySections.filter(s => !PRIMARY.includes(s) && (sectionMap.get(s) ?? []).length > 0)

              // Pair remaining into rows of 2
              const restRows: string[][] = []
              for (let i = 0; i < remainingSections.length; i += 2) {
                restRows.push(remainingSections.slice(i, i + 2))
              }

              // 4-4-4 (3 cols) when Owner2 present, 6-6 (2 cols) when not
              const primaryCols = hasOwner2 ? 3 : 2

              return (
                <div className="px-5 py-5 overflow-y-auto" style={{ width: '100%' }}>
                  <style>{`
                    .li-row-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;width:100%}
                    .li-row-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px;width:100%}
                    .li-section-sep{padding-bottom:24px;margin-bottom:24px;border-bottom:1px solid #f1f5f9}
                    .li-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 24px}
                    .li-field{display:flex;flex-direction:column;gap:4px}
                    .li-label{font-size:12px;color:#7c9bc6;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;line-height:1.3}
                    .li-value{font-size:14px;font-weight:600;color:#0f172a;word-break:break-word;line-height:1.4}
                    @media(max-width:1024px){.li-row-3{grid-template-columns:1fr!important}.li-fields{grid-template-columns:1fr}}
                    @media(max-width:768px){.li-row-2{grid-template-columns:1fr!important}}
                  `}</style>

                  {/* Primary row: 4-4-4 or 6-6 */}
                  {primarySections.length > 0 && (
                    <div className={`li-row-${primaryCols}${restRows.length > 0 ? ' li-section-sep' : ''}`}>
                      {primarySections.map(sec => <div key={sec} style={{ minWidth: 0 }}>{renderSection(sec)}</div>)}
                    </div>
                  )}

                  {/* Remaining sections: 6-6 */}
                  {restRows.map((row, ri) => (
                    <div key={ri} className={`li-row-2${ri < restRows.length - 1 ? ' li-section-sep' : ''}`}>
                      {row.map(sec => <div key={sec} style={{ minWidth: 0 }}>{renderSection(sec)}</div>)}
                    </div>
                  ))}
                </div>
              )
            })()}

            {activeTab === 'activity'  && <ErrorBoundary fallbackTitle="Activity failed to load"><div ref={activityRef}  className="p-5"><ActivityTimeline leadId={leadId} /></div></ErrorBoundary>}
            {activeTab === 'documents' && <ErrorBoundary fallbackTitle="Documents failed to load"><div className="px-5 py-4 h-full"><DocumentsPanel leadId={leadId} /></div></ErrorBoundary>}
            {activeTab === 'lenders'   && <ErrorBoundary fallbackTitle="Lenders panel failed to load"><div ref={lendersRef}   className="p-5"><LendersPanel leadId={leadId} /></div></ErrorBoundary>}
            {/* {activeTab === 'ondeck'    && <ErrorBoundary fallbackTitle="OnDeck panel failed to load"><div className="h-full flex flex-col"><OnDeckPanel leadId={leadId} /></div></ErrorBoundary>} */}
            {activeTab === 'merchant'  && <ErrorBoundary fallbackTitle="Merchant portal failed to load"><div className="p-5"><MerchantPortalSection leadId={leadId} /></div></ErrorBoundary>}
            {activeTab === 'offers'     && <ErrorBoundary fallbackTitle="Offers failed to load"><div className="p-5"><OffersStipsTab leadId={leadId} /></div></ErrorBoundary>}
            {activeTab === 'deal'       && <ErrorBoundary fallbackTitle="Deal failed to load"><div className="p-5"><DealTab leadId={leadId} /></div></ErrorBoundary>}
            {activeTab === 'compliance' && <ErrorBoundary fallbackTitle="Compliance failed to load"><div className="p-5"><ComplianceTab leadId={leadId} /></div></ErrorBoundary>}
            {activeTab === 'approvals' && <ErrorBoundary fallbackTitle="Approvals failed to load"><div className="p-5"><ApprovalsSection leadId={leadId} /></div></ErrorBoundary>}

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
