import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Download, Play, PhoneCall, Clock, TrendingUp, BarChart2,
  ChevronDown, Filter, Calendar, RefreshCw,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { reportService } from '../../services/report.service'
import { formatDateTime, formatDuration, formatPhoneNumber } from '../../utils/format'
import toast from 'react-hot-toast'

interface CdrRow {
  id: number
  phone_number: string
  agent_name: string
  duration: number
  disposition: string
  created_at: string
  recording_url?: string
  call_type?: string
  [key: string]: unknown
}

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
]

function SummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-300">
          {p.name}: <span className="text-white font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function Reports() {
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    number: '',
    extension: '',
    type: '',
  })
  const [page, setPage] = useState(1)
  const [activePreset, setActivePreset] = useState('7 Days')
  const [showExportMenu, setShowExportMenu] = useState(false)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cdr', filters, page],
    queryFn: () => reportService.getCdr({ ...filters, lower_limit: (page - 1) * 25, upper_limit: page * 25 }),
  })

  const rows: CdrRow[] = data?.data?.data?.data || []
  const total = data?.data?.data?.total || 0

  const answeredCalls = rows.filter((r) => r.disposition === 'ANSWERED').length
  const avgDuration = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + Number(r.duration), 0) / rows.length)
    : 0

  const dispositionMap: Record<string, number> = {}
  rows.forEach((r) => {
    const d = r.disposition || 'UNKNOWN'
    dispositionMap[d] = (dispositionMap[d] || 0) + 1
  })
  const chartData = Object.entries(dispositionMap).map(([name, count]) => ({ name, count }))

  const handlePreset = (preset: { label: string; days: number }) => {
    setActivePreset(preset.label)
    const now = new Date()
    const from = new Date(now.getTime() - preset.days * 86400000)
    setFilters((f) => ({
      ...f,
      start_date: preset.days === 0 ? now.toISOString().split('T')[0] : from.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    }))
    setPage(1)
  }

  const handleExport = async () => {
    try {
      setShowExportMenu(false)
      const res = await reportService.exportCsv(filters)
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cdr-report.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export started')
    } catch {
      toast.error('Export failed')
    }
  }

  const columns: Column<CdrRow>[] = [
    {
      key: 'phone_number', header: 'Number',
      render: (r) => (
        <span className="font-mono text-sm font-semibold text-slate-900">
          {formatPhoneNumber(r.phone_number)}
        </span>
      ),
    },
    {
      key: 'agent_name', header: 'Agent',
      render: (r) => <span className="text-sm text-slate-700">{r.agent_name || '—'}</span>,
    },
    {
      key: 'call_type', header: 'Type',
      render: (r) => (
        <Badge variant={r.call_type === 'inbound' ? 'blue' : 'gray'}>
          {String(r.call_type || 'outbound')}
        </Badge>
      ),
    },
    {
      key: 'duration', header: 'Duration',
      render: (r) => (
        <span className="text-sm font-mono text-slate-700">{formatDuration(Number(r.duration))}</span>
      ),
    },
    {
      key: 'disposition', header: 'Disposition',
      render: (r) => {
        const d = r.disposition || '-'
        const variant = d === 'ANSWERED' ? 'green' : d === 'NO ANSWER' ? 'yellow' : d === 'BUSY' ? 'red' : 'gray'
        return <Badge variant={variant}>{d}</Badge>
      },
    },
    {
      key: 'created_at', header: 'Date / Time',
      render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span>,
    },
    {
      key: 'recording', header: 'Recording',
      render: (r) => r.recording_url ? (
        <button
          onClick={() => window.open(r.recording_url as string, '_blank')}
          className="btn-ghost btn-sm p-1.5 text-indigo-600 hover:bg-indigo-50"
        >
          <Play size={13} />
        </button>
      ) : <span className="text-slate-200 text-xs">—</span>,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Reports &amp; Analytics</h1>
          <p className="page-subtitle">CDR analysis and call performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-ghost btn-sm p-2 rounded-lg"
            title="Refresh"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <div className="relative">
            <button onClick={() => setShowExportMenu((v) => !v)} className="btn-outline gap-2">
              <Download size={15} /> Export <ChevronDown size={13} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-200 z-20 overflow-hidden">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
          <Calendar size={12} /> Date Range:
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activePreset === preset.label
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={PhoneCall} label="Total Calls"
          value={total.toLocaleString()} sub="In selected period"
          color="bg-indigo-50 text-indigo-600"
        />
        <SummaryCard
          icon={TrendingUp} label="Answered"
          value={answeredCalls.toLocaleString()}
          sub={rows.length > 0 ? `${Math.round((answeredCalls / rows.length) * 100)}% rate` : '—'}
          color="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          icon={Clock} label="Avg Duration"
          value={formatDuration(avgDuration)} sub="Per call"
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={BarChart2} label="Dispositions"
          value={chartData.length} sub="Unique outcomes"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Disposition Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart2 size={14} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Disposition Breakdown</h3>
            <span className="text-xs text-slate-400 ml-auto">This page ({rows.length} calls)</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" name="Calls" radius={[6, 6, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filter Records</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="form-group">
            <label className="label">From</label>
            <input
              type="date" className="input" value={filters.start_date}
              onChange={(e) => { setFilters((f) => ({ ...f, start_date: e.target.value })); setActivePreset('Custom'); setPage(1) }}
            />
          </div>
          <div className="form-group">
            <label className="label">To</label>
            <input
              type="date" className="input" value={filters.end_date}
              onChange={(e) => { setFilters((f) => ({ ...f, end_date: e.target.value })); setActivePreset('Custom'); setPage(1) }}
            />
          </div>
          <div className="form-group">
            <label className="label">Type</label>
            <select className="input" value={filters.type}
              onChange={(e) => { setFilters((f) => ({ ...f, type: e.target.value })); setPage(1) }}>
              <option value="">All Types</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Extension</label>
            <input
              className="input font-mono" placeholder="e.g. 1001" value={filters.extension}
              onChange={(e) => { setFilters((f) => ({ ...f, extension: e.target.value })); setPage(1) }}
            />
          </div>
          <div className="form-group">
            <label className="label">Search</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-8" placeholder="Phone number…" value={filters.number}
                onChange={(e) => { setFilters((f) => ({ ...f, number: e.target.value })); setPage(1) }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
          <span className="text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading…' : `${total.toLocaleString()} records`}
          </span>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Updating…
            </span>
          )}
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          emptyText="No call records found"
          pagination={{ page, total, perPage: 25, onChange: setPage }}
        />
      </div>
    </div>
  )
}
