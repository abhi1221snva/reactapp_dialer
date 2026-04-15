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

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft, Loader2, X, AlertCircle, Phone, Mail, Briefcase,
  User, Users, Clock, DollarSign, FileText, FolderOpen, Building2,
  TrendingUp, ShieldCheck, CheckCircle, Send, FileBarChart,
  Pencil, Trash2, Download, Copy, ExternalLink, Upload, Search,
  ChevronDown, Hash, MessageSquare, Activity, MoreVertical,
  Tag, Calendar, Check, Eye, SlidersHorizontal,
  PanelRightClose, PanelRightOpen, Zap, MapPin, Globe,
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
import { confirmDelete }         from '../../utils/confirmDelete'
import { formatPhoneNumber }    from '../../utils/format'
import type { CrmLead, LeadStatus, CrmDocument, CrmLabel } from '../../types/crm.types'

// ─── Design tokens ────────────────────────────────────────────────────────────
const G = {
  600: '#059669',   // emerald-600 — primary accent
  500: '#10b981',   // emerald-500 — lighter
  700: '#047857',   // emerald-700 — darker
  50:  '#f0fdf4',   // emerald-50
  100: '#dcfce7',   // emerald-100
  HDR: 'linear-gradient(135deg, #022c22 0%, #064e3b 60%, #022c22 100%)', // header bg
}

// ─── Tab system ───────────────────────────────────────────────────────────────
type TabId =
  | 'overview' | 'documents' | 'activity' | 'lenders'
  | 'offers' | 'deal' | 'compliance' | 'approvals'
  | 'bank-statements' | 'drip'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'overview',        label: 'Overview',    icon: LayoutDashboard },
  { id: 'documents',       label: 'Documents',   icon: FolderOpen      },
  { id: 'activity',        label: 'Activity',    icon: Activity        },
  { id: 'lenders',         label: 'Lenders',     icon: Building2       },
  { id: 'offers',          label: 'Offers',      icon: DollarSign      },
  { id: 'deal',            label: 'Deal',        icon: TrendingUp      },
  { id: 'compliance',      label: 'Compliance',  icon: ShieldCheck     },
  { id: 'approvals',       label: 'Approvals',   icon: CheckCircle     },
  { id: 'bank-statements', label: 'Bank Stmts',  icon: FileBarChart    },
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
      <div className="flex flex-1 overflow-hidden bg-slate-50">
        <div className="w-[220px] bg-white border-r border-slate-100 p-3 space-y-3 flex-shrink-0">
          <Pulse className="h-20 w-full bg-slate-100" />
          {[48, 64, 32, 40, 28].map((h, i) => <Pulse key={i} className={`w-full bg-slate-100`} style={{ height: h }} />)}
        </div>
        <div className="flex-1 p-4 space-y-3">
          <Pulse className="h-9 w-full bg-white border border-slate-100" />
          {[180, 140, 100].map((h, i) => <Pulse key={i} className="w-full bg-white border border-slate-100" style={{ height: h }} />)}
        </div>
      </div>
    </div>
  )
}

// ─── DocViewer modal ──────────────────────────────────────────────────────────
function DocViewer({ doc, leadId, onClose }: { doc: CrmDocument; leadId: number; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [dl, setDl]           = useState(false)
  const ext = getFileExt(doc.file_path)

  useEffect(() => {
    if (ext === 'other') { setLoading(false); return }
    let url: string | null = null
    crmService.viewLeadDocument(leadId, doc.id)
      .then(r  => { url = URL.createObjectURL(r.data as Blob); setBlobUrl(url) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [doc.id, leadId, ext]) // eslint-disable-line

  async function download() {
    setDl(true)
    try {
      const r = await crmService.downloadLeadDocument(leadId, doc.id)
      const url = URL.createObjectURL(r.data as Blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: doc.file_name })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { toast.error('Download failed') }
    setDl(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText size={14} style={{ color: G[500] }} className="flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{doc.file_name}</p>
            <p className="text-[11px] text-slate-400">{doc.document_type ?? 'Document'}{doc.file_size ? ` · ${formatBytes(Number(doc.file_size))}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <button onClick={download} disabled={dl}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
            style={{ background: G[600] }}>
            {dl ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
        {loading && <Loader2 size={24} className="animate-spin text-white/40" />}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle size={28} className="text-slate-400" />
            <p className="text-slate-300 text-sm">Preview unavailable</p>
            <button onClick={download} disabled={dl} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: G[600] }}>
              {dl ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download
            </button>
          </div>
        )}
        {!loading && !error && blobUrl && ext === 'pdf' && <iframe src={blobUrl} className="w-full h-full rounded-lg" style={{ border: 'none' }} />}
        {!loading && !error && blobUrl && ext === 'image' && <img src={blobUrl} alt={doc.file_name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />}
        {!loading && !error && ext === 'other' && (
          <div className="flex flex-col items-center gap-3">
            <FileText size={40} className="text-slate-500" />
            <p className="text-slate-400 text-sm">No preview for this file type</p>
            <button onClick={download} disabled={dl} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: G[600] }}>
              {dl ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Documents Tab — compact list view ───────────────────────────────────────
function DocumentsTab({ leadId }: { leadId: number }) {
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [viewDoc, setViewDoc] = useState<CrmDocument | null>(null)
  const [uploading, setUp]    = useState(false)
  const [pct, setPct]         = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: docs = [], isLoading } = useQuery<CrmDocument[]>({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      const res = await crmService.getLeadDocuments(leadId)
      return (res.data?.data ?? []) as CrmDocument[]
    },
    staleTime: 60_000,
  })

  const deleteMut = useMutation({
    mutationFn: (docId: number) => crmService.deleteLeadDocument(leadId, docId),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['lead-documents', leadId] }) },
    onError: () => toast.error('Delete failed'),
  })

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUp(true); setPct(0)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append('files[]', f))
      await crmService.uploadLeadDocuments(leadId, fd, ({ loaded, total }) => setPct(total ? Math.round(loaded / total * 100) : 0))
      toast.success(`${files.length} file(s) uploaded`)
      qc.invalidateQueries({ queryKey: ['lead-documents', leadId] })
    } catch { toast.error('Upload failed') }
    setUp(false); setPct(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const filtered = docs.filter(d =>
    !search || d.file_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.document_type?.toLowerCase().includes(search.toLowerCase()),
  )

  const EXT_STYLE: Record<string, { bg: string; text: string }> = {
    pdf:   { bg: 'bg-red-50',   text: 'text-red-500'   },
    image: { bg: 'bg-sky-50',   text: 'text-sky-500'   },
    other: { bg: 'bg-slate-50', text: 'text-slate-400' },
  }

  return (
    <div className="space-y-2.5">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 placeholder:text-slate-400"
            style={{ '--tw-ring-color': G[500] } as React.CSSProperties}
          />
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 transition-all"
          style={{ background: G[600] }}>
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? `${pct}%` : 'Upload'}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <Pulse className="w-7 h-7 bg-slate-100 flex-shrink-0" />
                <Pulse className="flex-1 h-3 bg-slate-100" />
                <Pulse className="w-16 h-3 bg-slate-100" />
                <Pulse className="w-14 h-3 bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center">
            <FolderOpen size={28} className="text-slate-200 mb-2" />
            <p className="text-sm font-semibold text-slate-400">{search ? 'No matches' : 'No documents yet'}</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_100px_80px_24px_24px_24px] items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
              <div className="w-7" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">File</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Type</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Size</span>
              <div /><div /><div />
            </div>
            <div className="divide-y divide-slate-50">
              {filtered.map(doc => {
                const ft = getFileExt(doc.file_path)
                const fs = EXT_STYLE[ft]
                return (
                  <div key={doc.id} className="group grid grid-cols-[auto_1fr_100px_80px_24px_24px_24px] items-center gap-3 px-4 py-2 hover:bg-slate-50/80 transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${fs.bg}`}>
                      <FileText size={13} className={fs.text} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{doc.file_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    {doc.document_type
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full truncate"
                          style={{ background: G[50], color: G[700] }}>{doc.document_type}</span>
                      : <span className="text-slate-300">—</span>
                    }
                    <span className="text-[11px] text-slate-400">{doc.file_size ? formatBytes(Number(doc.file_size)) : '—'}</span>
                    {/* View */}
                    <button onClick={() => setViewDoc(doc)} title="View"
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                      <Eye size={13} />
                    </button>
                    {/* Download */}
                    <button title="Download"
                      onClick={async () => {
                        try {
                          const r = await crmService.downloadLeadDocument(leadId, doc.id)
                          const url = URL.createObjectURL(r.data as Blob)
                          const a = Object.assign(document.createElement('a'), { href: url, download: doc.file_name })
                          document.body.appendChild(a); a.click(); document.body.removeChild(a)
                          setTimeout(() => URL.revokeObjectURL(url), 1000)
                        } catch { toast.error('Download failed') }
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
                      <Download size={13} />
                    </button>
                    {/* Delete */}
                    <button title="Delete"
                      onClick={async () => { if (!await confirmDelete(doc.file_name)) return; deleteMut.mutate(doc.id) }}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      {viewDoc && <DocViewer doc={viewDoc} leadId={leadId} onClose={() => setViewDoc(null)} />}
    </div>
  )
}

// ─── Lenders Tab ──────────────────────────────────────────────────────────────
function LendersTab({ leadId }: { leadId: number }) {
  const navigate = useNavigate()
  const { data: subs = [], isLoading } = useQuery({
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

  const PILL: Record<string, { bg: string; color: string }> = {
    submitted:   { bg: '#eff6ff', color: '#1d4ed8' },
    approved:    { bg: '#f0fdf4', color: '#15803d' },
    declined:    { bg: '#fef2f2', color: '#b91c1c' },
    no_response: { bg: '#f8fafc', color: '#64748b' },
    viewed:      { bg: '#f5f3ff', color: '#6d28d9' },
    sent:        { bg: '#ecfdf5', color: '#059669' },
    failed:      { bg: '#fef2f2', color: '#b91c1c' },
  }

  function Pill({ status }: { status?: string }) {
    if (!status) return <span className="text-slate-300 text-xs">—</span>
    const s = status.toLowerCase()
    const c = PILL[s] ?? { bg: '#f8fafc', color: '#64748b' }
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ background: c.bg, color: c.color }}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </span>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">{subs.length} Submission{subs.length !== 1 ? 's' : ''}</span>
          {subs.filter(s => s.response_status === 'approved').length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: G[50], color: G[700] }}>
              {subs.filter(s => s.response_status === 'approved').length} Approved
            </span>
          )}
        </div>
        <button onClick={() => navigate(`/crm/leads/${leadId}`)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-emerald-50"
          style={{ color: G[600] }}>
          <ArrowUpRight size={12} /> Full View
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Pulse key={i} className="h-10 w-full bg-white border border-slate-100" />)}</div>
      ) : subs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 py-12 flex flex-col items-center">
          <Building2 size={28} className="text-slate-200 mb-2" />
          <p className="text-sm font-semibold text-slate-400">No submissions yet</p>
          <button onClick={() => navigate(`/crm/leads/${leadId}`)}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ background: G[600] }}>
            <Building2 size={12} /> Open Lenders Panel
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-2">Lender</th>
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 py-2">Status</th>
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 py-2">Response</th>
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 py-2">Email</th>
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subs.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2 text-[13px] font-semibold text-slate-800">{s.lender_name ?? `#${s.id}`}</td>
                  <td className="px-3 py-2"><Pill status={s.submission_status} /></td>
                  <td className="px-3 py-2"><Pill status={s.response_status} /></td>
                  <td className="px-3 py-2"><Pill status={s.email_status} /></td>
                  <td className="px-3 py-2 text-[11px] text-slate-400 whitespace-nowrap">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
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

// ─── Overview Tab — dense 4-column grid ──────────────────────────────────────
function OverviewTab({ lead, leadId, leadFields, onUpdated }: {
  lead: CrmLead; leadId: number; leadFields: CrmLabel[]; onUpdated: () => void
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty } } = useForm<Record<string, unknown>>({
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

  const FIELDS = [
    { key: 'first_name',   label: 'First Name' },
    { key: 'last_name',    label: 'Last Name'  },
    { key: 'phone_number', label: 'Phone',      fmt: (v: string) => formatPhoneNumber(v) },
    { key: 'email',        label: 'Email'      },
    { key: 'company_name', label: 'Company'    },
    { key: 'lead_type',    label: 'Lead Type'  },
    { key: 'city',         label: 'City'       },
    { key: 'state',        label: 'State'      },
    { key: 'address',      label: 'Address'    },
    { key: 'dob',          label: 'Date of Birth' },
    { key: 'zip',          label: 'ZIP'        },
    { key: 'country',      label: 'Country'    },
  ] as { key: string; label: string; fmt?: (v: string) => string }[]

  // Card wrapper
  const Card = ({ title, icon: Icon, iconBg = G[50], iconClr = G[600], children, action }: {
    title: string; icon: LucideIcon; iconBg?: string; iconClr?: string; children: React.ReactNode; action?: React.ReactNode
  }) => (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50" style={{ background: '#fafafa' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
            <Icon size={12} style={{ color: iconClr }} />
          </div>
          <span className="text-xs font-bold text-slate-700">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Contact & Business — 4-column dense grid */}
      <Card
        title="Contact & Business"
        icon={User}
        action={
          !editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors hover:bg-emerald-50"
              style={{ color: G[600] }}>
              <Pencil size={11} /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setEditing(false); reset(lr) }}
                className="text-[11px] font-semibold px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit(data => saveMut.mutate(data))}
                disabled={saveMut.isPending || !isDirty}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md text-white disabled:opacity-60"
                style={{ background: G[600] }}>
                {saveMut.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
              </button>
            </div>
          )
        }
      >
        {!editing ? (
          /* 4-column read view */
          <div className="grid grid-cols-4 gap-x-4 gap-y-3">
            {FIELDS.map(f => {
              const val = lr[f.key]
              if (!val) return null
              const display = f.fmt ? f.fmt(String(val)) : String(val)
              const isPhone = f.key === 'phone_number'
              const isEmail = f.key === 'email'
              return (
                <div key={f.key} className="min-w-0 group">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{f.label}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{display}</p>
                    {(isPhone || isEmail) && (
                      <button
                        onClick={() => copyToClipboard(String(val), f.label)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-emerald-600 transition-all flex-shrink-0"
                        title={`Copy ${f.label}`}
                      >
                        <Copy size={10} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* 4-column edit mode */
          <div className="grid grid-cols-4 gap-2">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{f.label}</label>
                <input {...register(f.key)}
                  className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 text-slate-800"
                  style={{ '--tw-ring-color': G[500] } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dynamic EAV fields */}
      {leadFields.length > 0 && (
        <Card title="Custom Fields" icon={SlidersHorizontal}
          iconBg="#f5f3ff" iconClr="#7c3aed">
          <DynamicFieldForm
            register={register} setValue={setValue}
            defaultValues={lr} errors={errors}
            labels={leadFields} formValues={watch() as Record<string, unknown>}
            readOnly={!editing} columns={4}
          />
        </Card>
      )}
    </div>
  )
}

// ─── Status change dropdown (inline popover) ──────────────────────────────────
function StatusDropdown({ statuses, current, onSelect, onClose }: {
  statuses: LeadStatus[]; current: string; onSelect: (s: string) => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-72 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-800">Change Status</span>
          <button onClick={onClose} className="p-0.5 text-slate-400 hover:text-slate-600"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto py-1">
          {statuses.map(s => {
            const isAct = s.lead_title_url === current
            const color = s.color_code ?? s.color ?? G[600]
            return (
              <button key={s.id}
                onClick={() => { if (!isAct) onSelect(s.lead_title_url); onClose() }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left ${isAct ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className={`flex-1 text-[13px] font-semibold ${isAct ? 'text-emerald-700' : 'text-slate-700'}`}>{s.lead_title}</span>
                {isAct && <Check size={13} style={{ color: G[600] }} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export function CrmLeadNew() {
  const { id }  = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const leadId    = Number(id)

  const [activeTab,    setActiveTab]    = useState<TabId>('overview')
  const [rightOpen,    setRightOpen]    = useState(true)
  const [showStatus,   setShowStatus]   = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const tabContentRef = useRef<HTMLDivElement>(null)

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
  const updateStatus = useMutation({
    mutationFn: (s: string) => leadService.update(leadId, { lead_status: s }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['crm-lead', leadId] }) },
    onError: () => toast.error('Failed'),
  })

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
  const displaySts    = statuses.slice(0, 10)
  const curStIdx      = displaySts.findIndex((s: LeadStatus) => s.lead_title_url === String(lead.lead_status))

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

      {/* ══════════════════════════════════════════════════════════════════════
          DENSE HEADER  — 2 rows total
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="flex-shrink-0 z-20" style={{ background: G.HDR, borderBottom: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>

        {/* Row 1: identity + all meta + actions  */}
        <div className="flex items-center gap-3 px-4 py-2">
          {/* Back */}
          <button onClick={() => navigate('/crm/leads')} title="Back"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
            <ArrowLeft size={15} />
          </button>

          {/* Avatar */}
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <span className="text-[12px] font-bold text-white">{leadInits}</span>
          </div>

          {/* Name + Status + meta — all on one line */}
          <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[15px] font-bold text-white leading-none tracking-tight truncate max-w-[220px]">{fullName}</h1>

            {/* Status chip */}
            <button onClick={() => setShowStatus(true)}
              className="inline-flex items-center gap-1 h-[20px] px-2 rounded-full text-[11px] font-bold flex-shrink-0 hover:brightness-110 transition-all"
              style={{ background: `${statusColor}25`, color: statusColor, border: `1px solid ${statusColor}35` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
              {curStatus?.lead_title ?? String(lead.lead_status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              <ChevronDown size={9} className="opacity-60" />
            </button>

            {/* Temperature */}
            {tempCfg && (
              <span className="hidden sm:inline-flex items-center gap-1 h-[18px] px-2 rounded-full text-[10px] font-bold flex-shrink-0"
                style={{ background: tempCfg.bg, color: tempCfg.text }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tempCfg.dot }} />
                {temp!.charAt(0).toUpperCase() + temp!.slice(1)}
              </span>
            )}

            {/* Separator */}
            <span className="text-white/10 hidden md:inline">|</span>

            {/* Contact meta inline */}
            {lead.company_name && (
              <span className="hidden md:flex items-center gap-1 text-[11px] text-white/40">
                <Briefcase size={10} className="text-white/25" />{String(lead.company_name)}
              </span>
            )}
            {lead.phone_number && (
              <button onClick={() => copyToClipboard(String(lead.phone_number), 'Phone')}
                className="hidden lg:flex items-center gap-1 text-[11px] text-white/40 hover:text-emerald-300 transition-colors group">
                <Phone size={10} className="text-emerald-500/50" />
                {formatPhoneNumber(String(lead.phone_number))}
                <Copy size={9} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
              </button>
            )}
            {lead.email && (
              <button onClick={() => copyToClipboard(String(lead.email), 'Email')}
                className="hidden xl:flex items-center gap-1 text-[11px] text-white/40 hover:text-sky-300 transition-colors truncate max-w-[160px] group">
                <Mail size={10} className="text-sky-400/50 flex-shrink-0" />
                <span className="truncate">{String(lead.email)}</span>
                <Copy size={9} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 flex-shrink-0" />
              </button>
            )}

            {/* KPI pills */}
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-white/30">
              <Clock size={10} className="text-white/20" />{daysInPipe}d
            </span>
            {loanFmt && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: G[500] }}>
                <DollarSign size={10} />{loanFmt}
              </span>
            )}
            {submissions.length > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-white/30">
                <Building2 size={10} className="text-white/20" />
                <span className="font-semibold" style={{ color: G[500] }}>{approvedCount}</span>/{submissions.length}
              </span>
            )}
          </div>

          {/* ── Action bar ── */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* PRIMARY: Call Now */}
            <a href={lead.phone_number ? `tel:${lead.phone_number}` : '#'}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[12px] font-bold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${G[600]}, ${G[700]})`, border: `1px solid ${G[700]}` }}>
              <PhoneCall size={13} /> <span className="hidden sm:inline">Call</span>
            </a>

            {/* Email */}
            <button
              onClick={() => navigate(`/crm/leads/${leadId}`, { state: { openModal: 'email' } })}
              className="h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all"
              style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.28)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.28)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)'}>
              <Mail size={12} /> <span className="hidden sm:inline">Email</span>
            </button>

            {/* SMS */}
            <button
              onClick={() => navigate(`/crm/leads/${leadId}`, { state: { openModal: 'sms' } })}
              className="h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all"
              style={{ background: 'rgba(139,92,246,0.18)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.28)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.28)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.18)'}>
              <MessageSquare size={12} /> <span className="hidden sm:inline">SMS</span>
            </button>

            {/* Edit */}
            <button onClick={() => navigate(`/crm/leads/${leadId}/edit`)}
              className="h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}>
              <Pencil size={12} /> <span className="hidden sm:inline">Edit</span>
            </button>

            {/* Portal */}
            <button
              onClick={() => merchantPortal?.url
                ? copyToClipboard(merchantPortal.url, 'Merchant link')
                : genPortal.mutate()}
              disabled={genPortal.isPending}
              title={merchantPortal?.url ? 'Copy merchant portal link' : 'Generate merchant portal'}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-white/40 hover:text-amber-300 hover:bg-white/10 transition-all">
              {genPortal.isPending ? <Loader2 size={13} className="animate-spin" /> : merchantPortal?.url ? <Copy size={13} /> : <ExternalLink size={13} />}
            </button>

            {/* More */}
            <div className="relative" data-more-menu>
              <button onClick={() => setShowMoreMenu(v => !v)}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <MoreVertical size={15} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1">
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

            {/* Panel toggle */}
            <button onClick={() => setRightOpen(v => !v)} title={rightOpen ? 'Hide panel' : 'Show panel'}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all">
              {rightOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            </button>
          </div>
        </div>

        {/* Row 2: Pipeline progress bar — ultra-compact */}
        {displaySts.length > 0 && (
          <div className="flex items-center gap-0 px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {displaySts.map((s: LeadStatus, i: number) => {
              const isAct  = i === curStIdx
              const isDone = curStIdx >= 0 && i < curStIdx
              const isLast = i === displaySts.length - 1
              return (
                <div key={s.id} className="flex items-center flex-shrink-0">
                  <button
                    disabled={isAct || updateStatus.isPending}
                    onClick={() => updateStatus.mutate(s.lead_title_url)}
                    className={['flex flex-col items-center gap-0.5 focus:outline-none px-0.5',
                      isAct ? 'cursor-default' : 'cursor-pointer hover:opacity-75 transition-opacity'].join(' ')}
                  >
                    <div className={[
                      'w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold',
                      isAct  ? 'text-white shadow-md shadow-emerald-900/50' : '',
                      isDone ? '' : !isAct ? 'text-white/25 border border-white/10 bg-white/5' : '',
                    ].join(' ')}
                      style={isAct ? { background: G[600] } : isDone ? { background: 'rgba(16,185,129,0.2)' } : {}}>
                      {isAct ? <span>{i+1}</span> : isDone ? <Check size={8} style={{ color: G[500] }} /> : <span>{i+1}</span>}
                    </div>
                    <span className={['text-[8px] font-medium whitespace-nowrap max-w-[52px] text-center leading-none',
                      isAct ? 'font-bold' : isDone ? 'text-white/30' : 'text-white/15'].join(' ')}
                      style={isAct ? { color: G[500] } : {}}>
                      {s.lead_title}
                    </span>
                  </button>
                  {!isLast && (
                    <div className="mx-0.5 h-px w-3.5 flex-shrink-0"
                      style={{ background: isDone ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.06)' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          BODY
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden" style={{ background: '#f1f5f9' }}>

        {/* ── LEFT PANEL (220px) ── */}
        <aside className="w-[220px] flex-shrink-0 bg-white border-r border-slate-100 overflow-y-auto flex flex-col">

          {/* KPI 2×2 grid */}
          <div className="grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-100">
            {([
              { label: 'Loan',     value: loanFmt ?? '—',                  icon: DollarSign, clr: G[600],   bg: G[50],    tab: null          },
              { label: 'Days',     value: `${daysInPipe}d`,               icon: Clock,     clr: '#0284c7', bg: '#f0f9ff', tab: null          },
              { label: 'Docs',     value: String(docs.length),            icon: FileText,  clr: '#7c3aed', bg: '#f5f3ff', tab: 'documents'   },
              { label: 'Lenders',  value: `${approvedCount}/${submissions.length}`, icon: Building2, clr: '#b45309', bg: '#fffbeb', tab: 'lenders' },
            ] as { label: string; value: string; icon: LucideIcon; clr: string; bg: string; tab: TabId | null }[]).map((k, i) => {
              const Icon = k.icon
              const Tag = k.tab ? 'button' : 'div'
              return (
                <Tag key={i}
                  onClick={k.tab ? () => switchTab(k.tab as TabId) : undefined}
                  className={['bg-white p-2.5 flex flex-col gap-1', k.tab ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''].join(' ')}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>
                      <Icon size={11} style={{ color: k.clr }} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{k.label}</span>
                  </div>
                  <p className="text-[15px] font-bold text-slate-800 leading-none pl-0.5">{k.value}</p>
                </Tag>
              )
            })}
          </div>

          {/* Lead meta — micro-table */}
          <div className="px-3 py-2.5 border-b border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lead Info</p>
            <dl className="space-y-1.5">
              {([
                { label: 'Assigned',  value: (lr['assigned_name'] as string) ?? (lr['assigned_to'] ? `Agent #${lr['assigned_to']}` : 'Unassigned') },
                { label: 'Type',      value: lead.lead_type ? String(lead.lead_type).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : null },
                { label: 'Source',    value: (lr['lead_source_name'] as string) ?? null },
                { label: 'Group',     value: (lr['group_name'] as string) ?? null },
                { label: 'Created',   value: new Date(lead.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) },
              ] as { label: string; value: string | null }[]).map((item, i) => {
                if (!item.value) return null
                return (
                  <div key={i} className="flex items-start gap-2">
                    <dt className="text-[10px] font-semibold text-slate-400 w-[52px] flex-shrink-0 pt-px">{item.label}</dt>
                    <dd className="text-[11px] font-semibold text-slate-700 truncate">{item.value}</dd>
                  </div>
                )
              })}
            </dl>
          </div>

          {/* Nav — compact list */}
          <div className="p-2 flex-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1.5 mb-1.5">Navigation</p>
            {TABS.map(t => {
              const Icon  = t.icon
              const badge = TAB_BADGES[t.id]
              const isAct = activeTab === t.id
              return (
                <button key={t.id} onClick={() => switchTab(t.id)}
                  className={[
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all mb-0.5',
                    isAct ? 'font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 font-medium',
                  ].join(' ')}
                  style={isAct ? { background: G[50], color: G[700] } : {}}>
                  <Icon size={13} style={isAct ? { color: G[600] } : { color: '#94a3b8' }} />
                  <span className="flex-1 text-left">{t.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={isAct ? { background: G[100], color: G[700] } : { background: '#f1f5f9', color: '#64748b' }}>
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── MAIN PANEL ── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Pill tabs */}
          <div className="flex-shrink-0 bg-white border-b border-slate-100 px-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center gap-1 py-1.5 min-w-max">
              {TABS.map(t => {
                const Icon  = t.icon
                const badge = TAB_BADGES[t.id]
                const isAct = activeTab === t.id
                return (
                  <button key={t.id} onClick={() => switchTab(t.id)}
                    className={[
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all',
                      isAct ? 'shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                    style={isAct ? { background: G[600], color: '#fff' } : {}}>
                    <Icon size={12} />
                    {t.label}
                    {badge !== undefined && badge > 0 && (
                      <span className={[
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        isAct ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                      ].join(' ')}>
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab content */}
          <div ref={tabContentRef} className="flex-1 overflow-y-auto p-4">
            <div key={activeTab} style={{ animation: 'fadeUp .15s ease-out' }}>
              {activeTab === 'overview'       && <OverviewTab lead={lead} leadId={leadId} leadFields={leadFields} onUpdated={() => qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })} />}
              {activeTab === 'documents'      && <DocumentsTab leadId={leadId} />}
              {activeTab === 'activity'       && <ActivityTimeline leadId={leadId} />}
              {activeTab === 'lenders'        && <LendersTab leadId={leadId} />}
              {activeTab === 'offers'         && <OffersStipsTab leadId={leadId} />}
              {activeTab === 'deal'           && <DealTab leadId={leadId} />}
              {activeTab === 'compliance'     && <ComplianceTab leadId={leadId} />}
              {activeTab === 'approvals'      && <ApprovalsSection leadId={leadId} />}
              {activeTab === 'bank-statements'&& <BankStatementTab leadId={leadId} />}
              {activeTab === 'drip'           && <DripLeadPanel leadId={leadId} />}
            </div>
          </div>
        </main>

        {/* ── RIGHT PANEL (collapsible, 260px) ── */}
        {rightOpen && (
          <aside className="w-[260px] flex-shrink-0 bg-white border-l border-slate-100 overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 flex-shrink-0" style={{ background: '#fafafa' }}>
              <div className="flex items-center gap-1.5">
                <Activity size={12} style={{ color: G[600] }} />
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Activity</span>
              </div>
              <button onClick={() => setRightOpen(false)} className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={13} />
              </button>
            </div>

            {/* Lender summary strip */}
            {submissions.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                {[
                  { label: 'Total',    n: submissions.length,                                                    clr: '#475569', bg: '#f8fafc' },
                  { label: 'Approved', n: submissions.filter(s => s.response_status === 'approved').length,      clr: G[700],    bg: G[50]    },
                  { label: 'Declined', n: submissions.filter(s => s.response_status === 'declined').length,      clr: '#b91c1c', bg: '#fef2f2' },
                ].map(s => (
                  <div key={s.label} className="flex-1 rounded-lg p-1.5 text-center" style={{ background: s.bg }}>
                    <p className="text-[14px] font-bold leading-none" style={{ color: s.clr }}>{s.n}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-2">
              <ActivityTimeline leadId={leadId} />
            </div>
          </aside>
        )}
      </div>

      {/* Status dropdown */}
      {showStatus && (
        <StatusDropdown statuses={statuses} current={String(lead.lead_status)}
          onSelect={s => updateStatus.mutate(s)} onClose={() => setShowStatus(false)} />
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
