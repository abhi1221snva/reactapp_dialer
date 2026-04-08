import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, AlertTriangle, Info, AlertCircle, FileText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { bankStatementService } from '../../services/bankStatement.service'
import { cn } from '../../utils/cn'

const LEVEL_CFG: Record<string, { bg: string; text: string; icon: typeof Info }> = {
  INFO:    { bg: 'bg-blue-100',   text: 'text-blue-800',   icon: Info },
  WARNING: { bg: 'bg-amber-100',  text: 'text-amber-800',  icon: AlertTriangle },
  ERROR:   { bg: 'bg-red-100',    text: 'text-red-800',    icon: AlertCircle },
  RAW:     { bg: 'bg-gray-100',   text: 'text-gray-700',   icon: FileText },
}

function fmtTime(dt: string | null): string {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

export function CrmBankStatementLogs() {
  useCrmHeader()

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 50

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['bs-logs', date, search, level, page],
    queryFn: async () => {
      const res = await bankStatementService.getLogs({ date, search: search || undefined, level: level || undefined, page, per_page: perPage })
      return res.data?.data ?? { entries: [], meta: { total: 0, page: 1, per_page: perPage, last_page: 1, file: '', date } }
    },
    refetchInterval: 10000, // auto-refresh every 10s
  })

  const entries = data?.entries ?? []
  const meta = data?.meta ?? { total: 0, page: 1, per_page: perPage, last_page: 1, file: '', date }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
              <FileText size={18} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Balji API Logs</h2>
              <p className="text-xs text-gray-400">Bank Statement Analysis API request/response logs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{meta.file}</span>
            <button onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />Refresh
            </button>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-500" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Date */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Date</label>
          <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(1) }}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400" />
        </div>

        {/* Level */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Level</label>
          <select value={level} onChange={e => { setLevel(e.target.value); setPage(1) }}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 bg-white min-w-[120px]">
            <option value="">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="text" placeholder="Search logs..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400" />
          </div>
        </div>

        {/* Stats */}
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
          <p className="text-sm font-bold text-gray-700">{meta.total} entries</p>
        </div>
      </div>

      {/* Log entries */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-green-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg flex flex-col items-center py-16 gap-3">
          <FileText size={32} className="text-gray-200" />
          <p className="text-sm text-gray-400">No Balji log entries found for {date}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry: any, i: number) => {
            const cfg = LEVEL_CFG[entry.level_name] ?? LEVEL_CFG.RAW
            const Icon = cfg.icon
            const ctx = entry.context ?? {}
            const hasContext = Object.keys(ctx).length > 0

            return (
              <LogEntry key={`${meta.page}-${i}`} entry={entry} cfg={cfg} Icon={Icon} ctx={ctx} hasContext={hasContext} />
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">
            Page {meta.page} of {meta.last_page} ({meta.total} entries)
          </p>
          <div className="flex items-center gap-1.5">
            <button disabled={meta.page <= 1} onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft size={12} /> Prev
            </button>
            <button disabled={meta.page >= meta.last_page} onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Single Log Entry ────────────────────────────────────────────────────────────

function LogEntry({ entry, cfg, Icon, ctx, hasContext }: {
  entry: any; cfg: { bg: string; text: string }; Icon: any; ctx: Record<string, any>; hasContext: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg overflow-hidden transition-shadow', expanded && 'shadow-sm')}>
      <div
        className="px-4 py-2.5 flex items-start gap-3 cursor-pointer hover:bg-gray-50/50"
        onClick={() => hasContext && setExpanded(!expanded)}
      >
        {/* Time */}
        <span className="text-xs font-mono text-gray-400 whitespace-nowrap pt-0.5 w-[85px] shrink-0">
          {fmtTime(entry.datetime)}
        </span>

        {/* Level badge */}
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0', cfg.bg, cfg.text)}>
          <Icon size={10} />
          {entry.level_name}
        </span>

        {/* Message */}
        <span className="text-sm text-gray-800 font-medium flex-1 break-all">{entry.message}</span>

        {/* Quick context preview */}
        {ctx.duration && (
          <span className="text-xs text-gray-400 font-mono shrink-0">{ctx.duration}</span>
        )}
        {ctx.status && (
          <span className={cn('text-xs font-mono font-bold shrink-0',
            ctx.status >= 400 ? 'text-red-600' : ctx.status >= 300 ? 'text-amber-600' : 'text-green-600'
          )}>{ctx.status}</span>
        )}
      </div>

      {/* Expanded context */}
      {expanded && hasContext && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(ctx).map(([key, val]) => {
              if (key === 'response' || key === 'body') return null
              return (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase min-w-[80px] shrink-0 pt-0.5">{key}</span>
                  <span className="text-xs text-gray-700 font-mono break-all">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                </div>
              )
            })}
          </div>

          {/* Response body */}
          {(ctx.response || ctx.body) && (
            <div className="mt-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Response Body</p>
              <pre className="bg-gray-900 text-green-400 text-xs font-mono p-3 rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                {formatJson(ctx.response || ctx.body)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}
