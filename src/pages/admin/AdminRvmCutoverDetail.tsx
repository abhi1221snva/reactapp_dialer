import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, RefreshCw, AlertTriangle, Activity,
  CheckCircle2, XCircle, Radio, Clock,
} from 'lucide-react'
import {
  adminRvmCutoverService,
  type ShadowLogRow,
  type PipelineMode,
} from '../../services/adminRvmCutover.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
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

// ShadowLogRow from the backend doesn't have a `keyField` type constraint; we
// alias it through Record<string, unknown> for the DataTable generic.
type ShadowRow = ShadowLogRow & Record<string, unknown>

// ── Page ───────────────────────────────────────────────────────────────────

export function AdminRvmCutoverDetail() {
  const { clientId } = useParams<{ clientId: string }>()
  const id = Number(clientId)

  const { data, isLoading, refetch, isFetching, isError, error } = useQuery({
    queryKey: ['admin-rvm-cutover-detail', id],
    queryFn: () => adminRvmCutoverService.show(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  const detail = data?.data?.data
  const flag = detail?.flag
  const recent: ShadowRow[] = (detail?.recent_shadow ?? []) as ShadowRow[]

  // 24h summary totals derived from the breakdown rows.
  const total24h = detail?.breakdown_24h?.reduce((sum, r) => sum + r.total, 0) ?? 0
  const dispatched24h =
    detail?.breakdown_24h?.find((r) => r.reason === 'would_dispatch')?.total ?? 0
  const rejected24h = total24h - dispatched24h

  // ── Columns for recent shadow rows ───────────────────────────────────────

  const columns: Column<ShadowRow>[] = [
    {
      key: 'id', header: 'ID',
      render: (r) => <span className="font-mono text-xs text-slate-400">#{r.id}</span>,
    },
    {
      key: 'created_at', header: 'Observed',
      render: (r) => (
        <span className="text-xs text-slate-500">
          {r.created_at ? formatDateTime(r.created_at) : '—'}
        </span>
      ),
    },
    {
      key: 'phone_e164', header: 'Phone',
      render: (r) => <span className="font-mono text-xs text-slate-700">{r.phone_e164}</span>,
    },
    {
      key: 'would_dispatch', header: 'Would Dispatch',
      render: (r) =>
        r.would_dispatch
          ? <Badge variant="green">Yes</Badge>
          : <Badge variant="red">No</Badge>,
    },
    {
      key: 'would_provider', header: 'Provider',
      render: (r) => r.would_provider
        ? <span className="font-mono text-xs text-slate-600">{r.would_provider}</span>
        : <span className="text-xs text-slate-300">—</span>,
    },
    {
      key: 'would_cost_cents', header: 'Cost',
      render: (r) => r.would_cost_cents !== null && r.would_cost_cents !== undefined
        ? <span className="text-xs text-slate-600">${(r.would_cost_cents / 100).toFixed(3)}</span>
        : <span className="text-xs text-slate-300">—</span>,
    },
    {
      key: 'would_reject_reason', header: 'Reject Reason',
      render: (r) => r.would_reject_reason
        ? (
          <span
            className="text-xs text-red-600 font-mono block max-w-[200px] truncate"
            title={r.would_reject_reason}
          >
            {r.would_reject_reason}
          </span>
        )
        : <span className="text-xs text-slate-300">—</span>,
    },
    {
      key: 'legacy_rvm_cdr_log_id', header: 'Legacy CDR',
      render: (r) => r.legacy_rvm_cdr_log_id
        ? <span className="font-mono text-xs text-slate-400">#{r.legacy_rvm_cdr_log_id}</span>
        : <span className="text-xs text-slate-300">—</span>,
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/rvm/cutover"
            className="btn-ghost btn-sm p-2 rounded-lg"
            title="Back to cutover list"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Radio size={18} className="text-indigo-600" />
              <h1 className="text-lg font-semibold text-slate-900">
                {detail?.client.company_name ?? `Client #${id}`}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              RVM cutover drill-down <span className="font-mono">· client #{id}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-ghost btn-sm p-2 rounded-lg"
          title="Refresh"
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-3">
          <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Failed to load tenant detail</p>
            <p className="text-xs text-red-700 mt-1">
              {(error as Error)?.message ?? 'Unknown error'}
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 py-12 justify-center text-slate-500">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">Loading tenant detail…</span>
        </div>
      )}

      {detail && (
        <>
          {/* Flag summary card */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={16} className="text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">Current Flag</h2>
            </div>

            {flag ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Pipeline Mode
                  </p>
                  <Badge variant={MODE_VARIANT[flag.pipeline_mode]}>
                    {MODE_LABEL[flag.pipeline_mode]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Live Provider
                  </p>
                  <p className="text-sm text-slate-700 font-mono">
                    {flag.live_provider ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Daily Cap
                  </p>
                  <p className="text-sm text-slate-700">
                    {flag.live_daily_cap !== null
                      ? flag.live_daily_cap.toLocaleString()
                      : <span className="text-slate-400">uncapped</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Live Since
                  </p>
                  <p className="text-sm text-slate-700">
                    {flag.live_enabled_at
                      ? formatDateTime(flag.live_enabled_at)
                      : <span className="text-slate-400">never</span>}
                  </p>
                </div>
                {flag.notes && (
                  <div className="col-span-2 md:col-span-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{flag.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-slate-500">
                <Clock size={15} />
                <span className="text-sm">
                  No flag row exists — this tenant is using the implicit legacy default.
                </span>
              </div>
            )}
          </div>

          {/* 24h summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Activity size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Shadow Rows (24h)
                </p>
                <p className="text-2xl font-bold text-slate-900">{total24h.toLocaleString()}</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Would Dispatch
                </p>
                <p className="text-2xl font-bold text-slate-900">{dispatched24h.toLocaleString()}</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <XCircle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Rejected
                </p>
                <p className="text-2xl font-bold text-slate-900">{rejected24h.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Reject reason + provider breakdowns — side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Reject reason breakdown */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-xs text-slate-700 font-semibold">
                  Reject Reasons (24h)
                </span>
              </div>
              {detail.breakdown_24h.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No shadow rows in last 24h.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th className="text-right">Count</th>
                      <th className="text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.breakdown_24h.map((row) => {
                      const pct = total24h > 0 ? ((row.total / total24h) * 100).toFixed(1) : '0.0'
                      const isDispatch = row.reason === 'would_dispatch'
                      return (
                        <tr key={row.reason}>
                          <td>
                            {isDispatch
                              ? <Badge variant="green">would_dispatch</Badge>
                              : <span className="font-mono text-xs text-red-600">{row.reason}</span>}
                          </td>
                          <td className="text-right text-sm text-slate-700">
                            {row.total.toLocaleString()}
                          </td>
                          <td className="text-right text-xs text-slate-400">{pct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Provider breakdown */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <Radio size={14} className="text-indigo-500" />
                <span className="text-xs text-slate-700 font-semibold">
                  Providers That Would Handle (24h)
                </span>
              </div>
              {detail.providers_24h.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No dispatches in last 24h.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th className="text-right">Count</th>
                      <th className="text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.providers_24h.map((row) => {
                      const pct = dispatched24h > 0
                        ? ((row.total / dispatched24h) * 100).toFixed(1)
                        : '0.0'
                      return (
                        <tr key={row.provider}>
                          <td>
                            <span className="font-mono text-xs text-slate-700">{row.provider}</span>
                          </td>
                          <td className="text-right text-sm text-slate-700">
                            {row.total.toLocaleString()}
                          </td>
                          <td className="text-right text-xs text-slate-400">{pct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent shadow rows */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <span className="text-xs text-slate-500 font-medium">
                Recent shadow rows · last {recent.length}
              </span>
            </div>
            <DataTable
              columns={columns}
              data={recent}
              loading={false}
              emptyText="No shadow rows recorded yet"
            />
          </div>
        </>
      )}
    </div>
  )
}
