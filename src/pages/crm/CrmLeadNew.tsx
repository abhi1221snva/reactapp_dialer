/**
 * CrmLeadNew.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * NEW CRM Lead Detail page — Dialer Studio–inspired layout
 * Route: /crm/leads-new/:id
 *
 * Architecture constraints:
 *   • Does NOT modify CrmLeadDetail.tsx or any other existing file
 *   • Reuses same backend API endpoints (via crmService / leadService)
 *   • Imports existing sub-components (ActivityTimeline, DealTab, etc.)
 *   • All new UI is isolated in this file
 */

import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft, Loader2, X, AlertCircle, Phone, Mail, Briefcase,
  User, Users, Clock, DollarSign, FileText, FolderOpen, Building2,
  TrendingUp, ShieldCheck, CheckCircle, Send, FileBarChart,
  Pencil, Trash2, Download, Copy, ExternalLink, Upload, Search,
  ChevronDown, Hash, MessageSquare, Activity, MoreVertical,
  Tag, Calendar, Check, Eye,
  SlidersHorizontal, PanelRightClose, PanelRightOpen,
  Zap, MapPin, Globe, ArrowUpRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import toast from 'react-hot-toast'

import { leadService }         from '../../services/lead.service'
import { crmService }          from '../../services/crm.service'
import { bankStatementService } from '../../services/bankStatement.service'
import { ActivityTimeline }    from '../../components/crm/ActivityTimeline'
import { OffersStipsTab }      from '../../components/crm/OffersStipsTab'
import { DealTab }             from '../../components/crm/DealTab'
import { ComplianceTab }       from '../../components/crm/ComplianceTab'
import { BankStatementTab }    from '../../components/crm/BankStatementTab'
import { DripLeadPanel }       from '../../components/crm/DripLeadPanel'
import { ApprovalsSection }    from '../../components/crm/ApprovalsSection'
import { DynamicFieldForm }    from '../../components/crm/DynamicFieldForm'
import { confirmDelete }        from '../../utils/confirmDelete'
import { formatPhoneNumber }   from '../../utils/format'
import type {
  CrmLead, LeadStatus, CrmDocument, CrmLabel,
} from '../../types/crm.types'

// ─────────────────────────────────────────────────────────────────────────────
// Tab system
// ─────────────────────────────────────────────────────────────────────────────
type NewTabId =
  | 'overview'
  | 'documents'
  | 'activity'
  | 'lenders'
  | 'offers'
  | 'deal'
  | 'compliance'
  | 'approvals'
  | 'bank-statements'
  | 'drip'

interface TabDef { id: NewTabId; label: string; icon: LucideIcon }

const TABS: TabDef[] = [
  { id: 'overview',        label: 'Overview',        icon: Hash          },
  { id: 'documents',       label: 'Documents',       icon: FolderOpen    },
  { id: 'activity',        label: 'Activity',        icon: Activity      },
  { id: 'lenders',         label: 'Lenders',         icon: Building2     },
  { id: 'offers',          label: 'Offers & Stips',  icon: DollarSign    },
  { id: 'deal',            label: 'Deal',            icon: TrendingUp    },
  { id: 'compliance',      label: 'Compliance',      icon: ShieldCheck   },
  { id: 'approvals',       label: 'Approvals',       icon: CheckCircle   },
  { id: 'bank-statements', label: 'Bank Statements', icon: FileBarChart  },
  { id: 'drip',            label: 'Drip',            icon: Send          },
]

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens / helpers
// ─────────────────────────────────────────────────────────────────────────────
const AVATAR_PALETTE = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-slate-500 to-slate-700',
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function formatBytes(b: number): string {
  if (b < 1024) return b + ' B'
  if (b < 1_048_576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1_048_576).toFixed(1) + ' MB'
}

function getFileExt(p: string | null | undefined) {
  if (!p) return 'other'
  const e = (p.split('.').pop() ?? '').toLowerCase()
  if (e === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e)) return 'image'
  return 'other'
}

function daysBetween(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />
}

function PageSkeleton() {
  return (
    <div className="flex flex-col h-full" style={{ background: '#0f172a' }}>
      {/* Header skeleton */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/5 flex items-center gap-4">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="flex flex-1 overflow-hidden" style={{ background: '#f8fafc' }}>
        {/* Left */}
        <div className="w-[280px] flex-shrink-0 bg-white border-r border-slate-100 p-4 space-y-4">
          {[80, 100, 60, 120, 80].map((h, i) => (
            <div key={i} className={`animate-pulse bg-slate-100 rounded-xl`} style={{ height: h }} />
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-6 space-y-4">
          <div className="animate-pulse bg-white rounded-2xl h-12 border border-slate-100" />
          {[200, 160, 120].map((h, i) => (
            <div key={i} className={`animate-pulse bg-white rounded-2xl border border-slate-100`} style={{ height: h }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Document viewer modal (isolated — no external deps)
// ─────────────────────────────────────────────────────────────────────────────
function DocViewer({ doc, leadId, onClose }: { doc: CrmDocument; leadId: number; onClose: () => void }) {
  const [blobUrl, setBlobUrl]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [downloading, setDl]    = useState(false)
  const ext = getFileExt(doc.file_path)

  useEffect(() => {
    if (ext === 'other') { setLoading(false); return }
    let url: string | null = null
    crmService.viewLeadDocument(leadId, doc.id)
      .then(r => { url = URL.createObjectURL(r.data as Blob); setBlobUrl(url) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [doc.id, leadId, ext]) // eslint-disable-line

  async function download() {
    setDl(true)
    try {
      const r   = await crmService.downloadLeadDocument(leadId, doc.id)
      const url = URL.createObjectURL(r.data as Blob)
      const a   = Object.assign(document.createElement('a'), { href: url, download: doc.file_name })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { toast.error('Download failed') }
    setDl(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={16} className="text-indigo-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{doc.file_name}</p>
            <p className="text-[11px] text-slate-400">{doc.document_type ?? 'Document'} • {doc.file_size ? formatBytes(Number(doc.file_size)) : '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <button
            onClick={download}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X size={17} />
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
        {loading && <Loader2 size={28} className="animate-spin text-white/50" />}
        {!loading && error && (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle size={32} className="text-slate-400" />
            <p className="text-slate-300 text-sm">Preview unavailable</p>
            <button onClick={download} disabled={downloading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download to view
            </button>
          </div>
        )}
        {!loading && !error && blobUrl && ext === 'pdf' && (
          <iframe src={blobUrl} className="w-full h-full rounded-xl" style={{ border: 'none' }} />
        )}
        {!loading && !error && blobUrl && ext === 'image' && (
          <img src={blobUrl} alt={doc.file_name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        )}
        {!loading && !error && ext === 'other' && (
          <div className="flex flex-col items-center gap-4">
            <FileText size={48} className="text-slate-400" />
            <p className="text-slate-300">No preview for this file type.</p>
            <button onClick={download} disabled={downloading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents Tab
// ─────────────────────────────────────────────────────────────────────────────
function DocumentsTab({ leadId }: { leadId: number }) {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [viewDoc, setViewDoc]     = useState<CrmDocument | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      const r = await crmService.getLeadDocuments(leadId)
      return (r.data?.data ?? r.data ?? []) as CrmDocument[]
    },
    staleTime: 60_000,
  })

  const deleteMut = useMutation({
    mutationFn: (docId: number) => crmService.deleteLeadDocument(leadId, docId),
    onSuccess: () => {
      toast.success('Document deleted')
      qc.invalidateQueries({ queryKey: ['lead-documents', leadId] })
    },
    onError: () => toast.error('Delete failed'),
  })

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setUploadPct(0)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append('files[]', f))
      await crmService.uploadLeadDocuments(
        leadId,
        fd,
        ({ loaded, total }) => setUploadPct(total ? Math.round((loaded / total) * 100) : 0),
      )
      toast.success(`${files.length} file(s) uploaded`)
      qc.invalidateQueries({ queryKey: ['lead-documents', leadId] })
    } catch { toast.error('Upload failed') }
    setUploading(false)
    setUploadPct(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const filtered = docs.filter(d =>
    !search || d.file_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.document_type?.toLowerCase().includes(search.toLowerCase())
  )

  const FILE_ICONS: Record<string, { bg: string; text: string; label: string }> = {
    pdf:   { bg: 'bg-red-50',     text: 'text-red-500',   label: 'PDF' },
    image: { bg: 'bg-sky-50',     text: 'text-sky-500',   label: 'IMG' },
    other: { bg: 'bg-slate-50',   text: 'text-slate-500', label: 'FILE' },
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-sm hover:shadow-indigo-200 hover:shadow-md"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? `Uploading ${uploadPct}%` : 'Upload'}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-100 h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <FolderOpen size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {search ? 'No documents match your search' : 'No documents yet'}
          </p>
          {!search && (
            <p className="text-xs text-slate-400 mt-1">Upload files using the button above</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(doc => {
            const ft = getFileExt(doc.file_path)
            const fc = FILE_ICONS[ft]
            return (
              <div
                key={doc.id}
                className="group bg-white rounded-2xl border border-slate-100 p-4 hover:border-indigo-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${fc.bg}`}>
                    <FileText size={18} className={fc.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {doc.document_type && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-wide">
                          {doc.document_type}
                        </span>
                      )}
                      {doc.file_size && (
                        <span className="text-[11px] text-slate-400">{formatBytes(Number(doc.file_size))}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {doc.created_at
                        ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => setViewDoc(doc)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const r   = await crmService.downloadLeadDocument(leadId, doc.id)
                        const url = URL.createObjectURL(r.data as Blob)
                        const a   = Object.assign(document.createElement('a'), { href: url, download: doc.file_name })
                        document.body.appendChild(a); a.click(); document.body.removeChild(a)
                        setTimeout(() => URL.revokeObjectURL(url), 1000)
                      } catch { toast.error('Download failed') }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Download size={12} /> Save
                  </button>
                  <button
                    onClick={async () => {
                      if (!await confirmDelete(doc.file_name)) return
                      deleteMut.mutate(doc.id)
                    }}
                    className="flex items-center justify-center p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewDoc && <DocViewer doc={viewDoc} leadId={leadId} onClose={() => setViewDoc(null)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Lenders Tab — submission history + quick view
// ─────────────────────────────────────────────────────────────────────────────
function LendersTab({ leadId }: { leadId: number }) {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      const r = await crmService.getLenderSubmissions(leadId)
      return (r.data?.data ?? r.data ?? []) as {
        id: number; lender_name?: string; submission_status?: string
        response_status?: string; submitted_at?: string; email_status?: string
      }[]
    },
    staleTime: 60_000,
  })

  const navigate = useNavigate()

  const STATUS_PILL: Record<string, { bg: string; text: string; dot: string }> = {
    submitted:    { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: '#0ea5e9' },
    approved:     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: '#10b981' },
    declined:     { bg: 'bg-red-50',     text: 'text-red-700',     dot: '#ef4444' },
    no_response:  { bg: 'bg-slate-50',   text: 'text-slate-500',   dot: '#94a3b8' },
    viewed:       { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: '#8b5cf6' },
    sent:         { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: '#6366f1' },
    failed:       { bg: 'bg-red-50',     text: 'text-red-700',     dot: '#ef4444' },
  }

  function pill(status?: string) {
    if (!status) return null
    const s = status.toLowerCase()
    const cfg = STATUS_PILL[s] ?? { bg: 'bg-slate-50', text: 'text-slate-500', dot: '#94a3b8' }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
        {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </span>
    )
  }

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="animate-pulse bg-white rounded-2xl h-16 border border-slate-100" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
          {submissions.length} Submission{submissions.length !== 1 ? 's' : ''}
          {submissions.filter(s => s.response_status === 'approved').length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              {submissions.filter(s => s.response_status === 'approved').length} Approved
            </span>
          )}
        </p>
        <button
          onClick={() => navigate(`/crm/leads/${leadId}`, { state: { tab: 'lenders' } })}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <ArrowUpRight size={13} /> Full Lender View
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Building2 size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">No submissions yet</p>
          <p className="text-xs text-slate-400 mt-1">Submissions will appear here after sending applications</p>
          <button
            onClick={() => navigate(`/crm/leads/${leadId}`, { state: { tab: 'lenders' } })}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <Building2 size={14} /> Open Lenders Panel
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3">Lender</th>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Response</th>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Email</th>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, i) => (
                <tr key={sub.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i === submissions.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{sub.lender_name ?? `Lender #${sub.id}`}</td>
                  <td className="px-4 py-3.5">{pill(sub.submission_status) ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3.5">{pill(sub.response_status) ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3.5">{pill(sub.email_status) ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {sub.submitted_at
                      ? new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview Tab — lead fields, inline edit
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({
  lead, leadId, leadFields, onUpdated,
}: {
  lead: CrmLead
  leadId: number
  leadFields: CrmLabel[]
  onUpdated: () => void
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty } } = useForm<Record<string, unknown>>({
    defaultValues: lead as Record<string, unknown>,
  })

  useEffect(() => {
    reset(lead as Record<string, unknown>)
  }, [lead, reset])

  const saveMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => leadService.update(leadId, data),
    onSuccess: () => {
      toast.success('Lead updated')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
      onUpdated()
    },
    onError: () => toast.error('Update failed'),
  })

  const SYSTEM_FIELDS = [
    { key: 'first_name',    label: 'First Name',   icon: User      },
    { key: 'last_name',     label: 'Last Name',    icon: User      },
    { key: 'email',         label: 'Email',        icon: Mail      },
    { key: 'phone_number',  label: 'Phone',        icon: Phone     },
    { key: 'company_name',  label: 'Company',      icon: Briefcase },
    { key: 'lead_type',     label: 'Lead Type',    icon: Tag       },
    { key: 'city',          label: 'City',         icon: MapPin    },
    { key: 'state',         label: 'State',        icon: Globe     },
    { key: 'address',       label: 'Address',      icon: MapPin    },
    { key: 'dob',           label: 'Date of Birth', icon: Calendar },
  ]

  const leadRecord = lead as Record<string, unknown>

  return (
    <div className="space-y-5">
      {/* System fields card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <User size={13} className="text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-slate-800">Contact & Business</span>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Pencil size={12} /> Edit Fields
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditing(false); reset(lead as Record<string, unknown>) }}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={12} /> Cancel
              </button>
              <button
                onClick={handleSubmit(data => saveMut.mutate(data))}
                disabled={saveMut.isPending || !isDirty}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
              >
                {saveMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save
              </button>
            </div>
          )}
        </div>
        <div className="p-5">
          {!editing ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {SYSTEM_FIELDS.map(f => {
                const val = leadRecord[f.key]
                if (!val) return null
                const Icon = f.icon
                return (
                  <div key={f.key} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={13} className="text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{f.label}</p>
                      <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">
                        {f.key === 'phone_number' ? formatPhoneNumber(String(val)) : String(val)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {SYSTEM_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1">{f.label}</label>
                  <input
                    {...register(f.key)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-slate-800 bg-white"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic EAV fields */}
      {leadFields.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/40">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <SlidersHorizontal size={13} className="text-violet-600" />
            </div>
            <span className="text-sm font-semibold text-slate-800">Custom Fields</span>
          </div>
          <div className="p-5">
            <DynamicFieldForm
              register={register}
              setValue={setValue}
              defaultValues={lead as Record<string, unknown>}
              errors={errors}
              labels={leadFields}
              formValues={watch() as Record<string, unknown>}
              readOnly={!editing}
              columns={2}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Status change modal
// ─────────────────────────────────────────────────────────────────────────────
function StatusModal({
  statuses, current, onSelect, onClose,
}: {
  statuses: LeadStatus[]
  current: string
  onSelect: (s: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="font-bold text-slate-800">Change Status</span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-3">
          {statuses.map(s => {
            const isActive = s.lead_title_url === current
            const color = s.color_code ?? s.color ?? '#6366f1'
            return (
              <button
                key={s.id}
                onClick={() => { if (!isActive) onSelect(s.lead_title_url); onClose() }}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors text-left',
                  isActive ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50',
                ].join(' ')}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className={`font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {s.lead_title}
                </span>
                {isActive && <Check size={14} className="ml-auto text-indigo-600" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export function CrmLeadNew() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const leadId    = Number(id)

  const [activeTab,       setActiveTab]       = useState<NewTabId>('overview')
  const [rightOpen,       setRightOpen]       = useState(true)
  const [showStatus,      setShowStatus]      = useState(false)
  const [showMoreMenu,    setShowMoreMenu]    = useState(false)
  const tabContentRef     = useRef<HTMLDivElement>(null)

  // ── Data queries ──────────────────────────────────────────────────────────
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
    staleTime: 5 * 60 * 1000,
  })

  const { data: leadFields = [] } = useQuery({
    queryKey: ['crm-lead-fields'],
    queryFn: async () => {
      const r = await crmService.getLeadFields()
      return (r.data?.data ?? r.data ?? []) as CrmLabel[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: docs = [] } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      const r = await crmService.getLeadDocuments(leadId)
      return (r.data?.data ?? r.data ?? []) as CrmDocument[]
    },
    staleTime: 60_000,
    enabled: !!leadId,
  })

  const { data: submissions = [] } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      const r = await crmService.getLenderSubmissions(leadId)
      return (r.data?.data ?? r.data ?? []) as { id: number; response_status?: string }[]
    },
    staleTime: 60_000,
    enabled: !!leadId,
  })

  const { data: merchantPortal } = useQuery({
    queryKey: ['merchant-portal', leadId],
    queryFn: async () => {
      try { return (await crmService.getMerchantPortal(leadId)).data?.data ?? null }
      catch { return null }
    },
    retry: false, staleTime: 60_000, enabled: !!leadId,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: (status: string) => leadService.update(leadId, { lead_status: status }),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const genPortalMut = useMutation({
    mutationFn: () => crmService.generateMerchantPortal(leadId),
    onSuccess: () => {
      toast.success('Portal link generated')
      qc.invalidateQueries({ queryKey: ['merchant-portal', leadId] })
    },
    onError: () => toast.error('Failed to generate portal'),
  })

  // ── Click-outside more menu ───────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (showMoreMenu && !(e.target as HTMLElement).closest('[data-more-menu]')) setShowMoreMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showMoreMenu])

  // ── Tab switch (scroll to top of content) ────────────────────────────────
  function switchTab(tab: NewTabId) {
    setActiveTab(tab)
    tabContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Delete lead ───────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!await confirmDelete(fullName)) return
    try {
      await leadService.delete(leadId)
      toast.success('Lead deleted')
      navigate('/crm/leads')
    } catch { toast.error('Failed to delete lead') }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="-mx-5 -mt-5" style={{ height: 'calc(100vh - 0px)' }}>
      <PageSkeleton />
    </div>
  )

  if (!lead) return (
    <div className="flex items-center gap-2.5 p-8 text-slate-400">
      <AlertCircle size={18} className="text-red-400" /> <span className="text-sm">Lead not found.</span>
    </div>
  )

  // ── Derived values ────────────────────────────────────────────────────────
  const leadRecord    = lead as Record<string, unknown>
  const fullName      = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead #${lead.id}`
  const avatarGrad    = AVATAR_PALETTE[leadId % AVATAR_PALETTE.length]
  const leadInits     = initials(fullName)
  const currentStatus = statuses.find((s: LeadStatus) => s.lead_title_url === String(lead.lead_status))
  const statusColor   = currentStatus?.color_code ?? currentStatus?.color ?? '#6366f1'
  const daysInPipe    = daysBetween(lead.created_at)
  const loanAmount    = leadRecord['loan_amount'] as string | number | undefined
  const loanFmt       = loanAmount
    ? `$${Number(String(loanAmount).replace(/[^0-9.]/g, '')).toLocaleString()}`
    : null
  const approvedCount = submissions.filter(s => s.response_status === 'approved').length

  // Pipeline helper
  const displayedStatuses = statuses.slice(0, 8)
  const currentStIdx = displayedStatuses.findIndex((s: LeadStatus) => s.lead_title_url === String(lead.lead_status))

  // Tab badge counts
  const TAB_BADGES: Partial<Record<NewTabId, number>> = {
    documents: docs.length,
    lenders:   submissions.length,
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="-mx-5 -mt-5 flex flex-col"
      style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', WebkitFontSmoothing: 'antialiased' }}
    >
      {/* ═══════════════════════════════════════════════════════════════════
          STICKY DARK HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <header
        className="flex-shrink-0 z-20"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center gap-4 px-5 py-3.5">
          {/* Back */}
          <button
            onClick={() => navigate('/crm/leads')}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            title="Back to Leads"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Avatar */}
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <span className="text-[14px] font-bold text-white tracking-wide">{leadInits}</span>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[17px] font-bold text-white leading-tight tracking-tight truncate max-w-[300px]">
                {fullName}
              </h1>
              {/* Status badge — clickable */}
              <button
                onClick={() => setShowStatus(true)}
                className="inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all hover:scale-105"
                style={{
                  background: `${statusColor}22`,
                  color: statusColor,
                  border: `1px solid ${statusColor}40`,
                }}
              >
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: statusColor }} />
                {currentStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                <ChevronDown size={10} className="opacity-60" />
              </button>
            </div>

            {/* Contact chips */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {lead.company_name && (
                <span className="flex items-center gap-1 text-[12px] text-white/50">
                  <Briefcase size={11} className="text-white/30" />{String(lead.company_name)}
                </span>
              )}
              {lead.phone_number && (
                <a href={`tel:${lead.phone_number}`} className="flex items-center gap-1 text-[12px] text-white/50 hover:text-indigo-300 transition-colors">
                  <Phone size={11} className="text-indigo-400/60" />{formatPhoneNumber(String(lead.phone_number))}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-[12px] text-white/50 hover:text-sky-300 transition-colors truncate max-w-[200px]">
                  <Mail size={11} className="text-sky-400/60" />{String(lead.email)}
                </a>
              )}
              <span className="flex items-center gap-1 text-[12px] text-white/30">
                <Clock size={11} />{daysInPipe}d in pipeline
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Email */}
            <button
              onClick={() => navigate(`/crm/leads/${leadId}`, { state: { openModal: 'email' } })}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.25)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.15)' }}
            >
              <Mail size={13} /> <span className="hidden sm:inline">Email</span>
            </button>

            {/* SMS */}
            <button
              onClick={() => navigate(`/crm/leads/${leadId}`, { state: { openModal: 'sms' } })}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.25)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.15)' }}
            >
              <MessageSquare size={13} /> <span className="hidden sm:inline">SMS</span>
            </button>

            {/* Edit */}
            <button
              onClick={() => navigate(`/crm/leads/${leadId}/edit`)}
              className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-lg text-[12px] font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-900/40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: '1px solid rgba(99,102,241,0.4)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
            </button>

            {/* Merchant link */}
            <button
              onClick={() => merchantPortal?.url
                ? navigator.clipboard.writeText(merchantPortal.url).then(() => toast.success('Merchant link copied!'))
                : genPortalMut.mutate()
              }
              disabled={genPortalMut.isPending}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.25)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.15)' }}
              title={merchantPortal?.url ? 'Copy merchant portal link' : 'Generate merchant portal link'}
            >
              {genPortalMut.isPending ? <Loader2 size={13} className="animate-spin" /> : merchantPortal?.url ? <Copy size={13} /> : <ExternalLink size={13} />}
              <span className="hidden md:inline">{merchantPortal?.url ? 'Copy Link' : 'Portal'}</span>
            </button>

            {/* More menu */}
            <div className="relative" data-more-menu>
              <button
                onClick={() => setShowMoreMenu(v => !v)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <MoreVertical size={16} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                  <button
                    onClick={() => { navigate(`/crm/leads/${leadId}`); setShowMoreMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowUpRight size={14} className="text-slate-400" /> Classic View
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => { handleDelete(); setShowMoreMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Delete Lead
                  </button>
                </div>
              )}
            </div>

            {/* Right panel toggle */}
            <button
              onClick={() => setRightOpen(v => !v)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
              title={rightOpen ? 'Hide activity panel' : 'Show activity panel'}
            >
              {rightOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </button>
          </div>
        </div>

        {/* Pipeline mini-bar */}
        {displayedStatuses.length > 0 && (
          <div className="px-5 pb-2.5 overflow-x-auto flex items-center gap-0" style={{ scrollbarWidth: 'none' }}>
            {displayedStatuses.map((s: LeadStatus, i: number) => {
              const isActive    = i === currentStIdx
              const isCompleted = currentStIdx >= 0 && i < currentStIdx
              const isLast      = i === displayedStatuses.length - 1
              return (
                <div key={s.id} className="flex items-center flex-shrink-0">
                  <button
                    disabled={isActive || updateStatus.isPending}
                    onClick={() => updateStatus.mutate(s.lead_title_url)}
                    className={[
                      'flex flex-col items-center gap-0.5 px-1 py-0.5 rounded focus:outline-none',
                      isActive ? 'cursor-default' : 'cursor-pointer hover:opacity-80 transition-opacity',
                    ].join(' ')}
                  >
                    <div className="relative flex items-center justify-center">
                      {isActive ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-500 shadow-lg shadow-indigo-900/50">
                          <span className="text-[8px] font-bold text-white">{i + 1}</span>
                        </div>
                      ) : isCompleted ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.25)' }}>
                          <Check size={10} className="text-indigo-400" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center border border-white/10 bg-white/5">
                          <span className="text-[8px] font-medium text-white/30">{i + 1}</span>
                        </div>
                      )}
                    </div>
                    <span className={[
                      'text-[9px] font-medium whitespace-nowrap max-w-[60px] text-center leading-tight',
                      isActive ? 'text-indigo-300 font-semibold' : isCompleted ? 'text-white/40' : 'text-white/20',
                    ].join(' ')}>
                      {s.lead_title}
                    </span>
                  </button>
                  {!isLast && (
                    <div className="mx-0.5 h-px w-4 flex-shrink-0" style={{ background: isCompleted ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          BODY  (flex row, overflow hidden — each panel scrolls independently)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden" style={{ background: '#f1f5f9' }}>

        {/* ─── LEFT PANEL ───────────────────────────────────────────────── */}
        <aside className="w-[260px] flex-shrink-0 bg-white border-r border-slate-100 overflow-y-auto flex flex-col gap-0">

          {/* KPI cards */}
          <div className="p-4 space-y-2.5 border-b border-slate-50">
            {[
              { label: 'Loan Amount',   value: loanFmt ?? '—', icon: DollarSign, iconBg: 'bg-indigo-50',  iconClr: 'text-indigo-600', tab: null },
              { label: 'Days in Pipeline', value: `${daysInPipe}d`, icon: Clock, iconBg: 'bg-sky-50',    iconClr: 'text-sky-600',    tab: null },
              { label: 'Documents',     value: docs.length,    icon: FileText,   iconBg: 'bg-violet-50', iconClr: 'text-violet-600', tab: 'documents' as NewTabId },
              { label: 'Lender Responses', value: `${approvedCount}/${submissions.length}`, icon: Building2, iconBg: 'bg-amber-50', iconClr: 'text-amber-600', tab: 'lenders' as NewTabId },
            ].map((k, i) => {
              const Icon = k.icon
              const Tag = k.tab ? 'button' : 'div'
              return (
                <Tag
                  key={i}
                  onClick={k.tab ? () => switchTab(k.tab as NewTabId) : undefined}
                  className={[
                    'flex items-center gap-3 p-3 rounded-xl',
                    k.tab ? 'cursor-pointer hover:bg-slate-50 transition-colors' : '',
                  ].join(' ')}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${k.iconBg}`}>
                    <Icon size={15} className={k.iconClr} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{k.label}</p>
                    <p className="text-base font-bold text-slate-800 leading-tight">{k.value}</p>
                  </div>
                </Tag>
              )
            })}
          </div>

          {/* Lead meta */}
          <div className="p-4 space-y-3 border-b border-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Details</p>

            {([
              { label: 'Assigned To',  value: (leadRecord['assigned_name'] as string) ?? (leadRecord['assigned_to'] ? `Agent #${leadRecord['assigned_to']}` : 'Unassigned'), icon: User    },
              { label: 'Lead Type',    value: lead.lead_type ? String(lead.lead_type).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : null, icon: Tag   },
              { label: 'Lead Source',  value: (leadRecord['lead_source_name'] as string) ?? null, icon: Zap     },
              { label: 'Group',        value: (leadRecord['group_name'] as string) ?? null,        icon: Users          },
              { label: 'Created',      value: new Date(lead.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), icon: Calendar },
            ] as { label: string; value: string | null; icon: LucideIcon }[]).map((item, i) => {
              if (!item.value) return null
              const Icon = item.icon
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={12} className="text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{item.label}</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick shortcuts */}
          <div className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Nav</p>
            <div className="space-y-1">
              {TABS.slice(0, 6).map(t => {
                const Icon = t.icon
                const badge = TAB_BADGES[t.id]
                return (
                  <button
                    key={t.id}
                    onClick={() => switchTab(t.id)}
                    className={[
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                      activeTab === t.id
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                    ].join(' ')}
                  >
                    <Icon size={14} className={activeTab === t.id ? 'text-indigo-500' : 'text-slate-400'} />
                    <span className="flex-1 text-left text-xs font-medium">{t.label}</span>
                    {badge !== undefined && badge > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* ─── MAIN PANEL ───────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Tab bar */}
          <div className="flex-shrink-0 bg-white border-b border-slate-100 px-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center gap-0.5 min-w-max px-3">
              {TABS.map(t => {
                const Icon  = t.icon
                const badge = TAB_BADGES[t.id]
                const isAct = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => switchTab(t.id)}
                    className={[
                      'flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition-all relative',
                      isAct ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <Icon size={13} />
                    {t.label}
                    {badge !== undefined && badge > 0 && (
                      <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isAct ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {badge}
                      </span>
                    )}
                    {/* Active indicator */}
                    {isAct && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-full bg-indigo-600" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab content */}
          <div ref={tabContentRef} className="flex-1 overflow-y-auto p-5">
            <div key={activeTab} style={{ animation: 'tabFadeIn 0.18s ease-out' }}>
              {activeTab === 'overview' && (
                <OverviewTab
                  lead={lead}
                  leadId={leadId}
                  leadFields={leadFields}
                  onUpdated={() => qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })}
                />
              )}
              {activeTab === 'documents' && <DocumentsTab leadId={leadId} />}
              {activeTab === 'activity'  && <ActivityTimeline leadId={leadId} />}
              {activeTab === 'lenders'   && <LendersTab leadId={leadId} />}
              {activeTab === 'offers'         && <OffersStipsTab leadId={leadId} />}
              {activeTab === 'deal'           && <DealTab leadId={leadId} />}
              {activeTab === 'compliance'     && <ComplianceTab leadId={leadId} />}
              {activeTab === 'approvals'      && <ApprovalsSection leadId={leadId} />}
              {activeTab === 'bank-statements' && <BankStatementTab leadId={leadId} />}
              {activeTab === 'drip'           && <DripLeadPanel leadId={leadId} />}
            </div>
          </div>
        </main>

        {/* ─── RIGHT PANEL (collapsible) ────────────────────────────────── */}
        {rightOpen && (
          <aside
            className="flex-shrink-0 bg-white border-l border-slate-100 overflow-y-auto flex flex-col"
            style={{ width: 300, transition: 'width 0.2s ease' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/40 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
                  <Activity size={12} className="text-indigo-600" />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Activity Feed</span>
              </div>
              <button
                onClick={() => setRightOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Activity timeline in right panel */}
            <div className="flex-1 overflow-y-auto p-3">
              <ActivityTimeline leadId={leadId} />
            </div>

            {/* Lender summary */}
            {submissions.length > 0 && (
              <div className="border-t border-slate-100 p-3 flex-shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Lender Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total',    value: submissions.length,                                                       clr: 'text-slate-700', bg: 'bg-slate-50'    },
                    { label: 'Approved', value: submissions.filter(s => s.response_status === 'approved').length,         clr: 'text-emerald-700', bg: 'bg-emerald-50' },
                    { label: 'Declined', value: submissions.filter(s => s.response_status === 'declined').length,         clr: 'text-red-700',     bg: 'bg-red-50'     },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
                      <p className={`text-lg font-bold ${s.clr}`}>{s.value}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── Status modal ── */}
      {showStatus && (
        <StatusModal
          statuses={statuses}
          current={String(lead.lead_status)}
          onSelect={status => updateStatus.mutate(status)}
          onClose={() => setShowStatus(false)}
        />
      )}

      {/* ── Tab fade-in animation ── */}
      <style>{`
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  )
}
