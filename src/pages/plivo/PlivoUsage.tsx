import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Phone, MessageSquare, Clock, DollarSign, RefreshCw } from 'lucide-react'
import { plivoService } from '../../services/plivo.service'

export function PlivoUsage() {
  const today     = new Date().toISOString().split('T')[0]
  const monthStart = today.substring(0, 8) + '01'

  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTill, setDateTill] = useState(today)
  const [queryParams, setQueryParams] = useState({ date_from: monthStart, date_till: today })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['plivo-usage', queryParams],
    queryFn:  () => plivoService.getUsage(queryParams),
  })

  const summary = data?.data?.data?.summary
  const applyFilter = () => setQueryParams({ date_from: dateFrom, date_till: dateTill })

  const stats = [
    { label: 'Total Calls',   value: summary?.total_calls ?? 0,                  icon: Phone,         color: 'green'  },
    { label: 'SMS Sent',      value: summary?.total_sms ?? 0,                    icon: MessageSquare, color: 'blue'   },
    { label: 'Minutes Used',  value: summary?.minutes_used ? `${summary.minutes_used.toFixed(1)}m` : '0m', icon: Clock, color: 'orange' },
    { label: 'Total Spend',   value: `$${(summary?.total_spend ?? 0).toFixed(4)}`, icon: DollarSign,   color: 'indigo' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Plivo Usage & Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor your Plivo telecom usage</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Till</label>
            <input type="date" value={dateTill} onChange={(e) => setDateTill(e.target.value)} className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={applyFilter} disabled={isFetching} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60">
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ label, value, icon: Icon, color }) => {
              const colors: Record<string, string> = {
                green: 'bg-green-50 text-green-600', blue: 'bg-blue-50 text-blue-600',
                orange: 'bg-orange-50 text-orange-600', indigo: 'bg-indigo-50 text-indigo-600',
              }
              return (
                <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mt-0.5">{value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Spend highlight */}
          {summary && (
            <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-xs font-medium uppercase tracking-wide">Period Spend</p>
                  <p className="text-4xl font-bold mt-1">${summary.total_spend.toFixed(4)}</p>
                  <p className="text-green-200 text-sm mt-2">
                    {summary.total_calls.toLocaleString()} calls · {summary.total_sms.toLocaleString()} SMS · {summary.minutes_used.toFixed(1)} minutes
                  </p>
                </div>
                <BarChart3 size={48} className="text-green-300 opacity-50" />
              </div>
            </div>
          )}

          {!summary && (
            <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
              <BarChart3 size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No usage data for selected period.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
