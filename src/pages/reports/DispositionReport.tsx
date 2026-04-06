import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, Calendar, Download, RefreshCw, Filter, ChevronDown,
  PieChart as PieChartIcon, AlignLeft, TrendingUp,
} from 'lucide-react'
import { useDialerHeader } from '../../layouts/DialerLayout'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import api from '../../api/axios'
import { campaignService } from '../../services/campaign.service'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DispositionRow {
  id?: number
  disposition?: string
  name?: string
  title?: string
  label?: string
  total?: number
  count?: number
  percentage?: number
  color?: string
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

type ChartType = 'bar' | 'pie'

import { useTimezone } from '../../hooks/useTimezone'

const PALETTE = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6',
]

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; payload?: DispositionRow }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-xl">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-300">
          {p.name}: <span className="text-white font-bold">{p.value?.toLocaleString()}</span>
          {p.payload?.percentage !== undefined && (
            <span className="text-slate-400 ml-1.5">({p.payload.percentage}%)</span>
          )}
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: {
  active?: boolean; payload?: Array<{ value: number; name: string; payload: DispositionRow }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-xl">
      <p className="font-semibold mb-1">{item.name}</p>
      <p className="text-slate-300">Count: <span className="text-white font-bold">{item.value?.toLocaleString()}</span></p>
      {item.payload?.percentage !== undefined && (
        <p className="text-slate-300">Share: <span className="text-white font-bold">{item.payload.percentage}%</span></p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DispositionReport() {
  const { setToolbar } = useDialerHeader()
  const { today, daysAgo } = useTimezone()
  const initDates = useMemo(() => ({ from: daysAgo(7), to: today() }), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState<Filters>({
    date_from:   initDates.from,
    date_to:     initDates.to,
    campaign_id: '',
  })
  const [activePreset, setActivePreset] = useState<string>('7 Days')
  const [chartType, setChartType]       = useState<ChartType>('bar')
  const [showExport, setShowExport]     = useState(false)

  // Campaigns list
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn:  () => campaignService.getAll(),
    staleTime: 5 * 60_000,
  })
  const campaigns: Campaign[] = campaignsData?.data?.data || campaignsData?.data || []

  const queryParams = {
    date_from:   filters.date_from,
    date_to:     filters.date_to,
    ...(filters.campaign_id ? { campaign_id: Number(filters.campaign_id) } : {}),
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['disposition-report', queryParams],
    queryFn:  () => api.post('/reports/disposition', queryParams),
  })

  const rawRows: DispositionRow[] = data?.data?.data?.data || data?.data?.data || data?.data || []
  const rows = Array.isArray(rawRows) ? rawRows : []

  // Normalise each row: label, count, percentage, color
  const totalCalls = rows.reduce((s, r) => s + Number(r.total || r.count || 0), 0)

  const enriched: (DispositionRow & { _label: string; _count: number; _pct: number; _color: string })[] =
    rows.map((r, i) => {
      const label  = r.disposition || r.name || r.title || r.label || `Disposition ${i + 1}`
      const count  = Number(r.total || r.count || 0)
      const pct    = totalCalls > 0 ? parseFloat(((count / totalCalls) * 100).toFixed(1)) : 0
      const color  = r.color || PALETTE[i % PALETTE.length]
      return { ...r, _label: label, _count: count, _pct: pct, _color: color }
    }).sort((a, b) => b._count - a._count)

  const applyPreset = useCallback((label: string, days: number) => {
    setActivePreset(label)
    setFilters((f) => ({
      ...f,
      date_from: days === 0 ? today() : daysAgo(days),
      date_to:   today(),
    }))
  }, [])

  const buildCsvRows = () => [
    ['Disposition', 'Count', 'Percentage'].join(','),
    ...enriched.map((r) => [`"${r._label}"`, r._count, `${r._pct}%`].join(',')),
    ['', '', ''].join(','),
    [`"Total"`, totalCalls, '100%'].join(','),
  ].join('\n')

  const handleExport = () => {
    setShowExport(false)
    try {
      const blob = new Blob([buildCsvRows()], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `disposition-report-${filters.date_from}-to-${filters.date_to}.csv`
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
      a.download = `disposition-report-${filters.date_from}-to-${filters.date_to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel exported')
    } catch { toast.error('Export failed') }
  }

  const columns: Column<typeof enriched[0]>[] = [
    {
      key: '_label',
      header: 'Disposition',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r._color }} />
          <span className="text-sm font-semibold text-slate-900">{r._label}</span>
        </div>
      ),
    },
    {
      key: '_count',
      header: 'Call Count',
      render: (r) => (
        <span className="text-sm font-bold text-slate-900">{r._count.toLocaleString()}</span>
      ),
    },
    {
      key: '_pct',
      header: 'Percentage',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${r._pct}%`, backgroundColor: r._color }}
            />
          </div>
          <Badge
            variant={
              r._pct >= 50 ? 'blue' :
              r._pct >= 20 ? 'purple' :
              r._pct >= 10 ? 'yellow' : 'gray'
            }
          >
            {r._pct}%
          </Badge>
        </div>
      ),
    },
    {
      key: 'share_bar',
      header: 'Visual Share',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-32 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${r._pct}%`, backgroundColor: r._color }}
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">{r._count.toLocaleString()}</span>
        </div>
      ),
    },
  ]

  const skeletonRows = isLoading ? Array.from({ length: 5 }).map((_, i) => ({
    id: i, _label: '', _count: 0, _pct: 0, _color: '', disposition: '',
  })) : []

  useEffect(() => {
    setToolbar(
      <div className="lt-right">
        <button onClick={() => refetch()} disabled={isFetching} className="lt-b" title="Refresh">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <div className="relative">
          <button onClick={() => setShowExport((v) => !v)} disabled={enriched.length === 0} className="lt-b">
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
      {/* Presets */}
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
              type="date" className="input" value={filters.date_from}
              max={filters.date_to}
              onChange={(e) => {
                setFilters((f) => ({ ...f, date_from: e.target.value }))
                setActivePreset('Custom')
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
              }}
            />
          </div>
          <div className="form-group">
            <label className="label">Campaign</label>
            <select
              className="input"
              value={filters.campaign_id}
              onChange={(e) =>
                setFilters((f) => ({ ...f, campaign_id: e.target.value ? Number(e.target.value) : '' }))
              }
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-20" />
          ))
        ) : (
          enriched.slice(0, 4).map((r) => (
            <div key={r._label} className="card">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r._color }} />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{r._label}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{r._count.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">{r._pct}% of total</p>
            </div>
          ))
        )}
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart3 size={14} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Disposition Distribution</h3>
            {!isLoading && (
              <span className="text-xs text-slate-400">
                {totalCalls.toLocaleString()} total calls
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('bar')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                chartType === 'bar' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-700'
              )}
              title="Bar chart"
            >
              <BarChart3 size={15} />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                chartType === 'pie' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-700'
              )}
              title="Pie chart"
            >
              <PieChartIcon size={15} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="h-56 bg-slate-100 rounded-xl animate-pulse" />
        ) : enriched.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
            No disposition data for the selected filters
          </div>
        ) : chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={enriched.map((r) => ({ name: r._label, count: r._count, percentage: r._pct }))} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={enriched.length > 6 ? -30 : 0}
                textAnchor={enriched.length > 6 ? 'end' : 'middle'}
                height={enriched.length > 6 ? 50 : 30}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" name="Calls" radius={[6, 6, 0, 0]}>
                {enriched.map((r, i) => (
                  <Cell key={i} fill={r._color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={enriched.map((r) => ({ name: r._label, value: r._count, percentage: r._pct }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {enriched.map((r, i) => (
                    <Cell key={i} fill={r._color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 11, color: '#64748b' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <AlignLeft size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">
              {isLoading ? 'Loading…' : `${enriched.length} disposition${enriched.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Refreshing…
            </span>
          )}
          {!isLoading && totalCalls > 0 && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <TrendingUp size={12} className="text-indigo-500" />
              {totalCalls.toLocaleString()} total calls
            </span>
          )}
        </div>
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={isLoading ? skeletonRows as unknown as Record<string, unknown>[] : enriched as unknown as Record<string, unknown>[]}
          loading={isLoading}
          keyField="_label"
          emptyText="No disposition data found for the selected filters"
        />
        {!isLoading && enriched.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/80">
            <span className="text-xs font-semibold text-slate-600">Total</span>
            <div className="flex items-center gap-8">
              <span className="text-sm font-bold text-slate-900">{totalCalls.toLocaleString()} calls</span>
              <span className="text-sm font-bold text-slate-900">100%</span>
              <div className="w-28" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
