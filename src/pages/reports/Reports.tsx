import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Download, Play, PhoneCall, Clock, TrendingUp, BarChart2,
  ChevronDown, Filter, Calendar, RefreshCw, ArrowDownLeft, ArrowUpRight,
  X, Volume2, PhoneIncoming, PhoneOutgoing, Hash,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { reportService } from '../../services/report.service'
import { formatDateTime, formatDuration, formatPhoneNumber } from '../../utils/format'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CdrRow {
  id: number
  phone_number: string
  agent_name: string
  duration: number
  disposition: string
  created_at: string
  recording_url?: string
  call_type?: string
  route?: string
  campaign?: string
  campaign_name?: string
  [key: string]: unknown
}

interface Campaign { id: number; title: string; [key: string]: unknown }

const DATE_PRESETS = [
  { label: 'Today',   days: 0  },
  { label: '7 Days',  days: 7  },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function AudioPlayerModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Volume2 size={16} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Call Recording</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <audio
          controls
          autoPlay
          className="w-full rounded-lg"
          src={url}
          onError={() => toast.error('Recording could not be loaded')}
        />
        <p className="text-xs text-slate-400 mt-3 text-center truncate">{url}</p>
      </div>
    </div>
  )
}

function DirectionBadge({ route }: { route?: string }) {
  const r = (route || 'OUT').toUpperCase()
  if (r === 'IN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
        <ArrowDownLeft size={11} /> IN
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
      <ArrowUpRight size={11} /> OUT
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Reports() {
  const [filters, setFilters] = useState({
    start_date:       new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    end_date:         new Date().toISOString().split('T')[0],
    number:           '',
    extension:        '',
    type:             '',
    campaign_id:      '' as number | '',
    disposition_name: '',
    call_status:      '',
  })
  const [page, setPage]               = useState(1)
  const [activePreset, setActivePreset] = useState('7 Days')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [sortField, setSortField]     = useState('created_at')
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc')
  const [playingUrl, setPlayingUrl]   = useState<string | null>(null)

  const PER_PAGE = 25

  // Campaigns dropdown
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn:  () => reportService.getCampaignList(),
    staleTime: 5 * 60_000,
  })
  const campaigns: Campaign[] = campaignsData?.data?.data || campaignsData?.data || []

  // Dispositions dropdown
  const { data: dispositionsData } = useQuery({
    queryKey: ['dispositions-list'],
    queryFn:  () => reportService.getDispositionList(),
    staleTime: 5 * 60_000,
  })
  const dispositionOptions: string[] = (dispositionsData?.data?.data || dispositionsData?.data || [])
    .map((d: Record<string, unknown>) => String(d.title || d.name || d.disposition || ''))
    .filter(Boolean)

  const handleSort = (key: string) => {
    if (sortField === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(key); setSortDir('desc') }
    setPage(1)
  }

  const queryFilters: import('../../services/report.service').CdrFilters = {
    start_date: filters.start_date,
    end_date:   filters.end_date,
    number:     filters.number,
    extension:  filters.extension,
    type:       filters.type,
    ...(filters.campaign_id      ? { campaign:         filters.campaign_id }      : {}),
    ...(filters.disposition_name ? { disposition_name: filters.disposition_name } : {}),
    ...(filters.call_status      ? { status:           filters.call_status }      : {}),
    lower_limit: (page - 1) * PER_PAGE,
    upper_limit:  page * PER_PAGE,
  }

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cdr', filters, page],
    queryFn:  () => reportService.getCdr(queryFilters),
  })

  const rawRows: CdrRow[] = data?.data?.data || []
  const total = data?.data?.record_count || 0

  // Client-side sort within page
  const rows = [...rawRows].sort((a, b) => {
    const av = a[sortField as keyof CdrRow] ?? ''
    const bv = b[sortField as keyof CdrRow] ?? ''
    if (sortField === 'duration') {
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
    }
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  // Stats
  const answeredCalls  = rawRows.filter((r) => r.disposition === 'ANSWERED').length
  const inboundCalls   = rawRows.filter((r) => (r.route || '').toUpperCase() === 'IN').length
  const outboundCalls  = rawRows.filter((r) => (r.route || '').toUpperCase() !== 'IN').length
  const avgDuration = rawRows.length > 0
    ? Math.round(rawRows.reduce((s, r) => s + Number(r.duration), 0) / rawRows.length)
    : 0

  const dispositionMap: Record<string, number> = {}
  rawRows.forEach((r) => {
    const d = r.disposition || 'UNKNOWN'
    dispositionMap[d] = (dispositionMap[d] || 0) + 1
  })
  const chartData = Object.entries(dispositionMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const handlePreset = (preset: { label: string; days: number }) => {
    setActivePreset(preset.label)
    const now  = new Date()
    const from = new Date(now.getTime() - preset.days * 86400000)
    setFilters((f) => ({
      ...f,
      start_date: preset.days === 0 ? now.toISOString().split('T')[0] : from.toISOString().split('T')[0],
      end_date:   now.toISOString().split('T')[0],
    }))
    setPage(1)
  }

  // CSV export (server-side, supports large datasets)
  const handleExportCsv = async () => {
    setShowExportMenu(false)
    try {
      const res = await reportService.exportCsv(filters)
      const url = URL.createObjectURL(res.data as Blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `cdr-report-${filters.start_date}-to-${filters.end_date}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV export started')
    } catch {
      toast.error('Export failed')
    }
  }

  // Excel export — UTF-8 BOM CSV that Excel opens correctly
  const handleExportExcel = () => {
    setShowExportMenu(false)
    try {
      const BOM = '\uFEFF'
      const header = ['Date/Time', 'Phone Number', 'Direction', 'Agent', 'Campaign', 'Duration', 'Disposition', 'Type'].join(',')
      const csvRows = rows.map((r) => [
        `"${formatDateTime(r.created_at)}"`,
        `"${r.phone_number || ''}"`,
        (r.route || 'OUT').toUpperCase(),
        `"${r.agent_name || ''}"`,
        `"${r.campaign_name || r.campaign || ''}"`,
        formatDuration(Number(r.duration || 0)),
        `"${r.disposition || ''}"`,
        `"${r.call_type || ''}"`,
      ].join(','))
      const blob = new Blob([BOM + [header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `cdr-report-${filters.start_date}-to-${filters.end_date}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel export downloaded')
    } catch {
      toast.error('Export failed')
    }
  }

  const columns: Column<CdrRow>[] = [
    {
      key: 'id',
      header: 'Call ID',
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400">
          <Hash size={10} />
          {r.id}
        </span>
      ),
    },
    {
      key: 'route',
      header: 'Direction',
      sortable: true,
      render: (r) => <DirectionBadge route={r.route} />,
    },
    {
      key: 'phone_number',
      header: 'Phone Number',
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {(r.route || '').toUpperCase() === 'IN'
            ? <PhoneIncoming size={13} className="text-blue-400 flex-shrink-0" />
            : <PhoneOutgoing size={13} className="text-emerald-400 flex-shrink-0" />
          }
          <span className="font-mono text-sm font-semibold text-slate-900">
            {formatPhoneNumber(r.phone_number)}
          </span>
        </div>
      ),
    },
    {
      key: 'agent_name',
      header: 'Agent',
      sortable: true,
      render: (r) => <span className="text-sm text-slate-700">{r.agent_name || '—'}</span>,
    },
    {
      key: 'campaign',
      header: 'Campaign',
      render: (r) => {
        const name = r.campaign_name || r.campaign || ''
        return name
          ? <Badge variant="blue">{String(name)}</Badge>
          : <span className="text-slate-300 text-xs">—</span>
      },
    },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      render: (r) => (
        <span className="text-sm font-mono text-slate-700">{formatDuration(Number(r.duration))}</span>
      ),
    },
    {
      key: 'disposition',
      header: 'Disposition',
      sortable: true,
      render: (r) => {
        const d = r.disposition || '-'
        const variant = d === 'ANSWERED' ? 'green' : d === 'NO ANSWER' ? 'yellow' : d === 'BUSY' ? 'red' : 'gray'
        return <Badge variant={variant}>{d}</Badge>
      },
    },
    {
      key: 'created_at',
      header: 'Date / Time',
      sortable: true,
      render: (r) => <span className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(r.created_at)}</span>,
    },
    {
      key: 'recording',
      header: 'Recording',
      render: (r) => r.recording_url ? (
        <button
          onClick={() => setPlayingUrl(r.recording_url as string)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all',
            'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
          )}
          title="Play recording"
        >
          <Play size={11} /> Play
        </button>
      ) : (
        <span className="text-slate-200 text-xs">—</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">CDR Report</h1>
          <p className="page-subtitle">Call detail records — full history with filtering and export</p>
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
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 z-20 overflow-hidden">
                <button
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100"
                >
                  <Download size={13} className="text-slate-400" /> Export CSV
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Download size={13} className="text-emerald-500" /> Export Excel
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
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                activePreset === preset.label
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              )}
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
          sub={rawRows.length > 0 ? `${Math.round((answeredCalls / rawRows.length) * 100)}% answer rate` : '—'}
          color="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          icon={ArrowDownLeft} label="Inbound"
          value={inboundCalls.toLocaleString()} sub="Incoming calls"
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={Clock} label="Avg Duration"
          value={formatDuration(avgDuration)} sub="Per call"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Direction split + Disposition chart */}
      {rawRows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* IN/OUT split */}
          <div className="card">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <PhoneIncoming size={14} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Call Direction</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-blue-700 flex items-center gap-1">
                    <ArrowDownLeft size={11} /> Inbound
                  </span>
                  <span className="font-bold text-slate-900">{inboundCalls}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: rawRows.length > 0 ? `${(inboundCalls / rawRows.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    <ArrowUpRight size={11} /> Outbound
                  </span>
                  <span className="font-bold text-slate-900">{outboundCalls}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: rawRows.length > 0 ? `${(outboundCalls / rawRows.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Disposition chart */}
          <div className="card lg:col-span-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BarChart2 size={14} className="text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Disposition Breakdown</h3>
              <span className="text-xs text-slate-400 ml-auto">Current page ({rawRows.length} calls)</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" name="Calls" radius={[6, 6, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filter Records</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
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
            <label className="label">Direction</label>
            <select className="input" value={filters.type}
              onChange={(e) => { setFilters((f) => ({ ...f, type: e.target.value })); setPage(1) }}>
              <option value="">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Campaign</label>
            <select className="input" value={filters.campaign_id}
              onChange={(e) => { setFilters((f) => ({ ...f, campaign_id: e.target.value ? Number(e.target.value) : '' })); setPage(1) }}>
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
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
            <label className="label">Phone Search</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-8" placeholder="Number…" value={filters.number}
                onChange={(e) => { setFilters((f) => ({ ...f, number: e.target.value })); setPage(1) }}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Disposition</label>
            <select
              className="input"
              value={filters.disposition_name}
              onChange={(e) => { setFilters((f) => ({ ...f, disposition_name: e.target.value })); setPage(1) }}
            >
              <option value="">All Dispositions</option>
              {dispositionOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Call Status</label>
            <select
              className="input"
              value={filters.call_status}
              onChange={(e) => { setFilters((f) => ({ ...f, call_status: e.target.value })); setPage(1) }}
            >
              <option value="">All Statuses</option>
              <option value="ANSWERED">Answered</option>
              <option value="NO ANSWER">No Answer</option>
              <option value="BUSY">Busy</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
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
          emptyText="No call records found for the selected filters"
          pagination={{ page, total, perPage: PER_PAGE, onChange: setPage }}
          sortKey={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* Recording player modal */}
      {playingUrl && (
        <AudioPlayerModal url={playingUrl} onClose={() => setPlayingUrl(null)} />
      )}
    </div>
  )
}
