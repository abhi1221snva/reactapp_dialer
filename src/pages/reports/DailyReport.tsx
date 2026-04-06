import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar, Download, RefreshCw, Phone, PhoneCall, PhoneOff, Clock,
  ChevronDown, Filter, TrendingUp, BarChart3, Search,
} from 'lucide-react'
import { useDialerHeader } from '../../layouts/DialerLayout'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import api from '../../api/axios'
import { campaignService } from '../../services/campaign.service'
import { formatDuration, formatDate } from '../../utils/format'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyRow {
  id?: number
  date?: string
  day?: string
  campaign?: string
  campaign_id?: number
  total_calls?: number
  calls?: number
  answered?: number
  missed?: number
  no_answer?: number
  busy?: number
  failed?: number
  total_duration?: number
  duration?: number
  avg_duration?: number
  answer_rate?: number
  [key: string]: unknown
}

interface Campaign {
  id: number
  title: string
  [key: string]: unknown
}

interface Filters {
  date_from: string
  date_to: string
  campaign_id: number | ''
}

const DATE_PRESETS = [
  { label: 'Today',    days: 0 },
  { label: '7 Days',  days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
] as const

import { useTimezone } from '../../hooks/useTimezone'

function SummaryCard({
  icon: Icon, label, value, sub, color, loading,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; loading?: boolean
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="h-7 w-20 bg-slate-200 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        )}
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DailyReport() {
  const { setToolbar } = useDialerHeader()
  const { today, daysAgo } = useTimezone()
  const initDates = useMemo(() => ({ from: today(), to: today() }), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState<Filters>({
    date_from: initDates.from,
    date_to:   initDates.to,
    campaign_id: '',
  })
  const [activePreset, setActivePreset] = useState<string>('Today')
  const [page, setPage]     = useState(1)
  const [showExport, setShowExport] = useState(false)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<string>('date')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')

  const PER_PAGE = 25

  const handleSort = (key: string) => {
    if (sortField === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(key); setSortDir('desc') }
    setPage(1)
  }

  // Campaigns dropdown
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn: () => campaignService.getAll(),
    staleTime: 5 * 60_000,
  })
  const campaigns: Campaign[] = campaignsData?.data?.data || campaignsData?.data || []

  // Daily report data
  const queryParams = {
    date_from:   filters.date_from,
    date_to:     filters.date_to,
    ...(filters.campaign_id ? { campaign_id: Number(filters.campaign_id) } : {}),
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['daily-report', queryParams],
    queryFn:  () => api.post('/reports/daily', queryParams),
  })

  const rawRows: DailyRow[] = data?.data?.data?.data || data?.data?.data || data?.data || []
  const rows = Array.isArray(rawRows) ? rawRows : []

  // Search → sort → paginate
  const filtered = search.trim()
    ? rows.filter((r) => {
        const s = search.toLowerCase()
        return (
          (r.date || r.day || '').toLowerCase().includes(s) ||
          (r.campaign || '').toLowerCase().includes(s)
        )
      })
    : rows

  const NUMERIC_FIELDS = ['total_calls', 'calls', 'answered', 'missed', 'no_answer', 'busy', 'failed', 'avg_duration', 'total_duration', 'duration', 'answer_rate']
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortField as keyof DailyRow] ?? ''
    const bv = b[sortField as keyof DailyRow] ?? ''
    if (NUMERIC_FIELDS.includes(sortField)) {
      const diff = Number(av) - Number(bv)
      return sortDir === 'asc' ? diff : -diff
    }
    const cmp = String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const total = sorted.length
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Aggregated stats
  const totalCalls    = rows.reduce((s, r) => s + Number(r.total_calls || r.calls || 0), 0)
  const totalAnswered = rows.reduce((s, r) => s + Number(r.answered || 0), 0)
  const totalMissed   = rows.reduce((s, r) => s + Number(r.missed || r.no_answer || 0), 0)
  const totalDuration = rows.reduce((s, r) => s + Number(r.total_duration || r.duration || 0), 0)
  const avgDuration   = totalAnswered > 0 ? Math.round(totalDuration / totalAnswered) : 0
  const answerRate    = totalCalls > 0 ? Math.round((totalAnswered / totalCalls) * 100) : 0

  const applyPreset = useCallback((label: string, days: number) => {
    setActivePreset(label)
    setFilters((f) => ({
      ...f,
      date_from: days === 0 ? today() : daysAgo(days),
      date_to:   today(),
    }))
    setPage(1)
  }, [])

  const buildCsvRows = () => [
    ['Date', 'Campaign', 'Total Calls', 'Answered', 'Missed', 'Busy', 'Failed', 'Answer Rate', 'Avg Duration', 'Total Talk Time'].join(','),
    ...rows.map((r) => {
      const tc   = Number(r.total_calls || r.calls || 0)
      const an   = Number(r.answered || 0)
      const rate = tc > 0 ? Math.round((an / tc) * 100) : 0
      return [
        r.date || r.day || '',
        `"${r.campaign || ''}"`,
        tc,
        an,
        r.missed || r.no_answer || 0,
        r.busy || 0,
        r.failed || 0,
        `${rate}%`,
        formatDuration(Number(r.avg_duration || 0)),
        formatDuration(Number(r.total_duration || r.duration || 0)),
      ].join(',')
    }),
  ].join('\n')

  const handleExport = async () => {
    setShowExport(false)
    try {
      const blob = new Blob([buildCsvRows()], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `daily-report-${filters.date_from}-to-${filters.date_to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } catch { toast.error('Export failed') }
  }

  const handleExportExcel = () => {
    setShowExport(false)
    try {
      const blob = new Blob(['\uFEFF' + buildCsvRows()], { type: 'text/csv;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `daily-report-${filters.date_from}-to-${filters.date_to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel exported')
    } catch { toast.error('Export failed') }
  }

  const columns: Column<DailyRow>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-900">
            {formatDate(r.date || r.day || '')}
          </span>
        </div>
      ),
    },
    {
      key: 'campaign',
      header: 'Campaign',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-slate-700">{r.campaign || '—'}</span>
      ),
    },
    {
      key: 'total_calls',
      header: 'Total Calls',
      sortable: true,
      render: (r) => (
        <span className="text-sm font-bold text-slate-900">
          {(r.total_calls || r.calls || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'answered',
      header: 'Answered',
      sortable: true,
      render: (r) => (
        <span className="text-sm font-semibold text-emerald-700">
          {(r.answered || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'missed',
      header: 'Missed / No Answer',
      sortable: true,
      render: (r) => (
        <span className="text-sm font-semibold text-red-600">
          {(r.missed || r.no_answer || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'busy',
      header: 'Busy',
      render: (r) => (
        <span className="text-sm text-amber-700">
          {(r.busy || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'answer_rate',
      header: 'Answer Rate',
      render: (r) => {
        const tc = Number(r.total_calls || r.calls || 0)
        const an = Number(r.answered || 0)
        const rate = tc > 0 ? Math.round((an / tc) * 100) : 0
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500')}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className={cn(
              'text-xs font-bold',
              rate >= 70 ? 'text-emerald-700' : rate >= 40 ? 'text-amber-700' : 'text-red-700'
            )}>
              {rate}%
            </span>
          </div>
        )
      },
    },
    {
      key: 'avg_duration',
      header: 'Avg Duration',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-sm text-slate-700">
          {formatDuration(Number(r.avg_duration || 0))}
        </span>
      ),
    },
    {
      key: 'total_duration',
      header: 'Total Talk Time',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-sm text-slate-600">
          {formatDuration(Number(r.total_duration || r.duration || 0))}
        </span>
      ),
    },
  ]

  useEffect(() => {
    setToolbar(
      <div className="lt-right">
        <button onClick={() => refetch()} disabled={isFetching} className="lt-b" title="Refresh">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <div className="relative">
          <button onClick={() => setShowExport((v) => !v)} disabled={rows.length === 0} className="lt-b">
            <Download size={13} /> Export <ChevronDown size={11} />
          </button>
          {showExport && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 z-20 overflow-hidden">
              <button onClick={handleExport} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100">
                <Download size={13} className="text-slate-400" /> Export CSV
              </button>
              <button onClick={handleExportExcel} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <Download size={13} className="text-emerald-500" /> Export Excel
              </button>
            </div>
          )}
        </div>
      </div>
    )
    return () => setToolbar(undefined)
  })

  return (
    <div className="space-y-6">
      {/* Date presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
          <Calendar size={12} /> Quick Range:
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.label, p.days)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                activePreset === p.label
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Phone}      label="Total Calls"
          value={totalCalls.toLocaleString()} sub="In date range"
          color="bg-indigo-50 text-indigo-600"   loading={isLoading}
        />
        <SummaryCard
          icon={PhoneCall}  label="Answered"
          value={totalAnswered.toLocaleString()} sub={`${answerRate}% answer rate`}
          color="bg-emerald-50 text-emerald-600" loading={isLoading}
        />
        <SummaryCard
          icon={PhoneOff}   label="Missed"
          value={totalMissed.toLocaleString()} sub="No answer / missed"
          color="bg-red-50 text-red-600"          loading={isLoading}
        />
        <SummaryCard
          icon={Clock}      label="Avg Talk Time"
          value={formatDuration(avgDuration)} sub="Per answered call"
          color="bg-blue-50 text-blue-600"        loading={isLoading}
        />
      </div>

      {/* Daily Trend Chart */}
      {(isLoading || rows.length > 0) && (
        <div className="card">
          <div className="flex items-center gap-2 pb-4 mb-2 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart3 size={14} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Daily Call Trend</h3>
            {!isLoading && (
              <span className="text-xs text-slate-400 ml-auto">{rows.length} days</span>
            )}
          </div>
          {isLoading ? (
            <div className="h-52 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[...rows].sort((a, b) =>
                  String(a.date || a.day || '').localeCompare(String(b.date || b.day || ''))
                ).map((r) => ({
                  date:     String(r.date || r.day || '').slice(5),
                  Total:    Number(r.total_calls || r.calls || 0),
                  Answered: Number(r.answered || 0),
                  Missed:   Number(r.missed || r.no_answer || 0),
                }))}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  interval={rows.length > 14 ? Math.floor(rows.length / 7) : 0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a', border: 'none', borderRadius: 10,
                    color: '#fff', fontSize: 11,
                  }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Total"    fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Answered" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Missed"   fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="form-group">
            <label className="label">From Date</label>
            <input
              type="date" className="input" value={filters.date_from}
              max={filters.date_to}
              onChange={(e) => {
                setFilters((f) => ({ ...f, date_from: e.target.value }))
                setActivePreset('Custom')
                setPage(1)
              }}
            />
          </div>
          <div className="form-group">
            <label className="label">To Date</label>
            <input
              type="date" className="input" value={filters.date_to}
              min={filters.date_from} max={today()}
              onChange={(e) => {
                setFilters((f) => ({ ...f, date_to: e.target.value }))
                setActivePreset('Custom')
                setPage(1)
              }}
            />
          </div>
          <div className="form-group">
            <label className="label">Campaign</label>
            <select
              className="input"
              value={filters.campaign_id}
              onChange={(e) => {
                setFilters((f) => ({ ...f, campaign_id: e.target.value ? Number(e.target.value) : '' }))
                setPage(1)
              }}
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Search</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-8" placeholder="Date or campaign…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">
              {isLoading ? 'Loading…' : `${total.toLocaleString()} day${total !== 1 ? 's' : ''}`}
            </span>
          </div>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Refreshing…
            </span>
          )}
          {!isLoading && rows.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <TrendingUp size={12} className="text-emerald-500" />
              {answerRate}% answer rate
            </div>
          )}
        </div>
        <DataTable
          columns={columns}
          data={paginated as unknown as Record<string, unknown>[]}
          loading={isLoading}
          keyField="date"
          emptyText="No daily report data found for the selected range"
          pagination={total > PER_PAGE ? { page, total, perPage: PER_PAGE, onChange: setPage } : undefined}
          sortKey={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>
    </div>
  )
}
