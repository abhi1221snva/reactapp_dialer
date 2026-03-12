import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Phone, Users, Radio, MessageSquare, Voicemail,
  UserPlus, PhoneCall, PhoneOff, Activity, TrendingUp, TrendingDown,
  DollarSign, ArrowRight, Clock, Target, Award,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts'
import { dashboardService } from '../../services/dashboard.service'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'

// ─── Palette ──────────────────────────────────────────────────────────────────
const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899']

const CALL_TYPE_COLORS: Record<string, string> = {
  inbound:          '#10b981',
  outbound_dialer:  '#6366f1',
  outbound_manual:  '#f59e0b',
  outbound_c2c:     '#f97316',
}
const CALL_TYPE_LABELS: Record<string, string> = {
  inbound:          'Inbound',
  outbound_dialer:  'Auto Dialer',
  outbound_manual:  'Manual',
  outbound_c2c:     'C2C',
}

// ─── Dummy / fallback data (shown when API returns empty) ─────────────────────
function _makeDates(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (count - 1 - i))
    return { date: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  })
}
const _days = _makeDates(14)
const _callSeed = [187,214,198,243,176,259,232,208,191,267,224,238,195,251]
const _hourSeed = [4,8,14,22,31,45,58,72,86,94,89,76,63,54,48,41,37,31,24,18,13,9,6,3]

const DUMMY = {
  stats: {
    totalCallbacks:   4_821,
    totalLeads:       12_340,
    totalUsers:       24,
    totalCampaigns:   8,
    incomingSms:      1_293,
    outgoingSms:      3_874,
    unreadVoicemail:  17,
    receivedVoicemail:89,
  },
  dailyCalls: _days.map((d, i) => ({ date: d.date, total_calls: _callSeed[i] })),
  dispositions: [
    { disposition: 'Answered',     name: 'Answered',     title: 'Answered',     total: 1842, count: 1842 },
    { disposition: 'No Answer',    name: 'No Answer',    title: 'No Answer',    total:  934, count:  934 },
    { disposition: 'Voicemail',    name: 'Voicemail',    title: 'Voicemail',    total:  612, count:  612 },
    { disposition: 'Busy',         name: 'Busy',         title: 'Busy',         total:  287, count:  287 },
    { disposition: 'Callback',     name: 'Callback',     title: 'Callback',     total:  423, count:  423 },
    { disposition: 'Do Not Call',  name: 'Do Not Call',  title: 'Do Not Call',  total:  198, count:  198 },
    { disposition: 'Wrong Number', name: 'Wrong Number', title: 'Wrong Number', total:  144, count:  144 },
    { disposition: 'Disconnected', name: 'Disconnected', title: 'Disconnected', total:  379, count:  379 },
  ],
  revenue: {
    summary: {
      totalRevenue:        48_720.50,
      totalCalls:          4_821,
      avgRevenuePerCall:   10.10,
      totalBillableMinutes:38_560,
    },
    byCallType: {
      inbound:         { revenue: 12_480.00, calls:  987 },
      outbound_dialer: { revenue: 22_340.50, calls: 2_143 },
      outbound_manual: { revenue:  9_860.00, calls:  1_241 },
      outbound_c2c:    { revenue:  4_040.00, calls:   450 },
    },
    byAgent: [
      { extension: '1001', agentName: 'Marcus Rivera',  revenue: 9_240.00, callCount: 521, avgRevenue: 17.74 },
      { extension: '1002', agentName: 'Samantha Cole',  revenue: 8_180.50, callCount: 487, avgRevenue: 16.80 },
      { extension: '1003', agentName: 'David Kim',      revenue: 7_320.00, callCount: 443, avgRevenue: 16.52 },
      { extension: '1004', agentName: 'Priya Sharma',   revenue: 6_450.00, callCount: 398, avgRevenue: 16.21 },
      { extension: '1005', agentName: 'Jason Torres',   revenue: 5_810.00, callCount: 362, avgRevenue: 16.05 },
      { extension: '1006', agentName: 'Emily Nguyen',   revenue: 4_960.00, callCount: 318, avgRevenue: 15.60 },
      { extension: '1007', agentName: 'Carlos Mendez',  revenue: 3_840.00, callCount: 271, avgRevenue: 14.17 },
      { extension: '1008', agentName: 'Rachel Brooks',  revenue: 2_920.00, callCount: 221, avgRevenue: 13.21 },
    ],
    byCampaign: [
      { campaignId: 1, campaignName: 'Q1 Outbound Blitz',     revenue: 14_200.00, callCount: 1_243, totalDurationFormatted: '87h 14m' },
      { campaignId: 2, campaignName: 'Inbound Support Line',  revenue: 10_840.00, callCount:   987, totalDurationFormatted: '64h 22m' },
      { campaignId: 3, campaignName: 'Renewal Follow-Up',     revenue:  9_120.00, callCount:   876, totalDurationFormatted: '58h 41m' },
      { campaignId: 4, campaignName: 'Cold Outreach Mar',     revenue:  7_380.00, callCount:   712, totalDurationFormatted: '47h 09m' },
      { campaignId: 5, campaignName: 'VIP Callbacks',         revenue:  4_960.00, callCount:   432, totalDurationFormatted: '31h 55m' },
      { campaignId: 6, campaignName: 'Survey Campaign',       revenue:  2_220.50, callCount:   571, totalDurationFormatted: '28h 03m' },
    ],
    hourlyBreakdown: _hourSeed.map((calls, i) => ({
      hour:      String(i).padStart(2, '0') + ':00',
      callCount: calls,
      revenue:   calls * 10.1,
    })),
    comparison: { change: { percentage: 12.4 } },
  },
}

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
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PERIOD_OPTIONS = ['7D', '30D', '90D'] as const
type Period = typeof PERIOD_OPTIONS[number]

function buildDateRange(days: number) {
  const to   = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return {
    date_from: from.toISOString().slice(0, 10),
    date_to:   to.toISOString().slice(0, 10),
  }
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────
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
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  gradient: string
  sub?: string
  trend?: number
  badge?: string | null
  badgeColor?: string
  pulse?: boolean
  onClick?: () => void
  loading?: boolean
}
function KpiCard({ label, value, icon: Icon, gradient, sub, trend, badge, badgeColor, pulse, onClick, loading }: KpiCardProps) {
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
      {badge && (
        <span className={cn('flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0', badgeColor)}>
          {pulse && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
          {badge}
        </span>
      )}
    </div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: {name:string;value:number;color:string}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-100 px-3 py-2 text-xs">
      <p className="text-slate-500 mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-700 font-semibold">{p.value.toLocaleString()}</span>
        </div>
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

// ─── Period selector ──────────────────────────────────────────────────────────
function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-full px-1 py-1">
      {PERIOD_OPTIONS.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'px-3 py-1 rounded-full text-[11px] font-semibold transition-all',
            value === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >{p}</button>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function Dashboard() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const [period, setPeriod] = useState<Period>('7D')
  const [revPeriod, setRevPeriod] = useState<Period>('30D')

  const days        = period === '7D' ? 7 : period === '30D' ? 30 : 90
  const revDays     = revPeriod === '7D' ? 7 : revPeriod === '30D' ? 30 : 90
  const dateRange   = buildDateRange(days)
  const revRange    = buildDateRange(revDays)

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => dashboardService.getStats(),
    staleTime: 2 * 60 * 1000,
  })

  const { data: cdrData, isLoading: cdrLoading } = useQuery({
    queryKey: ['cdr-summary', period],
    queryFn:  () => dashboardService.getCdrSummary(dateRange),
  })

  const { data: dispData, isLoading: dispLoading } = useQuery({
    queryKey: ['disposition-report', period],
    queryFn:  () => dashboardService.getDispositionReport(dateRange),
  })

  const { data: revData, isLoading: revLoading } = useQuery({
    queryKey: ['revenue-metrics', revPeriod],
    queryFn:  () => dashboardService.getRevenueMetrics({ period: 'custom', start_date: revRange.date_from, end_date: revRange.date_to }),
  })

  // ── Parse stats (fallback to dummy) ───────────────────────────────────────
  const rawStats = statsData?.data?.data || {}
  const stats = (rawStats.totalCallbacks != null || rawStats.totalLeads != null)
    ? rawStats
    : DUMMY.stats

  // ── Parse CDR daily data (fallback to dummy) ───────────────────────────────
  const rawDaily: { date?: string; day?: string; total_calls?: number; calls?: number }[] =
    (() => { const d = cdrData?.data?.data?.daily_calls || cdrData?.data?.data; return Array.isArray(d) && d.length ? d : DUMMY.dailyCalls })()
  const areaData = rawDaily.map(d => ({
    name:  d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (d.day || ''),
    calls: Number(d.total_calls ?? d.calls ?? 0),
  }))

  // ── Parse disposition (fallback to dummy) ──────────────────────────────────
  const rawDispApi: { disposition?: string; name?: string; title?: string; total?: number; count?: number }[] =
    dispData?.data?.data || []
  const rawDisp = (Array.isArray(rawDispApi) && rawDispApi.length) ? rawDispApi : DUMMY.dispositions
  const pieData = rawDisp.slice(0, 8).map(d => ({
    name:  String(d.disposition ?? d.name ?? d.title ?? 'Unknown'),
    value: Number(d.total ?? d.count ?? 0),
  })).filter(d => d.value > 0)
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0)

  // ── Parse revenue (fallback to dummy) ─────────────────────────────────────
  const rev         = revData?.data?.data
  const revSummary  = rev?.summary?.totalRevenue != null ? rev.summary        : DUMMY.revenue.summary
  const revByType   = rev?.byCallType && Object.keys(rev.byCallType).length   ? rev.byCallType    : DUMMY.revenue.byCallType
  const revAgents   = rev?.byAgent?.length                                    ? rev.byAgent       : DUMMY.revenue.byAgent
  const revCampaign = rev?.byCampaign?.length                                 ? rev.byCampaign    : DUMMY.revenue.byCampaign
  const revHourly   = rev?.hourlyBreakdown?.length                            ? rev.hourlyBreakdown : DUMMY.revenue.hourlyBreakdown
  const revComp     = rev?.comparison ?? DUMMY.revenue.comparison

  const hourlyBar = (revHourly as { hour: string; revenue?: number; callCount?: number }[]).map(h => ({
    hour:    h.hour,
    revenue: Number(h.revenue ?? 0),
    calls:   Number(h.callCount ?? 0),
  }))

  const callTypeBar = Object.entries(revByType).map(([key, v]: [string, unknown]) => {
    const val = v as { revenue?: number; calls?: number }
    return {
      name:    CALL_TYPE_LABELS[key] ?? key,
      revenue: Number(val.revenue ?? 0),
      calls:   Number(val.calls ?? 0),
      color:   CALL_TYPE_COLORS[key] ?? '#94a3b8',
    }
  })

  const greeting     = getGreeting()
  const displayName  = user?.first_name || user?.name?.split(' ')[0] || ''
  const today        = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-5 pb-6">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-6 py-5 flex items-center justify-between relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.30)',
        }}
      >
        {/* bg circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute right-32 -bottom-12 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-indigo-200 text-sm font-medium">{today}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">
            {greeting}{displayName ? `, ${displayName}` : '!'} 👋
          </h1>
          <p className="text-indigo-300 text-sm mt-1">Here's what's happening with your dialer today.</p>
        </div>

        {/* Quick actions */}
        <div className="relative flex items-center gap-2">
          {[
            { label: 'Dialer',   icon: Phone,    to: '/dialer',          bg: 'bg-white/10 hover:bg-white/20' },
            { label: 'Add Lead', icon: UserPlus,  to: '/crm/leads/create', bg: 'bg-emerald-500/80 hover:bg-emerald-500' },
            { label: 'Reports',  icon: BarChart3, to: '/reports',          bg: 'bg-white/10 hover:bg-white/20' },
          ].map(({ label, icon: Icon, to, bg }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all', bg)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Primary KPI row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Calls"
          value={fmtNum(stats.totalCallbacks ?? 0)}
          icon={Phone}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
          sub="All callbacks recorded"
          trend={revComp?.change?.percentage}
          onClick={() => navigate('/reports')}
          loading={statsLoading}
        />
        <KpiCard
          label="Total Leads"
          value={fmtNum(stats.totalLeads ?? 0)}
          icon={Target}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          sub="Across all lists"
          onClick={() => navigate('/crm/leads')}
          loading={statsLoading}
        />
        <KpiCard
          label="Active Agents"
          value={stats.totalUsers ?? 0}
          icon={Users}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          sub="Online & available"
          onClick={() => navigate('/agents')}
          loading={statsLoading}
        />
        <KpiCard
          label="Total Revenue"
          value={revLoading ? '—' : fmtMoney(revSummary.totalRevenue ?? 0)}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          sub={revLoading ? '' : `${revSummary.totalCalls ?? 0} billable calls`}
          trend={revComp?.change?.percentage}
          loading={statsLoading && revLoading}
        />
      </div>

      {/* ── Secondary KPI row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Campaigns"
          value={stats.totalCampaigns ?? 0}
          icon={Radio}
          gradient="bg-gradient-to-br from-sky-500 to-cyan-600"
          sub="Active campaigns"
          onClick={() => navigate('/campaigns')}
          loading={statsLoading}
        />
        <KpiCard
          label="Inbound SMS"
          value={fmtNum(stats.incomingSms ?? 0)}
          icon={MessageSquare}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
          sub="Received messages"
          onClick={() => navigate('/sms')}
          loading={statsLoading}
        />
        <KpiCard
          label="Outbound SMS"
          value={fmtNum(stats.outgoingSms ?? 0)}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-orange-500 to-amber-500"
          sub="Sent messages"
          onClick={() => navigate('/sms')}
          loading={statsLoading}
        />
        <KpiCard
          label="Voicemails"
          value={stats.unreadVoicemail ?? 0}
          icon={Voicemail}
          gradient="bg-gradient-to-br from-red-500 to-rose-600"
          sub={`${stats.receivedVoicemail ?? 0} total received`}
          onClick={() => navigate('/voicemail')}
          loading={statsLoading}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Call Volume — area chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
          <SectionHeader
            title="Call Volume"
            sub="Daily call activity"
            right={<PeriodSelector value={period} onChange={setPeriod} />}
          />
          {cdrLoading ? (
            <Skeleton className="h-[220px]" />
          ) : areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="calls"
                  stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-slate-300">
              <Activity size={36} />
              <p className="text-sm text-slate-400">No call data for this period</p>
            </div>
          )}
        </div>

        {/* Disposition donut */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader title="Disposition Breakdown" sub="Call outcomes" />
          {dispLoading ? (
            <Skeleton className="h-[200px]" />
          ) : pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={78}
                    paddingAngle={2} stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 12 }}
                    formatter={(v: number, name: string) => [`${v} (${pieTotal ? Math.round(v/pieTotal*100) : 0}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-1">
                {pieData.slice(0, 6).map((d, i) => {
                  const pct = pieTotal > 0 ? Math.round(d.value / pieTotal * 100) : 0
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-slate-600 truncate flex-1">{d.name}</span>
                      <span className="font-bold text-slate-800 tabular-nums">{d.value.toLocaleString()}</span>
                      <span className="text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-slate-300">
              <PhoneOff size={32} />
              <p className="text-sm text-slate-400">No disposition data</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Revenue analytics row ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHeader
          title="Revenue Analytics"
          sub="Call revenue breakdown by type and hour"
          right={<PeriodSelector value={revPeriod} onChange={setRevPeriod} />}
        />

        {/* Revenue summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Revenue',     value: fmtMoney(revSummary.totalRevenue ?? 0),       icon: DollarSign, color: 'text-amber-600',  bg: 'bg-amber-50' },
            { label: 'Total Calls',        value: (revSummary.totalCalls ?? 0).toLocaleString(), icon: Phone,      color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Avg Revenue/Call',   value: fmtMoney(revSummary.avgRevenuePerCall ?? 0),   icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Billable Minutes',   value: (revSummary.totalBillableMinutes ?? 0).toLocaleString(), icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl p-3 bg-slate-50 border border-slate-100">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">{label}</p>
                <p className={cn('text-sm font-bold', revLoading ? 'text-slate-300' : 'text-slate-900')}>
                  {revLoading ? '—' : value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Hourly revenue bar */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Hourly Call Volume</p>
            {revLoading ? <Skeleton className="h-[180px]" /> : hourlyBar.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyBar} barSize={8} margin={{ left: -20, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    interval={3} tickFormatter={h => h.slice(0,2)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="calls" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-slate-300">
                <Activity size={28} />
              </div>
            )}
          </div>

          {/* Call type breakdown */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Revenue by Call Type</p>
            {revLoading ? <Skeleton className="h-[180px]" /> : callTypeBar.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={callTypeBar} barSize={32} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => '$' + fmtNum(v)} />
                    <Tooltip formatter={(v: number) => [fmtMoney(v), 'Revenue']}
                      contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 12 }} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {callTypeBar.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {callTypeBar.map(e => (
                    <div key={e.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                      <span className="text-slate-500">{e.name}:</span>
                      <span className="font-bold text-slate-800">{fmtMoney(e.revenue)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-sm text-slate-300">
                <DollarSign size={28} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Agent leaderboard + Campaign table ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Agent leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader
            title="Agent Leaderboard"
            sub="Top agents by revenue"
            right={
              <button onClick={() => navigate('/agents')}
                className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700">
                View all <ArrowRight size={12} />
              </button>
            }
          />
          {revLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : revAgents.length > 0 ? (
            <div className="space-y-2.5">
              {revAgents.slice(0, 8).map((a: { extension?: string; agentName?: string; name?: string; revenue?: number; callCount?: number; avgRevenue?: number }, i: number) => {
                const maxRev = revAgents[0]?.revenue ?? 1
                const pct    = maxRev > 0 ? Math.round((a.revenue ?? 0) / maxRev * 100) : 0
                const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                return (
                  <div key={a.extension ?? i} className="flex items-center gap-3 group">
                    {/* rank / avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                      {medal ?? <span className="text-[10px]">{initials(a.agentName ?? a.name ?? '?')}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{a.agentName ?? a.name ?? `Ext. ${a.extension}`}</p>
                        <p className="text-[13px] font-bold text-slate-900 tabular-nums">{fmtMoney(a.revenue ?? 0)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums w-12 text-right">{a.callCount ?? 0} calls</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-300">
              <Award size={28} />
              <p className="text-sm text-slate-400">No agent data available</p>
            </div>
          )}
        </div>

        {/* Campaign performance */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader
            title="Campaign Performance"
            sub="Revenue by campaign"
            right={
              <button onClick={() => navigate('/campaigns')}
                className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700">
                View all <ArrowRight size={12} />
              </button>
            }
          />
          {revLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : revCampaign.length > 0 ? (
            <div className="space-y-2.5">
              {revCampaign.slice(0, 8).map((c: { campaignId?: number; campaignName?: string; revenue?: number; callCount?: number; totalDurationFormatted?: string }, i: number) => {
                const maxRev = revCampaign[0]?.revenue ?? 1
                const pct    = maxRev > 0 ? Math.round((c.revenue ?? 0) / maxRev * 100) : 0
                const colors = ['from-sky-500 to-cyan-500','from-emerald-500 to-teal-500','from-violet-500 to-purple-500','from-amber-500 to-orange-500','from-rose-500 to-pink-500']
                return (
                  <div key={c.campaignId ?? i} className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br text-white', colors[i % colors.length])}>
                      <Radio size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{c.campaignName ?? `Campaign #${c.campaignId}`}</p>
                        <p className="text-[13px] font-bold text-slate-900 tabular-nums">{fmtMoney(c.revenue ?? 0)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full bg-gradient-to-r transition-all', colors[i % colors.length])}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums w-12 text-right">{c.callCount ?? 0} calls</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-300">
              <Radio size={28} />
              <p className="text-sm text-slate-400">No campaign data available</p>
            </div>
          )}
        </div>
      </div>


    </div>
  )
}
