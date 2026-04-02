import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, ArrowLeft, Search, Calendar, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { smsAiService } from '../../services/smsAi.service'
import { cn } from '../../utils/cn'

interface ReportRow {
  id?: number
  phone_number?: string
  did?: string
  status?: string
  message?: string
  created_at?: string
  [key: string]: unknown
}

interface DailyReportRow {
  id?: number
  date?: string
  total_sent?: number
  total_received?: number
  total_failed?: number
  [key: string]: unknown
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

const TABS = [
  { key: 'sms', label: 'SMS Reports' },
  { key: 'daily', label: 'Daily Reports' },
] as const

type TabKey = typeof TABS[number]['key']

// ─── SMS Reports Tab ──────────────────────────────────────────────────────────
function SmsReportsTab() {
  const today = useMemo(() => formatDate(new Date()), [])
  const weekAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return formatDate(d)
  }, [])

  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['smsai-reports', startDate, endDate, search, page],
    queryFn: () =>
      smsAiService.listReports({
        start: page * limit,
        length: limit,
        search: { value: search },
        start_date: startDate,
        end_date: endDate,
        draw: page + 1,
      }),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  const rows: ReportRow[] = r?.data?.data ?? []
  const total: number = r?.data?.recordsTotal ?? r?.data?.recordsFiltered ?? 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="form-group">
          <label className="label text-xs">Start Date</label>
          <input
            type="date"
            className="input text-sm"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(0) }}
          />
        </div>
        <div className="form-group">
          <label className="label text-xs">End Date</label>
          <input
            type="date"
            className="input text-sm"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(0) }}
          />
        </div>
        <div className="form-group flex-1 min-w-[180px]">
          <label className="label text-xs">Search</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-slate-400" />
            </div>
            <input
              className="input pl-9 text-sm"
              placeholder="Search phone or DID…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">DID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <BarChart3 size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">No report data found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id ?? idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">{row.phone_number || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.did || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        row.status === 'sent' ? 'bg-emerald-50 text-emerald-600' :
                        row.status === 'failed' ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 text-slate-500'
                      )}>
                        {row.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">{row.message || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{row.created_at || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">{total} total records</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500 flex items-center px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Daily Reports Tab ────────────────────────────────────────────────────────
function DailyReportsTab() {
  const today = useMemo(() => formatDate(new Date()), [])
  const monthAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return formatDate(d)
  }, [])

  const [startDate, setStartDate] = useState(monthAgo)
  const [endDate, setEndDate] = useState(today)

  const { data, isLoading } = useQuery({
    queryKey: ['smsai-daily-reports', startDate, endDate],
    queryFn: () =>
      smsAiService.listDailyReports({
        start_date: startDate,
        end_date: endDate,
      }),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  const rows: DailyReportRow[] = r?.data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="form-group">
          <label className="label text-xs">Start Date</label>
          <input type="date" className="input text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label text-xs">End Date</label>
          <input type="date" className="input text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Received</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <Calendar size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">No daily report data found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id ?? idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">{row.date || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{row.total_sent ?? 0}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">{row.total_received ?? 0}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{row.total_failed ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function SmsAiReports() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('sms')

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/smsai/demo')} className="btn-ghost p-2 rounded-lg mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="page-header">
            <div>
              <h1 className="page-title">SMS AI Reports</h1>
              <p className="page-subtitle">View SMS delivery reports and daily analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sms' ? <SmsReportsTab /> : <DailyReportsTab />}
    </div>
  )
}
