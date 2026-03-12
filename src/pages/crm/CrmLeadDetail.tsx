import { useState, useRef } from 'react'
import type { ReactNode, ChangeEvent, RefObject, ComponentType } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Pencil, Loader2, ChevronDown, ChevronUp, Upload, FileText,
  Trash2, Download, Building2, Send, AlertCircle, X, Eye,
  Settings2, Mail, Phone, MapPin, Calendar, User, Briefcase,
  Hash, UserCheck, Clock, FolderOpen, CheckSquare, MoreVertical, Tag,
  ClipboardList, Zap, MessageSquare, FileDown, Plus, ExternalLink,
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
import type { CrmLead, LeadStatus, CrmDocument, Lender, LenderSendRecord } from '../../types/crm.types'

// ── Constants ──────────────────────────────────────────────────────────────────
const AVATAR_BG = ['bg-indigo-500','bg-violet-500','bg-sky-500','bg-emerald-500','bg-rose-500','bg-amber-500']

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
  return { bg: 'bg-indigo-50', color: 'text-indigo-500' }
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
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Icon size={14} className="text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 flex-shrink-0">
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
  title, icon: Icon, children, iconColor = 'text-indigo-600', iconBg = 'bg-indigo-50',
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
  iconColor?: string
  iconBg?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
          <FileText size={17} className="text-indigo-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{doc.file_name}</p>
            <p className="text-xs text-slate-400">{doc.document_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <button
            onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60"
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
            <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
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

  function handleFileChange(e: import('react').ChangeEvent<HTMLInputElement>) {
    const raw = Array.from(e.target.files ?? []); e.target.value = ''
    if (!raw.length) return
    const { valid, errors } = validateFiles([...selectedFiles, ...raw])
    setValidationErrors(errors); setSelectedFiles(valid)
  }

  const canUpload = !!selectedTypeId && selectedFiles.length > 0

  return (
    <div className="space-y-5">
      {/* Upload panel */}
      <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-600">Upload Documents</p>
          <button onClick={() => setShowTypeManager(true)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white transition-colors">
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-indigo-300 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-all disabled:opacity-40">
            <Upload size={14} /> Choose Files
          </button>
          {computedDocType && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700">
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

      {/* Document list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-indigo-400" /></div>
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
              <div key={doc.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-indigo-200 hover:shadow-sm transition-all group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ic.bg}`}><FileText size={16} className={ic.color} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600"><Tag size={8} /> {doc.document_type}</span>
                    {doc.file_size ? <span className="text-[11px] text-slate-400">{formatBytes(Number(doc.file_size))}</span> : null}
                    <span className="text-[11px] text-slate-400">{new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {doc.uploaded_by_name && <span className="text-[11px] text-slate-400">by {doc.uploaded_by_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setViewDoc(doc)} disabled={!doc.file_path} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-30" title="Preview"><Eye size={14} /></button>
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

// ── Lenders Panel ──────────────────────────────────────────────────────────────
function LendersPanel({ leadId }: { leadId: number }) {
  const qc = useQueryClient()
  const [showSendForm, setShowSendForm] = useState(false)
  const [selectedLender, setSelectedLender] = useState('')
  const [notes, setNotes] = useState('')

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ['lead-lender-history', leadId],
    queryFn: async () => (res => (res.data?.data ?? res.data ?? []) as LenderSendRecord[])(await crmService.getLeadLenderHistory(leadId)),
  })

  const { data: lendersData } = useQuery({
    queryKey: ['lenders', 1],
    queryFn: async () => (res => (res.data?.data?.data ?? res.data?.data ?? res.data?.records ?? res.data ?? []) as Lender[])(await crmService.getLenders({ per_page: 200 })),
    staleTime: 5 * 60 * 1000,
  })

  const activeLenders = (lendersData ?? []).filter(l => Number(l.status) === 1)
  const submissions = history ?? []

  const sendMutation = useMutation({
    mutationFn: () => crmService.sendLeadToLender(leadId, { lender_id: Number(selectedLender), notes: notes || undefined }),
    onSuccess: (res) => {
      const apiQueued = res.data?.data?.api_queued ?? false
      toast.success(apiQueued ? 'Lead queued for API submission' : 'Lead sent to lender')
      setShowSendForm(false); setSelectedLender(''); setNotes('')
      qc.invalidateQueries({ queryKey: ['lead-lender-history', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to send lead to lender'),
  })

  return (
    <div className="space-y-4">
      {!showSendForm ? (
        <button onClick={() => setShowSendForm(true)} className="btn-primary">
          <Send size={14} /> Send to Lender
        </button>
      ) : (
        <div className="bg-indigo-50/40 rounded-xl border border-indigo-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border-b border-indigo-100">
            <Send size={13} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Send Lead to Lender</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Lender</label>
              <select className="input w-full" value={selectedLender} onChange={e => setSelectedLender(e.target.value)}>
                <option value="">— Choose a lender —</option>
                {activeLenders.map(l => <option key={l.id} value={l.id}>{l.lender_name}</option>)}
              </select>
              {activeLenders.length === 0 && <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> No active lenders.</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes <span className="font-normal text-slate-400">(optional)</span></label>
              <textarea className="input w-full resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional context…" />
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={() => sendMutation.mutate()} disabled={!selectedLender || sendMutation.isPending} className="btn-primary disabled:opacity-50">
                {sendMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send Lead</>}
              </button>
              <button onClick={() => setShowSendForm(false)} className="btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Submission History</p>
        {histLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-indigo-400" /></div>
        ) : submissions.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-10 text-center">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-3"><Building2 size={18} className="text-slate-400" /></div>
            <p className="text-sm font-semibold text-slate-600">No submissions yet</p>
            <p className="text-xs text-slate-400 mt-1">Send this lead to a lender to start</p>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={15} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.lender_name ?? `Lender #${s.lender_id}`}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar size={9} /> {new Date(s.submitted_date ?? s.created_at ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {s.notes && <span className="text-[11px] text-slate-500 truncate max-w-[160px]">{s.notes}</span>}
                  </div>
                </div>
                {s.lender_status_id && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 flex-shrink-0">{s.lender_status_id}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Lead Summary Widget (right sidebar) ────────────────────────────────────────
function LeadSummaryWidget({ lead, statuses }: { lead: CrmLead; statuses: LeadStatus[] | undefined }) {
  const currentStatus = statuses?.find(s => s.lead_title_url === String(lead.lead_status))
  const statusColor = currentStatus?.color_code ?? currentStatus?.color ?? '#6366f1'

  const rows: { label: string; value: string | null | undefined; icon: LucideIcon }[] = [
    { label: 'Lead ID',    value: `#${lead.id}`,                         icon: Hash },
    { label: 'Type',       value: lead.lead_type ? String(lead.lead_type) : null, icon: Tag },
    { label: 'Assigned',   value: (lead.assigned_name as string | undefined), icon: UserCheck },
    { label: 'Created',    value: new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Calendar },
    { label: 'Created By', value: (lead.created_by_name as string | undefined), icon: User },
    { label: 'Updated',    value: lead.updated_at ? new Date(String(lead.updated_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null, icon: Clock },
  ]

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className="flex items-center gap-2.5 p-3 rounded-lg border" style={{ borderColor: `${statusColor}33`, background: `${statusColor}0d` }}>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
        <span className="text-sm font-semibold" style={{ color: statusColor }}>
          {currentStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      </div>

      {/* Metadata rows */}
      <div className="space-y-2">
        {rows.map(({ label, value, icon: Icon }) => {
          if (!value) return null
          return (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0">
                <Icon size={12} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide leading-none block">{label}</span>
                <span className="text-xs font-medium text-slate-700 truncate block mt-0.5">{value}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Quick Actions Widget (right sidebar) ───────────────────────────────────────
function QuickActionsWidget({
  leadId, onNavigateEdit, onScrollToActivity, onScrollToLenders,
}: {
  leadId: number
  onNavigateEdit: () => void
  onScrollToActivity: () => void
  onScrollToLenders: () => void
}) {
  const actions = [
    { label: 'Edit Lead',        icon: Pencil,      color: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-100', action: onNavigateEdit },
    { label: 'Add Note',         icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100', action: onScrollToActivity },
    { label: 'Send to Lender',   icon: Send,        color: 'text-amber-600',  bg: 'bg-amber-50 hover:bg-amber-100',   action: onScrollToLenders },
    { label: 'Download Lead',    icon: FileDown,    color: 'text-slate-600',  bg: 'bg-slate-50 hover:bg-slate-100',   action: () => toast('Export coming soon', { icon: 'ℹ️' }) },
    { label: 'External Link',    icon: ExternalLink, color: 'text-sky-600',   bg: 'bg-sky-50 hover:bg-sky-100',       action: () => toast('Portal link via Merchant Portal section', { icon: 'ℹ️' }) },
  ]

  return (
    <div className="space-y-1.5">
      {actions.map(({ label, icon: Icon, color, bg, action }) => (
        <button
          key={label}
          onClick={action}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${bg}`}
        >
          <Icon size={14} className={`${color} flex-shrink-0`} />
          <span className={color}>{label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Main Lead Detail (Single-scroll layout) ────────────────────────────────────
export function CrmLeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const leadId = Number(id)

  // Section refs for scroll-to navigation
  const activityRef = useRef<HTMLDivElement>(null)
  const lendersRef  = useRef<HTMLDivElement>(null)

  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

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
      toast.success('Status updated'); setShowStatusDropdown(false)
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  // ── Loading / Not found ───────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 size={28} className="animate-spin text-indigo-500" />
      <p className="text-sm text-slate-400">Loading lead…</p>
    </div>
  )

  if (!lead) return (
    <div className="flex items-center gap-2 text-slate-400 p-6">
      <AlertCircle size={18} className="text-red-400" />
      <span className="text-sm">Lead not found.</span>
    </div>
  )

  const fullName    = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead #${lead.id}`
  const avatarBg    = AVATAR_BG[leadId % AVATAR_BG.length]
  const leadInits   = initials(fullName)
  const location    = [lead.city, lead.state, lead.country].filter(Boolean).join(', ')
  const currentStatus = statuses?.find(s => s.lead_title_url === String(lead.lead_status))
  const statusColor   = currentStatus?.color_code ?? currentStatus?.color ?? '#6366f1'

  function scrollTo(ref: RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-slate-50/40">

      {/* ══════════════════════════════════════════════════════════════════
          STICKY HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">

        {/* Back bar */}
        <div className="flex items-center gap-3 px-5 py-2 bg-slate-50 border-b border-slate-100">
          <button
            onClick={() => navigate('/crm/leads')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Leads
          </button>
          <div className="w-px h-3.5 bg-slate-300" />
          <span className="text-xs text-slate-400">Lead #{lead.id}</span>
          {lead.lead_type && (
            <>
              <div className="w-px h-3.5 bg-slate-300" />
              <span className="text-xs font-medium text-slate-500">{String(lead.lead_type)}</span>
            </>
          )}
        </div>

        {/* Main header row */}
        <div className="flex items-center gap-4 px-5 py-3.5">

          {/* Avatar */}
          <div className={`w-10 h-10 rounded-xl ${avatarBg} flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white`}>
            <span className="text-sm font-bold text-white leading-none">{leadInits}</span>
          </div>

          {/* Name + contact info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 leading-tight">{fullName}</h1>
              {/* Status badge */}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold leading-none"
                style={{ background: `${statusColor}1a`, color: statusColor, border: `1px solid ${statusColor}44` }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                {currentStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              {/* Lead type tag */}
              {lead.lead_type && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <Tag size={9} /> {String(lead.lead_type)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                  <Mail size={11} className="text-slate-400 flex-shrink-0" /> {String(lead.email)}
                </a>
              )}
              {lead.phone_number && (
                <a href={`tel:${lead.phone_number}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                  <Phone size={11} className="text-slate-400 flex-shrink-0" /> {formatPhoneNumber(String(lead.phone_number))}
                </a>
              )}
              {location && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin size={11} className="flex-shrink-0" /> {location}
                </span>
              )}
              {lead.company_name && (
                <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
                  <Briefcase size={11} className="flex-shrink-0" /> {String(lead.company_name)}
                </span>
              )}
              {(lead.assigned_name as string | undefined) && (
                <span className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
                  <UserCheck size={11} className="flex-shrink-0" /> {lead.assigned_name as string}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Add Note */}
            <button
              onClick={() => scrollTo(activityRef)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <MessageSquare size={12} /> Add Note
            </button>

            {/* Change Status */}
            <div className="relative">
              <button
                onClick={() => { setShowStatusDropdown(s => !s); setShowMoreMenu(false) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                <Zap size={12} className="text-indigo-500" /> Status <ChevronDown size={11} />
              </button>
              {showStatusDropdown && statuses && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-20 py-1"
                  onMouseLeave={() => setShowStatusDropdown(false)}
                >
                  {statuses.map((s: LeadStatus) => (
                    <button
                      key={s.id}
                      onClick={() => updateStatus.mutate(s.lead_title_url)}
                      disabled={s.lead_title_url === String(lead.lead_status) || updateStatus.isPending}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color_code ?? s.color ?? '#94a3b8' }} />
                      {s.lead_title}
                      {s.lead_title_url === String(lead.lead_status) && (
                        <span className="ml-auto text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Current</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edit */}
            <button
              onClick={() => navigate(`/crm/leads/${leadId}/edit`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Pencil size={12} /> Edit
            </button>

            {/* More ⋮ */}
            <div className="relative">
              <button
                onClick={() => { setShowMoreMenu(s => !s); setShowStatusDropdown(false) }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <MoreVertical size={15} />
              </button>
              {showMoreMenu && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-20 py-1"
                  onMouseLeave={() => setShowMoreMenu(false)}
                >
                  <button onClick={() => { setShowMoreMenu(false); scrollTo(activityRef) }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors sm:hidden">
                    <MessageSquare size={13} /> Add Note
                  </button>
                  <button onClick={() => { setShowMoreMenu(false); scrollTo(lendersRef) }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors">
                    <Send size={13} /> Send to Lender
                  </button>
                  <button onClick={() => toast('Export coming soon', { icon: 'ℹ️' })} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors">
                    <FileDown size={13} /> Download Lead
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} /> Delete Lead
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TWO-COLUMN BODY
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row gap-6 px-5 py-6 max-w-[1600px] mx-auto">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* 1. Lead Information (Dynamic Fields) */}
          <CollapsibleSection title="Lead Information" icon={ClipboardList} defaultOpen={true}>
            <DynamicFieldForm
              register={(() => {}) as never}
              defaultValues={lead as Record<string, unknown>}
              readOnly
            />
            {/* Record metadata footer */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Record Info</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-x-5 gap-y-3.5">
                {[
                  { label: 'Lead ID',      value: `#${lead.id}` },
                  { label: 'Created',      value: new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                  { label: 'Created By',   value: (lead.created_by_name as string | undefined) },
                  { label: 'Last Updated', value: lead.updated_at ? new Date(String(lead.updated_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null },
                  { label: 'Updated By',   value: (lead.updated_by_name as string | undefined) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-1">{label}</p>
                    {value ? <p className="text-sm font-medium text-slate-800 leading-snug">{String(value)}</p> : <p className="text-sm text-slate-300">—</p>}
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          {/* 2. Activity Timeline */}
          <div ref={activityRef}>
            <CollapsibleSection
              title="Activity & Notes"
              icon={Clock}
              defaultOpen={true}
              headerRight={
                <button
                  onClick={() => scrollTo(activityRef)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={12} /> Add Note
                </button>
              }
            >
              <ActivityTimeline leadId={leadId} />
            </CollapsibleSection>
          </div>

          {/* 3. Documents */}
          <CollapsibleSection title="Documents" icon={FolderOpen} defaultOpen={false}>
            <DocumentsPanel leadId={leadId} />
          </CollapsibleSection>

        </div>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────────────── */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4 lg:sticky lg:top-[108px] lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pb-4">

          {/* Quick Actions */}
          <SidebarCard title="Quick Actions" icon={Zap} iconColor="text-amber-600" iconBg="bg-amber-50">
            <QuickActionsWidget
              leadId={leadId}
              onNavigateEdit={() => navigate(`/crm/leads/${leadId}/edit`)}
              onScrollToActivity={() => scrollTo(activityRef)}
              onScrollToLenders={() => scrollTo(lendersRef)}
            />
          </SidebarCard>

          {/* Lender Submissions */}
          <div ref={lendersRef}>
            <SidebarCard title="Lender Submissions" icon={Building2} iconColor="text-amber-600" iconBg="bg-amber-50">
              <LendersPanel leadId={leadId} />
            </SidebarCard>
          </div>

          {/* Approvals */}
          <SidebarCard title="Approvals" icon={CheckSquare} iconColor="text-emerald-600" iconBg="bg-emerald-50">
            <ApprovalsSection leadId={leadId} />
          </SidebarCard>

          {/* Merchant Portal */}
          <SidebarCard title="Merchant Portal" icon={ExternalLink} iconColor="text-sky-600" iconBg="bg-sky-50">
            <MerchantPortalSection leadId={leadId} />
          </SidebarCard>

        </div>
      </div>
    </div>
  )
}
