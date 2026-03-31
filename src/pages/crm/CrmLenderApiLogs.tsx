import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, X, CheckCircle2, AlertCircle, Clock,
  WifiOff, RefreshCw, Eye, SlidersHorizontal,
} from 'lucide-react'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { TablePagination } from '../../components/ui/TablePagination'
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

const PER_PAGE = 15

// Known lender API types — matches LENDER_API_TYPES in CrmLenders
const LENDER_API_TYPES = [
  { value: 'ondeck',            label: 'OnDeck' },
  { value: 'credibly',          label: 'Credibly' },
  { value: 'cancapital',        label: 'CAN Capital' },
  { value: 'lendini',           label: 'Lendini' },
  { value: 'forward_financing', label: 'Forward Financing' },
  { value: 'bitty_advance',     label: 'Bitty Advance' },
  { value: 'fox_partner',       label: 'Fox Partner' },
  { value: 'specialty',         label: 'Specialty' },
  { value: 'biz2credit',        label: 'Biz2Credit' },
]

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

// ── HTTP method pill ───────────────────────────────────────────────────────────

function MethodPill({ method }: { method: string }) {
  const colors: Record<string, string> = {
    POST:   'bg-blue-50 text-blue-700 border-blue-200',
    GET:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    PUT:    'bg-amber-50 text-amber-700 border-amber-200',
    PATCH:  'bg-violet-50 text-violet-700 border-violet-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={cn('inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border', colors[method] ?? 'bg-slate-50 text-slate-500 border-slate-200')}>
      {method}
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
      style={{ background: 'rgba(15,23,42,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-bold text-slate-900">API Log #{log.id}</h2>
              <StatusBadge status={log.status} />
            </div>
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-600">{log.lender_name ?? `Lender #${log.lender_id}`}</span>
              {log.api_name && <> · <span>{log.api_name}</span></>}
              {' · '}Lead <span className="font-mono text-indigo-600">#{log.lead_id}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0 ml-4">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Meta grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'HTTP Code', value: log.response_code ?? '—', color: log.response_code && log.response_code < 300 ? 'text-emerald-600' : 'text-red-600' },
              { label: 'Duration',  value: log.duration_ms != null ? `${log.duration_ms}ms` : '—', color: 'text-slate-700' },
              { label: 'Attempt',   value: `#${log.attempt}`, color: log.attempt > 1 ? 'text-amber-600' : 'text-slate-700' },
              { label: 'Method',    value: log.request_method, color: 'text-indigo-600' },
            ].map(m => (
              <div key={m.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{m.label}</p>
                <p className={cn('text-sm font-bold', m.color)}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Error */}
          {log.error_message && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-1">Error</p>
              <p className="text-xs text-red-600 font-mono leading-relaxed">{log.error_message}</p>
            </div>
          )}

          {/* Request */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Request</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">URL</p>
                <div className="flex items-start gap-2 font-mono bg-slate-900 px-3 py-2.5 rounded-lg">
                  <MethodPill method={log.request_method} />
                  <span className="text-xs text-green-400 break-all leading-relaxed">{log.request_url}</span>
                </div>
              </div>
              {log.request_headers && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Headers</p>
                  <pre className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600 max-h-32">
                    {JSON.stringify(log.request_headers, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 mb-1">Payload</p>
                <pre className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600 max-h-48">
                  {prettyJson(log.request_payload)}
                </pre>
              </div>
            </div>
          </div>

          {/* Response */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Response</p>
            <pre className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600 max-h-64">
              {prettyJson(log.response_body)}
            </pre>
          </div>

          <p className="text-[11px] text-slate-400 text-right">{new Date(log.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

// ── Filter chip ────────────────────────────────────────────────────────────────

function FilterChip({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
      <span className="text-indigo-400">{label}:</span> {value}
      <button onClick={onRemove} className="ml-0.5 hover:text-indigo-900 transition-colors">
        <X size={10} />
      </button>
    </span>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function CrmLenderApiLogs() {
  const { setDescription } = useCrmHeader()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selected, setSelected] = useState<ApiLog | null>(null)

  // Read all filter state from URL params
  const page        = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const search      = searchParams.get('search') || ''
  const lender      = searchParams.get('lender') || ''
  const lenderType  = searchParams.get('lender_type') || ''
  const status      = searchParams.get('status') || ''
  const dateFrom    = searchParams.get('date_from') || ''
  const dateTo      = searchParams.get('date_to') || ''

  // ── Helpers ────────────────────────────────────────────────────────────────

  const setFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }

  const goToPage = (p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p <= 1) next.delete('page')
      else next.set('page', String(p))
      return next
    })
  }

  const reset = () => setSearchParams({})

  const activeFilters = [
    search     && { key: 'search',      label: 'Search',   value: search },
    lender     && { key: 'lender',      label: 'Lender',   value: lender },
    lenderType && { key: 'lender_type', label: 'API Type', value: LENDER_API_TYPES.find(t => t.value === lenderType)?.label ?? lenderType },
    status     && { key: 'status',      label: 'Status',   value: status },
    dateFrom   && { key: 'date_from',   label: 'From',     value: dateFrom },
    dateTo     && { key: 'date_to',     label: 'To',       value: dateTo },
  ].filter(Boolean) as { key: string; label: string; value: string }[]

  const hasFilters = activeFilters.length > 0

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['lender-api-logs', page, search, lender, lenderType, status, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, per_page: PER_PAGE }
      if (search)     params.search      = search
      if (lender)     params.lender      = lender
      if (lenderType) params.lender_type = lenderType
      if (status)     params.status      = status
      if (dateFrom)   params.date_from   = dateFrom
      if (dateTo)     params.date_to     = dateTo
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

  const logs     = data?.data ?? []
  const total    = data?.total ?? 0
  const lastPage = data?.last_page ?? 1

  useEffect(() => {
    setDescription(`${total.toLocaleString()} API call log${total !== 1 ? 's' : ''}`)
    return () => setDescription(undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  return (
    <div className="space-y-4">

      {/* ── Filter card ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Filters</span>
            {hasFilters && (
              <span className="text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                {activeFilters.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {hasFilters && (
              <button
                onClick={reset}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={11} /> Clear all
              </button>
            )}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap gap-3">

            {/* Search */}
            <div className="flex-1 min-w-[180px]">
              <label className="text-[11px] font-medium text-slate-500 mb-1.5 block uppercase tracking-wide">Search</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className="input pl-8 h-8 text-sm w-full"
                  placeholder="Lead ID, request, response, error…"
                  value={search}
                  onChange={e => setFilter('search', e.target.value)}
                />
              </div>
            </div>

            {/* Lender name */}
            <div className="min-w-[150px]">
              <label className="text-[11px] font-medium text-slate-500 mb-1.5 block uppercase tracking-wide">Lender</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className="input pl-8 h-8 text-sm w-full"
                  placeholder="Lender name…"
                  value={lender}
                  onChange={e => setFilter('lender', e.target.value)}
                />
              </div>
            </div>

            {/* API Type dropdown */}
            <div className="min-w-[160px]">
              <label className="text-[11px] font-medium text-slate-500 mb-1.5 block uppercase tracking-wide">API Type</label>
              <select
                className="input h-8 text-sm w-full"
                value={lenderType}
                onChange={e => setFilter('lender_type', e.target.value)}
              >
                <option value="">All API types</option>
                {LENDER_API_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="min-w-[140px]">
              <label className="text-[11px] font-medium text-slate-500 mb-1.5 block uppercase tracking-wide">Status</label>
              <select
                className="input h-8 text-sm w-full"
                value={status}
                onChange={e => setFilter('status', e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="success">✓ Success</option>
                <option value="http_error">✗ HTTP Error</option>
                <option value="timeout">⏱ Timeout</option>
                <option value="error">✗ Error</option>
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1.5 block uppercase tracking-wide">From</label>
              <input
                type="date"
                className="input h-8 text-sm"
                value={dateFrom}
                onChange={e => setFilter('date_from', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1.5 block uppercase tracking-wide">To</label>
              <input
                type="date"
                className="input h-8 text-sm"
                value={dateTo}
                onChange={e => setFilter('date_to', e.target.value)}
              />
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeFilters.map(f => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  value={f.value}
                  onRemove={() => setFilter(f.key, '')}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="w-20">Lead #</th>
                <th>Lender / API</th>
                <th className="hidden md:table-cell">Endpoint</th>
                <th className="hidden lg:table-cell w-16 text-center">Code</th>
                <th className="hidden xl:table-cell w-20 text-center">Duration</th>
                <th>Status</th>
                <th className="hidden sm:table-cell">Time</th>
                <th className="w-12 !text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {[20, 40, 30, 10, 10, 15, 20, 5].map((w, j) => (
                      <td key={j} className={j >= 2 && j <= 4 ? (j === 2 ? 'hidden md:table-cell' : j === 3 ? 'hidden lg:table-cell' : 'hidden xl:table-cell') : j === 6 ? 'hidden sm:table-cell' : ''}>
                        <div className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ width: `${w * 3}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <Clock size={22} className="text-slate-300" />
                      </div>
                      <p className="font-medium text-slate-500 text-sm">No log entries found</p>
                      <p className="text-xs mt-1 text-slate-400">
                        {hasFilters ? 'Try adjusting or clearing your filters' : 'API call logs will appear here once lender submissions are made'}
                      </p>
                      {hasFilters && (
                        <button onClick={reset} className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Lead */}
                  <td>
                    <span className="text-sm font-mono font-semibold text-indigo-600">#{log.lead_id}</span>
                  </td>

                  {/* Lender / API */}
                  <td>
                    <p className="text-sm font-medium text-slate-800 leading-tight">
                      {log.lender_name ?? `Lender #${log.lender_id}`}
                    </p>
                    {log.api_name && (
                      <p className="text-xs text-slate-400 mt-0.5">{log.api_name}</p>
                    )}
                  </td>

                  {/* Endpoint */}
                  <td className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 max-w-[200px]">
                      <MethodPill method={log.request_method} />
                      <span className="text-xs font-mono text-slate-500 truncate" title={log.request_url}>
                        {log.request_url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </span>
                    </div>
                  </td>

                  {/* HTTP code */}
                  <td className="hidden lg:table-cell text-center">
                    <span className={cn(
                      'text-sm font-bold tabular-nums',
                      log.response_code && log.response_code < 300 ? 'text-emerald-600' :
                      log.response_code && log.response_code < 500 ? 'text-amber-600' :
                      log.response_code ? 'text-red-600' : 'text-slate-300',
                    )}>
                      {log.response_code ?? '—'}
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="hidden xl:table-cell text-center">
                    <span className={cn(
                      'text-xs tabular-nums',
                      log.duration_ms != null && log.duration_ms > 5000 ? 'text-red-500 font-medium' :
                      log.duration_ms != null && log.duration_ms > 2000 ? 'text-amber-600' : 'text-slate-500',
                    )}>
                      {log.duration_ms != null ? `${log.duration_ms}ms` : '—'}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <StatusBadge status={log.status} />
                    {log.error_message && (
                      <p className="text-[11px] text-red-500 mt-0.5 max-w-[160px] truncate leading-tight" title={log.error_message}>
                        {log.error_message}
                      </p>
                    )}
                  </td>

                  {/* Time */}
                  <td className="hidden sm:table-cell">
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    {log.attempt > 1 && (
                      <span className="block text-[11px] text-amber-500 font-medium">
                        Attempt {log.attempt}
                      </span>
                    )}
                  </td>

                  {/* View */}
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
        {(lastPage > 1 || total > 0) && (
          <TablePagination
            page={page}
            totalPages={lastPage}
            total={total}
            limit={PER_PAGE}
            onPageChange={goToPage}
          />
        )}
      </div>

      {selected && <LogDetailModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
