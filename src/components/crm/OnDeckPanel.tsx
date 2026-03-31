import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Send, FileText, Activity, ClipboardList, RefreshCw,
  CheckCircle, AlertTriangle, Upload, DollarSign, ChevronDown,
  ChevronRight, Clock, Check, X, Zap, Building2, BarChart2,
  ShieldCheck, FileCheck2, Eye, AlertCircle, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  onDeckService,
  type LenderApplication,
  type LenderDocument,
  type LenderOffer,
  type OnDeckApiLog,
  type SubmissionType,
  type OnDeckPricingParams,
  type OnDeckPricingResponse,
  type RequiredDocument,
} from '../../services/ondeck.service'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, prefix = '$') {
  if (n == null) return '—'
  return prefix + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return (Number(n) * 100).toFixed(2) + '%'
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:        { label: 'Pending',         bg: 'bg-slate-100',   text: 'text-slate-600', dot: 'bg-slate-400' },
  submitted:      { label: 'Submitted',       bg: 'bg-blue-50',     text: 'text-blue-700',  dot: 'bg-blue-500'  },
  underwriting:   { label: 'Underwriting',    bg: 'bg-violet-50',   text: 'text-violet-700',dot: 'bg-violet-500'},
  approved:       { label: 'Approved',        bg: 'bg-emerald-50',  text: 'text-emerald-700',dot:'bg-emerald-500'},
  closing:        { label: 'Closing',         bg: 'bg-cyan-50',     text: 'text-cyan-700',  dot: 'bg-cyan-500'  },
  funded:         { label: 'Funded',          bg: 'bg-green-50',    text: 'text-green-700', dot: 'bg-green-600' },
  declined:       { label: 'Declined',        bg: 'bg-red-50',      text: 'text-red-700',   dot: 'bg-red-500'   },
  cannot_contact: { label: 'Cannot Contact',  bg: 'bg-amber-50',    text: 'text-amber-700', dot: 'bg-amber-500' },
  incomplete:     { label: 'Incomplete',      bg: 'bg-orange-50',   text: 'text-orange-700',dot: 'bg-orange-500'},
  other:          { label: 'Other',           bg: 'bg-slate-100',   text: 'text-slate-600', dot: 'bg-slate-400' },
  closed:         { label: 'Closed',          bg: 'bg-slate-100',   text: 'text-slate-500', dot: 'bg-slate-400' },
}

const STATUS_STEPS = ['pending', 'submitted', 'underwriting', 'approved', 'closing', 'funded'] as const

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.other
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function ProgressBar({ status }: { status: string }) {
  const idx   = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number])
  const pct   = idx === -1 ? 0 : Math.round(((idx + 1) / STATUS_STEPS.length) * 100)
  const isDead = ['declined', 'closed', 'cannot_contact'].includes(status)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
        {STATUS_STEPS.map((s, i) => (
          <span key={s} className={i <= idx && !isDead ? 'text-emerald-600 font-bold' : ''}>
            {STATUS_CONFIG[s].label}
          </span>
        ))}
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isDead ? 'bg-red-400' : 'bg-emerald-500'}`}
          style={{ width: isDead ? '100%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Sub-tab types ─────────────────────────────────────────────────────────────

type SubTab = 'application' | 'documents' | 'status' | 'offers' | 'logs'

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'application', label: 'Application', icon: ClipboardList },
  { id: 'documents',   label: 'Documents',   icon: FileText      },
  { id: 'status',      label: 'Status',      icon: Activity      },
  { id: 'offers',      label: 'Offers',      icon: DollarSign    },
  { id: 'logs',        label: 'API Logs',    icon: Zap           },
]

// ── Main Component ────────────────────────────────────────────────────────────

export function OnDeckPanel({ leadId }: { leadId: number }) {
  const qc       = useQueryClient()
  const [subTab, setSubTab] = useState<SubTab>('application')

  const { data: localData, isLoading: localLoading } = useQuery({
    queryKey: ['ondeck-local', leadId],
    queryFn:  async () => {
      try {
        const res = await onDeckService.getLocalData(leadId)
        const raw = res.data?.data ?? res.data
        const d = raw as unknown as Record<string, unknown> | null
        return {
          app:    (d?.app ?? null) as LenderApplication | null,
          docs:   Array.isArray(d?.docs) ? d.docs as LenderDocument[] : [],
          offers: Array.isArray(d?.offers) ? d.offers as LenderOffer[] : [],
          logs:   Array.isArray(d?.logs) ? d.logs as OnDeckApiLog[] : [],
        }
      } catch (err) {
        console.error('[OnDeckPanel] Failed to fetch local data:', err)
        return { app: null, docs: [] as LenderDocument[], offers: [] as LenderOffer[], logs: [] as OnDeckApiLog[] }
      }
    },
  })

  const app    = localData?.app    ?? null
  const docs   = localData?.docs   ?? []
  const offers = localData?.offers ?? []
  const logs   = localData?.logs   ?? []

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['ondeck-local', leadId] })
  }, [qc, leadId])

  // Count badges
  const activeDocs   = docs.filter(d => d.upload_status === 'uploaded').length
  const activeOffers = offers.filter(o => o.status === 'active').length

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', boxShadow: '0 4px 12px rgba(30,64,175,0.3)' }}>
          <Building2 size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-900">OnDeck Partner API</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {app?.business_id
              ? <span>Business ID: <span className="font-mono text-blue-600">{app.business_id}</span></span>
              : 'No application submitted yet'}
          </p>
        </div>
        {app && <StatusBadge status={app.status} />}
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-4 overflow-x-auto scrollbar-hide">
        {SUB_TABS.map(t => {
          const badge = t.id === 'documents' ? activeDocs
            : t.id === 'offers' ? activeOffers
            : t.id === 'logs' ? logs.length
            : 0
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 whitespace-nowrap transition-colors ${
                subTab === t.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon size={12} />
              {t.label}
              {badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${
                  subTab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>{badge}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {localLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={18} className="animate-spin text-slate-300" />
          </div>
        ) : (
          <>
            {subTab === 'application' && <ApplicationTab leadId={leadId} app={app} onRefresh={invalidate} />}
            {subTab === 'documents'   && <DocumentsTab  leadId={leadId} app={app} docs={docs} onRefresh={invalidate} />}
            {subTab === 'status'      && <StatusTab     leadId={leadId} app={app} onRefresh={invalidate} />}
            {subTab === 'offers'      && <OffersTab     leadId={leadId} app={app} offers={offers} onRefresh={invalidate} />}
            {subTab === 'logs'        && <LogsTab       logs={logs} onRefresh={invalidate} />}
          </>
        )}
      </div>
    </div>
  )
}

// ── Application Tab ───────────────────────────────────────────────────────────

function ApplicationTab({
  leadId, app, onRefresh,
}: { leadId: number; app: LenderApplication | null; onRefresh: () => void }) {
  const [selType, setSelType] = useState<SubmissionType>('application')

  const submitMut = useMutation({
    mutationFn: () => onDeckService.submitApplication(leadId, selType),
    onSuccess: () => {
      toast.success(`Application submitted to OnDeck!`)
      onRefresh()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? String(e)
      toast.error(msg)
    },
  })

  const updateMut = useMutation({
    mutationFn: () => onDeckService.updateApplication(leadId),
    onSuccess: () => {
      toast.success('Application updated')
      onRefresh()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? String(e)
      toast.error(msg)
    },
  })

  const contactMut = useMutation({
    mutationFn: () => onDeckService.markContactable(leadId),
    onSuccess: () => toast.success('Merchant marked as contactable'),
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? String(e)
      toast.error(msg)
    },
  })

  if (app) {
    return (
      <div className="p-5 space-y-4">

        {/* Application Card */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Application</p>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={app.status} />
                <span className="text-[11px] text-slate-400 capitalize">{app.submission_type}</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <p>{new Date(app.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {app.business_id && (
              <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Business ID</p>
                <p className="text-xs font-mono font-bold text-blue-700 truncate">{app.business_id}</p>
              </div>
            )}
            {app.application_number && (
              <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">App Number</p>
                <p className="text-xs font-mono font-bold text-slate-700">{app.application_number}</p>
              </div>
            )}
          </div>

          {app.status_note && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700">{app.status_note}</p>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Application Progress</p>
          <ProgressBar status={app.status} />
        </div>

        {/* Actions */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateMut.mutate()}
              disabled={updateMut.isPending}
              className="btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50"
            >
              {updateMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Re-submit Update
            </button>
            <button
              onClick={() => contactMut.mutate()}
              disabled={contactMut.isPending}
              className="btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50"
            >
              {contactMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Mark Contactable
            </button>
          </div>
        </div>

      </div>
    )
  }

  // No application yet
  return (
    <div className="p-5 space-y-4">

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <Building2 size={28} className="text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600">No OnDeck application yet</p>
        <p className="text-xs text-slate-400 mt-1">Submit this lead to OnDeck to start the lending process</p>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Submission Type</p>

        <div className="space-y-2">
          {([
            { v: 'application' as SubmissionType,      label: 'Full Application',   desc: 'Complete underwriting — requires all fields (SSN, DOB, taxID, full address)', recommended: true },
            { v: 'preapproval' as SubmissionType,      label: 'Pre-Approval',       desc: 'Uses 3rd-party data — shows accurate offer range without full underwriting' },
            { v: 'prequalification' as SubmissionType, label: 'Pre-Qualification',  desc: 'Quick soft check — minimal data required, rough estimate only' },
            { v: 'lead' as SubmissionType,             label: 'Lead Only',          desc: 'OnDeck sales team contacts the merchant — no offer returned' },
          ]).map(opt => (
            <label
              key={opt.v}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selType === opt.v
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-blue-200'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selType === opt.v ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              }`}>
                {selType === opt.v && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <input type="radio" className="sr-only" checked={selType === opt.v} onChange={() => setSelType(opt.v)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                  {opt.recommended && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Recommended</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={() => submitMut.mutate()}
          disabled={submitMut.isPending}
          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-50"
        >
          {submitMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Submit to OnDeck
        </button>
      </div>
    </div>
  )
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

const DOCUMENT_NEEDS = [
  'Bank Statements', 'Tax Returns', 'Business License',
  'Voided Check', 'Driver License', 'Proof of Ownership',
  'Accounts Receivable', 'Other',
]

function DocumentsTab({
  leadId, app, docs, onRefresh,
}: { leadId: number; app: LenderApplication | null; docs: LenderDocument[]; onRefresh: () => void }) {
  const fileRef           = useRef<HTMLInputElement>(null)
  const [docNeed, setDocNeed]   = useState('')
  const [required, setRequired] = useState<RequiredDocument[]>([])
  const [loadingReq, setLoadingReq] = useState(false)
  const [uploading, setUploading]   = useState(false)

  const fetchRequired = async () => {
    if (!app?.business_id) return
    setLoadingReq(true)
    try {
      const res = await onDeckService.getRequiredDocuments(leadId)
      setRequired((res.data?.data as { requiredDocuments?: RequiredDocument[] })?.requiredDocuments ?? [])
    } catch {
      toast.error('Failed to fetch required documents')
    } finally {
      setLoadingReq(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !app?.business_id) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', files[0])
    if (docNeed) fd.append('document_need', docNeed)
    try {
      await onDeckService.uploadDocument(leadId, fd)
      toast.success('Document uploaded to OnDeck')
      onRefresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (!app?.business_id) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Submit an application first before uploading documents.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5">

      {/* Upload section */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Upload Document</p>
        <select
          value={docNeed}
          onChange={e => setDocNeed(e.target.value)}
          className="input w-full text-sm"
        >
          <option value="">— Select document type (optional) —</option>
          {DOCUMENT_NEEDS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl py-4 text-sm font-semibold text-blue-600 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading…' : 'Click to select & upload file'}
        </button>
        <input ref={fileRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.json"
          onChange={handleUpload} />
      </div>

      {/* Uploaded documents */}
      {docs.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Uploaded ({docs.length})
          </p>
          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  d.upload_status === 'uploaded' ? 'bg-emerald-100' :
                  d.upload_status === 'failed'   ? 'bg-red-100' : 'bg-slate-100'
                }`}>
                  {d.upload_status === 'uploaded'
                    ? <Check size={12} className="text-emerald-600" />
                    : d.upload_status === 'failed'
                    ? <X size={12} className="text-red-500" />
                    : <Clock size={12} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{d.original_name ?? 'Document'}</p>
                  <p className="text-[10px] text-slate-400">{d.document_need ?? d.document_type ?? 'No type'}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  d.upload_status === 'uploaded' ? 'bg-emerald-100 text-emerald-700' :
                  d.upload_status === 'failed'   ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                }`}>{d.upload_status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required docs from OnDeck */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Required by OnDeck</p>
          <button
            onClick={fetchRequired}
            disabled={loadingReq}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline disabled:opacity-50"
          >
            {loadingReq ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            {required.length ? 'Refresh' : 'Fetch required docs'}
          </button>
        </div>
        {required.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">Click "Fetch required docs" to see what OnDeck needs.</p>
        ) : (
          <div className="space-y-2">
            {required.map((r, i) => (
              <div key={i} className="p-3 rounded-lg border border-slate-100 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">{r.requestOfMerchant}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">{r.requestStatus}</span>
                </div>
                {r.documentNeed && <p className="text-[10px] text-slate-400">Need: {r.documentNeed}</p>}
                {r.details && <p className="text-[10px] text-slate-400">{r.details}</p>}
                {r.rejectionReason && (
                  <p className="text-[10px] text-red-500 flex items-center gap-1">
                    <AlertCircle size={9} /> {r.rejectionReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Status Tab ────────────────────────────────────────────────────────────────

function StatusTab({
  leadId, app, onRefresh,
}: { leadId: number; app: LenderApplication | null; onRefresh: () => void }) {
  const [liveStatus, setLiveStatus] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading]       = useState(false)

  const refresh = async () => {
    if (!app?.business_id) return
    setLoading(true)
    try {
      const res = await onDeckService.getStatus(leadId)
      setLiveStatus((res.data?.data ?? res.data) as unknown as Record<string, unknown>)
      onRefresh()
      toast.success('Status refreshed')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to fetch status'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!app?.business_id) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Submit an application first to track status.</p>
        </div>
      </div>
    )
  }

  const stage = (liveStatus?.outcomeStatus as Record<string, unknown> | undefined)?.stage as string | undefined
  const note  = (liveStatus?.outcomeStatus as Record<string, unknown> | undefined)?.note as string | undefined
  const contactStatus = liveStatus?.contactStatus as string | undefined

  return (
    <div className="p-5 space-y-4">

      {/* Progress bar */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Application Progress</p>
          <StatusBadge status={app.status} />
        </div>
        <ProgressBar status={app.status} />
        {app.status_note && (
          <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{app.status_note}</p>
        )}
      </div>

      {/* Refresh / live status */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Live Status from OnDeck</p>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:underline disabled:opacity-50 btn-outline px-3 py-1"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            Refresh Status
          </button>
        </div>

        {!liveStatus ? (
          <p className="text-xs text-slate-400 text-center py-3">Click "Refresh Status" to fetch live data from OnDeck.</p>
        ) : (
          <div className="space-y-3">
            {stage && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Stage</p>
                  <p className="text-sm font-bold text-blue-700 capitalize">{stage}</p>
                </div>
                {note && <span className="text-[11px] text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">{note}</span>}
              </div>
            )}
            {contactStatus && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${contactStatus === 'CONTACTED' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Contact Status</p>
                  <p className="text-xs font-bold text-slate-700">{contactStatus}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Application details */}
      <div className="rounded-xl border border-slate-100 bg-white divide-y divide-slate-50">
        {[
          { label: 'Business ID',        value: app.business_id },
          { label: 'Application Number', value: app.application_number },
          { label: 'Submission Type',    value: app.submission_type },
          { label: 'Submitted',          value: new Date(app.created_at).toLocaleString() },
        ].filter(r => r.value).map(row => (
          <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-[11px] text-slate-400 w-32 flex-shrink-0">{row.label}</span>
            <span className="text-xs font-medium text-slate-700 font-mono">{row.value}</span>
          </div>
        ))}
      </div>

    </div>
  )
}

// ── Offers Tab ────────────────────────────────────────────────────────────────

function OffersTab({
  leadId, app, offers, onRefresh,
}: { leadId: number; app: LenderApplication | null; offers: LenderOffer[]; onRefresh: () => void }) {
  const [selectedOffer, setSelectedOffer] = useState<LenderOffer | null>(null)
  const [pricing, setPricing]     = useState<OnDeckPricingResponse | null>(null)
  const [pricingParams, setPricingParams] = useState<Partial<OnDeckPricingParams>>({})
  const [loadingFetch, setLoadingFetch] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const qc = useQueryClient()

  const fetchOffers = async () => {
    if (!app?.business_id) return
    setLoadingFetch(true)
    try {
      await onDeckService.getOffers(leadId)
      onRefresh()
      toast.success('Offers synced from OnDeck')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to fetch offers'
      toast.error(msg)
    } finally {
      setLoadingFetch(false)
    }
  }

  const calcPricing = async () => {
    if (!selectedOffer?.offer_id) return
    setLoadingPrice(true)
    setPricing(null)
    try {
      const res = await onDeckService.getPricing(leadId, {
        offerId:           selectedOffer.offer_id,
        loanAmount:        (pricingParams.loanAmount ?? selectedOffer.loan_amount) ?? undefined,
        paymentFrequency:  (pricingParams.paymentFrequency ?? selectedOffer.payment_frequency as 'Daily' | 'Weekly') ?? undefined,
        commissionPoints:  pricingParams.commissionPoints ?? undefined,
      })
      setPricing((res.data?.data ?? res.data) as OnDeckPricingResponse)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Pricing failed'
      toast.error(msg)
    } finally {
      setLoadingPrice(false)
    }
  }

  const confirmMut = useMutation({
    mutationFn: (offerId: string) => onDeckService.confirmOffer(leadId, {
      offerId,
      loanAmount:       pricingParams.loanAmount ?? undefined,
      paymentFrequency: pricingParams.paymentFrequency ?? undefined,
      commissionPoints: pricingParams.commissionPoints ?? undefined,
    }),
    onSuccess: () => {
      toast.success('Offer confirmed! Application moved to Closing.')
      setConfirmId(null)
      onRefresh()
      qc.invalidateQueries({ queryKey: ['ondeck-local', leadId] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to confirm offer'
      toast.error(msg)
      setConfirmId(null)
    },
  })

  if (!app?.business_id) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">An approved application with a businessID is required before fetching offers.</p>
        </div>
      </div>
    )
  }

  const activeOffers = offers.filter(o => o.status === 'active')
  const confirmedOffer = offers.find(o => o.status === 'confirmed')

  return (
    <div className="p-5 space-y-4">

      {/* Confirmed offer banner */}
      {confirmedOffer && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <ShieldCheck size={20} className="text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-700">Offer Accepted!</p>
            <p className="text-xs text-emerald-600">
              {fmt(confirmedOffer.loan_amount)} over {confirmedOffer.term_months} months — Application is in Closing
            </p>
          </div>
        </div>
      )}

      {/* Fetch / refresh */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Active Offers {activeOffers.length > 0 && `(${activeOffers.length})`}
        </p>
        <button
          onClick={fetchOffers}
          disabled={loadingFetch}
          className="btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50"
        >
          {loadingFetch ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Fetch Offers
        </button>
      </div>

      {activeOffers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <DollarSign size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">No active offers yet</p>
          <p className="text-[11px] text-slate-400 mt-1">Click "Fetch Offers" once the application is approved</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeOffers.map(offer => {
            const isSel = selectedOffer?.id === offer.id
            return (
              <div
                key={offer.id}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  isSel ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'
                }`}
                onClick={() => { setSelectedOffer(isSel ? null : offer); setPricing(null) }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-sm font-bold text-slate-800">{fmt(offer.loan_amount)}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                        {offer.product_type?.replace('_', ' ') ?? 'Loan'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <p className="text-slate-400">Term</p>
                        <p className="font-semibold text-slate-700">{offer.term_months ?? '—'} mo</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Factor Rate</p>
                        <p className="font-semibold text-slate-700">{offer.factor_rate != null ? Number(offer.factor_rate).toFixed(2) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">APR</p>
                        <p className="font-semibold text-slate-700">{offer.apr != null ? fmtPct(offer.apr / 100) : '—'}</p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`text-slate-400 mt-1 transition-transform flex-shrink-0 ${isSel ? 'rotate-90' : ''}`} />
                </div>

                {/* Expanded: Pricing Calculator */}
                {isSel && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-3" onClick={e => e.stopPropagation()}>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <BarChart2 size={11} /> Pricing Calculator
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">Loan Amount</label>
                        <input
                          type="number"
                          className="input w-full text-xs"
                          value={pricingParams.loanAmount ?? (offer.loan_amount ?? '')}
                          onChange={e => setPricingParams(p => ({ ...p, loanAmount: Number(e.target.value) || undefined }))}
                          placeholder={fmt(offer.loan_amount, '')}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">Frequency</label>
                        <select
                          className="input w-full text-xs"
                          value={pricingParams.paymentFrequency ?? offer.payment_frequency ?? 'Daily'}
                          onChange={e => setPricingParams(p => ({ ...p, paymentFrequency: e.target.value as 'Daily' | 'Weekly' }))}
                        >
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={calcPricing}
                      disabled={loadingPrice}
                      className="w-full btn-outline flex items-center justify-center gap-2 text-xs py-2 disabled:opacity-50"
                    >
                      {loadingPrice ? <Loader2 size={11} className="animate-spin" /> : <BarChart2 size={11} />}
                      Calculate Pricing
                    </button>

                    {/* Pricing results */}
                    {pricing && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Pricing Breakdown</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                          {[
                            { label: 'Payment Amount',    value: fmt(pricing.payment) },
                            { label: 'Payments',          value: pricing.numberOfPayments?.toString() ?? '—' },
                            { label: 'Disbursed Amount',  value: fmt(pricing.disbursementAmount) },
                            { label: 'Total Payback',     value: fmt(pricing.totalAmountPaidBack) },
                            { label: 'Origination Fee',   value: fmt(pricing.originationFee) },
                            { label: 'Total Cost',        value: fmt(pricing.totalCost) },
                            { label: 'Cents on Dollar',   value: pricing.centsOnDollar ? pricing.centsOnDollar.toFixed(2) : '—' },
                            { label: 'APR',               value: pricing.apr ? fmtPct(pricing.apr / 100) : '—' },
                          ].map(r => (
                            <div key={r.label} className="flex justify-between">
                              <span className="text-slate-500">{r.label}</span>
                              <span className="font-bold text-slate-700">{r.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Accept offer */}
                    {offer.offer_id && (
                      confirmId === offer.offer_id ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                          <p className="text-[11px] text-amber-700 flex-1">Confirm acceptance? This will lock in the offer and start closing.</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => confirmMut.mutate(offer.offer_id!)}
                              disabled={confirmMut.isPending}
                              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                            >
                              {confirmMut.isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(offer.offer_id!)}
                          className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
                        >
                          <FileCheck2 size={14} /> Accept This Offer
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Logs Tab ──────────────────────────────────────────────────────────────────

function LogsTab({ logs, onRefresh }: { logs: OnDeckApiLog[]; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const statusCfg = (s: OnDeckApiLog['status']) => ({
    success:    { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Success' },
    http_error: { bg: 'bg-red-50 border-red-200',        text: 'text-red-700',     dot: 'bg-red-500',     label: 'HTTP Error' },
    timeout:    { bg: 'bg-amber-50 border-amber-200',    text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Timeout' },
    error:      { bg: 'bg-red-50 border-red-200',        text: 'text-red-700',     dot: 'bg-red-500',     label: 'Error' },
  })[s]

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          OnDeck API Logs {logs.length > 0 && `(${logs.length})`}
        </p>
        <button onClick={onRefresh} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600">
          <RefreshCw size={10} /> Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <TrendingUp size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">No API calls logged yet</p>
          <p className="text-[11px] text-slate-400 mt-1">All OnDeck API calls will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const cfg  = statusCfg(log.status)
            const isEx = expanded === log.id
            const method = log.request_method ?? 'POST'
            // Extract path from URL for display
            const urlPath = (() => {
              try { return new URL(log.request_url).pathname } catch { return log.request_url }
            })()

            return (
              <div key={log.id} className={`rounded-lg border ${cfg.bg}`}>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                  onClick={() => setExpanded(isEx ? null : log.id)}
                >
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} flex-shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 flex-shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200">{method}</span>
                  <span className="text-xs text-slate-600 truncate flex-1 font-mono text-[11px]">{urlPath}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {log.response_code && (
                      <span className={`text-[10px] font-bold ${log.response_code < 300 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {log.response_code}
                      </span>
                    )}
                    {log.duration_ms && <span className="text-[10px] text-slate-400">{log.duration_ms}ms</span>}
                    <ChevronDown size={12} className={`text-slate-400 transition-transform ${isEx ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isEx && (
                  <div className="px-3 pb-3 space-y-2 border-t border-slate-200/60">
                    <p className="text-[10px] text-slate-400 mt-2">{new Date(log.created_at).toLocaleString()}{log.attempt > 1 ? ` · Attempt ${log.attempt}` : ''}</p>
                    {log.error_message && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-[10px] font-semibold text-red-600 mb-0.5">Error</p>
                        <p className="text-[11px] text-red-700 whitespace-pre-wrap">{log.error_message}</p>
                      </div>
                    )}
                    {log.request_payload && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 mb-1">Request Payload</p>
                        <pre className="text-[10px] bg-slate-800 text-slate-200 rounded-lg p-2 overflow-auto max-h-40">
                          {(() => { try { return JSON.stringify(JSON.parse(log.request_payload), null, 2) } catch { return log.request_payload } })()}
                        </pre>
                      </div>
                    )}
                    {log.response_body && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 mb-1">Response</p>
                        <pre className="text-[10px] bg-slate-800 text-slate-200 rounded-lg p-2 overflow-auto max-h-40">
                          {(() => { try { return JSON.stringify(JSON.parse(log.response_body), null, 2) } catch { return log.response_body } })()}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
