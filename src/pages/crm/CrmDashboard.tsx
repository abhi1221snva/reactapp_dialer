import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts'
import {
  Users, TrendingUp, TrendingDown, Target, Activity,
  Award, DollarSign, ArrowRight, FileText,
  UserPlus, BarChart3, CheckCircle2,
  Building2, RefreshCw,
} from 'lucide-react'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { useAuthStore } from '../../stores/auth.store'
import { initials } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { AnalyticsPeriod } from '../../types/crm.types'

// ─── Dummy / fallback data (shown when API returns empty) ─────────────────────
function makeDailyDates(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (count - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}
const _dates = makeDailyDates(20)
const _seed  = [12,18,9,22,15,27,11,19,8,24,16,21,14,7,23,17,20,10,26,13]

const DUMMY = {
  distribution: {
    total: 1024,
    distribution: [
      { status_name: 'New Lead',     count: 245, percentage: 24, color: '#6366f1' },
      { status_name: 'Contacted',    count: 187, percentage: 18, color: '#06b6d4' },
      { status_name: 'Submitted',    count: 134, percentage: 13, color: '#8b5cf6' },
      { status_name: 'Under Review', count:  98, percentage: 10, color: '#f59e0b' },
      { status_name: 'Approved',     count:  76, percentage:  7, color: '#10b981' },
      { status_name: 'Funded',       count:  52, percentage:  5, color: '#22c55e' },
      { status_name: 'Follow Up',    count: 143, percentage: 14, color: '#f97316' },
      { status_name: 'Declined',     count:  89, percentage:  9, color: '#ef4444' },
    ],
  },
  velocity: {
    total_leads: 347,
    avg_per_day: 17.4,
    daily: _dates.map((date, i) => ({ date, new_leads: _seed[i] })),
  },
  agents: [
    { user_name: 'Marcus Rivera',   total: 143, by_status: { funded: 18, closed_won: 4, submitted: 31, approved: 12 } },
    { user_name: 'Samantha Cole',   total: 128, by_status: { funded: 15, closed_won: 3, submitted: 28, approved: 10 } },
    { user_name: 'David Kim',       total: 119, by_status: { funded: 14, closed_won: 2, submitted: 24, approved: 9  } },
    { user_name: 'Priya Sharma',    total: 107, by_status: { funded: 11, closed_won: 3, submitted: 22, approved: 8  } },
    { user_name: 'Jason Torres',    total:  98, by_status: { funded: 10, closed_won: 2, submitted: 19, approved: 7  } },
    { user_name: 'Emily Nguyen',    total:  87, by_status: { funded:  9, closed_won: 1, submitted: 17, approved: 6  } },
    { user_name: 'Carlos Mendez',   total:  76, by_status: { funded:  7, closed_won: 2, submitted: 15, approved: 5  } },
    { user_name: 'Rachel Brooks',   total:  65, by_status: { funded:  6, closed_won: 1, submitted: 12, approved: 4  } },
  ],
  funnel: {
    funnel: [
      { status_name: 'New Lead',     count: 1024, percentage: 100 },
      { status_name: 'Contacted',    count:  812, percentage:  79 },
      { status_name: 'Submitted',    count:  487, percentage:  60 },
      { status_name: 'Under Review', count:  341, percentage:  70 },
      { status_name: 'Approved',     count:  198, percentage:  58 },
      { status_name: 'Funded',       count:   52, percentage:  26 },
    ],
  },
  lenders: [
    { lender_name: 'Greenfield Capital',  total_sent: 210, total_approved: 134, total_funded: 28, approval_rate: 64 },
    { lender_name: 'Summit Funding',      total_sent: 185, total_approved: 108, total_funded: 21, approval_rate: 58 },
    { lender_name: 'Apex MCA Partners',   total_sent: 162, total_approved:  89, total_funded: 18, approval_rate: 55 },
    { lender_name: 'BlueSky Finance',     total_sent: 144, total_approved:  74, total_funded: 14, approval_rate: 51 },
    { lender_name: 'Liberty Advance',     total_sent: 121, total_approved:  58, total_funded: 10, approval_rate: 48 },
    { lender_name: 'Horizon Lending',     total_sent:  98, total_approved:  43, total_funded:  8, approval_rate: 44 },
  ],
  mca: {
    funding: {
      totalFunded:     2_840_000,
      totalDeals:      52,
      totalCommission:   142_000,
      dailyFunding: _dates.slice(-14).map((date, i) => ({
        date,
        deals:  Math.max(1, Math.round(_seed[i] * 0.4)),
        amount: Math.round(_seed[i] * 14000 + 80000),
      })),
    },
    conversions: {
      totalLeads:       1024,
      contacted:         812,
      submitted:         487,
      approved:          198,
      funded:             52,
      overallConversion:  5.1,
      contactRate:       79.3,
      submissionRate:    60.0,
      approvalRate:      40.7,
      fundingRate:       26.3,
    },
    comparison: {
      change: { leads: 12.4, volume: 8.7 },
    },
  },
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899']
const FUNNEL_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#10b981','#34d399','#f59e0b','#fbbf24','#ef4444']
const AGENT_GRADIENTS = [
  'from-indigo-500 to-violet-600','from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500','from-rose-500 to-pink-600',
  'from-sky-500 to-cyan-600','from-purple-500 to-indigo-500',
]

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today',   label: 'Today'   },
  { value: 'week',    label: 'Week'    },
  { value: 'month',   label: 'Month'   },
  { value: 'quarter', label: 'Quarter' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
function fmtMoney(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + Number(n).toFixed(2)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-slate-100 rounded-xl', className)} />
}

// ─── Trend badge ──────────────────────────────────────────────────────────────
function TrendBadge({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full',
      up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
    )}>
      {up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, gradient, sub, trend, onClick, loading,
}: {
  label: string; value: string | number; icon: React.ElementType
  gradient: string; sub?: string; trend?: number
  onClick?: () => void; loading?: boolean
}) {
  if (loading) return <Skeleton className="h-[86px]" />
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden',
        'bg-white border border-slate-100 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200'
      )}
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br flex-shrink-0', gradient)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</p>
        <p className="font-bold text-slate-900 text-xl leading-none mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
      {trend !== undefined && <TrendBadge pct={trend} />}
    </div>
  )
}

// ─── Period selector ──────────────────────────────────────────────────────────
function PeriodSelector({ value, onChange }: { value: AnalyticsPeriod; onChange: (p: AnalyticsPeriod) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-full px-1 py-1">
      {PERIODS.map(p => (
        <button key={p.value} onClick={() => onChange(p.value)}
          className={cn(
            'px-3 py-1 rounded-full text-[11px] font-semibold transition-all',
            value === p.value ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >{p.label}</button>
      ))}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-100 px-3 py-2 text-xs">
      {label && <p className="text-slate-500 mb-1.5 font-medium">{label}</p>}
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-700 font-semibold">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CrmDashboard() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const { setDescription, setActions } = useCrmHeader()
  const { user } = useAuthStore()

  const greeting    = getGreeting()
  const displayName = user?.first_name || user?.name?.split(' ')[0] || ''
  const today       = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    setDescription('Pipeline analytics & lead performance')
    setActions(null)
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: distribution, isLoading: loadingDist } = useQuery({
    queryKey: ['crm-status-distribution', period],
    queryFn: async () => {
      const res = await crmService.getStatusDistribution(period)
      return res.data?.data ?? res.data
    },
  })

  const { data: velocity, isLoading: loadingVel } = useQuery({
    queryKey: ['crm-lead-velocity', period],
    queryFn: async () => {
      const res = await crmService.getLeadVelocity(period)
      return res.data?.data ?? res.data
    },
  })

  const { data: agentPerf, isLoading: loadingAgent } = useQuery({
    queryKey: ['crm-agent-performance', period],
    queryFn: async () => {
      const res = await crmService.getAgentPerformance(period)
      return res.data?.data ?? res.data
    },
  })

  const { data: funnel, isLoading: loadingFunnel } = useQuery({
    queryKey: ['crm-conversion-funnel', period],
    queryFn: async () => {
      const res = await crmService.getConversionFunnel(period)
      return res.data?.data ?? res.data
    },
  })

  const { data: lenderPerf, isLoading: loadingLender } = useQuery({
    queryKey: ['crm-lender-performance', period],
    queryFn: async () => {
      const res = await crmService.getLenderPerformance(period)
      return res.data?.data ?? res.data
    },
  })

  const { data: mcaData, isLoading: loadingMca } = useQuery({
    queryKey: ['mca-metrics', period],
    queryFn: async () => {
      const res = await crmService.getMcaMetrics({ period })
      return res.data?.data ?? res.data
    },
  })

  // ── Derived data (falls back to DUMMY when API returns empty) ─────────────
  const rawDist = distribution?.distribution?.length ? distribution.distribution : DUMMY.distribution.distribution
  const distItems: { status_name: string; count: number; percentage: number; color?: string }[] =
    rawDist.map((d: Record<string, unknown>) => ({
      status_name: String(d.title ?? d.status_name ?? d.status ?? ''),
      count:       Number(d.count ?? 0),
      percentage:  Number(d.percentage ?? 0),
      color:       d.color as string | undefined,
    }))

  const rawVelDaily = velocity?.daily?.length ? velocity.daily : DUMMY.velocity.daily
  const velocityItems: { date: string; count: number }[] =
    rawVelDaily.map((d: Record<string, unknown>) => ({
      date:  String(d.date ?? '').slice(5),
      count: Number(d.new_leads ?? d.count ?? 0),
    }))

  const agents: { user_name: string; total: number; by_status: Record<string, number> }[] =
    (Array.isArray(agentPerf) && agentPerf.length) ? agentPerf : DUMMY.agents

  const rawFunnel = (funnel?.funnel ?? funnel?.stages ?? [])
  const funnelItems: { status_name: string; count: number; percentage: number }[] =
    (rawFunnel.length ? rawFunnel : DUMMY.funnel.funnel).map((f: Record<string, unknown>) => ({
      status_name: String(f.title ?? f.status_name ?? f.status ?? ''),
      count:       Number(f.count ?? 0),
      percentage:  Number(f.conversion_from_previous ?? f.percentage ?? 0),
    }))

  const rawLenders = Array.isArray(lenderPerf) ? lenderPerf : (lenderPerf?.lenders ?? [])
  const lenders: { lender_name?: string; name?: string; total_sent?: number; total_approved?: number; total_funded?: number; approval_rate?: number }[] =
    rawLenders.length ? rawLenders : DUMMY.lenders

  // MCA-derived
  const mcaFunding    = (mcaData?.funding?.totalFunded   != null) ? mcaData.funding    : DUMMY.mca.funding
  const mcaConv       = (mcaData?.conversions?.totalLeads != null) ? mcaData.conversions : DUMMY.mca.conversions
  const mcaComparison = mcaData?.comparison ?? DUMMY.mca.comparison

  const distTotal     = (distribution?.total ?? 0) || DUMMY.distribution.total
  const velocityTotal = (velocity?.total_leads ?? 0) || DUMMY.velocity.total_leads
  const activeAgents  = agents.length
  const topDistItem   = distItems.reduce(
    (prev, cur) => cur.count > prev.count ? cur : prev,
    { count: 0, status_name: '—', percentage: 0 }
  )
  const fundedCount   = agents.reduce((s, a) => s + ((a.by_status?.funded ?? 0) + (a.by_status?.closed_won ?? 0)), 0)

  // Funnel max for bar sizing
  const funnelMax = funnelItems.length > 0 ? Math.max(...funnelItems.map(f => f.count), 1) : 1

  const statsLoading = loadingDist || loadingVel

  return (
    <div className="space-y-5 pb-6">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-6 py-5 flex items-center justify-between relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
          boxShadow: '0 8px 32px rgba(16,185,129,0.28)',
        }}
      >
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute right-32 -bottom-12 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-emerald-300 text-sm font-medium">{today}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">
            {greeting}{displayName ? `, ${displayName}` : '!'} 👋
          </h1>
          <p className="text-emerald-300 text-sm mt-1">Here's what's happening with your pipeline today.</p>
        </div>

        <div className="relative flex items-center gap-2">
          <PeriodSelector value={period} onChange={setPeriod} />
          {[
            { label: 'Add Lead', icon: UserPlus, to: '/crm/leads/create' },
            { label: 'Leads',    icon: Users,    to: '/crm/leads' },
          ].map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold bg-white/10 hover:bg-white/20 transition-all"
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Primary KPIs ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Leads"
          value={fmtNum(distTotal)}
          icon={Users}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
          sub="In pipeline"
          trend={mcaComparison?.change?.leads}
          onClick={() => navigate('/crm/leads')}
          loading={statsLoading}
        />
        <KpiCard
          label="New This Period"
          value={fmtNum(velocityTotal)}
          icon={Activity}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          sub={`~${velocity?.avg_per_day ?? 0}/day average`}
          onClick={() => navigate('/crm/leads')}
          loading={loadingVel}
        />
        <KpiCard
          label="Total Funded"
          value={loadingMca ? '—' : fmtMoney(mcaFunding.totalFunded ?? 0)}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          sub={loadingMca ? '' : `${mcaFunding.totalDeals ?? 0} funded deals`}
          trend={mcaComparison?.change?.volume}
          loading={statsLoading && loadingMca}
        />
        <KpiCard
          label="Conversion Rate"
          value={loadingMca ? '—' : `${(mcaConv.overallConversion ?? 0).toFixed(1)}%`}
          icon={Target}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          sub={loadingMca ? '' : `${mcaConv.funded ?? fundedCount} closed deals`}
          loading={statsLoading && loadingMca}
        />
      </div>

      {/* ── Secondary KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Commission Earned"
          value={loadingMca ? '—' : fmtMoney(mcaFunding.totalCommission ?? 0)}
          icon={Award}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
          sub="This period"
          loading={loadingMca}
        />
        <KpiCard
          label="Active Agents"
          value={activeAgents}
          icon={Users}
          gradient="bg-gradient-to-br from-sky-500 to-cyan-600"
          sub="Working leads"
          onClick={() => navigate('/agents')}
          loading={loadingAgent}
        />
        <KpiCard
          label="Top Stage"
          value={topDistItem.status_name || '—'}
          icon={BarChart3}
          gradient="bg-gradient-to-br from-teal-500 to-emerald-600"
          sub={`${topDistItem.count} leads`}
          loading={loadingDist}
        />
        <KpiCard
          label="Submitted"
          value={loadingMca ? '—' : fmtNum(mcaConv.submitted ?? 0)}
          icon={FileText}
          gradient="bg-gradient-to-br from-orange-500 to-amber-500"
          sub={loadingMca ? '' : `${(mcaConv.submissionRate ?? 0).toFixed(1)}% submission rate`}
          loading={loadingMca}
        />
      </div>

      {/* ── Pipeline distribution donut ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pipeline distribution donut */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader
            title="Pipeline Distribution"
            sub="Leads by stage"
            right={<span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">{distTotal.toLocaleString()} total</span>}
          />
          {loadingDist ? (
            <Skeleton className="h-[200px]" />
          ) : distItems.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={155}>
                <PieChart>
                  <Pie data={distItems} dataKey="count" nameKey="status_name"
                    cx="50%" cy="50%" innerRadius={42} outerRadius={72}
                    paddingAngle={2} stroke="none"
                  >
                    {distItems.map((d, i) => (
                      <Cell key={i} fill={d.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 12 }}
                    formatter={(v: number, name: string) => [`${v} (${distTotal ? Math.round(v/distTotal*100) : 0}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-1">
                {distItems.slice(0, 6).map((d, i) => (
                  <div key={d.status_name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: d.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-600 truncate flex-1">{d.status_name}</span>
                    <span className="font-bold text-slate-800 tabular-nums">{d.count}</span>
                    <span className="text-slate-400 w-7 text-right tabular-nums">{d.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-slate-300">
              <Target size={32} />
              <p className="text-sm text-slate-400">No pipeline data</p>
            </div>
          )}
        </div>

        {/* Lender Performance */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader
            title="Lender Performance"
            sub="Approval & funding rates"
            right={
              <button onClick={() => navigate('/crm/lenders')}
                className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700">
                View all <ArrowRight size={12} />
              </button>
            }
          />
          {loadingLender ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : lenders.length > 0 ? (
            <div className="space-y-2.5">
              {lenders.slice(0, 8).map((l, i) => {
                const name      = l.lender_name ?? l.name ?? `Lender #${i+1}`
                const approvalR = Number(l.approval_rate ?? (l.total_sent && l.total_approved ? Math.round(l.total_approved / l.total_sent * 100) : 0))
                const lColors   = ['from-indigo-500 to-violet-500','from-emerald-500 to-teal-500','from-amber-500 to-orange-500','from-rose-500 to-pink-500','from-sky-500 to-cyan-500']
                return (
                  <div key={name + i} className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white bg-gradient-to-br', lColors[i % lColors.length])}>
                      <Building2 size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{name}</p>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {l.total_funded != null && (
                            <span className="text-[11px] font-bold text-emerald-600">{l.total_funded} funded</span>
                          )}
                          <span className={cn('text-[11px] font-bold tabular-nums', approvalR >= 50 ? 'text-emerald-600' : 'text-amber-600')}>
                            {approvalR}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full bg-gradient-to-r transition-all', lColors[i % lColors.length])}
                          style={{ width: `${Math.min(approvalR, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-300">
              <Building2 size={28} />
              <p className="text-sm text-slate-400">No lender data available</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Agent Leaderboard ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4">

        {/* Agent Leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader
            title="Agent Leaderboard"
            sub="Lead volume & conversion rate"
            right={
              <button onClick={() => navigate('/agents')}
                className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700">
                View all <ArrowRight size={12} />
              </button>
            }
          />
          {loadingAgent ? (
            <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : agents.length > 0 ? (
            <div className="space-y-2.5">
              {agents.slice(0, 8).map((a, idx) => {
                const funded   = (a.by_status?.funded ?? 0) + (a.by_status?.closed_won ?? 0)
                const convRate = a.total > 0 ? Math.round((funded / a.total) * 100) : 0
                const medal    = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                const maxTotal = agents[0]?.total ?? 1
                const barPct   = maxTotal > 0 ? Math.round((a.total / maxTotal) * 100) : 0
                return (
                  <div key={a.user_name ?? idx} className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 bg-gradient-to-br',
                      AGENT_GRADIENTS[idx % AGENT_GRADIENTS.length]
                    )}>
                      {medal ?? initials(a.user_name ?? '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{a.user_name ?? `Agent #${idx+1}`}</p>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[11px] font-bold text-slate-700 tabular-nums">{a.total} leads</span>
                          <span className={cn('text-[11px] font-bold tabular-nums', convRate >= 50 ? 'text-emerald-600' : 'text-amber-600')}>
                            {convRate}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full bg-gradient-to-r transition-all', AGENT_GRADIENTS[idx % AGENT_GRADIENTS.length])}
                          style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-300">
              <Users size={28} />
              <p className="text-sm text-slate-400">No agent data available</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MCA Funding bar chart + Renewal strip ───────────────────────────── */}
      {!loadingMca && (mcaData?.funding?.dailyFunding?.length > 0 || mcaData?.renewals) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Daily funding bar */}
          {mcaData?.funding?.dailyFunding?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
              <SectionHeader title="Daily Funding Volume" sub="Funded deal amounts per day" />
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={(mcaData.funding.dailyFunding as { date: string; deals: number; amount: number }[]).slice(-20)} barSize={16} margin={{ left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={(d: string) => d.slice(5)} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => fmtMoney(v)} />
                  <Tooltip
                    formatter={(v: number) => [fmtMoney(v), 'Funded']}
                    contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 12 }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
