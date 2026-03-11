import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { plivoService } from '../../services/plivo.service'
import type { PlivoSms } from '../../types/plivo.types'

const STATE_COLORS: Record<string, string> = {
  sent:        'bg-green-100 text-green-700',
  delivered:   'bg-emerald-100 text-emerald-700',
  queued:      'bg-slate-100 text-slate-600',
  failed:      'bg-red-100 text-red-700',
  undelivered: 'bg-orange-100 text-orange-700',
  rejected:    'bg-red-100 text-red-600',
  received:    'bg-blue-100 text-blue-700',
}

function formatDate(dt: string | null): string {
  if (!dt) return '—'
  return new Date(dt).toLocaleString()
}

export function PlivoSmsLogs() {
  const [page, setPage]         = useState(1)
  const [direction, setDir]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [search, setSearch]     = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['plivo-sms', { page, direction, dateFrom, dateTo, search }],
    queryFn:  () => plivoService.listSms({
      page, limit: 25,
      direction: direction || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: search || undefined,
    }),
  })

  const smsList: PlivoSms[] = data?.data?.data?.sms ?? []
  const total = data?.data?.data?.total ?? 0
  const pages = Math.ceil(total / 25)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Plivo SMS Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} total messages</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

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
            <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }} placeholder="Number or body…" className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => { setSearch(searchInput); setPage(1) }} className="px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Apply Filters</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : smsList.length === 0 ? (
          <div className="py-12 text-center"><MessageSquare size={32} className="mx-auto text-slate-300 mb-2" /><p className="text-sm text-slate-500">No messages found.</p></div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Direction</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">From</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">To</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Message</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">State</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {smsList.map((sms) => (
                  <tr key={sms.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sms.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{sms.direction}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{sms.from_number}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{sms.to_number}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{sms.message_body}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATE_COLORS[sms.message_state] ?? 'bg-slate-100 text-slate-500'}`}>{sms.message_state}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(sms.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">Page {page} of {pages} · {total} total</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={14} /></button>
                  <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="p-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
