import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare, Filter, Send } from 'lucide-react'
import { twilioService } from '../../services/twilio.service'
import type { TwilioSms } from '../../types/twilio.types'
import { formatDate } from '../../utils/format'

const STATUS_COLORS: Record<string, string> = {
  sent:        'bg-green-100 text-green-700',
  delivered:   'bg-emerald-100 text-emerald-700',
  received:    'bg-blue-100 text-blue-700',
  failed:      'bg-red-100 text-red-700',
  undelivered: 'bg-orange-100 text-orange-700',
  queued:      'bg-slate-100 text-slate-500',
  sending:     'bg-yellow-100 text-yellow-700',
}

export function TwilioSmsLogs() {
  const [page, setPage]         = useState(1)
  const [direction, setDir]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [search, setSearch]     = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['twilio-sms', { page, direction, dateFrom, dateTo, search }],
    queryFn: () => twilioService.listSms({
      page, limit: 25,
      direction: direction || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: search || undefined,
    }),
  })

  const sms: TwilioSms[] = data?.data?.data?.sms ?? []
  const total: number    = data?.data?.data?.total ?? 0
  const perPage          = 25

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">SMS Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">All inbound and outbound SMS messages</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <Filter size={14} className="text-slate-400 flex-shrink-0" />
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg overflow-hidden">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
            placeholder="Search number or body…"
            className="px-2.5 py-1.5 text-xs focus:outline-none w-44"
          />
          <button
            onClick={() => { setSearch(searchInput); setPage(1) }}
            className="px-2 py-1.5 bg-slate-50 text-slate-500 hover:bg-slate-100 text-xs border-l border-slate-200"
          >
            Go
          </button>
        </div>
        <select
          value={direction}
          onChange={(e) => { setDir(e.target.value); setPage(1) }}
          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
          />
        </div>
        {(direction || dateFrom || dateTo || search) && (
          <button
            onClick={() => { setDir(''); setDateFrom(''); setDateTo(''); setSearch(''); setSearchInput(''); setPage(1) }}
            className="text-xs text-red-500 hover:underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">{total.toLocaleString()} messages</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sms.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No SMS messages found.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Dir</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">From</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">To</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 max-w-xs">Message</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sms.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        m.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {m.direction === 'inbound' ? '↓ In' : '↑ Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800 text-xs">{m.from_number}</td>
                    <td className="px-4 py-3 font-mono text-slate-800 text-xs">{m.to_number}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      <p className="truncate text-xs">{m.body}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        STATUS_COLORS[m.status] ?? 'bg-slate-100 text-slate-500'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {m.sent_at ? formatDate(m.sent_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
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
