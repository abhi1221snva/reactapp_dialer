import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, FileText, ArrowLeft, RefreshCw, AlertCircle,
  BarChart3, ShieldAlert, DollarSign, TrendingUp,
  AlertTriangle, Banknote, Calendar,
  CheckCircle2, XCircle, Search,
  ArrowUpRight, ArrowDownRight, Timer, Receipt, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import toast from 'react-hot-toast'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { bankStatementService, type BankStatementSession } from '../../services/bankStatement.service'
import { cn } from '../../utils/cn'

// ── Helpers ──────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  pending:    { label: 'Pending',    bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Timer },
  processing: { label: 'Processing', bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     icon: Loader2 },
  completed:  { label: 'Completed',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  failed:     { label: 'Failed',     bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: XCircle },
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.pending
  const Icon = c.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border', c.bg, c.text, c.border)}>
      <Icon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
      {c.label}
    </span>
  )
}

function fmt(n: number | string | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || n === '') return '$0'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)
}

function fmtNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '0'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('en-US').format(num)
}

function fmtCompact(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '$0'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '$0'
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function num(v: any): number {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isNaN(n) ? 0 : n
}

// ── Colored Section ─────────────────────────────────────────────────────────────

function ColoredSection({ title, color, borderColor, children, defaultOpen = true }: {
  title: string; color: string; borderColor: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={cn('rounded-lg border-2 overflow-hidden', borderColor)}>
      <div
        className={cn('px-4 py-2.5 flex items-center justify-between cursor-pointer select-none', color)}
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {open ? <ChevronUp size={16} className="text-white/80" /> : <ChevronDown size={16} className="text-white/80" />}
      </div>
      {open && children}
    </div>
  )
}

// ── Stat Box ────────────────────────────────────────────────────────────────────

function StatBox({ label, value, borderColor, className }: {
  label: string; value: React.ReactNode; borderColor?: string; className?: string
}) {
  return (
    <div className={cn(
      'bg-gray-50 rounded-lg p-3 text-center border',
      borderColor ?? 'border-gray-200',
      className,
    )}>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
    </div>
  )
}

// ── Chart Tooltip ────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}</span>
          <span className="font-bold text-slate-700 ml-auto">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── PIE COLORS ──────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1']

// ── Main Page ────────────────────────────────────────────────────────────────────

export function CrmBankStatementDetail() {
  useCrmHeader()
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [txTab, setTxTab] = useState<'all' | 'credit' | 'debit'>('all')
  const [txSearch, setTxSearch] = useState('')

  const { data: session, isLoading } = useQuery<BankStatementSession | null>({
    queryKey: ['bank-statement-detail', sessionId],
    queryFn: async () => {
      const res = await bankStatementService.getAll({ per_page: 500 })
      const payload = res.data?.data ?? res.data ?? {}
      const sessions = (payload.sessions ?? payload.data ?? []) as BankStatementSession[]
      return sessions.find(s => s.session_id === sessionId) ?? null
    },
    refetchInterval: (query) => {
      const s = query.state.data
      return s && (s.status === 'pending' || s.status === 'processing') ? 5000 : false
    },
  })

  const refreshMut = useMutation({
    mutationFn: () => bankStatementService.refresh(session?.lead_id ?? 0, sessionId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-statement-detail', sessionId] }); toast.success('Refreshed') },
    onError: () => toast.error('Refresh failed'),
  })

  const leadId = session?.lead_id ?? 0
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['bs-transactions', sessionId, txTab],
    queryFn: async () => {
      if (!leadId) return []
      const params: Record<string, string> = {}
      if (txTab !== 'all') params.type = txTab
      const res = await bankStatementService.getTransactions(leadId, sessionId!, params)
      return res.data?.data ?? []
    },
    enabled: session?.status === 'completed' && !!leadId,
  })
  const transactions = (txData ?? []) as Record<string, any>[]
  const filteredTx = txSearch
    ? transactions.filter(tx => (tx.description ?? '').toLowerCase().includes(txSearch.toLowerCase()))
    : transactions

  // ── Loading / Empty ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Loader2 size={28} className="animate-spin text-green-500" />
        <p className="text-sm text-gray-500">Loading analysis...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
          <AlertCircle size={28} className="text-gray-300" />
        </div>
        <p className="text-base font-semibold text-gray-600">Session Not Found</p>
        <button onClick={() => navigate('/crm/bank-statements')}
          className="text-sm text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Sessions
        </button>
      </div>
    )
  }

  // ── Parse ───────────────────────────────────────────────────────────────

  const summary = (typeof session.summary_data === 'string' ? JSON.parse(session.summary_data) : session.summary_data) as Record<string, any> | null
  const mca = (typeof session.mca_analysis === 'string' ? JSON.parse(session.mca_analysis) : session.mca_analysis) as Record<string, any> | null
  const monthlyRaw = (typeof session.monthly_data === 'string' ? JSON.parse(session.monthly_data) : session.monthly_data) as Record<string, any> | null
  const monthly = (monthlyRaw?.months ?? (Array.isArray(monthlyRaw) ? monthlyRaw : [])) as Record<string, any>[]

  const fraudScore = summary?.fraud_score ?? session.fraud_score
  const nsfCount = summary?.nsf?.nsf_fee_count ?? summary?.nsf_count ?? session.nsf_count ?? 0
  const mcaDetected = mca?.total_mca_count > 0
  const mcaLenders = mca?.lenders ?? []
  const revenue = summary?.true_revenue ?? session.total_revenue
  const deposits = summary?.total_credits ?? session.total_deposits
  const totalDebits = summary?.total_debits ?? 0
  const avgDailyBal = summary?.average_daily_balance ?? 0
  const avgLedgerBal = summary?.average_ledger_balance ?? summary?.ending_balance ?? 0
  const adjustments = summary?.adjustments ?? 0
  const totalTx = summary?.total_transactions ?? 0
  const tierLabel = (session.model_tier ?? '').replace('lsc_', 'LSC ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-8">

      {/* ─── Header Bar ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/crm/bank-statements')}
              className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition shrink-0">
              <ArrowLeft size={16} className="text-gray-500" />
            </button>
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 truncate">{session.file_name ?? 'Unnamed'}</h2>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={11} /> {fmtDateTime(session.created_at)}</span>
                {session.lead_id && (
                  <button onClick={() => navigate(`/crm/leads/${session.lead_id}`)}
                    className="text-xs text-green-600 hover:underline font-bold flex items-center gap-0.5">
                    Lead #{session.lead_id}<ArrowUpRight size={10} />
                  </button>
                )}
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-semibold">{tierLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {session.status === 'completed' && leadId > 0 && (
              <button onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                <RefreshCw size={12} className={refreshMut.isPending ? 'animate-spin' : ''} />Re-sync
              </button>
            )}
            <StatusPill status={session.status} />
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
      </div>

      {/* ─── Processing Banner ───────────────────────────────────────────── */}
      {(session.status === 'pending' || session.status === 'processing') && (
        <div className="flex items-center gap-3 bg-blue-50 border-2 border-blue-200 rounded-lg px-5 py-4">
          <Loader2 size={20} className="text-blue-600 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-900">Analysis in Progress</p>
            <p className="text-xs text-blue-600 mt-0.5">Typically 15-60 seconds. Page auto-refreshes when ready.</p>
          </div>
        </div>
      )}

      {/* ─── Failed Banner ───────────────────────────────────────────────── */}
      {session.status === 'failed' && (
        <div className="flex items-center gap-3 bg-red-50 border-2 border-red-200 rounded-lg px-5 py-4">
          <XCircle size={20} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-900">Analysis Failed</p>
            <p className="text-xs text-red-600 mt-0.5">{session.error_message || 'Unknown error'}</p>
          </div>
        </div>
      )}

      {/* ─── Completed Content ───────────────────────────────────────────── */}
      {session.status === 'completed' && (
        <>
          {/* ═══ Combined Analysis Summary ════════════════════════════════════ */}
          <div className="rounded-lg border-2 border-green-500 overflow-hidden">
            <div className="bg-green-600 px-4 py-2.5">
              <h3 className="text-sm font-bold text-white">Combined Analysis Summary</h3>
            </div>
            <div className="bg-white p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                <StatBox label="Total Transactions" value={fmtNum(totalTx)} />
                <StatBox label="Total Deposits" value={fmt(deposits)} />
                <StatBox label="Adjustments" value={fmt(adjustments)} />
                <StatBox label="True Revenue" value={fmt(revenue)} borderColor="border-green-300" />
                <StatBox label="Total Debits" value={fmt(totalDebits)} />
                <StatBox label="NSF/OD Fees" value={fmtNum(nsfCount)} borderColor={nsfCount > 0 ? 'border-amber-300' : undefined} />
                <StatBox label="Avg Daily Balance" value={fmt(avgDailyBal)} borderColor="border-blue-300" />
                <StatBox label="Avg Ledger Balance" value={fmt(avgLedgerBal)} borderColor="border-indigo-300" />
              </div>
            </div>
          </div>

          {/* ═══ Monthly Bank Details ══════════════════════════════════════════ */}
          {monthly.length > 0 && <MonthlySection monthly={monthly} />}

          {/* ═══ MCA Detection ════════════════════════════════════════════════ */}
          {mcaDetected && <McaSection mca={mca!} lenders={mcaLenders} />}

          {/* ═══ MCA Offer Calculator ═════════════════════════════════════════ */}
          {mcaDetected && monthlyRaw?.mca_capacity && <McaCalculatorSection capacity={monthlyRaw.mca_capacity} revenue={num(revenue)} />}

          {/* ═══ Category Distribution ════════════════════════════════════════ */}
          {summary && <CategorySection summary={summary} transactions={transactions} />}

          {/* ═══ Transactions ═════════════════════════════════════════════════ */}
          {leadId > 0 && (
            <TransactionsSection
              txTab={txTab}
              setTxTab={setTxTab}
              txSearch={txSearch}
              setTxSearch={setTxSearch}
              txLoading={txLoading}
              filteredTx={filteredTx}
            />
          )}
        </>
      )}
    </div>
  )
}

// ── Monthly Bank Details Section ────────────────────────────────────────────────

function MonthlySection({ monthly }: { monthly: Record<string, any>[] }) {
  // Compute totals and averages
  const totals = useMemo(() => {
    const t = { deposits: 0, adjustments: 0, true_revenue: 0, avg_daily_balance: 0, nsf: 0, deposit_count: 0, negative_days: 0, debits: 0 }
    for (const m of monthly) {
      t.deposits += num(m.deposits)
      t.adjustments += num(m.adjustments)
      t.true_revenue += num(m.true_revenue)
      t.avg_daily_balance += num(m.avg_daily_balance ?? m.average_daily_balance)
      t.nsf += num(m.nsf?.nsf_fee_count ?? m.nsf_count)
      t.deposit_count += num(m.deposit_count ?? m.credit_count)
      t.negative_days += num(m.negative_days)
      t.debits += num(m.debits ?? m.total_debits)
    }
    return t
  }, [monthly])

  const avg = useMemo(() => {
    const n = monthly.length || 1
    return {
      deposits: totals.deposits / n,
      adjustments: totals.adjustments / n,
      true_revenue: totals.true_revenue / n,
      avg_daily_balance: totals.avg_daily_balance / n,
      nsf: totals.nsf / n,
      deposit_count: totals.deposit_count / n,
      negative_days: totals.negative_days / n,
      debits: totals.debits / n,
    }
  }, [totals, monthly.length])

  return (
    <ColoredSection title="Monthly Bank Details" color="bg-green-600" borderColor="border-green-500">
      <div className="bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-green-50 border-b border-green-200">
              <th className="px-4 py-2.5 text-left text-xs font-bold text-green-800 uppercase tracking-wide">Month</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">Monthly Deposits</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">Adjustments</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">True Revenue</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">Avg Daily Bal</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-green-800 uppercase tracking-wide">NSF</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-green-800 uppercase tracking-wide"># Deposits</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-green-800 uppercase tracking-wide">Neg Days</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">Total Debits</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m: any, i: number) => (
              <tr key={i} className={cn('border-b border-gray-100 hover:bg-green-50/40 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{m.month_name ?? m.month_key}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-700 font-medium">{fmt(m.deposits)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-gray-600">{fmt(m.adjustments)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-gray-900 font-bold">{fmt(m.true_revenue)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-blue-700">{fmt(m.avg_daily_balance ?? m.average_daily_balance)}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={cn('inline-block min-w-[24px] px-1.5 py-0.5 rounded text-xs font-bold',
                    num(m.nsf?.nsf_fee_count ?? m.nsf_count) > 0 ? 'bg-amber-100 text-amber-800' : 'text-gray-400'
                  )}>{num(m.nsf?.nsf_fee_count ?? m.nsf_count)}</span>
                </td>
                <td className="px-3 py-2.5 text-center text-sm text-gray-600 font-medium">{num(m.deposit_count ?? m.credit_count)}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={cn('inline-block min-w-[24px] px-1.5 py-0.5 rounded text-xs font-bold',
                    num(m.negative_days) > 0 ? 'bg-red-100 text-red-800' : 'text-gray-400'
                  )}>{num(m.negative_days)}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-600 font-medium">{fmt(m.debits ?? m.total_debits)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Total Row */}
            <tr className="bg-green-100 border-t-2 border-green-300 font-bold">
              <td className="px-4 py-2.5 text-sm font-bold text-green-900">Total</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">{fmt(totals.deposits)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">{fmt(totals.adjustments)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">{fmt(totals.true_revenue)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">—</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-900 font-bold">{totals.nsf}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-900 font-bold">{totals.deposit_count}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-900 font-bold">{totals.negative_days}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">{fmt(totals.debits)}</td>
            </tr>
            {/* Monthly Average Row */}
            <tr className="bg-green-50 font-semibold">
              <td className="px-4 py-2.5 text-sm font-semibold text-green-800">Monthly Average</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.deposits)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.adjustments)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.true_revenue)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.avg_daily_balance)}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-800 font-semibold">{avg.nsf.toFixed(1)}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-800 font-semibold">{avg.deposit_count.toFixed(1)}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-800 font-semibold">{avg.negative_days.toFixed(1)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.debits)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ColoredSection>
  )
}

// ── MCA Detection Section ───────────────────────────────────────────────────────

function McaSection({ mca, lenders }: { mca: Record<string, any>; lenders: any[] }) {
  return (
    <ColoredSection title="MCA Detection" color="bg-red-600" borderColor="border-red-500">
      <div className="bg-white p-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatBox label="MCAs Detected" value={mca.total_mca_count ?? lenders.length} borderColor="border-red-300" />
          <StatBox label="Est. Monthly Payments" value={fmt(mca.total_mca_payments)} borderColor="border-red-300" />
          <StatBox label="Total MCA Amount" value={fmt(mca.total_mca_amount)} borderColor="border-red-300" />
          <StatBox label="Risk Level" value={
            (mca.total_mca_count ?? 0) >= 3 ? 'High' : (mca.total_mca_count ?? 0) >= 1 ? 'Medium' : 'Low'
          } borderColor="border-red-300" />
        </div>

        {/* Lenders table */}
        {lenders.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-red-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50">
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-red-800 uppercase tracking-wide">Lender</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold text-red-800 uppercase tracking-wide">Est. Payment</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold text-red-800 uppercase tracking-wide">Total Amount</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-red-800 uppercase tracking-wide">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {lenders.map((l: any, i: number) => (
                  <tr key={i} className={cn('border-b border-red-100 last:border-0', i % 2 === 0 ? 'bg-white' : 'bg-red-50/30')}>
                    <td className="px-4 py-2.5 text-sm font-semibold text-red-800 flex items-center gap-2">
                      <ShieldAlert size={14} className="text-red-400 shrink-0" />
                      {l.name ?? l.lender ?? `Lender ${i + 1}`}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-700 font-medium">{l.estimated_payment ? fmt(l.estimated_payment) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-600">{l.total_amount ? fmt(l.total_amount) : '—'}</td>
                    <td className="px-3 py-2.5 text-center text-sm text-red-600">{l.frequency ?? 'Daily'}</td>
                  </tr>
                ))}
              </tbody>
              {(mca.total_mca_payments > 0 || mca.total_mca_amount > 0) && (
                <tfoot>
                  <tr className="bg-red-100 border-t-2 border-red-300 font-bold">
                    <td className="px-4 py-2.5 text-sm font-bold text-red-900">Total</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-900 font-bold">{fmt(mca.total_mca_payments)}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-900 font-bold">{fmt(mca.total_mca_amount)}</td>
                    <td className="px-3 py-2.5 text-center text-sm text-red-900">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </ColoredSection>
  )
}

// ── MCA Offer Calculator Section ────────────────────────────────────────────────

function McaCalculatorSection({ capacity, revenue }: { capacity: Record<string, any>; revenue: number }) {
  const [offerAmount, setOfferAmount] = useState('')
  const [factorRate, setFactorRate] = useState('1.35')
  const [term, setTerm] = useState('6')

  const calc = useMemo(() => {
    const amt = parseFloat(offerAmount) || 0
    const factor = parseFloat(factorRate) || 1.35
    const months = parseInt(term) || 6
    const payback = amt * factor
    const dailyPayment = payback / (months * 22)  // ~22 business days/month
    const monthlyPayment = payback / months
    const maxDaily = num(capacity.max_daily_payment)
    const remainingCapacity = num(capacity.remaining_daily_capacity)
    const canTake = amt > 0 ? dailyPayment <= remainingCapacity : null

    return { payback, dailyPayment, monthlyPayment, maxDaily, remainingCapacity, canTake }
  }, [offerAmount, factorRate, term, capacity])

  return (
    <ColoredSection title="MCA Offer Calculator" color="bg-blue-600" borderColor="border-blue-500">
      <div className="bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input side */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Offer Amount ($)</label>
              <input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Factor Rate</label>
                <input type="number" step="0.01" value={factorRate} onChange={e => setFactorRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Term (months)</label>
                <input type="number" value={term} onChange={e => setTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400" />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-800">Revenue: {fmt(revenue)}/mo</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-800">Max Daily Payment: {fmt(calc.maxDaily)}</span>
              </div>
            </div>
          </div>

          {/* Results side */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Total Payback" value={fmt(calc.payback)} borderColor="border-blue-300" />
              <StatBox label="Daily Payment" value={fmt(calc.dailyPayment, 2)} borderColor="border-blue-300" />
              <StatBox label="Monthly Payment" value={fmt(calc.monthlyPayment)} borderColor="border-blue-300" />
              <StatBox label="Remaining Capacity" value={fmt(calc.remainingCapacity)} borderColor="border-blue-300" />
            </div>
            {calc.canTake !== null && (
              <div className={cn('rounded-lg p-3 border-2 text-center', calc.canTake ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300')}>
                <span className={cn('text-sm font-bold', calc.canTake ? 'text-green-700' : 'text-red-700')}>
                  {calc.canTake ? 'Can Take This Position' : 'Exceeds Capacity'}
                </span>
                <p className={cn('text-xs mt-0.5', calc.canTake ? 'text-green-600' : 'text-red-600')}>
                  Withhold: {capacity.current_withhold_percent ?? 0}% / {capacity.max_withhold_percentage ?? 25}% max
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ColoredSection>
  )
}

// ── Category Distribution Section ───────────────────────────────────────────────

function CategorySection({ summary, transactions }: { summary: Record<string, any>; transactions: Record<string, any>[] }) {
  const [catView, setCatView] = useState<'all' | 'credit' | 'debit'>('all')

  const allCategories = useMemo(() => {
    const cats = summary.categories ?? summary.category_breakdown ?? summary.transaction_categories
    if (cats) {
      const list = Array.isArray(cats)
        ? cats.map((c: any) => ({ name: c.name ?? c.category ?? 'Other', count: num(c.count ?? c.total), amount: num(c.amount ?? c.total_amount), type: c.type ?? 'all' }))
        : Object.entries(cats).map(([name, val]: any) => ({ name, count: num(val?.count ?? val?.total ?? val), amount: num(val?.amount ?? val?.total_amount ?? 0), type: val?.type ?? 'all' }))
      return list.sort((a: any, b: any) => b.count - a.count)
    }
    if (!transactions.length) return []
    const map: Record<string, { count: number; amount: number; type: string }> = {}
    for (const tx of transactions) {
      const cat = tx.category || 'Uncategorized'
      if (!map[cat]) map[cat] = { count: 0, amount: 0, type: tx.type ?? 'all' }
      map[cat].count++
      map[cat].amount += Math.abs(num(tx.amount))
    }
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count)
  }, [summary, transactions])

  const categories = useMemo(() => {
    if (catView === 'all') return allCategories
    return allCategories.filter(c => c.type === catView || c.type === 'all')
  }, [allCategories, catView])

  if (allCategories.length === 0) return null

  const grandTotal = categories.reduce((s, c) => s + Math.abs(c.amount), 0)
  const grandCount = categories.reduce((s, c) => s + c.count, 0)
  const maxCount = Math.max(...categories.map(c => c.count), 1)

  const pieData = categories.slice(0, 10).map((c) => ({ name: c.name, value: Math.abs(c.amount) }))

  return (
    <div className="rounded-xl border-2 border-purple-500 overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-600 to-violet-600 px-4 py-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <h3 className="text-sm font-bold text-white">Category Distribution</h3>
            <span className="text-[10px] text-purple-200 hidden sm:inline">— {categories.length} categories · {fmtNum(String(grandCount))} tx · {fmt(grandTotal, 2)}</span>
          </div>
          {/* Toggle */}
          <div className="flex items-center bg-white/15 rounded-md p-0.5">
            {([
              { key: 'all', label: 'All', icon: null },
              { key: 'credit', label: 'Credits', icon: <ArrowDownRight size={11} /> },
              { key: 'debit', label: 'Debits', icon: <ArrowUpRight size={11} /> },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setCatView(t.key)}
                className={cn('flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded transition-all',
                  catView === t.key ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10')}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Donut Chart — 2 cols */}
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={190} height={190}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={50} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v, 2)} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-extrabold text-gray-900">{grandCount}</span>
                <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Total Tx</span>
              </div>
            </div>
          </div>

          {/* Table — 3 cols */}
          <div className="lg:col-span-3 overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-14">Count</th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16">Share</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c, i) => {
                  const pct = grandTotal > 0 ? (Math.abs(c.amount) / grandTotal) * 100 : 0
                  const color = PIE_COLORS[i % PIE_COLORS.length]
                  return (
                    <tr key={i} className="border-t border-gray-100 hover:bg-purple-50/30 transition-colors">
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-xs text-gray-900 font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-800">{c.count}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-xs text-gray-700 font-medium">{fmt(c.amount, 2)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="text-[11px] font-semibold text-gray-600">{pct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-purple-50 border-t-2 border-purple-200">
                  <td className="px-3 py-1.5 text-xs font-bold text-purple-900">Total</td>
                  <td className="px-2 py-1.5 text-center text-xs font-bold text-purple-900">{grandCount}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-xs font-bold text-purple-900">{fmt(grandTotal, 2)}</td>
                  <td className="px-2 py-1.5 text-center text-xs font-bold text-purple-900">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Transactions Section ────────────────────────────────────────────────────────

function TransactionsSection({ txTab, setTxTab, txSearch, setTxSearch, txLoading, filteredTx }: {
  txTab: string
  setTxTab: (t: 'all' | 'credit' | 'debit') => void
  txSearch: string
  setTxSearch: (s: string) => void
  txLoading: boolean
  filteredTx: Record<string, any>[]
}) {
  return (
    <div className="rounded-lg border-2 border-sky-500 overflow-hidden">
      <div className="bg-sky-600 px-4 py-2.5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Transactions ({filteredTx.length})</h3>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-200" />
            <input type="text" placeholder="Search..." value={txSearch} onChange={e => setTxSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-xs bg-sky-700/50 text-white placeholder-sky-200 border border-sky-400 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>
          {/* Credit / Debit Toggle */}
          <div className="flex bg-sky-700/50 rounded-lg p-0.5 border border-sky-400">
            {([['all', 'All'], ['credit', 'Credit View'], ['debit', 'Debit View']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTxTab(key as any)}
                className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  txTab === key ? 'bg-white text-sky-700 shadow-sm' : 'text-sky-100 hover:text-white')}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white">
        {txLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
        ) : !filteredTx.length ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <Receipt size={24} className="text-gray-200" />
            <p className="text-sm text-gray-400">{txSearch ? 'No matches found' : 'No transactions'}</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase w-12">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase w-20">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map((tx: any, i: number) => {
                  const isCredit = tx.type === 'credit'
                  return (
                    <tr key={i} className={cn('border-b border-gray-100 last:border-0 hover:bg-sky-50/40 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}>
                      <td className="px-3 py-2 text-center text-xs text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{tx.date ?? '—'}</td>
                      <td className="px-3 py-2 text-sm text-gray-800 font-medium max-w-[320px] truncate">{tx.description ?? '—'}</td>
                      <td className="px-3 py-2">
                        {tx.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{tx.category}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono tabular-nums text-sm font-bold whitespace-nowrap', isCredit ? 'text-green-700' : 'text-red-600')}>
                        {isCredit ? '+' : '-'}{fmt(tx.amount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
                          isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                          {isCredit ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                          {isCredit ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
