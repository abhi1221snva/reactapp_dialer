import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { workforceService } from '../../services/workforce.service'
import { cn } from '../../utils/cn'
import { TrendingUp, Award, Coffee } from 'lucide-react'

// ─── Tiny inline chart components (no external chart library required) ─────────

/** Simple SVG line chart */
function LineChart({
  data,
  color = '#6366f1',
  height = 80,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  if (!data.length) return <div className="text-xs text-slate-400 text-center py-4">No data</div>
  const max  = Math.max(...data, 1)
  const w    = 600
  const h    = height
  const pad  = 4
  const step = (w - pad * 2) / (data.length - 1 || 1)
  const points = data.map((v, i) => `${pad + i * step},${h - pad - ((v / max) * (h - pad * 2))}`)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon
        points={`${pad},${h} ${points.join(' ')} ${pad + (data.length - 1) * step},${h}`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
    </svg>
  )
}

/** Simple SVG bar chart */
function BarChart({
  labels,
  values,
  color = '#6366f1',
  height = 100,
}: {
  labels: string[]
  values: number[]
  color?: string
  height?: number
}) {
  if (!values.length) return <div className="text-xs text-slate-400 text-center py-4">No data</div>
  const max  = Math.max(...values, 1)
  const w    = 600
  const barW = Math.max(4, (w / values.length) - 4)
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      {values.map((v, i) => {
        const bh = Math.max(2, (v / max) * (height - 4))
        const x  = i * (w / values.length) + 2
        const y  = height - bh
        return <rect key={i} x={x} y={y} width={barW} height={bh} rx="2" fill={color} fillOpacity="0.8" />
      })}
    </svg>
  )
}

/** Mini stat card with sparkline */
function SparkCard({
  title,
  current,
  unit,
  data,
  color,
  icon: Icon,
}: {
  title: string
  current: string
  unit: string
  data: number[]
  color: string
  icon: React.ElementType
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color)}>
            <Icon size={14} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-slate-500">{title}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-1">{current}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></p>
      <div className="mt-2">
        <LineChart data={data} color={color.startsWith('bg-') ? '#6366f1' : color} height={50} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DAY_OPTIONS = [
  { label: '7 days',  value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
]

export function WorkforceAnalytics() {
  const [days, setDays] = useState(30)

  const attTrend = useQuery({
    queryKey: ['wf-att-trend', days],
    queryFn:  () => workforceService.getAttendanceTrend(days).then(r => r.data as { data: Array<{ date: string; agent_count: number }> }),
  })

  const callAvail = useQuery({
    queryKey: ['wf-call-avail', days],
    queryFn:  () => workforceService.getCallVsAvailability(days).then(r => r.data as { data: Array<{ date: string; agents_online: number; total_calls: number }> }),
  })

  const breakDist = useQuery({
    queryKey: ['wf-break-dist', days],
    queryFn:  () => workforceService.getBreakDistribution(days).then(r => r.data as { data: Array<{ break_type: string; total_breaks: number; total_minutes: number; avg_minutes: number }> }),
  })

  const utilTrend = useQuery({
    queryKey: ['wf-util-trend', days],
    queryFn:  () => workforceService.getUtilizationTrend(days).then(r => r.data as { data: Array<{ date: string; utilization: number; work_hours: number; talk_hours: number }> }),
  })

  const leaderboard = useQuery({
    queryKey: ['wf-leaderboard', days],
    queryFn:  () => workforceService.getLeaderboard(days).then(r => r.data as { data: Array<{ user_id: number; name: string; utilization: number; total_calls: number; work_hours: number; talk_hours: number; days_present: number }> }),
  })

  const attValues   = (attTrend.data?.data   ?? []).map(d => d.agent_count)
  const callValues  = (callAvail.data?.data  ?? []).map(d => d.total_calls)
  const agentValues = (callAvail.data?.data  ?? []).map(d => d.agents_online)
  const utilValues  = (utilTrend.data?.data  ?? []).map(d => d.utilization)

  const avgUtil     = utilValues.length ? Math.round(utilValues.reduce((a, b) => a + b, 0) / utilValues.length) : 0
  const avgAttend   = attValues.length  ? Math.round(attValues.reduce((a, b) => a + b, 0) / attValues.length)   : 0
  const totalCalls  = callValues.reduce((a, b) => a + b, 0)

  const breakData = breakDist.data?.data ?? []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workforce Analytics</h1>
          <p className="page-subtitle">Trends, utilization, and agent performance insights</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {DAY_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setDays(o.value)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                days === o.value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sparkline cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SparkCard
          title="Avg Daily Attendance"
          current={String(avgAttend)}
          unit="agents"
          data={attValues}
          color="bg-indigo-500"
          icon={TrendingUp}
        />
        <SparkCard
          title="Avg Utilization"
          current={String(avgUtil)}
          unit="%"
          data={utilValues}
          color="bg-emerald-500"
          icon={Award}
        />
        <SparkCard
          title="Total Calls"
          current={totalCalls > 1000 ? `${(totalCalls / 1000).toFixed(1)}k` : String(totalCalls)}
          unit="calls"
          data={callValues}
          color="bg-blue-500"
          icon={TrendingUp}
        />
      </div>

      {/* Attendance trend */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Agent Attendance Trend</h3>
          <span className="text-xs text-slate-400">Daily agents present (last {days} days)</span>
        </div>
        {attTrend.isLoading ? (
          <div className="animate-pulse h-28 bg-slate-100 rounded-xl" />
        ) : (
          <div>
            <LineChart data={attValues} color="#6366f1" height={100} />
            <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
              <span>{(attTrend.data?.data?.[0]?.date ?? '').slice(5)}</span>
              <span>{((d => d?.[d.length - 1])(attTrend.data?.data)?.date ?? '').slice(5)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Call volume vs availability */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Call Volume vs Agent Availability</h3>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-1 bg-blue-400 inline-block rounded" /> Calls</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 bg-indigo-400 inline-block rounded" /> Agents Online</span>
          </div>
        </div>
        {callAvail.isLoading ? (
          <div className="animate-pulse h-28 bg-slate-100 rounded-xl" />
        ) : (
          <div className="space-y-2">
            <LineChart data={callValues}  color="#60a5fa" height={70} />
            <LineChart data={agentValues} color="#818cf8" height={50} />
          </div>
        )}
      </div>

      {/* Break distribution + Utilization trend side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Break distribution */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Coffee size={16} className="text-amber-500" />
            <h3 className="font-bold text-slate-900">Break Distribution</h3>
          </div>
          {breakDist.isLoading ? (
            <div className="animate-pulse h-28 bg-slate-100 rounded-xl" />
          ) : breakData.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">No break data</p>
          ) : (
            <div className="space-y-3">
              {breakData.map(b => {
                const maxMins = Math.max(...breakData.map(x => x.total_minutes), 1)
                const pct     = Math.round((b.total_minutes / maxMins) * 100)
                const colors: Record<string, string> = {
                  lunch:    'bg-orange-400',
                  short:    'bg-amber-400',
                  personal: 'bg-teal-400',
                  other:    'bg-slate-400',
                }
                return (
                  <div key={b.break_type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold capitalize text-slate-700">{b.break_type}</span>
                      <span className="text-slate-500 text-xs">{b.total_breaks} breaks · avg {Math.round(b.avg_minutes)}m</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', colors[b.break_type] ?? 'bg-slate-400')}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Utilization trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Utilization Trend</h3>
            <span className="text-xs text-slate-400">Talk Time / Work Hours ×100</span>
          </div>
          {utilTrend.isLoading ? (
            <div className="animate-pulse h-28 bg-slate-100 rounded-xl" />
          ) : (
            <div>
              <LineChart data={utilValues} color="#10b981" height={100} />
              <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
                <span>{(utilTrend.data?.data?.[0]?.date ?? '').slice(5)}</span>
                <span>Avg: {avgUtil}%</span>
                <span>{((d => d?.[d.length - 1])(utilTrend.data?.data)?.date ?? '').slice(5)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent Leaderboard */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Award size={16} className="text-amber-500" />
          <h3 className="font-bold text-slate-900">Agent Utilization Leaderboard</h3>
          <span className="text-xs text-slate-400 ml-auto">Last {days} days · Top 20</span>
        </div>
        {leaderboard.isLoading ? (
          <div className="animate-pulse h-48 bg-slate-100 rounded-xl" />
        ) : !leaderboard.data?.data?.length ? (
          <p className="text-slate-400 text-sm py-4 text-center">No data available</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.data.data.map((agent, idx) => (
              <div key={agent.user_id} className="flex items-center gap-3">
                {/* Rank */}
                <span className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  idx === 0 ? 'bg-amber-100 text-amber-700'
                    : idx === 1 ? 'bg-slate-200 text-slate-700'
                    : idx === 2 ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-500'
                )}>
                  {idx + 1}
                </span>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-slate-800 truncate">{agent.name}</span>
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{agent.total_calls} calls · {agent.work_hours}h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', agent.utilization >= 70 ? 'bg-emerald-500' : agent.utilization >= 40 ? 'bg-amber-400' : 'bg-red-400')}
                        style={{ width: `${agent.utilization}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">{agent.utilization}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
