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
  Check, DollarSign, LayoutDashboard, ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { ActivityTimeline } from '../../components/crm/ActivityTimeline'
import { ApprovalsSection } from '../../components/crm/ApprovalsSection'
import { MerchantPortalSection } from '../../components/crm/MerchantPortalSection'
import { DynamicFieldForm } from '../../components/crm/DynamicFieldForm'
import { CrmDocumentTypesManager, parseValues } from '../../components/crm/CrmDocumentTypesManager'
import type { DocumentType } from '../../components/crm/CrmDocumentTypesManager'
import { confirmDelete } from '../../utils/confirmDelete'
import { formatPhoneNumber } from '../../utils/format'
import type { CrmLead, LeadStatus, CrmDocument, Lender, LenderSubmission, LenderResponseStatus, LenderSubmissionStatus } from '../../types/crm.types'

// ── Tab System ─────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'activity' | 'documents' | 'lenders' | 'approvals' | 'merchant'

const TABS: { id: TabId; label: string; icon: LucideIcon; mobileLabel: string }[] = [
  { id: 'overview',  label: 'Overview',        icon: LayoutDashboard, mobileLabel: 'Overview'  },
  { id: 'activity',  label: 'Activity',         icon: Clock,           mobileLabel: 'Activity'  },
  { id: 'documents', label: 'Documents',        icon: FolderOpen,      mobileLabel: 'Docs'      },
  { id: 'lenders',   label: 'Lenders',          icon: Building2,       mobileLabel: 'Lenders'   },
  { id: 'approvals', label: 'Approvals',        icon: CheckSquare,     mobileLabel: 'Approvals' },
  { id: 'merchant',  label: 'Merchant Portal',  icon: ExternalLink,    mobileLabel: 'Merchant'  },
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

// ── PipelineProgress ───────────────────────────────────────────────────────────
function PipelineProgress({ statuses, currentStatus }: { statuses: LeadStatus[]; currentStatus: string }) {
  const display = statuses.slice(0, 6)
  const currentIdx = display.findIndex(s => s.lead_title_url === currentStatus)

  return (
    <div className="px-5 py-3 border-t border-white/10">
      <div className="flex items-center gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {display.map((s, i) => {
          const isActive    = i === currentIdx
          const isCompleted = currentIdx >= 0 && i < currentIdx
          const isFuture    = currentIdx < 0 || i > currentIdx
          const isLast      = i === display.length - 1

          return (
            <div key={s.id} className="flex items-center flex-shrink-0">
              {/* Step */}
              <div className="flex flex-col items-center gap-1">
                <div className="relative flex items-center justify-center">
                  {/* Circle */}
                  {isActive ? (
                    <div className="relative w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(16,185,129,0.9)', boxShadow: '0 0 0 3px rgba(16,185,129,0.3), 0 0 0 6px rgba(16,185,129,0.1)' }}
                    >
                      <span className="text-[10px] font-bold text-white leading-none">{i + 1}</span>
                      {/* Pulse dot */}
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" style={{ animationDuration: '2s' }} />
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                  ) : isCompleted ? (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.6)' }}>
                      <Check size={12} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
                      <span className="text-[10px] font-medium text-white/35 leading-none">{i + 1}</span>
                    </div>
                  )}
                </div>
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap max-w-[72px] text-center leading-tight"
                  style={{ color: isActive ? '#6ee7b7' : isCompleted ? 'rgba(110,231,183,0.65)' : 'rgba(255,255,255,0.28)' }}
                >
                  {s.lead_title}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div className="mx-1.5 flex-shrink-0" style={{ width: '24px', height: '2px', borderRadius: '1px', background: isCompleted ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)' }} />
              )}
            </div>
          )
        })}
        {statuses.length > 6 && (
          <div className="flex items-center ml-2 flex-shrink-0">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <span className="text-[8px] font-bold text-white/30">+{statuses.length - 6}</span>
            </div>
          </div>
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

// ── InlineField ────────────────────────────────────────────────────────────────
function InlineField({ fieldKey, label, value, type = 'text', leadId, onUpdated }: {
  fieldKey: string; label: string; value: string | null | undefined
  type?: 'text' | 'email' | 'tel' | 'textarea'; leadId: number; onUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  const [saving,  setSaving]  = useState(false)

  function startEdit() { setDraft(value ?? ''); setEditing(true) }
  function cancel()    { setDraft(''); setEditing(false) }

  async function save() {
    if (draft === (value ?? '')) { setEditing(false); return }
    setSaving(true)
    try {
      await leadService.update(leadId, { [fieldKey]: draft })
      onUpdated()
      toast.success(`${label} updated`)
    } catch {
      toast.error(`Failed to update ${label}`)
    } finally { setSaving(false); setEditing(false) }
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</label>
        <div className="flex items-center gap-1.5">
          {type === 'textarea' ? (
            <textarea autoFocus rows={2} className="input flex-1 text-sm resize-none" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } if (e.key === 'Escape') cancel() }} />
          ) : (
            <input autoFocus type={type} className="input flex-1 text-sm" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }} />
          )}
          <button onMouseDown={e => { e.preventDefault(); save() }} disabled={saving} className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
          <button onMouseDown={e => { e.preventDefault(); cancel() }} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex-shrink-0 transition-colors"><X size={12} /></button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={startEdit} className="w-full text-left group rounded-lg px-2.5 py-2 hover:bg-emerald-50/70 transition-colors -mx-2.5 focus:outline-none">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium text-slate-800 flex-1 truncate leading-snug">
          {value || <span className="text-slate-300 italic font-normal text-xs">Click to edit…</span>}
        </p>
        <Pencil size={11} className="text-slate-200 group-hover:text-emerald-500 flex-shrink-0 transition-colors" />
      </div>
    </button>
  )
}

// ── FieldSection ───────────────────────────────────────────────────────────────
function FieldSection({ title, icon: Icon, children, iconBg = 'bg-emerald-50', iconColor = 'text-emerald-600' }: {
  title: string; icon: LucideIcon; children: ReactNode; iconBg?: string; iconColor?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={12} className={iconColor} />
        </div>
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-0.5">{children}</div>
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
      style={{ background: 'linear-gradient(135deg, #052e16 0%, #064e3b 60%, #065f46 100%)' }}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7)' }} />

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
function LeadProfilePanel({ lead, leadId, onUpdated, onEditAll, avatarBg, leadInits, statusColor, currentStatus, daysInSystem, fullName }: {
  lead: CrmLead; leadId: number; onUpdated: () => void; onEditAll: () => void
  avatarBg: string; leadInits: string; statusColor: string; currentStatus: LeadStatus | undefined
  daysInSystem: number; fullName: string
}) {
  return (
    <div className="space-y-4">
      {/* Hero card */}
      <LeadHeroCard
        lead={lead}
        leadId={leadId}
        avatarBg={avatarBg}
        leadInits={leadInits}
        statusColor={statusColor}
        currentStatus={currentStatus}
        daysInSystem={daysInSystem}
        fullName={fullName}
      />

      <FieldSection title="Contact Information" icon={User}>
        <InlineField fieldKey="first_name"   label="First Name" value={lead.first_name   as string | undefined} leadId={leadId} onUpdated={onUpdated} />
        <InlineField fieldKey="last_name"    label="Last Name"  value={lead.last_name    as string | undefined} leadId={leadId} onUpdated={onUpdated} />
        <InlineField fieldKey="email"        label="Email"      value={lead.email        as string | undefined} type="email" leadId={leadId} onUpdated={onUpdated} />
        <InlineField fieldKey="phone_number" label="Phone"      value={lead.phone_number as string | undefined} type="tel"   leadId={leadId} onUpdated={onUpdated} />
      </FieldSection>

      <FieldSection title="Business Information" icon={Briefcase} iconBg="bg-violet-50" iconColor="text-violet-600">
        <InlineField fieldKey="company_name" label="Business Name" value={lead.company_name as string | undefined} leadId={leadId} onUpdated={onUpdated} />
        <InlineField fieldKey="address"      label="Address"       value={lead.address      as string | undefined} leadId={leadId} onUpdated={onUpdated} />
        <InlineField fieldKey="city"         label="City"          value={lead.city         as string | undefined} leadId={leadId} onUpdated={onUpdated} />
        <InlineField fieldKey="state"        label="State"         value={lead.state        as string | undefined} leadId={leadId} onUpdated={onUpdated} />
        <InlineField fieldKey="zip"          label="ZIP"           value={(lead as Record<string, unknown>)['zip'] as string | undefined} leadId={leadId} onUpdated={onUpdated} />
        <InlineField fieldKey="country"      label="Country"       value={lead.country      as string | undefined} leadId={leadId} onUpdated={onUpdated} />
      </FieldSection>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-50/80 to-white border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <DollarSign size={12} className="text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Funding &amp; Custom Fields</span>
          </div>
          <button onClick={onEditAll} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2.5 py-1 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-colors">
            <Pencil size={11} /> Edit All
          </button>
        </div>
        <div className="p-4">
          <DynamicFieldForm register={(() => {}) as never} defaultValues={lead as Record<string, unknown>} readOnly />
        </div>
      </div>
    </div>
  )
}

// ── Actions Panel ──────────────────────────────────────────────────────────────
function ActionGroup({ title, icon: Icon, iconBg, iconColor, children }: {
  title: string; icon: LucideIcon; iconBg: string; iconColor: string; children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={11} className={iconColor} />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, color, bg, onClick }: {
  icon: LucideIcon; label: string; color: string; bg: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left hover:shadow-sm active:scale-[0.98] ${bg}`}>
      <Icon size={14} className={`${color} flex-shrink-0`} />
      <span className={color}>{label}</span>
    </button>
  )
}

function ActionsPanel({ lead, statuses, updateStatus, showStatusDropdown, setShowStatusDropdown, onScrollToActivity, onScrollToLenders, onGeneratePdf, onEditLead, onDeleteLead }: {
  lead: CrmLead; statuses: LeadStatus[] | undefined
  updateStatus: { mutate: (s: string) => void; isPending: boolean }
  showStatusDropdown: boolean; setShowStatusDropdown: (v: boolean) => void
  onScrollToActivity: () => void; onScrollToLenders: () => void
  onGeneratePdf: () => void; onEditLead: () => void; onDeleteLead: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-700 to-emerald-600 border-b border-emerald-800">
        <Zap size={14} className="text-white flex-shrink-0" />
        <span className="text-xs font-bold text-white uppercase tracking-widest">Quick Actions</span>
      </div>
      <div className="p-4 space-y-5">

        <ActionGroup title="Lead Actions" icon={ClipboardList} iconBg="bg-emerald-50" iconColor="text-emerald-600">
          <ActionBtn icon={Pencil} label="Edit Lead"   color="text-emerald-700" bg="bg-emerald-50 hover:bg-emerald-100"  onClick={onEditLead}   />
          <ActionBtn icon={Trash2} label="Delete Lead" color="text-red-600"     bg="bg-red-50 hover:bg-red-100"          onClick={onDeleteLead} />
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-all text-left hover:shadow-sm active:scale-[0.98]"
            >
              <Zap size={14} className="text-violet-600 flex-shrink-0" />
              <span className="flex-1">Change Status</span>
              <ChevronDown size={12} className="text-violet-400" />
            </button>
            {showStatusDropdown && statuses && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-20 py-1" onMouseLeave={() => setShowStatusDropdown(false)}>
                {statuses.map((s: LeadStatus) => {
                  const isCurrent = s.lead_title_url === String(lead.lead_status)
                  const dotColor = s.color_code ?? s.color ?? '#94a3b8'
                  return (
                    <button
                      key={s.id}
                      onClick={() => updateStatus.mutate(s.lead_title_url)}
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
        </ActionGroup>

        <div className="h-px bg-slate-100" />

        <ActionGroup title="Communication" icon={MessageSquare} iconBg="bg-emerald-50" iconColor="text-emerald-600">
          <ActionBtn icon={MessageSquare} label="Add Note" color="text-emerald-700" bg="bg-emerald-50 hover:bg-emerald-100" onClick={onScrollToActivity} />
          {lead.email
            ? <a href={`mailto:${String(lead.email)}`} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 hover:shadow-sm transition-all"><Mail size={14} className="text-sky-600 flex-shrink-0" /> Send Email</a>
            : <ActionBtn icon={Mail} label="Send Email" color="text-sky-700" bg="bg-sky-50 hover:bg-sky-100" onClick={() => toast('No email on file', { icon: '⚠️' })} />
          }
          {lead.phone_number
            ? <a href={`tel:${String(lead.phone_number)}`} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:shadow-sm transition-all"><Phone size={14} className="text-blue-600 flex-shrink-0" /> Call Lead</a>
            : <ActionBtn icon={Phone} label="Call Lead" color="text-blue-700" bg="bg-blue-50 hover:bg-blue-100" onClick={() => toast('No phone on file', { icon: '⚠️' })} />
          }
        </ActionGroup>

        <div className="h-px bg-slate-100" />

        <ActionGroup title="Funding" icon={DollarSign} iconBg="bg-amber-50" iconColor="text-amber-600">
          <ActionBtn icon={Printer}   label="Generate Application" color="text-violet-700" bg="bg-violet-50 hover:bg-violet-100" onClick={onGeneratePdf}     />
          <ActionBtn icon={Send}      label="Submit to Lenders"    color="text-amber-700"  bg="bg-amber-50 hover:bg-amber-100"   onClick={onScrollToLenders} />
          <ActionBtn icon={Building2} label="View Submissions"     color="text-amber-700"  bg="bg-amber-50 hover:bg-amber-100"   onClick={onScrollToLenders} />
        </ActionGroup>

        <div className="h-px bg-slate-100" />

        <ActionGroup title="Documents" icon={FolderOpen} iconBg="bg-slate-100" iconColor="text-slate-600">
          <ActionBtn icon={FileDown}     label="Download Lead"    color="text-slate-700" bg="bg-slate-50 hover:bg-slate-100" onClick={() => toast('Export coming soon', { icon: 'ℹ️' })} />
          <ActionBtn icon={ExternalLink} label="Merchant Portal" color="text-sky-700"   bg="bg-sky-50 hover:bg-sky-100"    onClick={() => toast('Scroll to Merchant Portal', { icon: 'ℹ️' })} />
        </ActionGroup>

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

  const [activeTab,          setActiveTab]          = useState<TabId>('overview')
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

  function scrollTo(ref: RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

  function goToActivity() {
    setActiveTab('activity')
    setTimeout(() => activityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function goToLenders() {
    setActiveTab('lenders')
    setTimeout(() => lendersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return (
    <div className="min-h-screen bg-slate-50/40 -mx-5 -mt-5">

      {/* ═══════════════════════════════════════════════════════════
          GRADIENT HERO HEADER — Emerald CRM Theme
      ═══════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #052e16 0%, #064e3b 50%, #065f46 100%)' }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%)' }} />
        <div className="absolute top-8 left-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.12) 0%, transparent 70%)' }} />

        <div className="relative max-w-[1800px] mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-white/10">
            <button onClick={() => navigate('/crm/leads')} className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-medium transition-colors">
              <ArrowLeft size={13} /> Leads
            </button>
            <ChevronRight size={11} className="text-white/25" />
            <span className="text-white/40 text-xs">#{lead.id}</span>
            {lead.lead_type && (
              <><ChevronRight size={11} className="text-white/25" /><span className="text-white/40 text-xs">{String(lead.lead_type)}</span></>
            )}
            <div className="ml-auto">
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                CRM Command Center
              </span>
            </div>
          </div>

          {/* Lead summary + quick actions */}
          <div className="flex items-center gap-4 px-5 py-4">
            {/* Avatar */}
            <div
              className={`w-14 h-14 rounded-2xl ${avatarBg} flex items-center justify-center flex-shrink-0 shadow-2xl`}
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.1)' }}
            >
              <span className="text-lg font-bold text-white leading-none">{leadInits}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white leading-tight">{fullName}</h1>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: `${statusColor}25`, color: '#6ee7b7', border: `1px solid ${statusColor}50` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: statusColor }} />
                  {currentStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </div>

              {/* Meta chips */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {lead.phone_number && (
                  <a href={`tel:${lead.phone_number}`}>
                    <StatChip icon={Phone} label={formatPhoneNumber(String(lead.phone_number))} />
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="hidden sm:flex">
                    <StatChip icon={Mail} label={String(lead.email)} />
                  </a>
                )}
                {(lead.assigned_name as string | undefined) && (
                  <div className="hidden md:flex"><StatChip icon={UserCheck} label={lead.assigned_name as string} /></div>
                )}
                {lead.company_name && (
                  <div className="hidden lg:flex"><StatChip icon={Briefcase} label={String(lead.company_name)} /></div>
                )}
                <div className="hidden xl:flex"><StatChip icon={Calendar} label={`${daysInSystem}d in pipeline`} /></div>
              </div>
            </div>

            {/* Header quick actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {lead.phone_number && (
                <a href={`tel:${lead.phone_number}`} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Phone size={12} /> Call
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Mail size={12} /> Email
                </a>
              )}
              <button onClick={goToActivity} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                <MessageSquare size={12} /> Note
              </button>
              <button onClick={() => setShowPdfModal(true)} className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Printer size={12} /> PDF
              </button>
              <button
                onClick={() => navigate(`/crm/leads/${leadId}/edit`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-lg"
                style={{ background: 'rgba(16,185,129,0.85)', color: '#fff' }}
              >
                <Pencil size={12} /> Edit
              </button>
              <div className="relative">
                <button onClick={() => { setShowMoreMenu(s => !s); setShowStatusDropdown(false) }} className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <MoreVertical size={15} />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-20 py-1" onMouseLeave={() => setShowMoreMenu(false)}>
                    <button onClick={() => { setShowMoreMenu(false); goToActivity() }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors sm:hidden"><MessageSquare size={13} /> Add Note</button>
                    <button onClick={() => { setShowMoreMenu(false); setShowPdfModal(true) }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors lg:hidden"><Printer size={13} /> Generate PDF</button>
                    <button onClick={() => { setShowMoreMenu(false); goToLenders() }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors"><Send size={13} /> Send to Lender</button>
                    <button onClick={() => toast('Export coming soon', { icon: 'ℹ️' })} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors"><FileDown size={13} /> Download Lead</button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button onClick={handleDeleteLead} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /> Delete Lead</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Pipeline Progress Stepper ── */}
          {statuses && statuses.length > 0 && (
            <PipelineProgress
              statuses={statuses}
              currentStatus={String(lead.lead_status)}
            />
          )}

          {/* ── Tab navigation bar ── */}
          <div className="flex items-center gap-1 px-5 overflow-x-auto border-t border-white/10" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                    isActive
                      ? 'border-emerald-400 text-white'
                      : 'border-transparent text-white/45 hover:text-white/75 hover:border-white/20',
                  ].join(' ')}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.mobileLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <div className="max-w-[1800px] mx-auto px-5 py-5">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[340px_1fr_268px] gap-5">
            {/* Profile (sticky left) */}
            <div className="xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-80px)] xl:overflow-y-auto xl:pb-4">
              <LeadProfilePanel
                lead={lead}
                leadId={leadId}
                onUpdated={onLeadUpdated}
                onEditAll={() => navigate(`/crm/leads/${leadId}/edit`)}
                avatarBg={avatarBg}
                leadInits={leadInits}
                statusColor={statusColor}
                currentStatus={currentStatus}
                daysInSystem={daysInSystem}
                fullName={fullName}
              />
            </div>

            {/* Center: activity preview */}
            <div className="min-w-0">
              <CollapsibleSection
                title="Recent Activity"
                icon={Clock}
                defaultOpen={true}
                headerRight={
                  <button
                    onClick={goToActivity}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Plus size={12} /> Add Note
                  </button>
                }
              >
                <ActivityTimeline leadId={leadId} />
              </CollapsibleSection>
            </div>

            {/* Right: actions (sticky) */}
            <div className="space-y-4 lg:col-span-2 xl:col-span-1 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-80px)] xl:overflow-y-auto xl:pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-4">
                <ActionsPanel
                  lead={lead}
                  statuses={statuses}
                  updateStatus={updateStatus}
                  showStatusDropdown={showStatusDropdown}
                  setShowStatusDropdown={setShowStatusDropdown}
                  onScrollToActivity={goToActivity}
                  onScrollToLenders={goToLenders}
                  onGeneratePdf={() => setShowPdfModal(true)}
                  onEditLead={() => navigate(`/crm/leads/${leadId}/edit`)}
                  onDeleteLead={handleDeleteLead}
                />
                <SidebarCard title="Lender Submissions" icon={Building2} iconColor="text-amber-600" iconBg="bg-amber-50">
                  <LendersPanel leadId={leadId} />
                </SidebarCard>
              </div>
              <SidebarCard title="Approvals" icon={CheckSquare} iconColor="text-emerald-600" iconBg="bg-emerald-50">
                <ApprovalsSection leadId={leadId} />
              </SidebarCard>
              <SidebarCard title="Merchant Portal" icon={ExternalLink} iconColor="text-sky-600" iconBg="bg-sky-50">
                <MerchantPortalSection leadId={leadId} />
              </SidebarCard>
            </div>
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {activeTab === 'activity' && (
          <div ref={activityRef} className="max-w-3xl mx-auto">
            <CollapsibleSection
              title="Activity Timeline"
              icon={Clock}
              defaultOpen={true}
              headerRight={
                <button onClick={() => scrollTo(activityRef)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                  <Plus size={12} /> Add Note
                </button>
              }
            >
              <ActivityTimeline leadId={leadId} />
            </CollapsibleSection>
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <div className="max-w-3xl mx-auto">
            <CollapsibleSection title="Documents" icon={FolderOpen} defaultOpen={true}>
              <DocumentsPanel leadId={leadId} />
            </CollapsibleSection>
          </div>
        )}

        {/* ── LENDERS TAB ── */}
        {activeTab === 'lenders' && (
          <div ref={lendersRef} className="max-w-3xl mx-auto">
            <SidebarCard title="Lender Submissions" icon={Building2} iconColor="text-amber-600" iconBg="bg-amber-50">
              <LendersPanel leadId={leadId} />
            </SidebarCard>
          </div>
        )}

        {/* ── APPROVALS TAB ── */}
        {activeTab === 'approvals' && (
          <div className="max-w-3xl mx-auto">
            <SidebarCard title="Approvals" icon={CheckSquare} iconColor="text-emerald-600" iconBg="bg-emerald-50">
              <ApprovalsSection leadId={leadId} />
            </SidebarCard>
          </div>
        )}

        {/* ── MERCHANT TAB ── */}
        {activeTab === 'merchant' && (
          <div className="max-w-3xl mx-auto">
            <SidebarCard title="Merchant Portal" icon={ExternalLink} iconColor="text-sky-600" iconBg="bg-sky-50">
              <MerchantPortalSection leadId={leadId} />
            </SidebarCard>
          </div>
        )}

      </div>

      {/* PDF Preview modal */}
      {showPdfModal && (
        <PdfPreviewModal
          leadId={leadId}
          leadName={fullName}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  )
}
