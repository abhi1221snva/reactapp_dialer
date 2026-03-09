import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Users, TrendingUp, Target, Activity, Loader2, Award, Zap } from 'lucide-react'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type { AnalyticsPeriod } from '../../types/crm.types'

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today',   label: 'Today' },
  { value: 'week',    label: 'Week' },
  { value: 'month',   label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
]

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#F97316', '#EC4899']
const AVATAR_BG  = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-sky-500']

function Sk({ h = 'h-4' }: { h?: string }) {
  return <div className={`${h} skeleton`} />
}

export function CrmDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const { setDescription, setActions } = useCrmHeader()

  useEffect(() => {
    setDescription('Pipeline analytics & performance')
    setActions(
      <div className="period-bar">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={period === p.value ? 'period-btn period-btn-active' : 'period-btn'}
          >
            {p.label}
          </button>
        ))}
      </div>
    )
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  // ── Queries ───────────────────────────────────────────────────────────────
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

  // ── Derived data ──────────────────────────────────────────────────────────
  const distItems = (distribution?.distribution ?? []).map((d: Record<string, unknown>) => ({
    status_name: String(d.title ?? d.status_name ?? d.status ?? ''),
    count:       Number(d.count ?? 0),
    percentage:  Number(d.percentage ?? 0),
  }))

  const velocityItems = (velocity?.daily ?? []).map((d: Record<string, unknown>) => ({
    date:  String(d.date ?? '').slice(5),
    count: Number(d.new_leads ?? d.count ?? 0),
  }))

  const agents: { user_name: string; total: number; by_status: Record<string, number> }[] = agentPerf ?? []

  const funnelItems = (funnel?.funnel ?? funnel?.stages ?? []).map((f: Record<string, unknown>) => ({
    status_name: String(f.title ?? f.status_name ?? f.status ?? ''),
    count:       Number(f.count ?? 0),
    percentage:  Number(f.conversion_from_previous ?? f.percentage ?? 0),
  }))

  const distTotal     = distribution?.total ?? 0
  const velocityTotal = velocity?.total_leads ?? 0
  const topDistItem   = distItems.reduce(
    (prev: { count: number; status_name: string }, cur: { count: number; status_name: string }) =>
      cur.count > prev.count ? cur : prev,
    { count: 0, status_name: '—' }
  )
  const fundedCount  = agents.reduce((s, a) => s + ((a.by_status?.funded ?? 0) + (a.by_status?.closed_won ?? 0)), 0)
  const activeAgents = agents.length

  const statCards = [
    { label: 'Active Leads',    value: distTotal,                  icon: Users,      bgClass: 'bg-indigo-50',  iconClass: 'text-indigo-600' },
    { label: 'New This Period', value: velocityTotal,              icon: Activity,   bgClass: 'bg-emerald-50', iconClass: 'text-emerald-600' },
    { label: 'Avg / Day',       value: velocity?.avg_per_day ?? 0, icon: TrendingUp, bgClass: 'bg-amber-50',   iconClass: 'text-amber-600' },
    { label: 'Top Stage',       value: topDistItem.status_name,    icon: Target,     bgClass: 'bg-violet-50',  iconClass: 'text-violet-600' },
    { label: 'Active Agents',   value: activeAgents,               icon: Award,      bgClass: 'bg-sky-50',     iconClass: 'text-sky-600' },
    { label: 'Funded',          value: fundedCount,                icon: Zap,        bgClass: 'bg-rose-50',    iconClass: 'text-rose-600' },
  ]

  return (
    <div className="space-y-5">

      {/* ── Row 1 — 6 metric stat cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="metric-card">
              <div className="flex items-center gap-3">
                <div className={`metric-icon-wrap ${card.bgClass}`}>
                  <Icon size={18} className={card.iconClass} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="metric-value truncate">{card.value}</p>
                  <p className="metric-label truncate">{card.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Row 2 — Pipeline Distribution + Lead Velocity ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pipeline Status Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Pipeline Distribution</h2>
            <span className="badge badge-indigo">{distTotal} total</span>
          </div>

          {loadingDist ? (
            <div className="space-y-2.5 py-1">
              {[...Array(4)].map((_, i) => <Sk key={i} />)}
            </div>
          ) : distItems.length === 0 ? (
            <div className="flex justify-center items-center py-12 text-sm text-slate-400">No data</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={distItems}
                      dataKey="count"
                      nameKey="status_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {distItems.map((_: unknown, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [v, 'Leads']}
                      contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {distItems.slice(0, 7).map((item: { status_name: string; count: number; percentage: number }, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs flex-1 truncate text-slate-700">{item.status_name}</span>
                    <span className="text-xs font-semibold text-slate-900 flex-shrink-0">{item.count}</span>
                    <span className="text-[10px] w-8 text-right text-slate-400 flex-shrink-0">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lead Velocity */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Lead Velocity</h2>
            {velocity && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">
                  avg <span className="font-semibold text-slate-600">{velocity.avg_per_day}/day</span>
                </span>
                <span className="badge badge-green">{velocity.total_leads} leads</span>
              </div>
            )}
          </div>

          {loadingVel ? (
            <div className="flex justify-center py-14">
              <Loader2 size={18} className="animate-spin text-indigo-500" />
            </div>
          ) : velocityItems.length === 0 ? (
            <div className="flex justify-center items-center py-12 text-sm text-slate-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={velocityItems} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '6px 10px' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Leads"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fill="url(#velocityGrad)"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 3 — Conversion Funnel + Agent Leaderboard ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Conversion Funnel */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Conversion Funnel</h2>
            <span className="text-[11px] text-slate-400">current pipeline</span>
          </div>

          {loadingFunnel ? (
            <div className="space-y-3 py-1">
              {[...Array(5)].map((_, i) => <Sk key={i} h="h-5" />)}
            </div>
          ) : funnelItems.length === 0 ? (
            <div className="flex justify-center items-center py-12 text-sm text-slate-400">No funnel data</div>
          ) : (
            <div className="space-y-3">
              {funnelItems.map((stage: { status_name: string; count: number; percentage: number }, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs truncate mr-2 text-slate-700">{stage.status_name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold text-slate-900">{stage.count}</span>
                      <span className="text-[10px] w-8 text-right text-slate-400">{stage.percentage}%</span>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.max(stage.percentage, 2)}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Leaderboard */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Agent Leaderboard</h2>
            <span className="badge badge-blue">{activeAgents} agents</span>
          </div>

          {loadingAgent ? (
            <div className="space-y-3 py-1">
              {[...Array(4)].map((_, i) => <Sk key={i} h="h-7" />)}
            </div>
          ) : agents.length === 0 ? (
            <div className="flex justify-center items-center py-12 text-sm text-slate-400">No data</div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs" style={{ minWidth: '300px' }}>
                <thead>
                  <tr className="border-b border-slate-100">
                    {['#', 'Agent', 'Leads', 'Funded', 'Rate'].map(h => (
                      <th key={h} className="pb-2 text-left font-semibold px-1 text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.slice(0, 8).map((a, idx) => {
                    const funded   = (a.by_status?.funded ?? 0) + (a.by_status?.closed_won ?? 0)
                    const convRate = a.total > 0 ? Math.round((funded / a.total) * 100) : 0
                    const rankCls  = idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-300'
                    return (
                      <tr key={a.user_name ?? idx} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                        <td className="py-2.5 px-1">
                          <span className={`font-bold text-[11px] ${rankCls}`}>#{idx + 1}</span>
                        </td>
                        <td className="py-2.5 px-1">
                          <div className="flex items-center gap-2">
                            <div className={`lead-avatar ${AVATAR_BG[idx % AVATAR_BG.length]}`}>
                              {(a.user_name ?? '?')[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800 truncate" style={{ maxWidth: '80px' }}>
                              {a.user_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-1 text-slate-600">{a.total}</td>
                        <td className="py-2.5 px-1 text-slate-600">{funded}</td>
                        <td className="py-2.5 px-1">
                          <div className="flex items-center gap-1.5">
                            <div className="progress-track flex-1" style={{ minWidth: '30px' }}>
                              <div
                                className="progress-fill"
                                style={{ width: `${convRate}%`, background: convRate >= 50 ? '#10B981' : '#F59E0B' }}
                              />
                            </div>
                            <span className={`text-[10px] font-semibold flex-shrink-0 ${convRate >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {convRate}%
                            </span>
                          </div>
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

    </div>
  )
}
