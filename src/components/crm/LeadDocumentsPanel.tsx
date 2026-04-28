import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, X, FileText, Download, AlertCircle, Eye,
  RefreshCw, BarChart3, ShieldAlert, FolderOpen, Trash2, Upload, Search,
  Banknote, TrendingDown, Scale, TrendingUp, Wallet, CreditCard, Activity, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { bankStatementService } from '../../services/bankStatement.service'
import type { BankStatementSession } from '../../services/bankStatement.service'
import type { CrmDocument } from '../../types/crm.types'
import { DocumentUploadButton } from './DocumentUploadButton'
import type { StagedFile } from './DocumentUploadButton'
import { confirmDelete } from '../../utils/confirmDelete'

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── fmtCurrency ────────────────────────────────────────────────────────────────
function fmtCurrency(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)
}

// ── Doc viewer modal ───────────────────────────────────────────────────────────
function DocViewerModal({ doc, leadId, onClose }: { doc: CrmDocument; leadId: number; onClose: () => void }) {
  const [blobUrl, setBlobUrl]       = useState<string | null>(null)
  const [viewLoading, setViewLoading] = useState(true)
  const [viewError, setViewError]   = useState(false)
  const [downloading, setDownloading] = useState(false)
  const fileType = getFileType(doc.file_path || doc.file_name)

  useEffect(() => {
    if (fileType === 'other') { setViewLoading(false); return }
    let url: string | null = null
    crmService.viewLeadDocument(leadId, doc.id)
      .then(res => { url = URL.createObjectURL(res.data as Blob); setBlobUrl(url) })
      .catch(() => setViewError(true))
      .finally(() => setViewLoading(false))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [doc.id, leadId, fileType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await crmService.downloadLeadDocument(leadId, doc.id)
      const url = URL.createObjectURL(res.data as Blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: doc.file_name })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { toast.error('Download failed') }
    setDownloading(false)
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
        {viewLoading && (
          <Loader2 size={28} className="animate-spin text-white/60" />
        )}
        {!viewLoading && viewError && (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle size={32} className="text-slate-400" />
            <p className="text-slate-300 text-sm">Failed to load document preview.</p>
            <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download to view
            </button>
          </div>
        )}
        {!viewLoading && !viewError && blobUrl && fileType === 'pdf' && (
          <iframe src={blobUrl} title={doc.file_name} className="w-full h-full rounded-xl" style={{ maxWidth: '960px', border: 'none', background: '#fff' }} />
        )}
        {!viewLoading && !viewError && blobUrl && fileType === 'image' && (
          <img src={blobUrl} alt={doc.file_name} className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
        )}
        {!viewLoading && fileType === 'other' && (
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

// ── Bank Statement Analysis Modal ──────────────────────────────────────────────
function BankStatementAnalysisModal({ session, leadId, onClose }: { session: BankStatementSession; leadId: number; onClose: () => void }) {
  const summary = (typeof session.summary_data === 'string' ? JSON.parse(session.summary_data as string) : session.summary_data) as Record<string, any> | null
  const mca = (typeof session.mca_analysis === 'string' ? JSON.parse(session.mca_analysis as string) : session.mca_analysis) as Record<string, any> | null
  const monthlyRaw = (typeof session.monthly_data === 'string' ? JSON.parse(session.monthly_data as string) : session.monthly_data) as Record<string, any> | null
  const monthly = (monthlyRaw?.months ?? (Array.isArray(monthlyRaw) ? monthlyRaw : [])) as Record<string, any>[]

  const fraudScore = summary?.fraud_score ?? session.fraud_score
  const nsfCount = summary?.nsf?.nsf_fee_count ?? summary?.nsf_count ?? session.nsf_count ?? 0
  const mcaDetected = mca?.total_mca_count > 0
  const mcaLenders = mca?.lenders ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center"><BarChart3 size={16} className="text-emerald-600" /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{session.file_name ?? 'Bank Statement Analysis'}</p>
              <p className="text-[10px] text-slate-400">Session: {session.session_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 ml-3">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Status banner */}
          {session.status === 'pending' || session.status === 'processing' ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sky-50 border border-sky-200">
              <Loader2 size={16} className="text-sky-600 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-sky-800">Analysis in progress…</p>
                <p className="text-xs text-sky-600 mt-0.5">This may take a minute. Check back soon.</p>
              </div>
            </div>
          ) : session.status === 'failed' ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Analysis Failed</p>
                <p className="text-xs text-red-700 mt-0.5">{session.error_message || 'Unknown error'}</p>
              </div>
            </div>
          ) : null}

          {/* Completed Results */}
          {session.status === 'completed' && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <div className="bg-indigo-50 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-indigo-500 font-bold uppercase">Fraud Score</p>
                  <p className={`text-xl font-bold mt-0.5 ${fraudScore != null ? (fraudScore >= 70 ? 'text-red-700' : fraudScore >= 40 ? 'text-amber-700' : 'text-emerald-700') : 'text-slate-400'}`}>
                    {fraudScore ?? '—'}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-emerald-500 font-bold uppercase">Revenue</p>
                  <p className="text-xl font-bold text-emerald-700 mt-0.5">{fmtCurrency(summary?.true_revenue ?? session.total_revenue)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-blue-500 font-bold uppercase">Deposits</p>
                  <p className="text-xl font-bold text-blue-700 mt-0.5">{fmtCurrency(summary?.total_credits ?? session.total_deposits)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-amber-500 font-bold uppercase">NSF Count</p>
                  <p className={`text-xl font-bold mt-0.5 ${nsfCount > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{nsfCount}</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-violet-500 font-bold uppercase">Avg Daily Bal</p>
                  <p className="text-xl font-bold text-violet-700 mt-0.5">{fmtCurrency(summary?.average_daily_balance)}</p>
                </div>
                <div className={`${mcaDetected ? 'bg-red-50' : 'bg-slate-50'} rounded-lg p-2.5 text-center`}>
                  <p className={`text-[9px] font-bold uppercase ${mcaDetected ? 'text-red-500' : 'text-slate-500'}`}>MCA Detected</p>
                  <p className={`text-xl font-bold mt-0.5 ${mcaDetected ? 'text-red-700' : 'text-emerald-700'}`}>{mcaDetected ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Statement Details */}
              {summary && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Statement Details</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                    {summary.bank_name && <div className="flex justify-between py-1 text-xs"><span className="text-slate-500">Bank</span><span className="font-semibold text-slate-700">{summary.bank_name}</span></div>}
                    {summary.total_transactions != null && <div className="flex justify-between py-1 text-xs"><span className="text-slate-500">Total Transactions</span><span className="font-semibold text-slate-700">{summary.total_transactions}</span></div>}
                    {summary.net_flow != null && <div className="flex justify-between py-1 text-xs"><span className="text-slate-500">Net Cash Flow</span><span className="font-semibold text-slate-700">{fmtCurrency(summary.net_flow)}</span></div>}
                    {summary.negative_days != null && <div className="flex justify-between py-1 text-xs"><span className="text-slate-500">Negative Days</span><span className={`font-semibold ${summary.negative_days > 0 ? 'text-red-600' : 'text-slate-700'}`}>{summary.negative_days}</span></div>}
                    {summary.beginning_balance != null && <div className="flex justify-between py-1 text-xs"><span className="text-slate-500">Begin Balance</span><span className="font-semibold text-slate-700">{fmtCurrency(summary.beginning_balance)}</span></div>}
                    {summary.ending_balance != null && <div className="flex justify-between py-1 text-xs"><span className="text-slate-500">End Balance</span><span className="font-semibold text-slate-700">{fmtCurrency(summary.ending_balance)}</span></div>}
                    {summary.pages != null && <div className="flex justify-between py-1 text-xs"><span className="text-slate-500">Pages</span><span className="font-semibold text-slate-700">{summary.pages}</span></div>}
                    {summary.credit_count != null && <div className="flex justify-between py-1 text-xs"><span className="text-slate-500">Credits</span><span className="font-semibold text-slate-700">{summary.credit_count}</span></div>}
                    {summary.debit_count != null && <div className="flex justify-between py-1 text-xs"><span className="text-slate-500">Debits</span><span className="font-semibold text-slate-700">{summary.debit_count}</span></div>}
                  </div>
                </div>
              )}

              {/* MCA Warning */}
              {mcaDetected && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <ShieldAlert size={16} className="text-red-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">MCA Lenders Detected ({mca?.total_mca_count})</p>
                    {mcaLenders.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {mcaLenders.map((l: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-red-700">{l.name ?? l.lender ?? `Lender ${i + 1}`}</span>
                            {l.estimated_payment && <span className="font-semibold text-red-800">{fmtCurrency(l.estimated_payment)}/mo</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {mca?.total_mca_payments > 0 && (
                      <p className="text-xs text-red-600 mt-1.5">Total Payments: {fmtCurrency(mca?.total_mca_payments)} · Total Amount: {fmtCurrency(mca?.total_mca_amount)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Monthly Breakdown Table */}
              {monthly.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Breakdown</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-1.5 text-slate-500 font-semibold">Month</th>
                        <th className="text-right py-1.5 text-slate-500 font-semibold">Deposits</th>
                        <th className="text-right py-1.5 text-slate-500 font-semibold">Withdrawals</th>
                        <th className="text-right py-1.5 text-slate-500 font-semibold">Revenue</th>
                        <th className="text-right py-1.5 text-slate-500 font-semibold">NSFs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthly.map((m: any, i: number) => (
                        <tr key={i}>
                          <td className="py-1.5 text-slate-700 font-medium">{m.month_name ?? m.month_key}</td>
                          <td className="py-1.5 text-right text-emerald-700">{fmtCurrency(m.deposits)}</td>
                          <td className="py-1.5 text-right text-red-600">{fmtCurrency(m.debits)}</td>
                          <td className="py-1.5 text-right text-slate-700 font-medium">{fmtCurrency(m.true_revenue)}</td>
                          <td className="py-1.5 text-right text-slate-700">{m.nsf?.nsf_fee_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MCA Capacity */}
              {monthlyRaw?.mca_capacity && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">MCA Capacity</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className={`${monthlyRaw.mca_capacity.can_take_position ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg p-2.5 text-center`}>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Can Take Position</p>
                      <p className={`text-base font-bold mt-0.5 ${monthlyRaw.mca_capacity.can_take_position ? 'text-emerald-700' : 'text-red-700'}`}>
                        {monthlyRaw.mca_capacity.can_take_position ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 text-center border border-slate-100">
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Max Daily Payment</p>
                      <p className="text-base font-bold text-slate-700 mt-0.5">{fmtCurrency(monthlyRaw.mca_capacity.max_daily_payment)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 text-center border border-slate-100">
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Remaining Cap.</p>
                      <p className="text-base font-bold text-slate-700 mt-0.5">{fmtCurrency(monthlyRaw.mca_capacity.remaining_daily_capacity)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 text-center border border-slate-100">
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Withhold %</p>
                      <p className="text-base font-bold text-slate-700 mt-0.5">{monthlyRaw.mca_capacity.current_withhold_percent}% / {monthlyRaw.mca_capacity.max_withhold_percentage}%</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Document Analysis Panel ────────────────────────────────────────────────────
function DocumentAnalysisPanel({ session, leadId }: {
  session: BankStatementSession
  leadId: number
}) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())

  const handleRefresh = async (showToast = true) => {
    if (isRefreshing) return
    setIsRefreshing(true)
    setError(null)
    try {
      await qc.refetchQueries({ queryKey: ['bs-by-documents', leadId], exact: true })
      setLastRefreshedAt(new Date())
      if (showToast) toast.success('Analysis refreshed')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message
        ?? 'Failed to refresh analysis'
      setError(msg)
      if (showToast) toast.error(msg)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const timer = setInterval(() => { handleRefresh(false) }, 45_000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  const sum = (typeof session.summary_data === 'string' ? JSON.parse(session.summary_data as string) : session.summary_data) as Record<string, any> | null
  const mcaRaw = (typeof session.mca_analysis === 'string' ? JSON.parse(session.mca_analysis as string) : session.mca_analysis) as Record<string, any> | null
  const hasMca = (mcaRaw?.total_mca_count ?? 0) > 0
  const fs = sum?.fraud_score ?? session.fraud_score
  const nsfCount = sum?.nsf?.nsf_fee_count ?? sum?.nsf_count ?? session.nsf_count ?? 0

  type Metric = { label: string; value: string | number; icon: typeof Banknote; iconBg: string; iconColor: string; accent: string; border: string }
  const metrics: Metric[] = [
    { label: 'Revenue',              value: fmtCurrency(sum?.true_revenue ?? session.total_revenue),           icon: TrendingUp,     iconBg: 'bg-emerald-50',  iconColor: 'text-emerald-600', accent: 'bg-emerald-500', border: 'border-emerald-200' },
    { label: 'Deposits',             value: fmtCurrency(sum?.total_credits ?? session.total_deposits),         icon: Banknote,       iconBg: 'bg-green-50',    iconColor: 'text-green-600',   accent: 'bg-green-500',   border: 'border-green-200'   },
    { label: 'Debits',               value: fmtCurrency(sum?.total_debits),                                    icon: TrendingDown,   iconBg: 'bg-red-50',      iconColor: 'text-red-500',     accent: 'bg-red-400',     border: 'border-red-200'     },
    { label: 'Adjustments',          value: fmtCurrency(sum?.adjustments),                                     icon: Scale,          iconBg: 'bg-orange-50',   iconColor: 'text-orange-500',  accent: 'bg-orange-400',  border: 'border-orange-200'  },
    { label: 'Avg Balance',          value: fmtCurrency(sum?.average_daily_balance),                           icon: Wallet,         iconBg: 'bg-blue-50',     iconColor: 'text-blue-500',    accent: 'bg-blue-400',    border: 'border-blue-200'    },
    { label: 'Ledger Balance',       value: fmtCurrency(sum?.average_ledger_balance ?? sum?.ending_balance),   icon: CreditCard,     iconBg: 'bg-indigo-50',   iconColor: 'text-indigo-500',  accent: 'bg-indigo-400',  border: 'border-indigo-200'  },
    { label: 'Transactions',         value: sum?.total_transactions ?? 0,                                      icon: Activity,       iconBg: 'bg-slate-100',   iconColor: 'text-slate-500',   accent: 'bg-slate-300',   border: 'border-slate-200'   },
    { label: 'NSF',                  value: nsfCount,                                                          icon: AlertTriangle,  iconBg: nsfCount > 0 ? 'bg-amber-50' : 'bg-gray-50', iconColor: nsfCount > 0 ? 'text-amber-500' : 'text-gray-400', accent: nsfCount > 0 ? 'bg-amber-400' : 'bg-gray-200', border: nsfCount > 0 ? 'border-amber-300' : 'border-gray-200' },
  ]

  return (
    <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white px-3 py-3">

      {/* Header row */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          <span className="bg-slate-800 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Analysis</span>
          {fs != null && (
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${fs >= 70 ? 'bg-red-100 text-red-800' : fs >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              Fraud {fs}
            </span>
          )}
          {hasMca && (
            <span className="font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1 text-[10px]">
              <ShieldAlert size={9} /> MCA
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {lastRefreshedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleRefresh(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-[11px] font-semibold disabled:opacity-60 shadow-sm"
          >
            {isRefreshing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/crm/bank-statements/${session.session_id}`)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors text-[11px] font-bold"
          >
            Details →
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle size={12} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700"><X size={11} /></button>
        </div>
      )}

      {/* Stats grid — 2×4 max */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 transition-opacity ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
        {metrics.map((m, i) => {
          const Icon = m.icon
          return (
            <div key={i} className={`bg-white rounded-lg border ${m.border} overflow-hidden shadow-sm`}>
              <div className={`h-0.5 w-full ${m.accent}`} />
              <div className="px-2.5 py-2 flex items-center gap-2">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${m.iconBg}`}>
                  <Icon size={13} className={m.iconColor} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider leading-none truncate">{m.label}</p>
                  <p className="text-[13px] font-extrabold text-gray-900 leading-tight mt-0.5 truncate">{m.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Documents Panel ────────────────────────────────────────────────────────────
type SortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'

export function DocumentsPanel({ leadId }: { leadId: number }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [viewDoc, setViewDoc] = useState<CrmDocument | null>(null)
  const [analyzingDocId, setAnalyzingDocId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('date_desc')
  const [analysisModalSession, setAnalysisModalSession] = useState<BankStatementSession | null>(null)

  const { data: docSessions } = useQuery({
    queryKey: ['bs-by-documents', leadId],
    queryFn: async () => {
      const res = await bankStatementService.getByDocuments(leadId)
      return (res.data?.data ?? []) as BankStatementSession[]
    },
    refetchInterval: (query) => {
      const sessions = query.state.data ?? []
      return sessions.some(s => s.status === 'pending' || s.status === 'processing') ? 5000 : false
    },
  })
  const sessionByDocId = new Map((docSessions ?? []).map(s => [s.document_id as number, s]))

  const analyzeMut = useMutation({
    mutationFn: (docId: number) => bankStatementService.analyzeDocument(leadId, docId),
    onSuccess: () => {
      toast.success('Analysis started')
      qc.invalidateQueries({ queryKey: ['bs-by-documents', leadId] })
      setAnalyzingDocId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Analysis failed')
      setAnalyzingDocId(null)
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => (res => (res.data?.data ?? res.data ?? []) as CrmDocument[])(await crmService.getLeadDocuments(leadId)),
  })
  const docs = data ?? []

  const visibleDocs = (() => {
    const q = search.trim().toLowerCase()
    let list = docs.filter(d => {
      if (!q) return true
      return (
        (d.file_name ?? '').toLowerCase().includes(q) ||
        (d.document_type ?? '').toLowerCase().includes(q)
      )
    })
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':  return +new Date(a.created_at) - +new Date(b.created_at)
        case 'name_asc':  return (a.file_name ?? '').localeCompare(b.file_name ?? '')
        case 'name_desc': return (b.file_name ?? '').localeCompare(a.file_name ?? '')
        case 'date_desc':
        default:          return +new Date(b.created_at) - +new Date(a.created_at)
      }
    })
    return list
  })()

  const allVisibleIds = visibleDocs.map(d => d.id)
  const allSelected  = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id))
  const someSelected = selectedIds.size > 0

  async function uploadLeadDocs(items: StagedFile[], onProgress: (pct: number) => void) {
    const fd = new FormData()
    items.forEach(it => {
      fd.append('files[]', it.file)
      fd.append('document_type[]', it.documentType)
      fd.append('sub_type[]', it.subType ?? '')
    })
    const res = await crmService.uploadLeadDocuments(leadId, fd, (evt) => {
      if (evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100))
    })
    const failed: string[] = res.data?.data?.failed ?? []
    if (failed.length) toast.error(`Failed: ${failed.join(', ')}`)
    qc.invalidateQueries({ queryKey: ['lead-documents', leadId] })
    qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    return res
  }

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => crmService.deleteLeadDocument(leadId, docId),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['lead-documents', leadId] }) },
    onError: () => toast.error('Delete failed'),
  })

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: number[]) =>
      crmService.bulkLeadDocumentAction(leadId, { action: 'delete', doc_ids: ids }),
    onSuccess: (res) => {
      const count = res.data?.data?.count ?? 0
      toast.success(`Deleted ${count} document${count !== 1 ? 's' : ''}`)
      setSelectedIds(new Set())
      qc.invalidateQueries({ queryKey: ['lead-documents', leadId] })
    },
    onError: () => toast.error('Bulk delete failed'),
  })

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allVisibleIds))
  }

  async function bulkDownload() {
    const ids = [...selectedIds]
    if (!ids.length) return
    toast.success(`Downloading ${ids.length} file${ids.length !== 1 ? 's' : ''}…`)
    for (const id of ids) {
      const doc = docs.find(d => d.id === id)
      if (!doc || !doc.file_path) continue
      try {
        const res = await crmService.downloadLeadDocument(leadId, id)
        const url = URL.createObjectURL(res.data as Blob)
        const a = Object.assign(document.createElement('a'), { href: url, download: doc.file_name })
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch {
        toast.error(`Failed to download ${doc.file_name}`)
      }
    }
    setSelectedIds(new Set())
  }

  async function bulkDelete() {
    if (!selectedIds.size) return
    if (!(await confirmDelete())) return
    bulkDeleteMut.mutate([...selectedIds])
  }

  return (
    <>
      {viewDoc && <DocViewerModal doc={viewDoc} leadId={leadId} onClose={() => setViewDoc(null)} />}
      {analysisModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) setAnalysisModalSession(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[92vw] max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center"><BarChart3 size={16} className="text-emerald-600" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{analysisModalSession.file_name ?? 'Bank Statement Analysis'}</p>
                  <p className="text-[10px] text-slate-400">Session: {analysisModalSession.session_id}</p>
                </div>
              </div>
              <button onClick={() => setAnalysisModalSession(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 ml-3">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DocumentAnalysisPanel session={analysisModalSession} leadId={leadId} />
            </div>
          </div>
        </div>
      )}

    <div className="flex flex-col h-full">

      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-auto">
            {isLoading ? 'Documents' : `${visibleDocs.length} of ${docs.length}`}
          </span>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-emerald-400 focus:outline-none w-40"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="text-xs rounded-lg border border-slate-200 py-1.5 px-2 focus:border-emerald-400 focus:outline-none"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>
          <DocumentUploadButton onUpload={uploadLeadDocs} />
        </div>

        {someSelected && (
          <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="text-xs font-semibold text-emerald-700">
              {selectedIds.size} selected
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={bulkDownload}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold transition-colors"
              >
                <Download size={11} /> Download
              </button>
              <button
                onClick={bulkDelete}
                disabled={bulkDeleteMut.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-red-300 text-red-600 hover:bg-red-100 text-[11px] font-semibold transition-colors disabled:opacity-50"
              >
                <Trash2 size={11} /> Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
                title="Clear selection"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <FolderOpen size={22} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No documents yet</p>
            <p className="text-xs text-slate-400 mt-1">Click <strong>Upload Files</strong> to add one</p>
            <div className="mt-4">
              <DocumentUploadButton
                onUpload={uploadLeadDocs}
                buttonClassName="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
              />
            </div>
          </div>
        ) : visibleDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search size={22} className="text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-500">No matches</p>
            <p className="text-xs text-slate-400 mt-1">Try a different search or filter</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 py-1.5 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400 cursor-pointer"
              />
              <span>Select all</span>
            </div>

            <div className="space-y-1.5">
              {visibleDocs.map(doc => {
                const ic = getFileIcon(doc.file_path || doc.file_name)
                const isPdf = getFileType(doc.file_path || doc.file_name) === 'pdf'
                const isBankStatement = isPdf && /bank.?statement/i.test(doc.document_type)
                const bsSession = sessionByDocId.get(doc.id)
                const isAnalyzing = analyzingDocId === doc.id && analyzeMut.isPending
                const isChecked = selectedIds.has(doc.id)

                return (
                  <div
                    key={doc.id}
                    className={`rounded-lg border bg-white hover:shadow-sm transition-all group ${
                      isChecked ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(doc.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400 cursor-pointer flex-shrink-0"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ic.bg}`}>
                        <FileText size={14} className={ic.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap leading-tight">
                          <p className="text-sm font-semibold text-slate-800 truncate">{doc.document_type}</p>
                          {doc.sub_type && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {doc.sub_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">{doc.file_name}</span>
                          {doc.file_size ? <span className="text-[10px] text-slate-400">· {formatBytes(Number(doc.file_size))}</span> : null}
                          <span className="text-[10px] text-slate-400">· {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {doc.uploaded_by_name && <span className="text-[10px] text-slate-400">· {doc.uploaded_by_name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isBankStatement && !bsSession && (
                          <button
                            onClick={() => { setAnalyzingDocId(doc.id); analyzeMut.mutate(doc.id) }}
                            disabled={isAnalyzing || analyzeMut.isPending}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors text-[11px] font-semibold disabled:opacity-50"
                            title="Analyze with Balji"
                          >
                            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                            Analyze
                          </button>
                        )}
                        {bsSession && (
                          <>
                            {bsSession.status === 'completed' && (
                              <>
                                <button onClick={() => navigate(`/crm/bank-statements/${bsSession.session_id}`)}
                                  className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors text-[11px] font-semibold" title="View Analysis">
                                  <BarChart3 size={12} /> Analysis
                                </button>
                              </>
                            )}
                            {(bsSession.status === 'pending' || bsSession.status === 'processing') && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold">
                                <Loader2 size={10} className="animate-spin" /> Analyzing
                              </span>
                            )}
                            {bsSession.status === 'failed' && (
                              <>
                                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-bold" title={bsSession.error_message ?? 'Failed'}>
                                  <AlertCircle size={10} /> Failed
                                </span>
                                <button
                                  onClick={async () => {
                                    try {
                                      await bankStatementService.destroy(leadId, bsSession.session_id)
                                      qc.invalidateQueries({ queryKey: ['bs-by-documents', leadId] })
                                      toast.success('Cleared — you can re-analyze')
                                    } catch { toast.error('Failed to clear') }
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-semibold transition-colors"
                                  title="Clear failed analysis and retry"
                                >
                                  <RefreshCw size={10} /> Retry
                                </button>
                              </>
                            )}
                          </>
                        )}
                        <button onClick={() => setViewDoc(doc)} disabled={!doc.file_path && !doc.file_name} className="p-1.5 rounded-md bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors disabled:opacity-30" title="Preview"><Eye size={13} /></button>
                        <button
                          disabled={!doc.file_path && !doc.file_name}
                          className="p-1.5 rounded-md bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700 transition-colors disabled:opacity-30"
                          title="Download"
                          onClick={async () => {
                            if (!doc.file_path) return
                            try {
                              const res = await crmService.downloadLeadDocument(leadId, doc.id)
                              const url = URL.createObjectURL(res.data as Blob)
                              const a = Object.assign(document.createElement('a'), { href: url, download: doc.file_name })
                              document.body.appendChild(a); a.click(); document.body.removeChild(a)
                              setTimeout(() => URL.revokeObjectURL(url), 1000)
                            } catch { toast.error('Download failed') }
                          }}
                        ><Download size={13} /></button>
                        <button onClick={async () => { if (await confirmDelete()) deleteMutation.mutate(doc.id) }} className="p-1.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

    </div>
    </>
  )
}
