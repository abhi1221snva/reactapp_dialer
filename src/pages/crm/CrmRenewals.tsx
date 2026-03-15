import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Loader2, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RenewalPipelineItem {
  id: number
  lead_id: number
  first_name?: string
  last_name?: string
  company_name?: string
  funded_amount: number
  factor_rate: number
  daily_payment: number
  funding_date: string
  renewal_eligible_date: string
  days_until_renewal: number
  lead_status: string
  [key: string]: unknown
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function fmtDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function DaysAwayBadge({ days }: { days: number }) {
  if (days <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        Eligible Now
      </span>
    )
  }
  if (days <= 14) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        {days}d away
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      {days}d away
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase().replace(/[\s]+/g, '_')
  const map: Record<string, string> = {
    funded:           'bg-emerald-100 text-emerald-700',
    active:           'bg-emerald-100 text-emerald-700',
    renewal_eligible: 'bg-indigo-100 text-indigo-700',
    closed:           'bg-slate-100 text-slate-600',
    declined:         'bg-red-100 text-red-600',
  }
  const cls = map[s] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

const DAY_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
]

// ─── Page Component ───────────────────────────────────────────────────────────

export function CrmRenewals() {
  const navigate = useNavigate()
  const { setDescription, setActions } = useCrmHeader()
  const [daysFilter, setDaysFilter] = useState(60)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['renewal-pipeline', daysFilter],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (crmService as any).getRenewalPipeline({ days: daysFilter })
      return (res.data?.data ?? res.data) as RenewalPipelineItem[]
    },
    staleTime: 60 * 1000,
  })

  const items: RenewalPipelineItem[] = Array.isArray(data) ? data : []

  useEffect(() => {
    setDescription(
      isLoading
        ? 'Loading...'
        : `${items.length} deal${items.length !== 1 ? 's' : ''} approaching renewal`
    )
    setActions(
      <button
        onClick={() => refetch()}
        className="btn-outline flex items-center gap-2"
      >
        <RefreshCw size={14} />
        Refresh
      </button>
    )
    return () => {
      setDescription(undefined)
      setActions(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, items.length])

  return (
    <div className="space-y-5">

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-slate-600">Renewal window:</span>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {DAY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDaysFilter(opt.value)}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                daysFilter === opt.value
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Merchant', 'Funded Amount', 'Factor Rate', 'Daily Payment',
                  'Funding Date', 'Renewal Eligible', 'Status', 'Action'].map(h => (
                  <th key={h} className={h === 'Action' ? 'text-right' : ''}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12">
                    <div className="flex justify-center">
                      <Loader2 size={22} className="animate-spin text-emerald-500" />
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="py-12">
                    <div className="text-center">
                      <p className="text-sm text-red-500">Failed to load renewal pipeline.</p>
                      <button onClick={() => refetch()} className="mt-2 text-sm text-emerald-600 underline">
                        Try again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                        <RefreshCw size={22} className="text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">No deals approaching renewal</p>
                      <p className="text-xs text-slate-400 mt-1">
                        No funded deals are eligible for renewal within the next {daysFilter} days.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : items.map(item => {
                const merchantName =
                  item.company_name ||
                  [item.first_name, item.last_name].filter(Boolean).join(' ') ||
                  `Lead #${item.lead_id}`

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <TrendingUp size={13} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{merchantName}</p>
                          <p className="text-xs text-slate-400">Lead #{item.lead_id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <DollarSign size={13} className="text-emerald-500" />
                        <span className="font-semibold text-slate-800 text-sm">
                          {usd(Number(item.funded_amount))}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-slate-700">
                        {typeof item.factor_rate === 'number'
                          ? item.factor_rate.toFixed(2)
                          : String(item.factor_rate ?? '—')}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-slate-700">{usd(Number(item.daily_payment))}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar size={12} className="text-slate-400" />
                        {fmtDate(item.funding_date)}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="text-sm text-slate-700">{fmtDate(item.renewal_eligible_date)}</div>
                        <DaysAwayBadge days={item.days_until_renewal} />
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={item.lead_status} />
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => navigate('/crm/leads/create')}
                        className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
                      >
                        Create Renewal Lead
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
