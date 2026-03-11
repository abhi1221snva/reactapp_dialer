import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Phone, Play, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { plivoService } from '../../services/plivo.service'
import type { PlivoCall } from '../../types/plivo.types'

const STATUS_COLORS: Record<string, string> = {
  completed:   'bg-green-100 text-green-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  ringing:     'bg-yellow-100 text-yellow-700',
  queued:      'bg-slate-100 text-slate-600',
  failed:      'bg-red-100 text-red-700',
  busy:        'bg-orange-100 text-orange-700',
  'no-answer': 'bg-slate-100 text-slate-500',
  canceled:    'bg-slate-100 text-slate-400',
}

function formatDuration(secs: number): string {
  if (!secs) return '—'
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function formatDate(dt: string | null): string {
  if (!dt) return '—'
  return new Date(dt).toLocaleString()
}

export function PlivoCallLogs() {
  const [page, setPage]         = useState(1)
  const [direction, setDir]     = useState('')
  const [status, setStatus]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['plivo-calls', { page, direction, status, dateFrom, dateTo }],
    queryFn:  () => plivoService.listCalls({
      page, limit: 25,
      direction: direction || undefined,
      status: status || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
  })

  const calls: PlivoCall[] = data?.data?.data?.calls ?? []
  const total = data?.data?.data?.total ?? 0
  const pages = Math.ceil(total / 25)

  const handleFilter = () => { setPage(1); refetch() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Plivo Call Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} total calls</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Direction</label>
            <select value={direction} onChange={(e) => setDir(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All</option>
              {['completed','ringing','in-progress','busy','no-answer','canceled','failed'].map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={handleFilter} className="px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Apply Filters</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : calls.length === 0 ? (
          <div className="py-12 text-center"><Phone size={32} className="mx-auto text-slate-300 mb-2" /><p className="text-sm text-slate-500">No calls found.</p></div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Direction</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">From</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">To</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Duration</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Started</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Recording</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        call.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>{call.direction}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{call.from_number}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{call.to_number}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDuration(call.duration)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[call.call_status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {call.call_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(call.started_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {call.recording_url ? (
                        <a href={call.recording_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                          <Play size={11} />Play
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">Page {page} of {pages} · {total} total</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="p-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
