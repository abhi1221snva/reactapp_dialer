import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import {
  Target, Download, RefreshCw, Calendar, Filter, ChevronDown,
  PhoneCall, Clock, TrendingUp, BarChart3, Users,
} from 'lucide-react'
import api from '../../api/axios'
import { campaignService } from '../../services/campaign.service'
import { formatDuration } from '../../utils/format'
import { cn } from '../../utils/cn'
import { ReportViewTabs } from '../../components/ui/ReportViewTabs'
import toast from 'react-hot-toast'
import { useDialerHeader } from '../../layouts/DialerLayout'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignRow extends Record<string, unknown> {
  campaign_id: number
  campaign_name: string
  total_calls: number
  answered: number
  no_answer: number
  busy: number
  failed: number
  total_duration: number
  avg_duration: number
  answer_rate: number
  unique_leads: number
}

interface Summary {
  total_campaigns: number
  total_calls: number
  total_answered: number
  overall_answer_rate: number
  total_duration_hours: number
}

interface Campaign { id: number; title: string; [key: string]: unknown }

interface Filters {
  from_date: string
  to_date: string
  campaign_id: string
}

const DATE_PRESETS = [
  { label: 'Today',   days: 0  },
  { label: '7 Days',  days: 7  },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
] as const

import { useTimezone } from '../../hooks/useTimezone'

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-xl">
      <p className="font-semibold mb-1.5 max-w-[180px] truncate">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-300">
          {p.name}: <span className="text-white font-bold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const CampaignPerformance: React.FC = () => {
  const { setToolbar } = useDialerHeader()
  const { today, daysAgo } = useTimezone()
  const initDates = useMemo(() => ({ from: daysAgo(7), to: today() }), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState<Filters>({
    from_date:   initDates.from,
    to_date:     initDates.to,
    campaign_id: '',
  })
  const [activePreset, setActivePreset] = useState('7 Days')
  const [showExport, setShowExport]     = useState(false)
  const [sortField, setSortField]       = useState<string>('total_calls')
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc')
  const [page, setPage]                 = useState(1)

  const PER_PAGE = 25

  // Campaigns dropdown
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn:  () => campaignService.getAll(),
    staleTime: 5 * 60_000,
  })
  const campaigns: Campaign[] = campaignsData?.data?.data || campaignsData?.data || []

  const queryParams = {
    from_date: filters.from_date,
    to_date:   filters.to_date,
    ...(filters.campaign_id ? { campaign_id: filters.campaign_id } : {}),
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['campaign-performance', queryParams],
    queryFn:  () => api.post('/reports/campaign-performance', queryParams),
  })

  const rows: CampaignRow[]      = data?.data?.data    ?? []
  const summary: Summary | null  = data?.data?.summary ?? null

  // Sort
  const sorted = [...rows].sort((a, b) => {
    const av = Number(a[sortField as keyof CampaignRow] ?? 0)
    const bv = Number(b[sortField as keyof CampaignRow] ?? 0)
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const total     = sorted.length
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleSort = (key: string) => {
    if (sortField === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(key); setSortDir('desc') }
    setPage(1)
  }

  const applyPreset = useCallback((label: string, days: number) => {
    setActivePreset(label)
    setFilters((f) => ({
      ...f,
      from_date: days === 0 ? today() : daysAgo(days),
      to_date:   today(),
    }))
    setPage(1)
  }, [])

  // Computed summary (fallback if API doesn't return summary object)
  const totalCampaigns = summary?.total_campaigns     ?? rows.length
  const totalCalls     = summary?.total_calls         ?? rows.reduce((s, r) => s + Number(r.total_calls), 0)
  const totalAnswered  = summary?.total_answered      ?? rows.reduce((s, r) => s + Number(r.answered), 0)
  const overallRate    = summary?.overall_answer_rate ?? (totalCalls > 0 ? Math.round((totalAnswered / totalCalls) * 100) : 0)
  const totalHours     = summary?.total_duration_hours
    ?? Math.round(rows.reduce((s, r) => s + Number(r.total_duration), 0) / 3600)

  // Top-10 chart data
  const chartData = sorted.slice(0, 10).map((r) => ({
    name:          r.campaign_name.length > 18 ? r.campaign_name.slice(0, 15) + '…' : r.campaign_name,
    'Total Calls': Number(r.total_calls),
    'Answered':    Number(r.answered),
  }))

  // ─── Export ────────────────────────────────────────────────────────────────

  const buildCsvRows = () => {
    const header = ['Campaign','Total Calls','Answered','No Answer','Busy','Failed','Answer Rate','Avg Duration','Unique Leads'].join(',')
    const body = sorted.map((r) => [
      `"${r.campaign_name}"`,
      r.total_calls,
      r.answered,
      r.no_answer,
      r.busy,
      r.failed,
      `${r.answer_rate}%`,
      formatDuration(Number(r.avg_duration)),
      r.unique_leads,
    ].join(','))
    return [header, ...body].join('\n')
  }

  const handleExportCsv = () => {
    setShowExport(false)
    try {
      const blob = new Blob([buildCsvRows()], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `campaign-performance-${filters.from_date}-to-${filters.to_date}.csv`
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
      a.download = `campaign-performance-${filters.from_date}-to-${filters.to_date}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel exported')
    } catch { toast.error('Export failed') }
  }

  // ─── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<CampaignRow>[] = [
    {
      key:    'campaign_name',
      header: 'Campaign',
      render: (r) => (
        <span className="text-sm font-semibold text-slate-900">{r.campaign_name}</span>
      ),
    },
    {
      key:      'total_calls',
      header:   'Total',
      sortable: true,
      render: (r) => (
        <span className="text-sm font-bold text-slate-900">{Number(r.total_calls).toLocaleString()}</span>
      ),
    },
    {
      key:      'answered',
      header:   'Answered',
      sortable: true,
      render: (r) => (
        <span className="text-sm font-semibold text-emerald-700">{Number(r.answered).toLocaleString()}</span>
      ),
    },
    {
      key:      'no_answer',
      header:   'No Answer',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-amber-600">{Number(r.no_answer).toLocaleString()}</span>
      ),
    },
    {
      key:    'busy',
      header: 'Busy',
      render: (r) => (
        <span className="text-sm text-orange-600">{Number(r.busy).toLocaleString()}</span>
      ),
    },
    {
      key:    'failed',
      header: 'Failed',
      render: (r) => (
        <span className="text-sm text-red-600">{Number(r.failed).toLocaleString()}</span>
      ),
    },
    {
      key:      'answer_rate',
      header:   'Answer Rate',
      sortable: true,
      render: (r) => {
        const rate = Number(r.answer_rate)
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  rate >= 50 ? 'bg-emerald-500' : rate >= 30 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>
            <Badge variant={rate >= 50 ? 'green' : rate >= 30 ? 'yellow' : 'red'}>
              {rate}%
            </Badge>
          </div>
        )
      },
    },
    {
      key:      'avg_duration',
      header:   'Avg Duration',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-sm text-slate-700">{formatDuration(Number(r.avg_duration))}</span>
      ),
    },
    {
      key:      'unique_leads',
      header:   'Unique Leads',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-slate-700">{Number(r.unique_leads).toLocaleString()}</span>
      ),
    },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

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
              <button onClick={handleExportCsv} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100">
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={Target}     label="Campaigns"
          value={totalCampaigns} sub="In period"
          color="bg-purple-50 text-purple-600" loading={isLoading}
        />
        <SummaryCard
          icon={PhoneCall}  label="Total Calls"
          value={totalCalls.toLocaleString()} sub="All campaigns"
          color="bg-indigo-50 text-indigo-600" loading={isLoading}
        />
        <SummaryCard
          icon={Users}      label="Answered"
          value={totalAnswered.toLocaleString()} sub="Connected calls"
          color="bg-emerald-50 text-emerald-600" loading={isLoading}
        />
        <SummaryCard
          icon={TrendingUp} label="Answer Rate"
          value={`${overallRate}%`} sub="Overall efficiency"
          color={overallRate >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}
          loading={isLoading}
        />
        <SummaryCard
          icon={Clock}      label="Talk Time"
          value={`${totalHours}h`} sub="Total across all campaigns"
          color="bg-blue-50 text-blue-600" loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="form-group">
            <label className="label">From Date</label>
            <input
              type="date" className="input" value={filters.from_date}
              max={filters.to_date}
              onChange={(e) => {
                setFilters((f) => ({ ...f, from_date: e.target.value }))
                setActivePreset('Custom')
                setPage(1)
              }}
            />
          </div>
          <div className="form-group">
            <label className="label">To Date</label>
            <input
              type="date" className="input" value={filters.to_date}
              min={filters.from_date} max={today()}
              onChange={(e) => {
                setFilters((f) => ({ ...f, to_date: e.target.value }))
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
                setFilters((f) => ({ ...f, campaign_id: e.target.value }))
                setPage(1)
              }}
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabbed Graph / Table views */}
      <ReportViewTabs
        graphContent={
          <div className="card">
            <div className="flex items-center gap-2 pb-4 mb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BarChart3 size={14} className="text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Top Campaigns — Call Volume</h3>
              {!isLoading && chartData.length > 0 && (
                <span className="text-xs text-slate-400 ml-auto">
                  Top {Math.min(chartData.length, 10)} campaigns
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <BarChart3 size={40} className="mb-3 text-slate-300" />
                <p className="text-sm font-medium">No campaign data for the selected period</p>
                <p className="text-xs mt-1">Adjust your date range or filters above</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="Total Calls" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Answered"    fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        }
        tableContent={
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <span className="text-xs text-slate-500 font-medium">
                {isLoading ? 'Loading…' : `${total} campaign${total !== 1 ? 's' : ''}`}
              </span>
              {isFetching && !isLoading && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <RefreshCw size={11} className="animate-spin" /> Refreshing…
                </span>
              )}
              {!isLoading && overallRate > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <TrendingUp size={12} className="text-emerald-500" />
                  {overallRate}% overall answer rate
                </div>
              )}
            </div>
            <DataTable
              columns={columns}
              data={paginated}
              loading={isLoading}
              keyField="campaign_id"
              emptyText="No campaign data found for the selected period"
              pagination={total > PER_PAGE ? { page, total, perPage: PER_PAGE, onChange: setPage } : undefined}
              sortKey={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
          </div>
        }
      />
    </div>
  )
}

export default CampaignPerformance
