import { useState, useRef } from 'react'
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
  Activity,
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
import type { DocumentType } from '../../components/crm/CrmDocumentTypesManager'
import { confirmDelete } from '../../utils/confirmDelete'
import { formatPhoneNumber } from '../../utils/format'
import type { CrmLead, LeadStatus, CrmDocument, Lender, LenderSubmission, LenderResponseStatus, LenderSubmissionStatus } from '../../types/crm.types'

// ── Tab System ─────────────────────────────────────────────────────────────────
type TabId = 'contact' | 'business' | 'details' | 'activity' | 'documents' | 'lenders' | 'approvals' | 'merchant' | 'offers' | 'deal' | 'compliance'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'contact',   label: 'Contact',         icon: User         },
  { id: 'business',  label: 'Business',        icon: Briefcase    },
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
    setDownloading(true); await downloadFile(doc.file_path, doc.file_name); setDownloading(false)
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
          <iframe src={doc.file_path} title={doc.file_name} className="w-full h-full rounded-xl" style={{ maxWidth: '960px', border: 'none', background: '#fff' }} />
        )}
        {fileType === 'image' && (
          <img src={doc.file_path} alt={doc.file_name} className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
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
    <div className="space-y-5">
      <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-600">Upload Documents</p>
          <button onClick={() => setShowTypeManager(true)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-emerald-600 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white transition-colors">
            <Settings2 size={11} /> Manage Types
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <select value={selectedTypeId} onChange={e => { setSelectedTypeId(e.target.value); setSubValue('') }} className="input text-sm flex-1 min-w-[160px]">
            <option value="">— Select document type —</option>
            {activeTypes.map((t: DocumentType) => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
          </select>
          {subValues.length > 0 && (
            <select value={subValue} onChange={e => setSubValue(e.target.value)} className="input text-sm flex-1 min-w-[140px]">
              <option value="">— Select sub-type —</option>
              {subValues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => fileRef.current?.click()} disabled={!selectedTypeId || uploadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all disabled:opacity-40">
            <Upload size={14} /> Choose Files
          </button>
          {computedDocType && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Tag size={11} /><span className="text-xs font-semibold">{computedDocType}</span>
            </div>
          )}
          {selectedFiles.length > 0 && (
            <button onClick={() => uploadMutation.mutate(selectedFiles)} disabled={!canUpload || uploadMutation.isPending} className="btn-primary ml-auto disabled:opacity-50">
              {uploadMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}</>}
            </button>
          )}
          <input ref={fileRef} type="file" multiple accept={ALLOWED_EXT} className="hidden" onChange={handleFileChange} />
        </div>
        <p className="text-[11px] text-slate-400 mt-2.5">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG · max {MAX_FILE_MB} MB · up to {MAX_FILES} files</p>
        {validationErrors.length > 0 && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3 space-y-1">
            {validationErrors.map((err, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs text-red-600"><AlertCircle size={12} className="mt-0.5 flex-shrink-0" /> {err}</p>
            ))}
          </div>
        )}
        {selectedFiles.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {selectedFiles.map((f, i) => {
              const ic = getFileIcon(f.name)
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ic.bg}`}><FileText size={13} className={ic.color} /></div>
                  <span className="flex-1 text-xs font-medium text-slate-700 truncate">{f.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
                  <button onClick={() => { setSelectedFiles(p => p.filter((_, j) => j !== i)); setValidationErrors([]) }} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"><X size={13} /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><FolderOpen size={22} className="text-slate-400" /></div>
          <p className="text-sm font-semibold text-slate-600">No documents yet</p>
          <p className="text-xs text-slate-400 mt-1">Upload bank statements, ID, or any relevant files</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">{docs.length} Document{docs.length !== 1 ? 's' : ''}</p>
          {docs.map(doc => {
            const ic = getFileIcon(doc.file_path)
            return (
              <div key={doc.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-emerald-200 hover:shadow-sm transition-all group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ic.bg}`}><FileText size={16} className={ic.color} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700"><Tag size={8} /> {doc.document_type}</span>
                    {doc.file_size ? <span className="text-[11px] text-slate-400">{formatBytes(Number(doc.file_size))}</span> : null}
                    <span className="text-[11px] text-slate-400">{new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {doc.uploaded_by_name && <span className="text-[11px] text-slate-400">by {doc.uploaded_by_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setViewDoc(doc)} disabled={!doc.file_path} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30" title="Preview"><Eye size={14} /></button>
                  <button onClick={() => doc.file_path && downloadFile(doc.file_path, doc.file_name)} disabled={!doc.file_path} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30" title="Download"><Download size={14} /></button>
                  <button onClick={async () => { if (await confirmDelete()) deleteMutation.mutate(doc.id) }} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {viewDoc && <DocViewerModal doc={viewDoc} onClose={() => setViewDoc(null)} />}
      {showTypeManager && <CrmDocumentTypesManager onClose={() => setShowTypeManager(false)} />}
    </div>
  )
}

// ── Lender status helpers ───────────────────────────────────────────────────────
const SUBMISSION_STATUS_MAP: Record<LenderSubmissionStatus, { label: string; bg: string; text: string }> = {
  pending:     { label: 'Pending',     bg: 'bg-slate-100',   text: 'text-slate-600'  },
  submitted:   { label: 'Submitted',   bg: 'bg-blue-100',    text: 'text-blue-700'   },
  viewed:      { label: 'Viewed',      bg: 'bg-violet-100',  text: 'text-violet-700' },
  approved:    { label: 'Approved',    bg: 'bg-emerald-100', text: 'text-emerald-700'},
  declined:    { label: 'Declined',    bg: 'bg-red-100',     text: 'text-red-700'    },
  no_response: { label: 'No Response', bg: 'bg-amber-100',   text: 'text-amber-700'  },
}
const RESPONSE_STATUS_MAP: Record<LenderResponseStatus, { label: string; bg: string; text: string }> = {
  pending:         { label: 'Pending',     bg: 'bg-slate-100',   text: 'text-slate-600'  },
  approved:        { label: 'Approved',    bg: 'bg-emerald-100', text: 'text-emerald-700'},
  declined:        { label: 'Declined',    bg: 'bg-red-100',     text: 'text-red-700'    },
  needs_documents: { label: 'Needs Docs', bg: 'bg-amber-100',   text: 'text-amber-700'  },
  no_response:     { label: 'No Response', bg: 'bg-slate-100',   text: 'text-slate-500'  },
}

function StatusPill({ status, map }: { status: string; map: Record<string, { label: string; bg: string; text: string }> }) {
  const cfg = map[status] ?? { label: status, bg: 'bg-slate-100', text: 'text-slate-600' }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
}

// ── Response Update Modal ───────────────────────────────────────────────────────
function ResponseModal({ submission, leadId, onClose }: { submission: LenderSubmission; leadId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [responseStatus, setResponseStatus] = useState<LenderResponseStatus>(submission.response_status ?? 'pending')
  const [submissionStatus, setSubmissionStatus] = useState<LenderSubmissionStatus>(submission.submission_status ?? 'submitted')
  const [responseNote, setResponseNote] = useState(submission.response_note ?? '')

  const mutation = useMutation({
    mutationFn: () => crmService.updateSubmissionResponse(leadId, submission.id, {
      response_status:   responseStatus,
      submission_status: submissionStatus,
      response_note:     responseNote || undefined,
    }),
    onSuccess: () => {
      toast.success('Response updated')
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
      onClose()
    },
    onError: () => toast.error('Failed to update response'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Building2 size={14} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{submission.lender_name ?? `Lender #${submission.lender_id}`}</p>
              <p className="text-[11px] text-slate-400">Update lender response</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Lender Response</label>
            <select className="input w-full" value={responseStatus} onChange={e => setResponseStatus(e.target.value as LenderResponseStatus)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="needs_documents">Needs Documents</option>
              <option value="no_response">No Response</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Submission Status</label>
            <select className="input w-full" value={submissionStatus} onChange={e => setSubmissionStatus(e.target.value as LenderSubmissionStatus)}>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="viewed">Viewed</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="no_response">No Response</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Response Note <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea className="input w-full resize-none" rows={3} value={responseNote} onChange={e => setResponseNote(e.target.value)} placeholder="e.g. Approved for $50,000 at 1.35 factor rate…" />
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary disabled:opacity-50 flex-1">
              {mutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <>Save Response</>}
            </button>
            <button onClick={onClose} className="btn-outline">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Lenders Panel ──────────────────────────────────────────────────────────────
function LendersPanel({ leadId }: { leadId: number }) {
  const qc = useQueryClient()
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [selectedIds, setSelectedIds]       = useState<Set<number>>(new Set())
  const [notes, setNotes]                   = useState('')
  const [pdfPath, setPdfPath]               = useState('')
  const [editingSub, setEditingSub]         = useState<LenderSubmission | null>(null)

  const { data: submissions, isLoading: subsLoading } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      const res = await crmService.getLenderSubmissions(leadId)
      return (res.data?.data ?? res.data ?? []) as LenderSubmission[]
    },
  })

  const { data: lendersData } = useQuery({
    queryKey: ['lenders', 1],
    queryFn: async () => (res => (res.data?.data?.data ?? res.data?.data ?? res.data?.records ?? res.data ?? []) as Lender[])(await crmService.getLenders({ per_page: 200 })),
    staleTime: 5 * 60 * 1000,
  })

  const activeLenders = (lendersData ?? []).filter(l => Number(l.status) === 1)
  const subList       = submissions ?? []

  function toggleLender(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const submitMutation = useMutation({
    mutationFn: () => crmService.submitApplication(leadId, {
      lender_ids: Array.from(selectedIds),
      notes:      notes || undefined,
      pdf_path:   pdfPath || undefined,
    }),
    onSuccess: (res) => {
      const { submitted = [], failed = [] } = res.data?.data ?? {}
      if (submitted.length) toast.success(`Application sent to ${submitted.length} lender${submitted.length !== 1 ? 's' : ''}`)
      if (failed.length)    toast.error(`Failed for ${failed.length} lender${failed.length !== 1 ? 's' : ''}`)
      setShowSubmitForm(false); setSelectedIds(new Set()); setNotes(''); setPdfPath('')
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Submission failed'),
  })

  return (
    <div className="space-y-4">
      {!showSubmitForm ? (
        <button onClick={() => setShowSubmitForm(true)} className="btn-primary w-full">
          <Send size={14} /> Submit Application to Lenders
        </button>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <Send size={13} className="text-emerald-600" />
              <span className="text-sm font-semibold text-slate-800">Submit Application</span>
            </div>
            <button onClick={() => { setShowSubmitForm(false); setSelectedIds(new Set()) }} className="p-1 text-slate-400 hover:text-slate-700">
              <X size={14} />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">Select Lenders</label>
                {activeLenders.length > 0 && (
                  <button
                    onClick={() => setSelectedIds(selectedIds.size === activeLenders.length ? new Set() : new Set(activeLenders.map(l => l.id)))}
                    className="text-[11px] text-emerald-600 hover:underline font-medium"
                  >
                    {selectedIds.size === activeLenders.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>
              {activeLenders.length === 0 ? (
                <p className="text-xs text-amber-600 flex items-center gap-1.5 py-2"><AlertCircle size={12} /> No active lenders configured.</p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {activeLenders.map(l => (
                    <label key={l.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${selectedIds.has(l.id) ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <input type="checkbox" className="accent-emerald-600 w-4 h-4 flex-shrink-0" checked={selectedIds.has(l.id)} onChange={() => toggleLender(l.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{l.lender_name}</p>
                        {l.email && <p className="text-[11px] text-slate-400 truncate">{l.email}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selectedIds.size > 0 && <p className="text-[11px] text-emerald-600 font-medium mt-1.5">{selectedIds.size} lender{selectedIds.size !== 1 ? 's' : ''} selected</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Application PDF path <span className="font-normal text-slate-400">(optional)</span></label>
              <input className="input w-full text-xs" value={pdfPath} onChange={e => setPdfPath(e.target.value)} placeholder="crm_documents/client_1/lead_42/application.pdf" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cover note <span className="font-normal text-slate-400">(optional)</span></label>
              <textarea className="input w-full resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special context for the lender…" />
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={() => submitMutation.mutate()} disabled={selectedIds.size === 0 || submitMutation.isPending} className="btn-primary flex-1 disabled:opacity-50">
                {submitMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send to {selectedIds.size || '…'} Lender{selectedIds.size !== 1 ? 's' : ''}</>}
              </button>
              <button onClick={() => { setShowSubmitForm(false); setSelectedIds(new Set()) }} className="btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Submission History</p>
        {subsLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-emerald-500" /></div>
        ) : subList.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-10 text-center">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-3"><Building2 size={18} className="text-slate-400" /></div>
            <p className="text-sm font-semibold text-slate-600">No submissions yet</p>
            <p className="text-xs text-slate-400 mt-1">Submit an application to track lender responses</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subList.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 hover:shadow-sm transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5"><Building2 size={15} className="text-amber-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.lender_name ?? `Lender #${s.lender_id}`}</p>
                    {s.lender_email && <p className="text-[11px] text-slate-400 truncate">{s.lender_email}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <StatusPill status={s.submission_status ?? 'pending'} map={SUBMISSION_STATUS_MAP} />
                      <span className="text-slate-300">·</span>
                      <StatusPill status={s.response_status ?? 'pending'} map={RESPONSE_STATUS_MAP} />
                      {s.application_pdf && <><span className="text-slate-300">·</span><span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium"><FileText size={9} /> PDF attached</span></>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {s.submitted_at && <span className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar size={9} /> {new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                      {s.response_note && <span className="text-[11px] text-slate-500 italic truncate max-w-[180px]">"{s.response_note}"</span>}
                    </div>
                  </div>
                  <button onClick={() => setEditingSub(s)} className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-0 group-hover:opacity-100" title="Update response"><Pencil size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editingSub && <ResponseModal submission={editingSub} leadId={leadId} onClose={() => setEditingSub(null)} />}
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
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${leadName.replace(/\s+/g, '_')}_application.html` })
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
function PropertyRow({ fieldKey, label, value, type = 'text', leadId, onUpdated }: {
  fieldKey: string; label: string; value: string | null | undefined
  type?: 'text' | 'email' | 'tel' | 'textarea'; leadId: number; onUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  const [saving,  setSaving]  = useState(false)

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

  return (
    <div className="flex items-start py-1.5 border-b border-slate-50 last:border-0 group">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5 leading-tight">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {type === 'textarea'
            ? <textarea autoFocus rows={2} className="flex-1 text-xs border border-emerald-400 rounded-md px-2 py-1 outline-none resize-none bg-white" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') cancel() }} />
            : <input autoFocus type={type} className="flex-1 text-xs border border-emerald-400 rounded-md px-2 py-1 outline-none bg-white min-w-0" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }} />
          }
          <button onMouseDown={e => { e.preventDefault(); save() }} disabled={saving} className="p-1 rounded bg-emerald-600 text-white flex-shrink-0 disabled:opacity-50">
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          </button>
          <button onMouseDown={e => { e.preventDefault(); cancel() }} className="p-1 rounded bg-slate-100 text-slate-500 flex-shrink-0"><X size={10} /></button>
        </div>
      ) : (
        <button onClick={startEdit} className="flex items-center gap-1.5 flex-1 min-w-0 text-left hover:text-emerald-700 transition-colors">
          <span className="text-sm text-slate-800 flex-1 truncate leading-tight">
            {value || <span className="text-slate-300 text-xs">—</span>}
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

  const [activeTab,          setActiveTab]          = useState<TabId>('contact')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showMoreMenu,       setShowMoreMenu]       = useState(false)
  const [showPdfModal,       setShowPdfModal]       = useState(false)

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
      <div className="relative bg-white border-b border-slate-200">
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #059669, #10b981, #34d399)' }} />
        <div className="relative max-w-[1800px] mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-100">
            <button onClick={() => navigate('/crm/leads')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-medium transition-colors">
              <ArrowLeft size={13} /> Leads
            </button>
            <ChevronRight size={11} className="text-slate-300" />
            <span className="text-xs font-semibold text-slate-600">Lead Detail</span>
            <span className="text-xs text-slate-400 font-mono">#{lead.id}</span>
            {tempStyle && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${tempStyle.bg} ${tempStyle.text}`}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tempStyle.dot }} />
                {tempStyle.label}
              </span>
            )}
          </div>

          {/* Lead identity + actions */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className={`w-14 h-14 rounded-2xl ${avatarBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <span className="text-lg font-bold text-white leading-none">{leadInits}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">{fullName}</h1>
                <div className="relative">
                  <button
                    onClick={() => { setShowStatusDropdown(s => !s); setShowMoreMenu(false) }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all hover:opacity-80"
                    style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                    {currentStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    <ChevronDown size={10} className="opacity-60" />
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
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {lead.company_name && <span className="flex items-center gap-1 text-xs text-slate-500"><Briefcase size={11} />{String(lead.company_name)}</span>}
                {lead.phone_number && <a href={`tel:${lead.phone_number}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 transition-colors"><Phone size={11} />{formatPhoneNumber(String(lead.phone_number))}</a>}
                {lead.email && <a href={`mailto:${lead.email}`} className="hidden sm:flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 transition-colors"><Mail size={11} />{String(lead.email)}</a>}
                {(lead.assigned_name as string | undefined) && <span className="hidden md:flex items-center gap-1 text-xs text-slate-500"><UserCheck size={11} />{lead.assigned_name as string}</span>}
                <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar size={11} />{daysInSystem}d in pipeline</span>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {lead.phone_number && (
                <a href={`tel:${lead.phone_number}`} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                  <Phone size={12} /> Call
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                  <Mail size={12} /> Email
                </a>
              )}
              <button onClick={() => navigate(`/crm/leads/${leadId}/edit`)} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                <Pencil size={12} /> Edit
              </button>
              <div className="relative">
                <button onClick={() => { setShowMoreMenu(s => !s); setShowStatusDropdown(false) }} className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors">
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
          </div>

        </div>
      </div>

      {/* ── SINGLE CARD ── */}
      <div className="max-w-[1800px] mx-auto px-5 py-5 pb-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 160px)' }}>

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
            {(activeTab === 'contact' || activeTab === 'business' || activeTab === 'details') && (
              <button onClick={() => navigate(`/crm/leads/${leadId}/edit`)} className="flex items-center gap-1.5 px-4 py-3 text-[11px] text-emerald-600 hover:text-emerald-800 font-medium transition-colors flex-shrink-0">
                <Pencil size={10} /> Edit all
              </button>
            )}
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

            {activeTab === 'contact' && (
              <div className="px-6 py-5">
                <PropertyRow fieldKey="first_name"   label="First name" value={lead.first_name   as string | undefined} leadId={leadId} onUpdated={onLeadUpdated} />
                <PropertyRow fieldKey="last_name"    label="Last name"  value={lead.last_name    as string | undefined} leadId={leadId} onUpdated={onLeadUpdated} />
                <PropertyRow fieldKey="email"        label="Email"      value={lead.email        as string | undefined} type="email" leadId={leadId} onUpdated={onLeadUpdated} />
                <PropertyRow fieldKey="phone_number" label="Phone"      value={lead.phone_number as string | undefined} type="tel"   leadId={leadId} onUpdated={onLeadUpdated} />
              </div>
            )}

            {activeTab === 'business' && (
              <div className="px-6 py-5">
                <PropertyRow fieldKey="company_name" label="Company" value={lead.company_name as string | undefined} leadId={leadId} onUpdated={onLeadUpdated} />
                <PropertyRow fieldKey="address"      label="Address" value={lead.address      as string | undefined} leadId={leadId} onUpdated={onLeadUpdated} />
                <PropertyRow fieldKey="city"         label="City"    value={lead.city         as string | undefined} leadId={leadId} onUpdated={onLeadUpdated} />
                <PropertyRow fieldKey="state"        label="State"   value={lead.state        as string | undefined} leadId={leadId} onUpdated={onLeadUpdated} />
                <PropertyRow fieldKey="zip"          label="ZIP"     value={(lead as Record<string, unknown>)['zip'] as string | undefined} leadId={leadId} onUpdated={onLeadUpdated} />
              </div>
            )}

            {activeTab === 'details' && (
              <div className="px-6 py-5">
                <div className="flex items-start py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: statusColor }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                    {currentStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
                <div className="flex items-start py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">Lead type</span>
                  <span className="text-sm text-slate-800">{lead.lead_type ? String(lead.lead_type) : <span className="text-slate-300 text-xs">—</span>}</span>
                </div>
                <div className="flex items-start py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">Assigned to</span>
                  <span className="text-sm text-slate-800">{(lead.assigned_name as string | undefined) || <span className="text-slate-300 text-xs">—</span>}</span>
                </div>
                <div className="flex items-start py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">Loan amount</span>
                  <span className="text-sm text-slate-800">
                    {loanAmount ? `$${Number(String(loanAmount).replace(/[^0-9.]/g, '')).toLocaleString('en-US')}` : <span className="text-slate-300 text-xs">—</span>}
                  </span>
                </div>
                <div className="flex items-start py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">Created</span>
                  <span className="text-sm text-slate-800">{lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                </div>
                <div className="flex items-start py-1.5">
                  <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">In pipeline</span>
                  <span className="text-sm text-slate-800">{daysInSystem} days</span>
                </div>
              </div>
            )}

            {activeTab === 'activity'  && <div ref={activityRef}  className="p-5"><ActivityTimeline leadId={leadId} /></div>}
            {activeTab === 'documents' && <div className="p-5"><DocumentsPanel leadId={leadId} /></div>}
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
    </div>
  )
}
