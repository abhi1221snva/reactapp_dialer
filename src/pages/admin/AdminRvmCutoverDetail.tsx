import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ArrowLeft, Building2, RefreshCw, AlertTriangle, Activity,
  CheckCircle2, XCircle, Radio, Clock, History, User, Download,
} from 'lucide-react'
import {
  adminRvmCutoverService,
  type ShadowLogRow,
  type PipelineMode,
  type AuditHistoryRow,
  type AuditActionType,
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

const ACTION_LABEL: Record<AuditActionType, string> = {
  set_mode:        'Set Mode',
  check_readiness: 'Readiness Check',
  rollback_all:    'Rollback All',
}

const ACTION_VARIANT: Record<AuditActionType, 'blue' | 'gray' | 'red'> = {
  set_mode:        'blue',
  check_readiness: 'gray',
  rollback_all:    'red',
}

/**
 * Human-readable summary of an audit row's payload. Works hand-in-hand with
 * the compact Change History table — we don't dump raw JSON on operators.
 */
function summarizeHistoryRow(row: AuditHistoryRow): React.ReactNode {
  if (row.action_type === 'check_readiness') {
    return <span className="text-xs text-slate-400">—</span>
  }
  if (row.action_type === 'rollback_all') {
    return <span className="text-xs text-red-600">All tenants → legacy</span>
  }
  // set_mode
  const p = row.payload ?? {}
  const mode = (p.pipeline_mode as PipelineMode | undefined) ?? null
  const provider = (p.live_provider as string | null | undefined) ?? null
  const cap = p.live_daily_cap as number | null | undefined
  const notes = (p.notes as string | null | undefined) ?? null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {mode && <Badge variant={MODE_VARIANT[mode]}>{MODE_LABEL[mode]}</Badge>}
      {provider && (
        <span className="font-mono text-xs text-slate-500">
          via {provider}
        </span>
      )}
      {cap !== null && cap !== undefined && (
        <span className="font-mono text-xs text-slate-500">
          cap {cap.toLocaleString()}
        </span>
      )}
      {notes && (
        <span
          className="text-xs text-slate-500 italic truncate max-w-[240px]"
          title={notes}
        >
          "{notes}"
        </span>
      )}
    </div>
  )
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

  const historyQuery = useQuery({
    queryKey: ['admin-rvm-cutover-history', id],
    queryFn: () => adminRvmCutoverService.history(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  const [isExporting, setIsExporting] = useState(false)

  const handleExportHistory = async () => {
    if (!Number.isFinite(id) || id <= 0) return
    setIsExporting(true)
    try {
      const resp = await adminRvmCutoverService.historyCsv(id)
      // axios with responseType:'blob' returns the blob at resp.data.
      const blob = resp.data instanceof Blob
        ? resp.data
        : new Blob([resp.data as BlobPart], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ts = new Date().toISOString().replace(/[:T]/g, '').slice(0, 15)
      a.download = `rvm-cutover-history-client-${id}-${ts}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      // Non-fatal — show to the user via a simple alert.
      // eslint-disable-next-line no-alert
      alert('Failed to download history CSV: ' + ((e as Error)?.message ?? 'unknown'))
    } finally {
      setIsExporting(false)
    }
  }

  const detail = data?.data?.data
  const flag = detail?.flag
  const recent: ShadowRow[] = (detail?.recent_shadow ?? []) as ShadowRow[]
  const historyRows: AuditHistoryRow[] = historyQuery.data?.data?.data?.history ?? []

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

          {/* Change history — audit_log entries for this tenant */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <History size={14} className="text-slate-500" />
                <span className="text-xs text-slate-700 font-semibold">
                  Change History
                </span>
                <span className="text-xs text-slate-400">
                  · last {historyRows.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {historyQuery.isFetching && (
                  <RefreshCw size={13} className="animate-spin text-slate-400" />
                )}
                <button
                  type="button"
                  onClick={handleExportHistory}
                  disabled={isExporting || historyRows.length === 0}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Download the current audit history as CSV"
                >
                  <Download size={12} />
                  {isExporting ? 'Exporting…' : 'CSV'}
                </button>
              </div>
            </div>

            {historyQuery.isError ? (
              <div className="py-6 px-4 text-center text-xs text-red-500">
                Failed to load history: {(historyQuery.error as Error)?.message ?? 'unknown'}
              </div>
            ) : historyRows.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No audit log entries for this tenant yet.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '170px' }}>When</th>
                    <th style={{ width: '180px' }}>Actor</th>
                    <th style={{ width: '140px' }}>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock size={11} className="text-slate-300" />
                          {formatDateTime(row.created_at)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-300" />
                          <div className="leading-tight">
                            <div className="text-xs text-slate-700 font-medium">
                              {row.actor_name ?? `user #${row.user_id}`}
                            </div>
                            {row.actor_email && (
                              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                                {row.actor_email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge variant={ACTION_VARIANT[row.action_type]}>
                          {ACTION_LABEL[row.action_type]}
                        </Badge>
                      </td>
                      <td>{summarizeHistoryRow(row)}</td>
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
