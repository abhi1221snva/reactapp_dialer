import { useState, useMemo, useCallback } from 'react'
import {
  Loader2, Send, ChevronDown, ChevronUp, Code2, Copy, Check,
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, Activity,
  BarChart3, Shield, ShieldAlert, Building2, FileText, Clock,
  CreditCard, Landmark, Users, Banknote, Receipt, Search,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Eye,
  Minus, AlertCircle, Zap, Database, Hash,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { bankAnalysisViewerService, type FullAnalysisRequest } from '../../services/bankAnalysisViewer.service'

// ── Sections config ──────────────────────────────────────────────────────────
const SECTIONS = [
  { value: 'summary',                 label: 'Summary' },
  { value: 'balances',                label: 'Balances' },
  { value: 'risk',                    label: 'Risk' },
  { value: 'revenue',                 label: 'Revenue' },
  { value: 'monthly_data',            label: 'Monthly Data' },
  { value: 'mca_analysis',            label: 'MCA Analysis' },
  { value: 'debt_collector_analysis', label: 'Debt Collectors' },
  { value: 'offer_preview',           label: 'Offer Preview' },
  { value: 'transactions',            label: 'Transactions' },
  { value: 'comments',                label: 'Comments' },
  { value: 'audit_log',               label: 'Audit Log' },
] as const

const TX_BATCH = 50

// ── Formatters ───────────────────────────────────────────────────────────────
function fmt(n: any, decimals = 0): string {
  if (n === null || n === undefined || n === '') return '$0'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)
}

function fmtNum(n: any): string {
  if (n === null || n === undefined || n === '') return '0'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('en-US').format(num)
}

function num(v: any): number {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isNaN(n) ? 0 : n
}

function pick(obj: any, ...keys: string[]): any {
  if (!obj) return undefined
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  return undefined
}

// ── Colored Section ──────────────────────────────────────────────────────────
function ColoredSection({ title, icon: Icon, color, borderColor, children, defaultOpen = true, badge }: {
  title: string; icon: any; color: string; borderColor: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string | number
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${borderColor}`}>
      <div className={`px-4 py-3 flex items-center justify-between cursor-pointer select-none ${color}`}
        onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-white/90" />
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {badge !== undefined && (
            <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">{badge}</span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-white/70" /> : <ChevronDown size={16} className="text-white/70" />}
      </div>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  )
}

// ── Stat Box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, icon: Icon, color = 'text-slate-800', borderColor = 'border-slate-200', sub }: {
  label: string; value: string | number; icon?: any; color?: string; borderColor?: string; sub?: string
}) {
  return (
    <div className={`bg-gray-50 rounded-lg p-3.5 border ${borderColor}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={13} className="text-slate-400" />}
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────
function Pill({ children, variant = 'gray' }: { children: React.ReactNode; variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'indigo' }) {
  const c: Record<string, string> = {
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    gray:   'bg-slate-100 text-slate-600 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${c[variant]}`}>
      {children}
    </span>
  )
}

// ── Risk Gauge ───────────────────────────────────────────────────────────────
function RiskGauge({ score, grade }: { score: number; grade: string }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  const bgColor = score >= 70 ? 'bg-emerald-50 border-emerald-200' : score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  const textColor = score >= 70 ? 'text-emerald-700' : score >= 40 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="flex items-center gap-6">
      {/* Circle gauge */}
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
            strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${textColor}`}>{score}</span>
        </div>
      </div>
      {/* Grade */}
      <div className={`px-5 py-3 rounded-xl border-2 ${bgColor}`}>
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Grade</p>
        <span className={`text-4xl font-black ${textColor}`}>{grade}</span>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function BankAnalysisViewer() {
  const [sessionInput, setSessionInput] = useState('')
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [txLimit, setTxLimit] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Record<string, any> | null>(null)
  const [rawJson, setRawJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [txShowing, setTxShowing] = useState(TX_BATCH)
  const [copied, setCopied] = useState(false)
  const [txSearch, setTxSearch] = useState('')
  const [activeSession, setActiveSession] = useState(0)

  // ── Robust data extraction (handles nested data.data, sessions wrapper, flat) ──
  const root = useMemo(() => {
    if (!data) return null
    // Unwrap common wrappers: data.data, data, direct
    let inner = data.data ?? data
    if (inner && typeof inner === 'object' && !Array.isArray(inner) && inner.data && typeof inner.data === 'object' && !Array.isArray(inner.data)) {
      inner = inner.data
    }
    return inner
  }, [data])

  // Detect sessions-based response shape
  const sessions = useMemo(() => {
    if (!root) return []
    if (Array.isArray(root.sessions)) return root.sessions
    // Single session response might be the root itself (has summary/balances directly)
    if (root.summary || root.balances || root.risk || root.transactions) return [root]
    return []
  }, [root])

  const batchSummary = useMemo(() => root?.batch_summary ?? {}, [root])
  const hasSessions  = sessions.length > 0

  // Active session data — fall back to root for flat responses
  const d = useMemo(() => {
    if (sessions.length > 0) return sessions[Math.min(activeSession, sessions.length - 1)] ?? {}
    return root ?? {}
  }, [root, sessions, activeSession])

  const summary    = useMemo(() => d?.summary ?? batchSummary ?? {}, [d, batchSummary])
  const balances   = useMemo(() => d?.balances ?? {}, [d])
  const risk       = useMemo(() => d?.risk ?? {}, [d])
  const revenue    = useMemo(() => d?.revenue ?? {}, [d])
  const monthly    = useMemo(() => {
    const m = d?.monthly_data
    if (Array.isArray(m)) return m
    if (m?.months && Array.isArray(m.months)) return m.months
    return []
  }, [d])
  const mca        = useMemo(() => d?.mca_analysis ?? {}, [d])
  const debt       = useMemo(() => d?.debt_collector_analysis ?? {}, [d])
  const offer      = useMemo(() => d?.offer_preview ?? {}, [d])
  const comments   = useMemo(() => d?.comments ?? [], [d])
  const auditLog   = useMemo(() => d?.audit_log ?? [], [d])

  const txRaw      = useMemo(() => d?.transactions ?? {}, [d])
  const transactions = useMemo(() => {
    if (Array.isArray(txRaw)) return txRaw
    return txRaw?.items ?? txRaw?.data ?? txRaw?.transactions ?? []
  }, [txRaw])
  const txTotal     = pick(txRaw, 'transactions_total', 'total') ?? pick(d, 'transactions_total') ?? transactions.length
  const txTruncated = pick(txRaw, 'transactions_truncated') ?? pick(d, 'transactions_truncated') ?? false

  const filteredTx = useMemo(() => {
    if (!txSearch) return transactions
    const q = txSearch.toLowerCase()
    return transactions.filter((tx: any) => (tx.description ?? '').toLowerCase().includes(q))
  }, [transactions, txSearch])

  const hasSummary  = Object.keys(summary).length > 0
  const hasBalances = Object.keys(balances).length > 0
  const hasRisk     = Object.keys(risk).length > 0
  const hasRevenue  = Object.keys(revenue).length > 0
  const hasMca      = Object.keys(mca).length > 0
  const hasDebt     = Object.keys(debt).length > 0
  const hasOffer    = Object.keys(offer).length > 0

  const toggleSection = useCallback((val: string) => {
    setSelectedSections(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val])
  }, [])

  const handleSubmit = useCallback(async () => {
    const ids = sessionInput.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean)
    if (!ids.length) { toast.error('Enter at least one Session ID'); return }

    setLoading(true); setError(null); setData(null); setRawJson(''); setTxShowing(TX_BATCH); setTxSearch('')
    const payload: FullAnalysisRequest = { session_ids: ids }
    if (selectedSections.length > 0) payload.include = selectedSections
    if (txLimit && parseInt(txLimit) > 0) payload.transaction_limit = parseInt(txLimit)

    try {
      const res = await bankAnalysisViewerService.fetchAnalysis(payload)
      const body = res.data ?? {}
      setData(body)
      setRawJson(JSON.stringify(body, null, 2))
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [sessionInput, selectedSections, txLimit])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(rawJson)
    setCopied(true); toast.success('Copied'); setTimeout(() => setCopied(false), 2000)
  }, [rawJson])

  // Detect which top-level keys came back (for debug)
  const rootKeys = useMemo(() => root ? Object.keys(root) : [], [root])
  const sessionKeys = useMemo(() => d ? Object.keys(d) : [], [d])

  return (
    <div className="space-y-5 pb-10">

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Bank Analysis Viewer</h1>
            <p className="text-[11px] text-slate-400">Full Analysis API — Debug & Validation Tool</p>
          </div>
        </div>
        {root && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRaw(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                showRaw ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}>
              <Code2 size={13} /> {showRaw ? 'Hide JSON' : 'Raw JSON'}
            </button>
          </div>
        )}
      </div>

      {/* ── INPUT FORM ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-indigo-400" />
            <span className="text-sm font-bold text-white">Full Analysis Request</span>
            <span className="text-[10px] text-slate-500 ml-1 font-mono">ai.easify.app/api/v1</span>
          </div>
          <span className="text-[10px] text-slate-500">Balji Bank Statement Parser</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Session ID(s)</label>
            <textarea value={sessionInput} onChange={e => setSessionInput(e.target.value)} rows={2}
              placeholder="Paste one or more UUIDs — one per line or comma-separated"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit() }} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Include Sections</label>
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.map(s => (
                <button key={s.value} onClick={() => toggleSection(s.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition border ${
                    selectedSections.includes(s.value)
                      ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">Leave none selected to fetch all sections.</p>
          </div>
          <div className="flex items-end gap-4 pt-1">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Tx Limit</label>
              <input type="number" value={txLimit} onChange={e => setTxLimit(e.target.value)} min={1} max={5000}
                placeholder="5000"
                className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <button onClick={handleSubmit} disabled={loading || !sessionInput.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-300 text-white text-sm font-bold rounded-lg transition shadow-sm">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
              Analyze
            </button>
          </div>
        </div>
      </div>

      {/* ── ERROR ───────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">API Error</p>
            <p className="text-xs text-red-600 mt-0.5 break-all">{error}</p>
          </div>
        </div>
      )}

      {/* ── LOADING ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200 mb-4">
              <Loader2 size={28} className="animate-spin text-white" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Analyzing bank statements...</p>
            <p className="text-[11px] text-slate-400 mt-1">This may take up to 2 minutes</p>
          </div>
        </div>
      )}

      {/* ── RAW JSON ────────────────────────────────────────────────── */}
      {root && showRaw && (
        <div className="bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-700">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Code2 size={13} className="text-emerald-400" />
              <span className="text-xs font-bold text-slate-300">Raw Response</span>
              <span className="text-[10px] text-slate-500 font-mono">({rootKeys.length} keys: {rootKeys.join(', ')})</span>
            </div>
            <button onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded transition">
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-4 text-[11px] font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap break-words max-h-[600px] overflow-auto">
            {rawJson}
          </pre>
        </div>
      )}

      {/* ── RESULTS ─────────────────────────────────────────────────── */}
      {root && !loading && (
        <>
          {/* ═══ SESSION TABS ═══ */}
          {sessions.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 flex items-center gap-2">
                <Database size={14} className="text-white/80" />
                <span className="text-xs font-bold text-white">{sessions.length} Sessions Found</span>
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                {sessions.map((s: any, i: number) => (
                  <button key={i} onClick={() => { setActiveSession(i); setTxShowing(TX_BATCH); setTxSearch('') }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition border ${
                      activeSession === i
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                    }`}>
                    <span className="font-mono text-[10px] block">{s.session_id ?? `Session ${i + 1}`}</span>
                    {s.bank_name && <span className="block text-[10px] text-slate-400 mt-0.5">{s.bank_name}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ BATCH SUMMARY (multi-session) ═══ */}
          {sessions.length > 1 && Object.keys(batchSummary).length > 0 && (
            <ColoredSection title="Batch Summary (All Sessions)" icon={BarChart3} color="bg-gradient-to-r from-purple-600 to-indigo-600" borderColor="border-purple-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {pick(batchSummary, 'total_credits', 'credit_amount') != null && (
                  <StatBox label="Total Credits" value={fmt(pick(batchSummary, 'total_credits', 'credit_amount'), 2)}
                    icon={ArrowUpRight} color="text-emerald-600" borderColor="border-emerald-200" />
                )}
                {pick(batchSummary, 'total_debits', 'debit_amount') != null && (
                  <StatBox label="Total Debits" value={fmt(pick(batchSummary, 'total_debits', 'debit_amount'), 2)}
                    icon={ArrowDownRight} color="text-red-600" borderColor="border-red-200" />
                )}
                {pick(batchSummary, 'total_transactions') != null && (
                  <StatBox label="Total Transactions" value={fmtNum(pick(batchSummary, 'total_transactions'))} icon={Hash} />
                )}
                {pick(batchSummary, 'net_balance') != null && (
                  <StatBox label="Net Balance" value={fmt(pick(batchSummary, 'net_balance'), 2)} icon={DollarSign}
                    color={num(pick(batchSummary, 'net_balance')) >= 0 ? 'text-emerald-600' : 'text-red-600'}
                    borderColor={num(pick(batchSummary, 'net_balance')) >= 0 ? 'border-emerald-200' : 'border-red-200'} />
                )}
              </div>
              {/* Render any remaining batch_summary keys as a simple grid */}
              {(() => {
                const shown = new Set(['total_credits', 'credit_amount', 'total_debits', 'debit_amount', 'total_transactions', 'net_balance'])
                const rest = Object.entries(batchSummary).filter(([k]) => !shown.has(k))
                if (!rest.length) return null
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {rest.map(([k, v]) => (
                      <StatBox key={k} label={k.replace(/_/g, ' ')} value={typeof v === 'number' ? (k.includes('amount') || k.includes('balance') || k.includes('credit') || k.includes('debit') || k.includes('revenue') ? fmt(v, 2) : fmtNum(v)) : String(v ?? '—')} />
                    ))}
                  </div>
                )
              })()}
            </ColoredSection>
          )}

          {/* ═══ SESSION HEADER ═══ */}
          {sessions.length > 1 && (
            <div className="flex items-center gap-2 pt-1">
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Session: <span className="text-indigo-600 font-mono">{d?.session_id ?? `#${activeSession + 1}`}</span>
                {d?.bank_name && <span className="text-slate-400 ml-2 normal-case font-sans">{d.bank_name}</span>}
              </p>
            </div>
          )}

          {/* ═══ A. SUMMARY ═══ */}
          {hasSummary && (
            <ColoredSection title="Summary Overview" icon={BarChart3} color="bg-gradient-to-r from-blue-600 to-blue-700" borderColor="border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Total Transactions" value={fmtNum(pick(summary, 'total_transactions'))} icon={Hash} color="text-slate-800" />
                <StatBox label="Total Credits" value={fmt(pick(summary, 'total_credits', 'credit_amount'), 2)}
                  icon={ArrowUpRight} color="text-emerald-600" borderColor="border-emerald-200"
                  sub={pick(summary, 'credit_count') ? `${fmtNum(pick(summary, 'credit_count'))} txns` : undefined} />
                <StatBox label="Total Debits" value={fmt(pick(summary, 'total_debits', 'debit_amount'), 2)}
                  icon={ArrowDownRight} color="text-red-600" borderColor="border-red-200"
                  sub={pick(summary, 'debit_count') ? `${fmtNum(pick(summary, 'debit_count'))} txns` : undefined} />
                <StatBox label="Net Balance" value={fmt((pick(summary, 'net_balance') ?? (num(pick(summary, 'total_credits', 'credit_amount')) - num(pick(summary, 'total_debits', 'debit_amount')))) || 0, 2)}
                  icon={DollarSign}
                  color={num(pick(summary, 'net_balance')) >= 0 ? 'text-emerald-600' : 'text-red-600'}
                  borderColor={num(pick(summary, 'net_balance')) >= 0 ? 'border-emerald-200' : 'border-red-200'} />
              </div>
              {(pick(summary, 'returned_count') != null || pick(summary, 'nsf_count') != null || summary.date_range) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {pick(summary, 'returned_count') != null && (
                    <StatBox label="Returned Items" value={fmtNum(summary.returned_count)} icon={XCircle} color="text-amber-600" borderColor="border-amber-200" />
                  )}
                  {pick(summary, 'nsf_count', 'nsf_fee_count') != null && (
                    <StatBox label="NSF Count" value={fmtNum(pick(summary, 'nsf_count', 'nsf_fee_count'))} icon={AlertTriangle} color="text-red-600" borderColor="border-red-200" />
                  )}
                  {summary.date_range && (
                    <div className="col-span-2 bg-gray-50 rounded-lg p-3.5 border border-slate-200 flex items-center gap-3">
                      <Clock size={16} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Statement Period</p>
                        <p className="text-sm font-semibold text-slate-700">{summary.date_range.start} — {summary.date_range.end}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ColoredSection>
          )}

          {/* ═══ B. BALANCES ═══ */}
          {hasBalances && (
            <ColoredSection title="Balance Details" icon={Landmark} color="bg-gradient-to-r from-violet-600 to-violet-700" borderColor="border-violet-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Beginning Balance" value={fmt(pick(balances, 'beginning_balance'), 2)} color="text-slate-800" />
                <StatBox label="Ending Balance" value={fmt(pick(balances, 'ending_balance'), 2)} color="text-slate-800" />
                <StatBox label="Avg Daily Balance" value={fmt(pick(balances, 'average_daily_balance'), 2)} color="text-indigo-600" borderColor="border-indigo-200" />
                {(() => {
                  const neg = num(pick(balances, 'negative_balance_days', 'negative_days'))
                  return (
                    <StatBox label="Negative Balance Days" value={String(neg)} icon={AlertTriangle}
                      color={neg > 0 ? 'text-red-600' : 'text-emerald-600'} borderColor={neg > 0 ? 'border-red-200' : 'border-emerald-200'} />
                  )
                })()}
              </div>
              {(pick(balances, 'lowest_balance') != null || pick(balances, 'highest_balance') != null || pick(balances, 'average_ledger_balance') != null) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {pick(balances, 'lowest_balance') != null && (
                    <StatBox label="Lowest Balance" value={fmt(balances.lowest_balance, 2)} color="text-red-600" borderColor="border-red-200" />
                  )}
                  {pick(balances, 'highest_balance') != null && (
                    <StatBox label="Highest Balance" value={fmt(balances.highest_balance, 2)} color="text-emerald-600" borderColor="border-emerald-200" />
                  )}
                  {pick(balances, 'average_ledger_balance') != null && (
                    <StatBox label="Avg Ledger Balance" value={fmt(balances.average_ledger_balance, 2)} color="text-slate-700" />
                  )}
                </div>
              )}
            </ColoredSection>
          )}

          {/* ═══ C. RISK ═══ */}
          {hasRisk && (
            <ColoredSection title="Risk Assessment" icon={ShieldAlert}
              color={num(pick(risk, 'risk_score', 'score')) >= 70
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700'
                : num(pick(risk, 'risk_score', 'score')) >= 40
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                  : 'bg-gradient-to-r from-red-600 to-red-700'}
              borderColor={num(pick(risk, 'risk_score', 'score')) >= 70 ? 'border-emerald-200' : num(pick(risk, 'risk_score', 'score')) >= 40 ? 'border-amber-200' : 'border-red-200'}>
              <div className="flex flex-wrap gap-8 items-start">
                <RiskGauge score={num(pick(risk, 'risk_score', 'score'))} grade={String(pick(risk, 'risk_grade', 'grade') ?? 'N/A')} />
                {(() => {
                  const factors: any[] = pick(risk, 'risk_factors', 'factors') ?? []
                  if (!factors.length) return null
                  return (
                    <div className="flex-1 min-w-[240px]">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Risk Factors</p>
                      <div className="space-y-2">
                        {factors.map((f: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                            <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                            <span className="text-xs text-red-800 font-medium">
                              {typeof f === 'string' ? f : (f.description ?? f.factor ?? JSON.stringify(f))}
                            </span>
                            {typeof f === 'object' && f.severity && (
                              <Pill variant={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'yellow' : 'gray'}>{f.severity}</Pill>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </ColoredSection>
          )}

          {/* ═══ D. REVENUE ═══ */}
          {hasRevenue && (
            <ColoredSection title="Revenue Analysis" icon={TrendingUp} color="bg-gradient-to-r from-emerald-600 to-teal-600" borderColor="border-emerald-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <StatBox label="True Revenue" value={fmt(pick(revenue, 'true_revenue', 'total_revenue'), 2)}
                  icon={DollarSign} color="text-emerald-600" borderColor="border-emerald-200" />
                <div className="bg-gray-50 rounded-lg p-3.5 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={13} className="text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue Decline</p>
                  </div>
                  {(() => {
                    const decline = pick(revenue, 'revenue_decline_alert', 'decline_alert')
                    return <Pill variant={decline ? 'red' : 'green'}>{decline ? 'Yes — Declining' : 'No Decline'}</Pill>
                  })()}
                </div>
                {pick(revenue, 'average_monthly_revenue') != null && (
                  <StatBox label="Avg Monthly Revenue" value={fmt(revenue.average_monthly_revenue, 2)} icon={BarChart3} color="text-slate-700" />
                )}
              </div>
              {/* Monthly velocity table */}
              {(() => {
                const vel: any = pick(revenue, 'monthly_velocity', 'monthly_revenue') ?? []
                const items = Array.isArray(vel) ? vel : Object.entries(vel).map(([month, val]) => (
                  typeof val === 'object' ? { month, ...(val as any) } : { month, revenue: val }
                ))
                if (!items.length) return null
                return (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Velocity</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b-2 border-slate-100">
                          <th className="text-left py-2 px-3 text-[10px] font-bold text-slate-400 uppercase">Month</th>
                          <th className="text-right py-2 px-3 text-[10px] font-bold text-slate-400 uppercase">Revenue</th>
                        </tr></thead>
                        <tbody>
                          {items.map((m: any, i: number) => (
                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-700">{m.month ?? '—'}</td>
                              <td className="py-2 px-3 text-right text-emerald-600 font-bold">{fmt(m.revenue ?? m.amount ?? 0, 2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </ColoredSection>
          )}

          {/* ═══ E. MONTHLY DATA ═══ */}
          {monthly.length > 0 && (
            <ColoredSection title="Monthly Breakdown" icon={BarChart3} color="bg-gradient-to-r from-sky-600 to-cyan-600" borderColor="border-sky-200" defaultOpen={false} badge={monthly.length}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b-2 border-slate-100">
                    {['Month', 'Credits', 'Debits', 'Net', 'Txns', 'Avg Balance'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {monthly.map((m: any, i: number) => {
                      const cr = num(pick(m, 'total_credits', 'credits'))
                      const dr = num(pick(m, 'total_debits', 'debits'))
                      return (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-700">{pick(m, 'month', 'period') ?? '—'}</td>
                          <td className="py-2 px-3 text-emerald-600 font-medium">{fmt(cr, 2)}</td>
                          <td className="py-2 px-3 text-red-600 font-medium">{fmt(dr, 2)}</td>
                          <td className={`py-2 px-3 font-bold ${cr - dr >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(cr - dr, 2)}</td>
                          <td className="py-2 px-3 text-slate-600">{fmtNum(pick(m, 'transaction_count', 'total_transactions'))}</td>
                          <td className="py-2 px-3 text-slate-600">{fmt(pick(m, 'average_daily_balance', 'avg_balance'), 2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </ColoredSection>
          )}

          {/* ═══ F. MCA ANALYSIS ═══ */}
          {hasMca && (
            <ColoredSection title="MCA Analysis" icon={CreditCard} color="bg-gradient-to-r from-rose-600 to-pink-600" borderColor="border-rose-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <StatBox label="Total MCA Payments" value={fmt(pick(mca, 'total_mca_payments', 'total_payments'), 2)}
                  icon={Banknote} color="text-red-600" borderColor="border-red-200" />
                {pick(mca, 'lender_count', 'mca_count', 'total_mca_count') != null && (
                  <StatBox label="MCA Lenders" value={fmtNum(pick(mca, 'lender_count', 'mca_count', 'total_mca_count'))}
                    icon={Building2} color="text-slate-700" />
                )}
                {pick(mca, 'estimated_monthly_mca') != null && (
                  <StatBox label="Est. Monthly MCA" value={fmt(mca.estimated_monthly_mca, 2)} icon={Receipt} color="text-amber-600" borderColor="border-amber-200" />
                )}
              </div>
              {(() => {
                const lenders: any[] = pick(mca, 'lenders', 'mca_lenders') ?? []
                if (!lenders.length) return null
                return (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lender Breakdown</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b-2 border-slate-100">
                          {['Lender Name', 'Total', 'Count', 'Avg Payment'].map(h => (
                            <th key={h} className="text-left py-2 px-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {lenders.map((l: any, i: number) => (
                            <tr key={i} className="border-b border-slate-50 hover:bg-red-50/30">
                              <td className="py-2 px-3 font-semibold text-slate-700">{typeof l === 'string' ? l : pick(l, 'name', 'lender_name') ?? '—'}</td>
                              <td className="py-2 px-3 text-red-600 font-bold">{fmt(typeof l === 'object' ? pick(l, 'total_amount', 'total_payments') : 0, 2)}</td>
                              <td className="py-2 px-3 text-slate-600">{typeof l === 'object' ? pick(l, 'payment_count', 'count') ?? '—' : '—'}</td>
                              <td className="py-2 px-3 text-slate-600">{fmt(typeof l === 'object' ? pick(l, 'average_payment', 'avg_payment') : 0, 2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </ColoredSection>
          )}

          {/* ═══ G. DEBT COLLECTORS ═══ */}
          {hasDebt && (
            <ColoredSection title="Debt Collector Activity" icon={Users} color="bg-gradient-to-r from-orange-600 to-orange-700" borderColor="border-orange-200" defaultOpen={false}>
              {(() => {
                const collectors: any[] = pick(debt, 'collectors', 'debt_collectors') ?? (Array.isArray(debt) ? debt : [])
                if (!collectors.length) return <p className="text-sm text-emerald-600 font-semibold flex items-center gap-2"><CheckCircle2 size={16} /> No debt collector activity detected</p>
                return (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b-2 border-slate-100">
                      {['Collector', 'Total Amount', 'Count'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {collectors.map((c: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-orange-50/30">
                          <td className="py-2 px-3 font-semibold text-slate-700">{typeof c === 'string' ? c : pick(c, 'name', 'collector_name') ?? '—'}</td>
                          <td className="py-2 px-3 text-red-600 font-bold">{fmt(typeof c === 'object' ? c.total_amount : 0, 2)}</td>
                          <td className="py-2 px-3 text-slate-600">{typeof c === 'object' ? pick(c, 'count', 'transaction_count') ?? '—' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </ColoredSection>
          )}

          {/* ═══ H. OFFER PREVIEW ═══ */}
          {hasOffer && (
            <ColoredSection title="Offer Preview" icon={Zap} color="bg-gradient-to-r from-indigo-600 to-purple-600" borderColor="border-indigo-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-200">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Advance Amount</p>
                  <p className="text-2xl font-black text-indigo-700 mt-1">{fmt(pick(offer, 'advance_amount', 'advance'), 2)}</p>
                </div>
                <StatBox label="Factor Rate" value={String(pick(offer, 'factor_rate') ?? '—')} icon={TrendingUp} />
                <StatBox label="Payback Amount" value={fmt(pick(offer, 'payback_amount', 'payback'), 2)} icon={Banknote} />
                {pick(offer, 'daily_payment', 'estimated_daily_payment') != null && (
                  <StatBox label="Daily Payment" value={fmt(pick(offer, 'daily_payment', 'estimated_daily_payment'), 2)} icon={Receipt} />
                )}
              </div>
              {(pick(offer, 'term_days', 'estimated_term') != null || pick(offer, 'hold_percentage') != null) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {pick(offer, 'term_days', 'estimated_term') != null && (
                    <StatBox label="Term (Days)" value={String(pick(offer, 'term_days', 'estimated_term'))} icon={Clock} />
                  )}
                  {pick(offer, 'hold_percentage') != null && (
                    <StatBox label="Hold %" value={`${offer.hold_percentage}%`} />
                  )}
                </div>
              )}
            </ColoredSection>
          )}

          {/* ═══ I. TRANSACTIONS TABLE ═══ */}
          {transactions.length > 0 && (
            <ColoredSection title={`Transactions${txTruncated ? ' (truncated)' : ''}`} icon={FileText}
              color="bg-gradient-to-r from-slate-700 to-slate-800" borderColor="border-slate-300" badge={txTotal}>
              {/* Search bar */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={txSearch} onChange={e => setTxSearch(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-300" />
                </div>
                <span className="text-[10px] text-slate-400">{filteredTx.length} results</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    {['#', 'Date', 'Description', 'Amount', 'Type', 'Category', 'MCA'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredTx.slice(0, txShowing).map((tx: any, i: number) => {
                      const amount = num(tx.amount)
                      const type = (tx.type ?? tx.transaction_type ?? '').toLowerCase()
                      const isMca = tx.is_mca || tx.mca_flag
                      return (
                        <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 ${isMca ? 'bg-red-50/40' : ''}`}>
                          <td className="py-2 px-3 text-[10px] text-slate-400 font-mono">{i + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-700 text-xs">{tx.date ?? tx.transaction_date ?? '—'}</td>
                          <td className="py-2 px-3 max-w-[300px] truncate text-slate-700 text-xs" title={tx.description}>{tx.description ?? '—'}</td>
                          <td className={`py-2 px-3 font-mono font-bold whitespace-nowrap text-xs ${amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmt(Math.abs(amount), 2)}
                          </td>
                          <td className="py-2 px-3">
                            <Pill variant={type === 'credit' ? 'green' : type === 'debit' ? 'red' : 'gray'}>{type || '—'}</Pill>
                          </td>
                          <td className="py-2 px-3"><Pill variant="blue">{tx.category ?? '—'}</Pill></td>
                          <td className="py-2 px-3 text-center">
                            {isMca ? <Pill variant="red">MCA</Pill> : <Minus size={14} className="text-slate-300 mx-auto" />}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {filteredTx.length > txShowing && (
                <div className="text-center pt-4">
                  <p className="text-[10px] text-slate-400 mb-2">Showing {Math.min(txShowing, filteredTx.length)} of {filteredTx.length}</p>
                  <button onClick={() => setTxShowing(p => p + TX_BATCH)}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition">
                    Load More
                  </button>
                </div>
              )}
            </ColoredSection>
          )}

          {/* ═══ J. COMMENTS ═══ */}
          {Array.isArray(comments) && comments.length > 0 && (
            <ColoredSection title="Comments" icon={FileText} color="bg-gradient-to-r from-teal-600 to-teal-700" borderColor="border-teal-200" defaultOpen={false} badge={comments.length}>
              <div className="space-y-3">
                {comments.map((c: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-teal-500 shrink-0" />
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-sm text-slate-700">
                        {typeof c === 'string' ? c : (c.text ?? c.comment ?? c.content ?? JSON.stringify(c))}
                      </p>
                      {typeof c === 'object' && (c.created_at || c.date || c.user || c.author) && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {c.created_at ?? c.date ?? ''}
                          {(c.user || c.author) && <> — <strong>{c.user ?? c.author}</strong></>}
                          {c.type && <> · <Pill>{c.type}</Pill></>}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ColoredSection>
          )}

          {/* ═══ K. AUDIT LOG ═══ */}
          {Array.isArray(auditLog) && auditLog.length > 0 && (
            <ColoredSection title="Audit Log" icon={Clock} color="bg-gradient-to-r from-gray-600 to-gray-700" borderColor="border-gray-300" defaultOpen={false} badge={auditLog.length}>
              <div className="space-y-2">
                {auditLog.map((entry: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <Clock size={12} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-700 font-medium">
                        {typeof entry === 'string' ? entry : (entry.action ?? entry.event ?? entry.message ?? JSON.stringify(entry))}
                      </p>
                      {typeof entry === 'object' && (entry.created_at || entry.timestamp || entry.user) && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {entry.created_at ?? entry.timestamp ?? entry.date ?? ''}
                          {entry.user && <> — {entry.user}</>}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ColoredSection>
          )}

          {/* ═══ DATA KEYS DEBUG ═══ */}
          {!hasSummary && !hasBalances && !hasRisk && !hasRevenue && !hasMca && !hasOffer && transactions.length === 0 && !hasSessions && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">No structured sections found</p>
                  <p className="text-xs text-amber-700 mt-1">Root keys: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">{rootKeys.join(', ') || 'none'}</code></p>
                  {sessionKeys.length > 0 && (
                    <p className="text-xs text-amber-700 mt-1">Session keys: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">{sessionKeys.join(', ')}</code></p>
                  )}
                  <p className="text-xs text-amber-600 mt-1">Toggle "Raw JSON" to see the full response.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
