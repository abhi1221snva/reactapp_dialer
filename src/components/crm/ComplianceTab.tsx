import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck, AlertTriangle,
  CheckCircle2, Clock, XCircle,
  FileText, Database, CreditCard, UserCheck, FileSearch,
  ChevronDown, ChevronUp,
  Eye, RefreshCw, Loader2, FileX,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { bankStatementService, type BankStatementSession } from '../../services/bankStatement.service'
import type { ComplianceCheck, StackingWarning } from '../../types/crm.types'
import { BankStatementAnalysisView } from './BankStatementAnalysisView'

interface Props { leadId: number }

const fmtDec = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const HARDCODED_CHECKS = [
  { key: 'bank_statements',   label: 'Bank Statements Analysis',               icon: FileText,   color: 'emerald' },
  { key: 'data_merch',        label: 'Data Merch',                              icon: Database,   color: 'indigo'  },
  { key: 'credit_biz',        label: 'Credit Reports & Business Verification',  icon: CreditCard, color: 'blue'    },
  { key: 'identity_kyc',      label: 'Identity Verification & KYC',             icon: UserCheck,  color: 'violet'  },
  { key: 'ucc_lien',          label: 'UCC Lien Search & Filing Verification',   icon: FileSearch, color: 'amber'   },
] as const

type HardcodedStatus = 'pending' | 'pass' | 'fail'

const STATUS_STYLES: Record<HardcodedStatus, { border: string; bg: string; badge: string; badgeText: string; label: string }> = {
  pending: { border: 'border-slate-200',  bg: 'bg-white',      badge: 'bg-amber-50',   badgeText: 'text-amber-700',   label: 'Pending'  },
  pass:    { border: 'border-emerald-300', bg: 'bg-emerald-50', badge: 'bg-emerald-100', badgeText: 'text-emerald-700', label: 'Passed'   },
  fail:    { border: 'border-red-300',     bg: 'bg-red-50',     badge: 'bg-red-100',     badgeText: 'text-red-700',     label: 'Failed'   },
}

const COLOR_MAP: Record<string, { iconBg: string; iconText: string }> = {
  emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  indigo:  { iconBg: 'bg-indigo-100',  iconText: 'text-indigo-600'  },
  blue:    { iconBg: 'bg-blue-100',    iconText: 'text-blue-600'    },
  violet:  { iconBg: 'bg-violet-100',  iconText: 'text-violet-600'  },
  amber:   { iconBg: 'bg-amber-100',   iconText: 'text-amber-600'   },
}


function StatusPill({ status, label }: { status: 'pass' | 'fail' | 'warn' | 'pending'; label: string }) {
  const cfg = {
    pass:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    fail:    'bg-red-50 text-red-700 border-red-200',
    warn:    'bg-amber-50 text-amber-700 border-amber-200',
    pending: 'bg-slate-50 text-slate-500 border-slate-200',
  }[status]
  const Icon = { pass: CheckCircle2, fail: XCircle, warn: AlertTriangle, pending: Clock }[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${cfg}`}>
      <Icon size={10} />{label}
    </span>
  )
}

/* ── Bank Statements Analysis (combined + individual) ────────────────────── */

interface StatementSummary {
  revenue: number
  deposits: number
  debits: number
  adjustments: number
  avg_balance: number
  ledger_balance: number
  total_transactions: number
  nsf: number
}
interface CombinedSummary extends StatementSummary {
  statement_count: number
}
interface StatementItem {
  session_id: string
  document_id: number | null
  file_name: string | null
  status: string
  fraud_score: number | null
  analyzed_at: string | null
  created_at: string | null
  summary: StatementSummary
  raw: {
    summary_data: unknown
    mca_analysis: unknown
    monthly_data: unknown
  }
}
interface CombinedRaw {
  summary_data: unknown
  mca_analysis: unknown
  monthly_data: unknown
}
interface BankStatementsAnalysisResponse {
  combined: CombinedSummary
  combined_raw?: CombinedRaw
  statements: StatementItem[]
}

type ViewMode = 'both' | 'combined' | 'individual'

/** Metric card — reused by combined and individual views. */
function MetricCard({ label, value, labelColor, valueColor, bg, border }: {
  label: string; value: string; labelColor: string; valueColor: string; bg: string; border: string
}) {
  return (
    <div className={`rounded-lg border ${border} ${bg} px-3 py-3 flex flex-col items-start justify-center min-w-0`}>
      <span className={`text-[10px] font-semibold uppercase tracking-wide leading-tight ${labelColor}`}>{label}</span>
      <span className={`mt-1.5 text-base font-extrabold tabular-nums leading-tight truncate w-full ${valueColor}`}>{value}</span>
    </div>
  )
}

/** Build the 8 metric cards for a summary object. */
function buildMetrics(s: StatementSummary) {
  const nsfActive = s.nsf > 0
  return [
    { label: 'Revenue',              value: fmtDec(s.revenue),        labelColor: 'text-emerald-600', valueColor: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Deposits',             value: fmtDec(s.deposits),       labelColor: 'text-green-600',   valueColor: 'text-green-800',   bg: 'bg-green-50',   border: 'border-green-200'   },
    { label: 'Debits',               value: fmtDec(s.debits),         labelColor: 'text-red-500',     valueColor: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200'     },
    { label: 'Adjustments',          value: fmtDec(s.adjustments),    labelColor: 'text-orange-500',  valueColor: 'text-orange-800',  bg: 'bg-orange-50',  border: 'border-orange-200'  },
    { label: 'Average Balance',      value: fmtDec(s.avg_balance),    labelColor: 'text-blue-500',    valueColor: 'text-blue-800',    bg: 'bg-blue-50',    border: 'border-blue-200'    },
    { label: 'Ledger Balance',       value: fmtDec(s.ledger_balance), labelColor: 'text-indigo-500',  valueColor: 'text-indigo-800',  bg: 'bg-indigo-50',  border: 'border-indigo-200'  },
    { label: 'Total Transactions',   value: new Intl.NumberFormat('en-US').format(s.total_transactions), labelColor: 'text-slate-500', valueColor: 'text-slate-800', bg: 'bg-slate-50', border: 'border-slate-200' },
    { label: 'Non-Sufficient Funds', value: new Intl.NumberFormat('en-US').format(s.nsf),                labelColor: nsfActive ? 'text-amber-600' : 'text-slate-500', valueColor: nsfActive ? 'text-amber-800' : 'text-slate-700', bg: nsfActive ? 'bg-amber-50' : 'bg-slate-50', border: nsfActive ? 'border-amber-200' : 'border-slate-200' },
  ]
}

/** Hydrate a StatementItem's raw payload into a shape BankStatementAnalysisView expects. */
function toSessionShape(s: StatementItem): BankStatementSession {
  return {
    id: 0,
    lead_id: null,
    batch_id: null,
    session_id: s.session_id,
    file_name: s.file_name,
    status: (s.status as BankStatementSession['status']) ?? 'completed',
    model_tier: 'lsc_pro',
    summary_data: s.raw.summary_data as BankStatementSession['summary_data'],
    mca_analysis: s.raw.mca_analysis as BankStatementSession['mca_analysis'],
    monthly_data: s.raw.monthly_data as BankStatementSession['monthly_data'],
    fraud_score: s.fraud_score,
    total_revenue: s.summary.revenue,
    total_deposits: s.summary.deposits,
    nsf_count: s.summary.nsf,
    error_message: null,
    uploaded_by: null,
    analyzed_at: s.analyzed_at,
    created_at: s.created_at ?? '',
    updated_at: null,
  }
}

/** Build a synthetic "combined" session from the aggregated raw payload. */
function toCombinedSessionShape(combined: CombinedSummary, raw: CombinedRaw | undefined): BankStatementSession {
  return {
    id: 0,
    lead_id: null,
    batch_id: null,
    session_id: '__combined__',
    file_name: `Combined (${combined.statement_count} statement${combined.statement_count !== 1 ? 's' : ''})`,
    status: 'completed',
    model_tier: 'lsc_pro',
    summary_data: (raw?.summary_data ?? null) as BankStatementSession['summary_data'],
    mca_analysis: (raw?.mca_analysis ?? null) as BankStatementSession['mca_analysis'],
    monthly_data: (raw?.monthly_data ?? null) as BankStatementSession['monthly_data'],
    fraud_score: null,
    total_revenue: combined.revenue,
    total_deposits: combined.deposits,
    nsf_count: combined.nsf,
    error_message: null,
    uploaded_by: null,
    analyzed_at: null,
    created_at: '',
    updated_at: null,
  }
}

/** Individual statement card — collapsed summary + expand-to-full-details. */
function StatementCard({ statement, index, leadId }: { statement: StatementItem; index: number; leadId: number }) {
  const [expanded, setExpanded] = useState(false)
  const metrics = buildMetrics(statement.summary)
  const fileLabel = statement.file_name || `Bank Statement #${index + 1}`
  const createdDate = statement.created_at
    ? new Date(statement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
            <FileText size={13} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{fileLabel}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {createdDate && <span className="text-[10px] text-slate-500">{createdDate}</span>}
              {statement.fraud_score != null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statement.fraud_score >= 70 ? 'bg-red-100 text-red-700' : statement.fraud_score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  Fraud {statement.fraud_score}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-[11px] font-semibold text-slate-600 transition-colors"
        >
          {expanded
            ? <><ChevronUp size={12} /> Hide Details</>
            : <><Eye size={12} /> View Details</>}
        </button>
      </div>

      {/* Body: 8 metric cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {metrics.map((m, i) => <MetricCard key={i} {...m} />)}
        </div>

        {/* Expanded full detail view */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <BankStatementAnalysisView session={toSessionShape(statement)} leadId={leadId} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── 1. Bank Statements Analysis Panel ── */
function BankStatementsPanel({ leadId }: { leadId: number }) {
  const [viewMode, setViewMode] = useState<ViewMode>('both')

  const { data, isLoading, isError, isFetching, error, refetch } = useQuery<BankStatementsAnalysisResponse>({
    queryKey: ['lead-bank-statements-analysis', leadId],
    queryFn: async () => {
      const r = await bankStatementService.getBankStatementsAnalysis(leadId)
      const payload = r.data?.data ?? r.data
      return payload as BankStatementsAnalysisResponse
    },
    enabled: !!leadId,
    staleTime: 30_000,
  })

  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success('Bank statement analysis refreshed')
    } catch {
      toast.error('Refresh failed')
    }
  }

  const combined = data?.combined
  const statements = data?.statements ?? []
  const hasData = statements.length > 0

  const errorMessage = (() => {
    if (!isError) return null
    const e = error as { response?: { data?: { message?: string } }; message?: string } | null
    return e?.response?.data?.message ?? e?.message ?? 'Failed to load bank statement analysis'
  })()

  const showCombined   = viewMode === 'combined'   || viewMode === 'both'
  const showIndividual = viewMode === 'individual' || viewMode === 'both'

  const toggleOptions: Array<{ key: ViewMode; label: string }> = [
    { key: 'both',       label: 'Both' },
    { key: 'combined',   label: 'Combined Only' },
    { key: 'individual', label: 'Individual Only' },
  ]

  return (
    <div className="space-y-4">
      {/* ═══ Toolbar: view toggle + refresh ═══ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
          {toggleOptions.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setViewMode(opt.key)}
              disabled={!hasData && opt.key !== 'both'}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === opt.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ═══ Loading ═══ */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={24} className="animate-spin text-emerald-500" />
          <p className="text-sm text-slate-500">Loading bank statement analysis...</p>
        </div>
      )}

      {/* ═══ Error ═══ */}
      {!isLoading && isError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to load bank statement analysis</p>
            <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ═══ Empty ═══ */}
      {!isLoading && !isError && !hasData && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
          <FileX size={28} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No data available</p>
          <p className="text-xs text-slate-400">Upload and analyze bank statements in the Documents tab to see them here.</p>
        </div>
      )}

      {/* ═══ Combined Analysis ═══ */}
      {!isLoading && !isError && hasData && combined && showCombined && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-emerald-500" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Combined Analysis</h4>
            <span className="text-[10px] font-semibold text-slate-400">
              {combined.statement_count} statement{combined.statement_count !== 1 ? 's' : ''} aggregated
            </span>
          </div>
          <div className={`transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            <BankStatementAnalysisView
              session={toCombinedSessionShape(combined, data?.combined_raw)}
              title="Combined Bank Statement Analysis"
            />
          </div>
        </div>
      )}

      {/* ═══ Individual Statements ═══ */}
      {!isLoading && !isError && hasData && showIndividual && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-slate-400" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Individual Bank Statements</h4>
            <span className="text-[10px] font-semibold text-slate-400">
              {statements.length} statement{statements.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className={`space-y-3 transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            {statements.map((s, i) => <StatementCard key={s.session_id} statement={s} index={i} leadId={leadId} />)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 2. Data Merch Panel ── */
function DataMerchPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
      <Database size={28} className="text-slate-300" />
      <p className="text-sm font-semibold text-slate-500">Data Merch not connected</p>
      <p className="text-xs text-slate-400">Run a Data Merch lookup to see merchant profile and funding history.</p>
    </div>
  )
}

/* ── 3. Experian / Credit Reports & Business Verification Panel ── */
function ExperianPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
      <CreditCard size={28} className="text-slate-300" />
      <p className="text-sm font-semibold text-slate-500">Credit report not pulled</p>
      <p className="text-xs text-slate-400">Pull a credit &amp; business verification report to see scores and trade lines.</p>
    </div>
  )
}

/* ── 4. Persona / Identity Verification & KYC Panel ── */
function PersonaPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
      <UserCheck size={28} className="text-slate-300" />
      <p className="text-sm font-semibold text-slate-500">Identity verification not run</p>
      <p className="text-xs text-slate-400">Run a KYC / identity check to see verification results and watchlist screening.</p>
    </div>
  )
}

/* ── 5. UCC Lien Search & Filing Verification Panel ── */
function UccFilingPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
      <FileSearch size={28} className="text-slate-300" />
      <p className="text-sm font-semibold text-slate-500">UCC lien search not run</p>
      <p className="text-xs text-slate-400">Run a UCC lien search to see active filings and risk assessment.</p>
    </div>
  )
}

const PANEL_MAP: Record<string, (props: { leadId: number }) => JSX.Element> = {
  bank_statements: ({ leadId }) => <BankStatementsPanel leadId={leadId} />,
  data_merch:      () => <DataMerchPanel />,
  credit_biz:      () => <ExperianPanel />,
  identity_kyc:    () => <PersonaPanel />,
  ucc_lien:        () => <UccFilingPanel />,
}

function CoreComplianceChecks({ leadId }: { leadId: number }) {
  const [expanded, setExpanded] = useState<string | null>('bank_statements')
  const { data: checks = [] } = useQuery<ComplianceCheck[]>({
    queryKey: ['compliance', leadId],
    queryFn: async () => { const r = await crmService.getComplianceChecks(leadId); return r.data?.data ?? r.data ?? [] },
  })

  const statusMap = HARDCODED_CHECKS.reduce((m, c) => {
    const match = checks.find(ch => (ch.check_type as string) === c.key || ch.notes?.toLowerCase().includes(c.label.toLowerCase()))
    m[c.key] = match ? (match.result === 'pass' ? 'pass' : match.result === 'fail' ? 'fail' : 'pending') : 'pending'
    return m
  }, {} as Record<string, HardcodedStatus>)

  const Panel = expanded ? PANEL_MAP[expanded] : null
  const expandedCheck = expanded ? HARDCODED_CHECKS.find(c => c.key === expanded) : null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={16} className="text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-800">Core Compliance Checks</h3>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {HARDCODED_CHECKS.map(check => {
          const Icon = check.icon
          const status = statusMap[check.key]
          const ss = STATUS_STYLES[status]
          const cm = COLOR_MAP[check.color]
          const isActive = expanded === check.key
          return (
            <button key={check.key} onClick={() => setExpanded(isActive ? null : check.key)}
              className={`relative rounded-xl border ${isActive ? 'border-slate-400 ring-2 ring-slate-200 shadow-md' : ss.border} ${ss.bg} p-4 flex flex-col items-center text-center transition-all hover:shadow-md cursor-pointer`}>
              <div className={`w-10 h-10 rounded-full ${cm.iconBg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={cm.iconText} />
              </div>
              <p className="text-xs font-semibold text-slate-700 leading-tight mb-2">{check.label}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${ss.badge} ${ss.badgeText}`}>
                {status === 'pass' && <CheckCircle2 size={9} />}
                {status === 'fail' && <XCircle size={9} />}
                {status === 'pending' && <Clock size={9} />}
                {ss.label}
              </span>
              <div className="mt-2 text-slate-400">
                {isActive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>
          )
        })}
      </div>
      {Panel && expandedCheck && (
        <div className="mt-4 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2 mb-4">
            <expandedCheck.icon size={15} className={COLOR_MAP[expandedCheck.color].iconText} />
            <h4 className="text-sm font-semibold text-slate-800">{expandedCheck.label}</h4>
          </div>
          <Panel leadId={leadId} />
        </div>
      )}
    </div>
  )
}

function StackingAlert({ warning }: { warning: StackingWarning }) {
  if (!warning.position_count || warning.position_count === 0) return null
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Stacking Warning</p>
        <p className="text-xs text-amber-700 mt-0.5">
          This merchant has <strong>{warning.position_count}</strong> existing advance
          {warning.position_count !== 1 ? 's' : ''} with a total daily burden of{' '}
          <strong>{fmtDec(warning.total_daily_burden ?? 0)}</strong>.
        </p>
      </div>
    </div>
  )
}


export function ComplianceTab({ leadId }: Props) {
  const { data: warning } = useQuery<StackingWarning>({
    queryKey: ['stacking-warning', leadId],
    queryFn: async () => {
      const r = await crmService.getPositions(leadId)
      const positions: { daily_payment?: number; remaining_balance?: number }[] = r.data?.data ?? r.data ?? []
      const totalDaily = positions.reduce((s, p) => s + (p.daily_payment ?? 0), 0)
      const balances = positions.map(p => p.remaining_balance ?? 0).filter(b => b > 0)
      return {
        position_count: positions.length,
        total_daily_burden: totalDaily,
        highest_balance: balances.length > 0 ? Math.max(...balances) : null,
      } as unknown as StackingWarning
    },
    staleTime: 30000,
  })

  return (
    <div className="space-y-5">
      {warning && <StackingAlert warning={warning} />}
      <CoreComplianceChecks leadId={leadId} />
    </div>
  )
}
