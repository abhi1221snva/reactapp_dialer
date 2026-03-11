import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Phone, Download, Play, Search, Filter } from 'lucide-react'
import { twilioService } from '../../services/twilio.service'
import type { TwilioCall } from '../../types/twilio.types'
import { formatDate } from '../../utils/format'

const STATUS_COLORS: Record<string, string> = {
  completed:   'bg-green-100 text-green-700',
  'in-progress':'bg-blue-100 text-blue-700',
  ringing:     'bg-yellow-100 text-yellow-700',
  queued:      'bg-slate-100 text-slate-600',
  busy:        'bg-orange-100 text-orange-700',
  failed:      'bg-red-100 text-red-700',
  'no-answer': 'bg-slate-100 text-slate-500',
  canceled:    'bg-slate-100 text-slate-500',
}

function formatDur(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}

export function TwilioCallLogs() {
  const [page, setPage]         = useState(1)
  const [direction, setDir]     = useState('')
  const [status, setStatus]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['twilio-calls', { page, direction, status, dateFrom, dateTo }],
    queryFn: () => twilioService.listCalls({
      page, limit: 25, direction: direction || undefined,
      status: status || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
  })

  const calls: TwilioCall[] = data?.data?.data?.calls ?? []
  const total: number       = data?.data?.data?.total  ?? 0
  const perPage             = 25

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Call Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">All inbound and outbound calls via Twilio</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <Filter size={14} className="text-slate-400 flex-shrink-0" />
        <select
          value={direction}
          onChange={(e) => { setDir(e.target.value); setPage(1) }}
          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {['completed','failed','busy','no-answer','canceled','in-progress'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {(direction || status || dateFrom || dateTo) && (
          <button
            onClick={() => { setDir(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1) }}
            className="text-xs text-red-500 hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">{total.toLocaleString()} calls</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="py-12 text-center">
            <Phone size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No call records found.</p>
          </div>
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
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Recording</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calls.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.direction === 'inbound'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {c.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800">{c.from_number}</td>
                    <td className="px-4 py-3 font-mono text-slate-800">{c.to_number}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDur(c.duration)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {c.started_at ? formatDate(c.started_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.recording_url ? (
                        <a
                          href={c.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                        >
                          <Play size={11} />
                          Play
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * perPage >= total}
                  className="px-3 py-1 text-xs border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
