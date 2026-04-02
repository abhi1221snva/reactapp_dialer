import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Building2, ArrowUpRight, ArrowDownRight, TrendingUp,
  CheckCircle2, XCircle, Clock, DollarSign, Loader2,
  ArrowLeft,
} from 'lucide-react'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { cn } from '../../utils/cn'
import type { AnalyticsPeriod } from '../../types/crm.types'

/* ── Period pills ─────────────────────────────────────────────────────────── */
const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: 'week' },
  { label: '30 Days', value: 'month' },
  { label: '90 Days', value: 'quarter' },
]

/* ── Sort options ─────────────────────────────────────────────────────────── */
type SortKey = 'submissions' | 'approval' | 'funding' | 'funded_amount'
const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Submissions', value: 'submissions' },
  { label: 'Approval %', value: 'approval' },
  { label: 'Funding %', value: 'funding' },
  { label: 'Funded $', value: 'funded_amount' },
]

interface LenderPerf {
  lender_id: string | number
  lender_name: string
  total_submissions: number
  total_approved: number
  total_declined: number
  total_funded: number
  funded_amount: number
  approval_rate: number
  funding_rate: number
  by_status: Record<string, number>
}

/* ── Colour helpers ───────────────────────────────────────────────────────── */
const LENDER_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-sky-500 to-cyan-500',
  'from-purple-500 to-fuchsia-500',
  'from-lime-500 to-green-500',
  'from-red-500 to-rose-500',
]

function rateColor(rate: number) {
  if (rate >= 70) return 'text-emerald-600'
  if (rate >= 40) return 'text-amber-600'
  return 'text-red-500'
}

function rateBg(rate: number) {
  if (rate >= 70) return 'bg-emerald-500'
  if (rate >= 40) return 'bg-amber-500'
  return 'bg-red-400'
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

/* ── Component ────────────────────────────────────────────────────────────── */
export function CrmLenderPerformance() {
  const navigate = useNavigate()
  const { setDescription, setActions } = useCrmHeader()
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [sortBy, setSortBy] = useState<SortKey>('submissions')

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['crm-lender-performance-full', period],
    queryFn: async () => {
      const res = await crmService.getLenderPerformance(period)
      return res.data?.data ?? res.data
    },
  })

  const lenders: LenderPerf[] = (Array.isArray(rawData) ? rawData : []).map((l: Record<string, unknown>) => ({
    lender_id:         l.lender_id as string,
    lender_name:       (l.lender_name ?? l.name ?? 'Unknown') as string,
    total_submissions: Number(l.total_submissions ?? 0),
    total_approved:    Number(l.total_approved ?? 0),
    total_declined:    Number(l.total_declined ?? 0),
    total_funded:      Number(l.total_funded ?? 0),
    funded_amount:     Number(l.funded_amount ?? 0),
    approval_rate:     Number(l.approval_rate ?? 0),
    funding_rate:      Number(l.funding_rate ?? 0),
    by_status:         (l.by_status ?? {}) as Record<string, number>,
  }))

  const sorted = [...lenders].sort((a, b) => {
    switch (sortBy) {
      case 'approval':      return b.approval_rate - a.approval_rate
      case 'funding':       return b.funding_rate - a.funding_rate
      case 'funded_amount': return b.funded_amount - a.funded_amount
      default:              return b.total_submissions - a.total_submissions
    }
  })

  // Totals for summary cards
  const totals = lenders.reduce(
    (acc, l) => ({
      submissions: acc.submissions + l.total_submissions,
      approved:    acc.approved + l.total_approved,
      declined:    acc.declined + l.total_declined,
      funded:      acc.funded + l.total_funded,
      amount:      acc.amount + l.funded_amount,
    }),
    { submissions: 0, approved: 0, declined: 0, funded: 0, amount: 0 },
  )
  const overallApproval = totals.submissions > 0 ? Math.round(totals.approved / totals.submissions * 100) : 0
  const overallFunding  = totals.submissions > 0 ? Math.round(totals.funded / totals.submissions * 100) : 0

  useEffect(() => {
    setDescription(isLoading ? 'Loading...' : `${lenders.length} lenders`)
    setActions(
      <button onClick={() => navigate('/crm/lenders')} className="btn-ghost flex items-center gap-2 text-sm">
        <ArrowLeft size={14} /> Manage Lenders
      </button>,
    )
    return () => { setDescription(undefined); setActions(undefined) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, lenders.length])

  return (
    <div className="space-y-5">
      {/* ── Controls ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                period === p.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium px-2">Sort:</span>
          {SORT_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setSortBy(s.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                sortBy === s.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Submissions', value: totals.submissions.toLocaleString(), icon: Building2, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Approved', value: totals.approved.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Declined', value: totals.declined.toLocaleString(), icon: XCircle, color: 'text-red-500 bg-red-50' },
          { label: 'Approval Rate', value: `${overallApproval}%`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
          { label: 'Total Funded', value: totals.funded > 0 ? `${totals.funded} (${formatCurrency(totals.amount)})` : '0', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', card.color)}>
                <card.icon size={14} />
              </div>
              <span className="text-[11px] font-medium text-slate-400">{card.label}</span>
            </div>
            <p className="text-lg font-bold text-slate-900">{isLoading ? '—' : card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Lender Table ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex justify-center">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Building2 size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">No lender submissions found for this period</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Lender', 'Submissions', 'Approved', 'Declined', 'Approval Rate', 'Funded', 'Funding Rate', 'Funded Amount', 'Status Breakdown'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((l, i) => (
                  <tr key={l.lender_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {/* Lender Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white bg-gradient-to-br', LENDER_COLORS[i % LENDER_COLORS.length])}>
                          <Building2 size={14} />
                        </div>
                        <span className="text-[13px] font-semibold text-slate-800 truncate max-w-[180px]">
                          {l.lender_name}
                        </span>
                      </div>
                    </td>

                    {/* Submissions */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-800 tabular-nums">{l.total_submissions}</span>
                    </td>

                    {/* Approved */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-600 tabular-nums">{l.total_approved}</span>
                      </div>
                    </td>

                    {/* Declined */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <XCircle size={13} className="text-red-400" />
                        <span className="text-sm font-semibold text-red-500 tabular-nums">{l.total_declined}</span>
                      </div>
                    </td>

                    {/* Approval Rate */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', rateBg(l.approval_rate))}
                            style={{ width: `${Math.min(l.approval_rate, 100)}%` }} />
                        </div>
                        <span className={cn('text-sm font-bold tabular-nums', rateColor(l.approval_rate))}>
                          {l.approval_rate}%
                        </span>
                      </div>
                    </td>

                    {/* Funded */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={13} className="text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-600 tabular-nums">{l.total_funded}</span>
                      </div>
                    </td>

                    {/* Funding Rate */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', rateBg(l.funding_rate))}
                            style={{ width: `${Math.min(l.funding_rate, 100)}%` }} />
                        </div>
                        <span className={cn('text-sm font-bold tabular-nums', rateColor(l.funding_rate))}>
                          {l.funding_rate}%
                        </span>
                      </div>
                    </td>

                    {/* Funded Amount */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-800 tabular-nums">
                        {l.funded_amount > 0 ? formatCurrency(l.funded_amount) : '—'}
                      </span>
                    </td>

                    {/* Status Breakdown */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(l.by_status).map(([status, count]) => (
                          <span key={status} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                            {status}: <b className="text-slate-800">{count}</b>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
