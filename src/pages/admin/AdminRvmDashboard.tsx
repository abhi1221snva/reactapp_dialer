import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, RefreshCw, Activity, AlertTriangle, CheckCircle2,
  XCircle, DollarSign, Radio, Building2, TrendingUp, ExternalLink,
} from 'lucide-react'
import {
  adminRvmCutoverService,
  type DashboardWindow,
  type DashboardResponse,
  type DashboardHourlyBucket,
  type PipelineMode,
} from '../../services/adminRvmCutover.service'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/format'

const MODE_VARIANT: Record<PipelineMode, 'gray' | 'blue' | 'yellow' | 'green'> = {
  legacy:  'gray',
  shadow:  'blue',
  dry_run: 'yellow',
  live:    'green',
}

const MODE_LABEL: Record<PipelineMode, string> = {
  legacy:  'Legacy',
  shadow:  'Shadow',
  dry_run: 'Dry Run',
  live:    'Live',
}

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function shortHour(ts: string): string {
  // "2026-04-11 07:00:00" → "07:00"
  return ts.slice(11, 16)
}

// ── Hourly timeline (inline SVG — no chart lib) ────────────────────────────

function HourlyTimeline({ buckets }: { buckets: DashboardHourlyBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.total))
  const W = 24 * 28 // 28px per hour
  const H = 140

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H + 30} className="text-slate-300">
        {/* baseline */}
        <line x1={0} x2={W} y1={H} y2={H} stroke="currentColor" strokeWidth={1} />

        {buckets.map((b, i) => {
          const barH = (b.total / max) * (H - 10)
          const dispatchedH = (b.dispatched / max) * (H - 10)
          const x = i * 28 + 4
          return (
            <g key={b.hour}>
              {/* rejected (red, base) */}
              <rect
                x={x}
                y={H - barH}
                width={20}
                height={barH}
                className="fill-red-200"
              />
              {/* dispatched (emerald, overlay from bottom) */}
              <rect
                x={x}
                y={H - dispatchedH}
                width={20}
                height={dispatchedH}
                className="fill-emerald-500"
              />
              {/* total label above bar */}
              {b.total > 0 && (
                <text
                  x={x + 10}
                  y={H - barH - 4}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  {b.total}
                </text>
              )}
              {/* hour label */}
              <text
                x={x + 10}
                y={H + 16}
                textAnchor="middle"
                className="fill-slate-400 text-[9px] font-mono"
              >
                {shortHour(b.hour)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Mode distribution bars ─────────────────────────────────────────────────

function ModeDistributionBar({
  distribution,
}: {
  distribution: DashboardResponse['mode_distribution']
}) {
  const total =
    distribution.legacy + distribution.shadow + distribution.dry_run + distribution.live
  if (total === 0) return <p className="text-xs text-slate-400">No tenants.</p>

  const segments: Array<{ key: PipelineMode; count: number; bg: string }> = [
    { key: 'legacy',  count: distribution.legacy,  bg: 'bg-slate-300' },
    { key: 'shadow',  count: distribution.shadow,  bg: 'bg-blue-400' },
    { key: 'dry_run', count: distribution.dry_run, bg: 'bg-amber-400' },
    { key: 'live',    count: distribution.live,    bg: 'bg-emerald-500' },
  ]

  return (
    <>
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-3">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.key}
              className={s.bg}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${MODE_LABEL[s.key]}: ${s.count}`}
            />
          ) : null,
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${s.bg}`} />
            <span className="text-slate-600">{MODE_LABEL[s.key]}</span>
            <span className="ml-auto font-mono text-slate-900">{s.count}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export function AdminRvmDashboard() {
  const [window, setWindow] = useState<DashboardWindow>('24h')

  const { data, isLoading, refetch, isFetching, isError, error } = useQuery({
    queryKey: ['admin-rvm-dashboard', window],
    queryFn: () => adminRvmCutoverService.dashboard(window),
    refetchInterval: 60_000, // auto-refresh every minute
  })

  const d = data?.data?.data

  const kpiCards = d ? [
    {
      label: 'Shadow Rows',
      value: d.kpis.total.toLocaleString(),
      icon: Activity,
      bg: 'bg-indigo-50',
      fg: 'text-indigo-600',
    },
    {
      label: 'Would Dispatch',
      value: d.kpis.dispatched.toLocaleString(),
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      fg: 'text-emerald-600',
    },
    {
      label: 'Rejected',
      value: d.kpis.rejected.toLocaleString(),
      sub: `${(d.kpis.rejection_rate * 100).toFixed(1)}% rate`,
      icon: XCircle,
      bg: 'bg-red-50',
      fg: 'text-red-500',
    },
    {
      label: 'Would Cost',
      value: dollars(d.kpis.total_cost_cents),
      icon: DollarSign,
      bg: 'bg-amber-50',
      fg: 'text-amber-600',
    },
    {
      label: 'Active Tenants',
      value: d.kpis.tenant_count.toLocaleString(),
      icon: Building2,
      bg: 'bg-slate-100',
      fg: 'text-slate-600',
    },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" />
            <h1 className="text-lg font-semibold text-slate-900">RVM Dashboard</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet-wide observability for the RVM v2 migration.
            {d?.generated_at && (
              <span className="ml-2 text-slate-400">
                · updated {formatDateTime(d.generated_at)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Window toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            {(['24h', '7d'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={[
                  'px-3 py-1.5 text-xs font-semibold transition-colors',
                  window === w
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {w === '24h' ? 'Last 24h' : 'Last 7d'}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-ghost btn-sm p-2 rounded-lg"
            title="Refresh"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <Link
            to="/admin/rvm/cutover"
            className="btn-outline btn-sm gap-2 px-3 py-2 rounded-lg flex items-center"
          >
            <ExternalLink size={13} />
            Open Cutover
          </Link>
        </div>
      </div>

      {/* Kill switch banner */}
      {d && !d.global_kill_switch && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Global kill switch is OFF — the new RVM pipeline is disabled system-wide.
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Shadow rows will still be written by the legacy pipeline if tenants are
              in <code>shadow</code> mode, but nothing is dispatched through v2 until
              <code className="mx-1">rvm.use_new_pipeline</code> is flipped on.
            </p>
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-3">
          <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Failed to load dashboard</p>
            <p className="text-xs text-red-700 mt-1">
              {(error as Error)?.message ?? 'Unknown error'}
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 py-12 justify-center text-slate-500">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">Loading dashboard…</span>
        </div>
      )}

      {d && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiCards.map((c) => {
              const Icon = c.icon
              return (
                <div key={c.label} className="card flex items-center gap-4">
                  <div
                    className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon size={20} className={c.fg} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {c.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                    {c.sub && (
                      <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mode distribution + hourly timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Radio size={14} className="text-indigo-500" />
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Pipeline Mode Distribution
                </h2>
              </div>
              <ModeDistributionBar distribution={d.mode_distribution} />
            </div>

            <div className="card lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-indigo-500" />
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Last 24h — Hourly Activity
                </h2>
                <span className="ml-auto text-xs text-slate-400">
                  <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1" />
                  dispatched
                  <span className="inline-block w-2 h-2 rounded-sm bg-red-200 mr-1 ml-3" />
                  rejected
                </span>
              </div>
              <HourlyTimeline buckets={d.hourly_buckets} />
            </div>
          </div>

          {/* Provider + reject reason tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <Radio size={14} className="text-indigo-500" />
                <span className="text-xs text-slate-700 font-semibold">
                  Provider Breakdown
                </span>
              </div>
              {d.provider_breakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No dispatches in selected window.
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th className="text-right">Dispatches</th>
                      <th className="text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.provider_breakdown.map((p) => (
                      <tr key={p.provider}>
                        <td>
                          <span className="font-mono text-xs text-slate-700">{p.provider}</span>
                        </td>
                        <td className="text-right text-sm text-slate-700">
                          {p.count.toLocaleString()}
                        </td>
                        <td className="text-right text-xs text-slate-500">
                          {dollars(p.cost_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-xs text-slate-700 font-semibold">
                  Top Reject Reasons
                </span>
              </div>
              {d.reject_reasons.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No rejections in selected window.
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th className="text-right">Count</th>
                      <th className="text-right">% of rejected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.reject_reasons.map((r) => (
                      <tr key={r.reason}>
                        <td>
                          <span className="font-mono text-xs text-red-600">{r.reason}</span>
                        </td>
                        <td className="text-right text-sm text-slate-700">
                          {r.total.toLocaleString()}
                        </td>
                        <td className="text-right text-xs text-slate-400">{r.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Top tenants */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <Building2 size={14} className="text-indigo-500" />
              <span className="text-xs text-slate-700 font-semibold">
                Top 10 Tenants by Shadow Volume
              </span>
            </div>
            {d.top_tenants.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No tenant activity in selected window.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Mode</th>
                    <th className="text-right">Shadow Rows</th>
                    <th className="text-right">Rejected</th>
                    <th className="text-right">Rate</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.top_tenants.map((t) => (
                    <tr key={t.client_id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Building2 size={13} className="text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {t.company_name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">#{t.client_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge variant={MODE_VARIANT[t.pipeline_mode]}>
                          {MODE_LABEL[t.pipeline_mode]}
                        </Badge>
                      </td>
                      <td className="text-right text-sm text-slate-700">
                        {t.total.toLocaleString()}
                      </td>
                      <td className="text-right text-sm text-slate-700">
                        {t.rejected.toLocaleString()}
                      </td>
                      <td className="text-right">
                        <span
                          className={[
                            'text-xs font-mono',
                            t.rejection_rate >= 0.5
                              ? 'text-red-600'
                              : t.rejection_rate >= 0.2
                              ? 'text-amber-600'
                              : 'text-slate-500',
                          ].join(' ')}
                        >
                          {(t.rejection_rate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/admin/rvm/cutover/${t.client_id}`}
                          className="btn-ghost btn-sm p-1.5 text-slate-500 hover:text-indigo-600"
                          title="View detail"
                        >
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
