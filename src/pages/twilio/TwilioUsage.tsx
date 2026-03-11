import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, DollarSign, Phone, MessageSquare, Clock, RefreshCw } from 'lucide-react'
import { twilioService } from '../../services/twilio.service'
import type { TwilioUsageRecord } from '../../types/twilio.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'indigo',
}: {
  icon: React.ComponentType<any>
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] ?? colors.indigo}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const PRESETS = [
  { label: 'This Month',    days: 30  },
  { label: 'Last 7 Days',   days: 7   },
  { label: 'Last 90 Days',  days: 90  },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const KEY_CATEGORIES = ['calls', 'calls-inbound', 'calls-outbound', 'sms', 'sms-inbound', 'sms-outbound', 'recordings']

export function TwilioUsage() {
  const today  = new Date().toISOString().split('T')[0]
  const [start, setStart] = useState(daysAgo(30))
  const [end, setEnd]     = useState(today)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['twilio-usage', start, end],
    queryFn:  () => twilioService.getUsage({ start_date: start, end_date: end }),
    staleTime: 5 * 60_000,
  })

  const records: TwilioUsageRecord[] = (data?.data?.data?.records as TwilioUsageRecord[]) ?? []
  const summary = data?.data?.data?.summary

  const getCat = (cat: string) => records.find((r) => r.category === cat)

  const callRec   = getCat('calls')
  const smsRec    = getCat('sms')
  const recRec    = getCat('recordings')
  const totalSpend = records.reduce((acc, r) => acc + (Number(r.price) || 0), 0)

  const keyRows = KEY_CATEGORIES.map((cat) => getCat(cat)).filter(Boolean) as TwilioUsageRecord[]
  const otherRows = records.filter((r) => !KEY_CATEGORIES.includes(r.category) && Number(r.price) > 0)
    .sort((a, b) => Number(b.price) - Number(a.price))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usage & Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor your Twilio spend and activity</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Date controls */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => { setStart(daysAgo(p.days)); setEnd(today) }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              start === daysAgo(p.days) && end === today
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={start}
            max={end}
            onChange={(e) => setStart(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={end}
            min={start}
            max={today}
            onChange={(e) => setEnd(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={DollarSign}
              label="Total Spend"
              value={`$${totalSpend.toFixed(2)}`}
              sub="USD"
              color="orange"
            />
            <StatCard
              icon={Phone}
              label="Total Calls"
              value={(callRec?.count ?? summary?.total_calls ?? 0).toLocaleString()}
              sub={`${(Number(callRec?.usage ?? 0) / 60).toFixed(1)} hours`}
              color="green"
            />
            <StatCard
              icon={MessageSquare}
              label="SMS Messages"
              value={(smsRec?.count ?? summary?.total_sms ?? 0).toLocaleString()}
              color="blue"
            />
            <StatCard
              icon={Clock}
              label="Voice Minutes"
              value={((Number(callRec?.usage ?? 0)) / 60).toFixed(1)}
              sub="hours of audio"
              color="indigo"
            />
          </div>

          {/* Spend gradient banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 text-white flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-200 font-medium uppercase tracking-wide">
                {start} → {end}
              </p>
              <p className="text-3xl font-bold mt-1">${totalSpend.toFixed(4)}</p>
              <p className="text-xs text-indigo-200 mt-1">Total spend across all services</p>
            </div>
            <BarChart3 size={48} className="text-indigo-300 opacity-50" />
          </div>

          {/* Key categories table */}
          {keyRows.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Key Usage Breakdown</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Count</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Usage</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {keyRows.map((r) => (
                    <tr key={r.category} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800 capitalize">
                        {r.description || r.category.replace(/-/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {Number(r.count).toLocaleString()} {r.count_unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {Number(r.usage).toFixed(2)} {r.usage_unit}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        ${Number(r.price).toFixed(4)} {r.price_unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Other charges */}
          {otherRows.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Other Charges</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Service</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Count</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {otherRows.map((r) => (
                    <tr key={r.category} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 capitalize">
                        {r.description || r.category.replace(/-/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {Number(r.count).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        ${Number(r.price).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {records.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
              <BarChart3 size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No usage data for this period.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
