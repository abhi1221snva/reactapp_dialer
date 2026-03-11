import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Calendar, Download, RefreshCw, Phone, Clock, PhoneCall,
  ChevronDown, Filter, Search, TrendingUp, UserCheck, BarChart2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import api from '../../api/axios'
import { campaignService } from '../../services/campaign.service'
import { formatDuration, formatDate } from '../../utils/format'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentRow {
  id?: number
  agent_id?: number
  agent_name?: string
  name?: string
  extension?: string
  total_calls?: number
  calls?: number
  answered?: number
  missed?: number
  talk_time?: number
  total_duration?: number
  avg_duration?: number
  campaigns?: string | string[]
  campaign_count?: number
  answer_rate?: number
  [key: string]: unknown
}

interface Campaign { id: number; title: string; [key: string]: unknown }

interface Filters {
  date_from:   string
  date_to:     string
  campaign_id: number | ''
}

const DATE_PRESETS = [
  { label: 'Today',    days: 0 },
  { label: '7 Days',  days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
] as const

function today()       { return new Date().toISOString().slice(0, 10) }
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

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

export function AgentSummary() {
  const [filters, setFilters] = useState<Filters>({
    date_from:   daysAgo(7),
    date_to:     today(),
    campaign_id: '',
  })
  const [activePreset, setActivePreset] = useState<string>('7 Days')
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [sortField, setSortField] = useState<string>('total_calls')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')

  const PER_PAGE = 25

  // Campaigns dropdown
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn:  () => campaignService.getAll(),
    staleTime: 5 * 60_000,
  })
  const campaigns: Campaign[] = campaignsData?.data?.data || campaignsData?.data || []

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['agent-report', filters],
    queryFn:  () => api.post('/agent-report', {
      date_from:   filters.date_from,
      date_to:     filters.date_to,
      ...(filters.campaign_id ? { campaign_id: Number(filters.campaign_id) } : {}),
    }),
  })

  const rawRows: AgentRow[] = data?.data?.data?.data || data?.data?.data || data?.data || []
  const rows = Array.isArray(rawRows) ? rawRows : []

  // Search filter
  const searched = search.trim()
    ? rows.filter((r) => {
        const s = search.toLowerCase()
        const name = (r.agent_name || r.name || '').toLowerCase()
        const ext  = (r.extension || '').toLowerCase()
        return name.includes(s) || ext.includes(s)
      })
    : rows

  // Sort
  const sorted = [...searched].sort((a, b) => {
    const av = Number(a[sortField] ?? 0)
    const bv = Number(b[sortField] ?? 0)
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const total     = sorted.length
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Aggregated stats
  const totalAgents   = rows.length
  const totalCalls    = rows.reduce((s, r) => s + Number(r.total_calls || r.calls || 0), 0)
  const totalAnswered = rows.reduce((s, r) => s + Number(r.answered || 0), 0)
  const totalTalkTime = rows.reduce((s, r) => s + Number(r.talk_time || r.total_duration || 0), 0)
  const avgCallsPerAgent = totalAgents > 0 ? (totalCalls / totalAgents).toFixed(1) : '0'
  const avgDuration   = totalAnswered > 0 ? Math.round(totalTalkTime / totalAnswered) : 0

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }

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
    ['Rank', 'Agent', 'Extension', 'Total Calls', 'Answered', 'Missed', 'Talk Time', 'Avg Duration', 'Answer Rate', 'Campaigns'].join(','),
    ...sorted.map((r, idx) => {
      const tc   = Number(r.total_calls || r.calls || 0)
      const an   = Number(r.answered || 0)
      const rate = tc > 0 ? Math.round((an / tc) * 100) : 0
      const cams = Array.isArray(r.campaigns) ? r.campaigns.join('; ') : (r.campaigns || '')
      return [
        idx + 1,
        `"${r.agent_name || r.name || ''}"`,
        r.extension || '',
        tc,
        an,
        r.missed || 0,
        formatDuration(Number(r.talk_time || r.total_duration || 0)),
        formatDuration(Number(r.avg_duration || 0)),
        `${rate}%`,
        `"${cams}"`,
      ].join(',')
    }),
  ].join('\n')

  const handleExport = () => {
    setShowExport(false)
    try {
      const blob = new Blob([buildCsvRows()], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `agent-summary-${filters.date_from}-to-${filters.date_to}.csv`
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
      a.download = `agent-summary-${filters.date_from}-to-${filters.date_to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel exported')
    } catch { toast.error('Export failed') }
  }

  const columns: Column<AgentRow>[] = [
    {
      key: 'agent_name',
      header: 'Agent',
      render: (r) => {
        const name = r.agent_name || r.name || 'Unknown'
        const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{name}</p>
              <p className="text-xs text-slate-400">{r.extension ? `Ext. ${r.extension}` : '—'}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'extension',
      header: 'Extension',
      render: (r) => (
        <span className="font-mono text-sm text-slate-600">{r.extension || '—'}</span>
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
      key: 'answer_rate',
      header: 'Answer Rate',
      sortable: true,
      render: (r) => {
        const tc   = Number(r.total_calls || r.calls || 0)
        const an   = Number(r.answered || 0)
        const rate = tc > 0 ? Math.round((an / tc) * 100) : 0
        return (
          <div className="flex items-center gap-2">
            <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500')}
                style={{ width: `${rate}%` }}
              />
            </div>
            <Badge variant={rate >= 70 ? 'green' : rate >= 40 ? 'yellow' : 'red'}>
              {rate}%
            </Badge>
          </div>
        )
      },
    },
    {
      key: 'talk_time',
      header: 'Talk Time',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-sm text-slate-700">
          {formatDuration(Number(r.talk_time || r.total_duration || 0))}
        </span>
      ),
    },
    {
      key: 'avg_duration',
      header: 'Avg Duration',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-sm text-slate-600">
          {formatDuration(Number(r.avg_duration || 0))}
        </span>
      ),
    },
    {
      key: 'campaigns',
      header: 'Campaigns',
      render: (r) => {
        const cList = Array.isArray(r.campaigns)
          ? r.campaigns
          : r.campaigns ? String(r.campaigns).split(',').map((s) => s.trim()) : []
        const count = r.campaign_count ?? cList.length
        if (count === 0) return <span className="text-slate-300 text-sm">—</span>
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {cList.slice(0, 2).map((c, i) => (
              <Badge key={i} variant="blue">{c}</Badge>
            ))}
            {count > 2 && (
              <Badge variant="gray">+{count - 2}</Badge>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Agent Summary</h1>
          <p className="page-subtitle">Agent performance metrics and call activity breakdown</p>
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
            <button
              onClick={() => setShowExport((v) => !v)}
              disabled={rows.length === 0}
              className="btn-outline gap-2"
            >
              <Download size={15} /> Export <ChevronDown size={13} />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 z-20 overflow-hidden">
                <button
                  onClick={handleExport}
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
          icon={Users}      label="Total Agents"
          value={totalAgents.toLocaleString()} sub="Active in period"
          color="bg-purple-50 text-purple-600"  loading={isLoading}
        />
        <SummaryCard
          icon={Phone}      label="Total Calls"
          value={totalCalls.toLocaleString()} sub={`Avg ${avgCallsPerAgent} / agent`}
          color="bg-indigo-50 text-indigo-600"  loading={isLoading}
        />
        <SummaryCard
          icon={PhoneCall}  label="Answered"
          value={totalAnswered.toLocaleString()} sub="Connected calls"
          color="bg-emerald-50 text-emerald-600" loading={isLoading}
        />
        <SummaryCard
          icon={Clock}      label="Total Talk Time"
          value={formatDuration(totalTalkTime)} sub={`Avg ${formatDuration(avgDuration)} / call`}
          color="bg-blue-50 text-blue-600"       loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filter Agents</span>
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
            <label className="label">Search Agent</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-8" placeholder="Name or extension…"
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
            <BarChart2 size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">
              {isLoading ? 'Loading…' : `${total.toLocaleString()} agent${total !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isFetching && !isLoading && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <RefreshCw size={11} className="animate-spin" /> Updating…
              </span>
            )}
            {!isLoading && rows.length > 0 && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-500" />
                {formatDate(filters.date_from)} — {formatDate(filters.date_to)}
              </span>
            )}
          </div>
        </div>
        <DataTable
          columns={columns}
          data={paginated as unknown as Record<string, unknown>[]}
          loading={isLoading}
          keyField="id"
          emptyText="No agent data found for the selected period"
          pagination={total > PER_PAGE ? { page, total, perPage: PER_PAGE, onChange: setPage } : undefined}
          sortKey={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* Agent Performance Chart */}
      {!isLoading && sorted.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 pb-4 mb-2 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart2 size={14} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Agent Performance Comparison</h3>
            <span className="text-xs text-slate-400 ml-auto">
              Top {Math.min(sorted.length, 10)} agents by call volume
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={sorted.slice(0, 10).map((r) => ({
                name:          (r.agent_name || r.name || 'Unknown').split(' ')[0],
                'Total Calls': Number(r.total_calls || r.calls || 0),
                'Answered':    Number(r.answered || 0),
              }))}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
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
              <Bar dataKey="Total Calls" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {sorted.slice(0, 10).map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#4f46e5' : i === 1 ? '#818cf8' : i === 2 ? '#a5b4fc' : '#c7d2fe'} />
                ))}
              </Bar>
              <Bar dataKey="Answered" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top performers */}
      {!isLoading && sorted.length >= 3 && (
        <div className="card">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <UserCheck size={14} className="text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Top Performers</h3>
            <span className="text-xs text-slate-400 ml-auto">By total calls</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sorted.slice(0, 3).map((r, idx) => {
              const name    = r.agent_name || r.name || 'Unknown'
              const tc      = Number(r.total_calls || r.calls || 0)
              const an      = Number(r.answered || 0)
              const rate    = tc > 0 ? Math.round((an / tc) * 100) : 0
              const medals  = ['🥇', '🥈', '🥉']
              const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
              return (
                <div key={r.id ?? idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-2xl leading-none">{medals[idx]}</span>
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                    <p className="text-xs text-slate-500">{tc} calls · {rate}% answer rate</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
