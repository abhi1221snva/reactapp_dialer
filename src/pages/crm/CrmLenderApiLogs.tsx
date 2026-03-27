import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, X, Loader2, CheckCircle2, AlertCircle, Clock,
  WifiOff, RefreshCw, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { cn } from '../../utils/cn'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ApiLog {
  id: number
  crm_lender_api_id: number | null
  lead_id: number
  lender_id: number
  user_id: number | null
  request_url: string
  request_method: string
  request_headers: Record<string, string> | null
  request_payload: string | null
  response_code: number | null
  response_body: string | null
  status: 'success' | 'http_error' | 'timeout' | 'error'
  error_message: string | null
  duration_ms: number | null
  attempt: number
  created_at: string
  lender_name?: string
  api_name?: string
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ApiLog['status'] }) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    success:    { icon: <CheckCircle2 size={11} />, label: 'Success',    cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    http_error: { icon: <AlertCircle  size={11} />, label: 'HTTP Error', cls: 'text-red-700 bg-red-50 border-red-200' },
    timeout:    { icon: <WifiOff      size={11} />, label: 'Timeout',    cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    error:      { icon: <AlertCircle  size={11} />, label: 'Error',      cls: 'text-red-700 bg-red-50 border-red-200' },
  }
  const cfg = map[status] ?? map.error
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', cfg.cls)}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ── Detail Modal ───────────────────────────────────────────────────────────────

function LogDetailModal({ log, onClose }: { log: ApiLog; onClose: () => void }) {
  const prettyJson = (s: string | null) => {
    if (!s) return '—'
    try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="h-1 bg-indigo-600" />
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900">API Log #{log.id}</h2>
            <p className="text-xs text-slate-400">
              {log.api_name ?? `Config #${log.crm_lender_api_id}`} · {log.lender_name ?? `Lender #${log.lender_id}`} · Lead #{log.lead_id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={log.status} />
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 ml-2">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Meta row */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">HTTP Status</p>
              <p className={cn('text-sm font-bold', log.response_code && log.response_code < 300 ? 'text-emerald-600' : 'text-red-600')}>
                {log.response_code ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Duration</p>
              <p className="text-sm font-bold text-slate-700">{log.duration_ms != null ? `${log.duration_ms}ms` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Attempt</p>
              <p className="text-sm font-bold text-slate-700">#{log.attempt}</p>
            </div>
          </div>

          {log.error_message && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-1">Error</p>
              <p className="text-xs text-red-600 font-mono">{log.error_message}</p>
            </div>
          )}

          {/* Request */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Request</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">URL</p>
                <p className="text-xs font-mono bg-slate-900 text-green-400 px-3 py-2 rounded-lg break-all">
                  <span className="text-blue-400 mr-2">{log.request_method}</span>{log.request_url}
                </p>
              </div>
              {log.request_headers && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Headers</p>
                  <pre className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600">
                    {JSON.stringify(log.request_headers, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 mb-1">Payload</p>
                <pre className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600 max-h-40">
                  {prettyJson(log.request_payload)}
                </pre>
              </div>
            </div>
          </div>

          {/* Response */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Response</p>
            <pre className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600 max-h-56">
              {prettyJson(log.response_body)}
            </pre>
          </div>

          <p className="text-[11px] text-slate-400 text-right">{log.created_at}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function CrmLenderApiLogs() {
  const { setDescription } = useCrmHeader()
  const [page, setPage]           = useState(1)
  const [leadSearch, setLeadSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [selected, setSelected]   = useState<ApiLog | null>(null)

  const perPage = 20

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['lender-api-logs', page, leadSearch, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, per_page: perPage }
      if (leadSearch.match(/^\d+$/)) params.lead_id = Number(leadSearch)
      if (statusFilter) params.status = statusFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo)   params.date_to   = dateTo
      const res = await crmService.getLenderApiLogs(params)
      return res.data?.data as {
        data: ApiLog[]
        total: number
        page: number
        per_page: number
        last_page: number
      }
    },
    staleTime: 0,
  })

  const logs      = data?.data ?? []
  const total     = data?.total ?? 0
  const lastPage  = data?.last_page ?? 1

  useEffect(() => {
    setDescription(`${total.toLocaleString()} API call log${total !== 1 ? 's' : ''}`)
    return () => setDescription(undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const reset = () => {
    setPage(1)
    setLeadSearch('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
  }

  const hasFilters = leadSearch || statusFilter || dateFrom || dateTo

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-8 h-9 text-sm w-40"
            placeholder="Lead ID…"
            value={leadSearch}
            onChange={e => { setLeadSearch(e.target.value); setPage(1) }}
          />
        </div>

        <select
          className="input h-9 text-sm w-36"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="http_error">HTTP Error</option>
          <option value="timeout">Timeout</option>
          <option value="error">Error</option>
        </select>

        <input
          type="date"
          className="input h-9 text-sm"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1) }}
          title="From date"
        />
        <input
          type="date"
          className="input h-9 text-sm"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1) }}
          title="To date"
        />

        {hasFilters && (
          <button onClick={reset} className="btn-ghost btn-sm h-9 px-3 flex items-center gap-1 text-slate-500">
            <X size={13} /> Clear
          </button>
        )}

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-ghost btn-sm h-9 px-3 ml-auto"
          title="Refresh"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper bg-white">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Lender / Config</th>
                <th className="hidden md:table-cell">Endpoint</th>
                <th className="hidden lg:table-cell">Code</th>
                <th className="hidden xl:table-cell">Duration</th>
                <th>Status</th>
                <th className="hidden sm:table-cell">Time</th>
                <th className="!text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="h-3.5 bg-slate-200 rounded animate-pulse" style={{ width: '65%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                      <Clock size={28} className="mb-2 text-slate-300" />
                      <p className="font-medium text-slate-500">No log entries found</p>
                      <p className="text-xs mt-1">{hasFilters ? 'Try adjusting your filters' : 'API logs will appear here after lender calls'}</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td>
                    <span className="text-sm font-mono text-indigo-600">#{log.lead_id}</span>
                  </td>
                  <td>
                    <p className="text-sm font-medium text-slate-800">{log.lender_name ?? `#${log.lender_id}`}</p>
                    {log.api_name && <p className="text-xs text-slate-400">{log.api_name}</p>}
                  </td>
                  <td className="hidden md:table-cell">
                    <p className="text-xs font-mono text-slate-500 truncate max-w-[180px]" title={log.request_url}>
                      <span className="text-indigo-500 mr-1">{log.request_method}</span>
                      {log.request_url.replace(/^https?:\/\/[^/]+/, '')}
                    </p>
                  </td>
                  <td className="hidden lg:table-cell">
                    <span className={cn(
                      'text-sm font-bold',
                      log.response_code && log.response_code < 300 ? 'text-emerald-600' :
                      log.response_code ? 'text-red-600' : 'text-slate-400',
                    )}>
                      {log.response_code ?? '—'}
                    </span>
                  </td>
                  <td className="hidden xl:table-cell">
                    <span className="text-sm text-slate-500">
                      {log.duration_ms != null ? `${log.duration_ms}ms` : '—'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={log.status} />
                    {log.error_message && (
                      <p className="text-[11px] text-red-500 mt-0.5 max-w-[160px] truncate" title={log.error_message}>
                        {log.error_message}
                      </p>
                    )}
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className="text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    {log.attempt > 1 && (
                      <span className="text-[11px] text-amber-500 ml-1">attempt {log.attempt}</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => setSelected(log)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="View full detail"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {total === 0 ? 'No results' : `Page ${page} of ${lastPage} · ${total.toLocaleString()} entries`}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost btn-sm px-2 py-1 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="btn-ghost btn-sm px-2 py-1 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <LogDetailModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
