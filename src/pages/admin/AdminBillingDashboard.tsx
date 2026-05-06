import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  DollarSign, Users, AlertTriangle, TrendingUp,
  Loader2, Calendar, Search,
} from 'lucide-react'
import {
  adminBillingService,
  type BillingDashboardData,
  type AutoRechargeLogEntry,
  type UsageSummaryRow,
} from '../../services/billing.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { formatDateTime } from '../../utils/format'

type Tab = 'Overview' | 'Usage Report'

export function AdminBillingDashboard() {
  const [tab, setTab] = useState<Tab>('Overview')

  return (
    <div className="p-6 w-full">
      <PageHeader
        title="Billing Dashboard"
        subtitle="Revenue, client health, and auto-recharge activity."
      />

      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {(['Overview', 'Usage Report'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium ' +
                (tab === t
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')
              }
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'Overview' && <OverviewTab />}
      {tab === 'Usage Report' && <UsageReportTab />}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-billing-dashboard'],
    queryFn: adminBillingService.getDashboard,
    staleTime: 60_000,
  })

  if (isLoading) return <Spinner />

  const d: BillingDashboardData | undefined = data?.data?.data

  if (!d) return <p className="text-sm text-slate-500">Failed to load dashboard data.</p>

  const revenue30d = Number(d.total_revenue_30d || 0)
  const avgPerClient = d.active_clients > 0 ? revenue30d / d.active_clients : 0

  const breakdownData = [
    { name: 'Voice', value: Number(d.revenue_breakdown.voice_revenue || 0), color: '#6366f1' },
    { name: 'SMS', value: Number(d.revenue_breakdown.sms_revenue || 0), color: '#10b981' },
    { name: 'DID', value: Number(d.revenue_breakdown.did_revenue || 0), color: '#f59e0b' },
  ].filter((item) => item.value > 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          iconColor="bg-emerald-500"
          label="Revenue (30d)"
          value={`${revenue30d.toFixed(2)} credits`}
        />
        <KpiCard
          icon={Users}
          iconColor="bg-blue-500"
          label="Active Clients"
          value={String(d.active_clients)}
        />
        <KpiCard
          icon={AlertTriangle}
          iconColor="bg-amber-500"
          label="Low Balance Clients"
          value={String(d.low_balance_clients)}
        />
        <KpiCard
          icon={TrendingUp}
          iconColor="bg-indigo-500"
          label="Avg Revenue / Client"
          value={`${avgPerClient.toFixed(2)} credits`}
        />
      </div>

      {/* Revenue Breakdown Chart */}
      {breakdownData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Revenue Breakdown (30 days)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => v.toFixed(0)} />
                <YAxis type="category" dataKey="name" width={60} />
                <Tooltip formatter={(v: number) => v.toFixed(2) + ' credits'} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {breakdownData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Auto-Recharge Events */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 text-sm mb-4">Recent Auto-Recharge Events</h3>
        {d.recent_auto_recharges.length === 0 ? (
          <p className="text-sm text-slate-400">No auto-recharge events yet.</p>
        ) : (
          <DataTable<AutoRechargeLogEntry>
            columns={autoRechargeColumns}
            data={d.recent_auto_recharges}
          />
        )}
      </div>
    </div>
  )
}

const STATUS_BADGE: Record<string, 'green' | 'red' | 'gray'> = {
  success: 'green',
  failed: 'red',
  cooldown_skipped: 'gray',
}

const autoRechargeColumns: Column<AutoRechargeLogEntry>[] = [
  { key: 'created_at', header: 'When', render: (r) => formatDateTime(r.created_at) },
  { key: 'client_id', header: 'Client' },
  { key: 'amount', header: 'Amount', className: 'text-right', render: (r) => `$${Number(r.amount).toFixed(2)}` },
  { key: 'status', header: 'Status', render: (r) => (
    <Badge variant={STATUS_BADGE[r.status] ?? 'gray'}>{r.status.replace('_', ' ')}</Badge>
  )},
  { key: 'balance_before', header: 'Before', className: 'text-right', render: (r) => Number(r.balance_before).toFixed(2) },
  { key: 'balance_after', header: 'After', className: 'text-right', render: (r) => Number(r.balance_after).toFixed(2) },
  { key: 'stripe_payment_intent_id', header: 'Stripe Ref', render: (r) => (
    <span className="text-xs font-mono text-slate-500 max-w-[12rem] truncate block">
      {r.stripe_payment_intent_id ?? (r.failure_reason || '—')}
    </span>
  )},
]

// ── Usage Report Tab ──────────────────────────────────────────────────────────

function UsageReportTab() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [clientId, setClientId] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 50

  const { data, isFetching } = useQuery({
    queryKey: ['admin-billing-usage', from, to, clientId, page],
    queryFn: () => adminBillingService.getUsageReport({
      from,
      to,
      client_id: clientId ? Number(clientId) : undefined,
      page,
      per_page: perPage,
    }),
    placeholderData: keepPreviousData,
  })

  const summaries: UsageSummaryRow[] = data?.data?.data?.summaries ?? []
  const pagination = data?.data?.data?.pagination ?? { page: 1, per_page: perPage, total: 0, last_page: 1 }
  const totals = data?.data?.data?.totals

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">From</span>
            <div className="relative mt-1">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1) }}
                className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">To</span>
            <div className="relative mt-1">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1) }}
                className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Client ID (optional)</span>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={clientId}
                onChange={(e) => { setClientId(e.target.value.replace(/\D/g, '')); setPage(1) }}
                placeholder="All clients"
                className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-36"
              />
            </div>
          </label>
          {isFetching && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin mb-2" />}
        </div>
      </div>

      {/* Summary totals */}
      {totals && (
        <div className="flex gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-400">Total Credits Used</p>
            <p className="text-lg font-bold text-slate-800">{Number(totals.total_credits_used).toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-400">Total Credits Granted</p>
            <p className="text-lg font-bold text-slate-800">{Number(totals.total_credits_granted).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <DataTable<UsageSummaryRow>
          columns={usageColumns}
          data={summaries}
          loading={isFetching && summaries.length === 0}
          emptyText="No usage data for this period."
          pagination={{
            page: pagination.page,
            total: pagination.total,
            perPage: pagination.per_page,
            onChange: setPage,
          }}
        />
      </div>
    </div>
  )
}

const usageColumns: Column<UsageSummaryRow>[] = [
  { key: 'summary_date', header: 'Date' },
  { key: 'client_id', header: 'Client' },
  { key: 'call_minutes_out', header: 'Voice Out (min)', className: 'text-right',
    render: (r) => Number(r.call_minutes_out).toFixed(1) },
  { key: 'call_minutes_in', header: 'Voice In (min)', className: 'text-right',
    render: (r) => Number(r.call_minutes_in).toFixed(1) },
  { key: 'sms_out_count', header: 'SMS Out', className: 'text-right' },
  { key: 'sms_in_count', header: 'SMS In', className: 'text-right' },
  { key: 'did_charges', header: 'DID', className: 'text-right',
    render: (r) => Number(r.did_charges).toFixed(2) },
  { key: 'total_credits_used', header: 'Used', className: 'text-right font-semibold',
    render: (r) => Number(r.total_credits_used).toFixed(2) },
  { key: 'total_credits_granted', header: 'Granted', className: 'text-right',
    render: (r) => Number(r.total_credits_granted).toFixed(2) },
]

// ── Shared Components ─────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, iconColor, label, value }: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="p-8 flex items-center gap-2 text-slate-500">
      <Loader2 className="animate-spin w-4 h-4" /> Loading...
    </div>
  )
}
