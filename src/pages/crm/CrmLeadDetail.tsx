import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Pencil, Loader2, ChevronDown, Upload, FileText,
  Trash2, Download, Building2, Send, AlertCircle, X, Eye,
  Settings2, Mail, Phone, MapPin, Calendar, User, Briefcase,
  Hash, UserCheck, Clock, FolderOpen,
  ClipboardList, CheckSquare, MoreVertical, Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { LeadStatusBadge } from '../../components/crm/LeadStatusBadge'
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
const TABS = [
  { key: 'Overview',   icon: ClipboardList },
  { key: 'Activity',   icon: Clock },
  { key: 'Documents',  icon: FolderOpen },
  { key: 'Lenders',    icon: Building2 },
  { key: 'Approvals',  icon: CheckSquare },
] as const
type Tab = typeof TABS[number]['key']

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
            onClick={handleDownload}
            disabled={downloading}
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

// ── Documents Tab ──────────────────────────────────────────────────────────────
function DocumentsTab({ leadId }: { leadId: number }) {
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Array.from(e.target.files ?? []); e.target.value = ''
    if (!raw.length) return
    const { valid, errors } = validateFiles([...selectedFiles, ...raw])
    setValidationErrors(errors); setSelectedFiles(valid)
  }

  const canUpload = !!selectedTypeId && selectedFiles.length > 0

  return (
    <div className="space-y-5">

      {/* Upload panel */}
      <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">Upload Documents</p>
          <button onClick={() => setShowTypeManager(true)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white border border-slate-200 bg-white">
            <Settings2 size={12} /> Manage Types
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={selectedTypeId}
            onChange={e => { setSelectedTypeId(e.target.value); setSubValue('') }}
            className="input text-sm flex-1 min-w-[160px]"
          >
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
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!selectedTypeId || uploadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-indigo-300 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-all disabled:opacity-40"
          >
            <Upload size={15} /> Choose Files
          </button>

          {computedDocType && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Tag size={12} />
              <span className="text-xs font-semibold">{computedDocType}</span>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <button
              onClick={() => uploadMutation.mutate(selectedFiles)}
              disabled={!canUpload || uploadMutation.isPending}
              className="btn-primary ml-auto disabled:opacity-50"
            >
              {uploadMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}</>}
            </button>
          )}

          <input ref={fileRef} type="file" multiple accept={ALLOWED_EXT} className="hidden" onChange={handleFileChange} />
        </div>

        <p className="text-[11px] text-slate-400 mt-3">
          PDF, DOC, DOCX, XLS, XLSX, JPG, PNG · max {MAX_FILE_MB} MB per file · up to {MAX_FILES} files
        </p>

        {validationErrors.length > 0 && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3 space-y-1">
            {validationErrors.map((err, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" /> {err}
              </p>
            ))}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {selectedFiles.map((f, i) => {
              const ic = getFileIcon(f.name)
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ic.bg}`}>
                    <FileText size={13} className={ic.color} />
                  </div>
                  <span className="flex-1 text-xs font-medium text-slate-700 truncate">{f.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
                  <button onClick={() => { setSelectedFiles(p => p.filter((_, j) => j !== i)); setValidationErrors([]) }} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-indigo-400" /></div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <FolderOpen size={24} className="text-slate-400" />
          </div>
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
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ic.bg}`}>
                  <FileText size={16} className={ic.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600">
                      <Tag size={8} /> {doc.document_type}
                    </span>
                    {doc.file_size ? <span className="text-[11px] text-slate-400">{formatBytes(Number(doc.file_size))}</span> : null}
                    <span className="text-[11px] text-slate-400">{new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {doc.uploaded_by_name && <span className="text-[11px] text-slate-400">by {doc.uploaded_by_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setViewDoc(doc)} disabled={!doc.file_path} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Preview">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => doc.file_path && downloadFile(doc.file_path, doc.file_name)} disabled={!doc.file_path} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Download">
                    <Download size={14} />
                  </button>
                  <button onClick={async () => { if (await confirmDelete()) deleteMutation.mutate(doc.id) }} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
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

// ── Lenders Tab ────────────────────────────────────────────────────────────────
function LendersTab({ leadId }: { leadId: number }) {
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

  const lenders = lendersData ?? []
  const activeLenders = lenders.filter(l => Number(l.status) === 1)
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
    <div className="space-y-5">
      {!showSendForm ? (
        <button onClick={() => setShowSendForm(true)} className="btn-primary">
          <Send size={14} /> Send to Lender
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 bg-indigo-50 border-b border-indigo-100">
            <Send size={14} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Send Lead to Lender</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Lender</label>
              <select className="input w-full" value={selectedLender} onChange={e => setSelectedLender(e.target.value)}>
                <option value="">— Choose a lender —</option>
                {activeLenders.map(l => <option key={l.id} value={l.id}>{l.lender_name}</option>)}
              </select>
              {activeLenders.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> No active lenders found. Add lenders first.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes <span className="font-normal text-slate-400">(optional)</span></label>
              <textarea className="input w-full resize-none" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional context for the lender..." />
            </div>
            <div className="flex items-center gap-3 pt-1">
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
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-indigo-400" /></div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Building2 size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No submissions yet</p>
            <p className="text-xs text-slate-400 mt-1">Send this lead to a lender to start the process</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {submissions.map(s => (
              <div key={s.id} className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{s.lender_name ?? `Lender #${s.lender_id}`}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={10} /> {new Date(s.submitted_date ?? s.created_at ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {s.notes && <span className="text-xs text-slate-500 truncate max-w-xs">{s.notes}</span>}
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

// ── Main Lead Detail ───────────────────────────────────────────────────────────
export function CrmLeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const leadId = Number(id)

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

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 size={28} className="animate-spin text-indigo-500" />
      <p className="text-sm text-slate-400">Loading lead details…</p>
    </div>
  )

  if (!lead) return (
    <div className="flex items-center gap-2 text-slate-400 p-6">
      <AlertCircle size={18} className="text-red-400" />
      <span className="text-sm">Lead not found.</span>
    </div>
  )

  const fullName  = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead #${lead.id}`
  const avatarBg  = AVATAR_BG[leadId % AVATAR_BG.length]
  const leadInits = initials(fullName)

  // Location string
  const location = [lead.city, lead.state, lead.country].filter(Boolean).join(', ')

  return (
    <div className="space-y-0">

      {/* ── Hero Banner ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl overflow-hidden mb-4 shadow-md">

        {/* ── Main content row ── */}
        <div className="flex items-center gap-4 px-5 py-4">

          {/* Avatar */}
          <div className={`w-11 h-11 rounded-xl ${avatarBg} flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white/25`}>
            <span className="text-sm font-bold text-white leading-none">{leadInits}</span>
          </div>

          {/* Info block — Name row + Contact row */}
          <div className="flex-1 min-w-0">

            {/* Row 1: Name + Status badge + Company */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-white leading-tight">{fullName}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/90 text-gray-800 leading-none">
                {String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              {lead.company_name && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-100">
                  <Briefcase size={11} className="flex-shrink-0" />
                  {String(lead.company_name)}
                </span>
              )}
            </div>

            {/* Row 2: Email · Phone · Location */}
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-1.5 text-xs text-indigo-100 hover:text-white transition-colors"
                >
                  <Mail size={11} className="text-indigo-300 flex-shrink-0" />
                  {String(lead.email)}
                </a>
              )}
              {lead.phone_number && (
                <a
                  href={`tel:${lead.phone_number}`}
                  className="flex items-center gap-1.5 text-xs text-indigo-100 hover:text-white transition-colors"
                >
                  <Phone size={11} className="text-indigo-300 flex-shrink-0" />
                  {formatPhoneNumber(String(lead.phone_number))}
                </a>
              )}
              {location && (
                <span className="hidden md:flex items-center gap-1.5 text-xs text-indigo-200">
                  <MapPin size={11} className="text-indigo-300 flex-shrink-0" />
                  {location}
                </span>
              )}
            </div>
          </div>

          {/* Actions — pinned right, all vertically centered */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Change Status */}
            <div className="relative">
              <button
                onClick={() => { setShowStatusDropdown(s => !s); setShowMoreMenu(false) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-colors"
              >
                Change Status <ChevronDown size={12} />
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <Pencil size={12} /> Edit
            </button>

            {/* More ⋮ */}
            <div className="relative">
              <button
                onClick={() => { setShowMoreMenu(s => !s); setShowStatusDropdown(false) }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <MoreVertical size={15} />
              </button>
              {showMoreMenu && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-20 py-1"
                  onMouseLeave={() => setShowMoreMenu(false)}
                >
                  <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors">
                    <Send size={13} /> Send to Lender
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} /> Delete Lead
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Meta strip: back + info pills ── */}
        <div className="flex items-center gap-2 px-5 py-2 bg-black/10 flex-wrap">

          {/* Back link */}
          <button
            onClick={() => navigate('/crm/leads')}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-200 hover:text-white transition-colors mr-1"
          >
            <ArrowLeft size={11} /> Back
          </button>

          <div className="w-px h-3.5 bg-white/20 flex-shrink-0" />

          {/* Info pills */}
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-medium text-white">
            <Hash size={9} className="text-indigo-300" /> {lead.id}
          </span>
          {lead.lead_type && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-medium text-white">
              <Tag size={9} className="text-indigo-300" /> {String(lead.lead_type)}
            </span>
          )}
          {(lead.assigned_name as string | undefined) && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-medium text-white">
              <UserCheck size={9} className="text-indigo-300" /> {lead.assigned_name as string}
            </span>
          )}
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-medium text-white">
            <Calendar size={9} className="text-indigo-300" />
            {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          {(lead.created_by_name as string | undefined) && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-medium text-white">
              <User size={9} className="text-indigo-300" /> {lead.created_by_name as string}
            </span>
          )}
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-4 shadow-sm">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center ${
              activeTab === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Icon size={13} /> {key}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <div className="space-y-4">

          {/* ── All Lead Fields — driven by lead-fields configuration ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Dynamic fields (column + EAV) in read-only mode */}
            <div className="px-5 py-4">
              <DynamicFieldForm
                register={(() => {}) as never}
                defaultValues={lead as Record<string, unknown>}
                readOnly
              />
            </div>

            <div className="h-px bg-slate-100 mx-5" />

            {/* Record metadata */}
            <div className="px-5 pt-4 pb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Record Info</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-x-5 gap-y-3.5">
                {[
                  { label: 'Lead ID',      value: `#${lead.id}` },
                  { label: 'Status',       value: String(lead.lead_status).replace(/_/g, ' ') },
                  { label: 'Created',      value: new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                  { label: 'Created By',   value: (lead.created_by_name as string | undefined) },
                  { label: 'Last Updated', value: lead.updated_at ? new Date(String(lead.updated_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null },
                  { label: 'Updated By',   value: (lead.updated_by_name as string | undefined) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-1">{label}</p>
                    {value
                      ? <p className="text-sm font-medium text-slate-800 leading-snug">{String(value)}</p>
                      : <p className="text-sm text-slate-300">—</p>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Merchant Portal ── */}
          <MerchantPortalSection leadId={leadId} />
        </div>
      )}

      {/* ── Activity Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'Activity' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <Clock size={14} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Activity Timeline</h3>
          </div>
          <div className="p-5">
            <ActivityTimeline leadId={leadId} />
          </div>
        </div>
      )}

      {/* ── Documents Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'Documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <FolderOpen size={14} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-700">Documents</h3>
            </div>
          </div>
          <div className="p-5">
            <DocumentsTab leadId={leadId} />
          </div>
        </div>
      )}

      {/* ── Lenders Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'Lenders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <Building2 size={14} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Lender Communications</h3>
          </div>
          <div className="p-5">
            <LendersTab leadId={leadId} />
          </div>
        </div>
      )}

      {/* ── Approvals Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'Approvals' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <CheckSquare size={14} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Approvals</h3>
          </div>
          <div className="p-5">
            <ApprovalsSection leadId={leadId} />
          </div>
        </div>
      )}

    </div>
  )
}
