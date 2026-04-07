import { useState, useEffect, useMemo } from 'react'
import { useTimezone } from '../../hooks/useTimezone'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Download, Play, PhoneCall, Clock, TrendingUp, BarChart2,
  ChevronDown, Filter, Calendar, RefreshCw, ArrowDownLeft, ArrowUpRight,
  X, Volume2, PhoneIncoming, PhoneOutgoing, Hash, SlidersHorizontal,
  RotateCcw, ChevronRight, Users, Layers, PieChart as PieChartIcon,
  BarChart3, Table2,
} from 'lucide-react'
import { useDialerHeader } from '../../layouts/DialerLayout'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { reportService } from '../../services/report.service'
import { extensiongroupService } from '../../services/extensiongroup.service'
import { formatDateTime, formatDuration, formatPhoneNumber } from '../../utils/format'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CdrRow {
  id: number
  extension: string | null
  number: string | null
  start_time: string | null
  end_time: string | null
  duration: number | null
  route: string | null
  call_recording: string | null
  campaign_id: number | null
  lead_id: number | null
  type: string | null
  disposition: string | null
  [key: string]: unknown
}

interface Campaign { id: number; title: string; [key: string]: unknown }
interface ExtItem { id: number; extension: string; first_name?: string; last_name?: string }

const DATE_PRESETS = [
  { label: 'Today',   days: 0  },
  { label: '7 Days',  days: 7  },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

// SummaryCard removed — using compact inline stat pills

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

function PieTooltip({ active, payload }: {
  active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string } }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold">{d.payload.name}</p>
      <p className="text-slate-300">{d.value.toLocaleString()} calls</p>
    </div>
  )
}

function ChartCard({ title, icon: Icon, iconBg, children }: {
  title: string; icon: React.ElementType; iconBg: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon size={14} />
        </div>
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function AudioPlayerModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Volume2 size={16} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Call Recording</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>
        <audio controls autoPlay className="w-full rounded-lg" src={url} onError={() => toast.error('Recording could not be loaded')} />
        <p className="text-xs text-slate-400 mt-3 text-center truncate">{url}</p>
      </div>
    </div>
  )
}

function DirectionBadge({ route }: { route?: string | null }) {
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

// ─── Filter Drawer ───────────────────────────────────────────────────────────

function FilterDrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Reports() {
  const { setToolbar } = useDialerHeader()
  const { today, daysAgo } = useTimezone()
  const initDates = useMemo(() => ({ from: daysAgo(7), to: today() }), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState({
    start_date:       initDates.from,
    end_date:         initDates.to,
    number:           '',
    extension:        '',
    route:            '',
    type:             '',
    campaign_id:      '' as number | '',
    disposition_name: '',
    call_status:      '',
  })
  const [page, setPage]                 = useState(1)
  const [activePreset, setActivePreset] = useState('7 Days')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showFilters, setShowFilters]   = useState(false)
  const [sortField, setSortField]       = useState('start_time')
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc')
  const [playingUrl, setPlayingUrl]     = useState<string | null>(null)
  const [viewTab, setViewTab]           = useState<'graph' | 'table'>('table')
  const [globalSearch, setGlobalSearch] = useState('')

  const PER_PAGE = 25

  // Campaigns dropdown
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn:  () => reportService.getCampaignList(),
    staleTime: 5 * 60_000,
  })
  const campaigns: Campaign[] = campaignsData?.data?.data || campaignsData?.data || []

  // Extensions dropdown
  const { data: extensionsData } = useQuery({
    queryKey: ['extensions-list'],
    queryFn:  () => extensiongroupService.getExtensions(),
    staleTime: 5 * 60_000,
  })
  const extensionsRaw = extensionsData?.data?.data || extensionsData?.data || []
  const extensions: ExtItem[] = (Array.isArray(extensionsRaw) ? extensionsRaw : [])
    .slice()
    .sort((a: ExtItem, b: ExtItem) => {
      const nameA = [a.first_name, a.last_name].filter(Boolean).join(' ').toLowerCase()
      const nameB = [b.first_name, b.last_name].filter(Boolean).join(' ').toLowerCase()
      return nameA.localeCompare(nameB) || String(a.extension).localeCompare(String(b.extension))
    })

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
    ...(filters.number     ? { number:     filters.number }     : {}),
    ...(filters.extension  ? { extension:  filters.extension }  : {}),
    ...(filters.route      ? { route:      filters.route }      : {}),
    ...(filters.type       ? { type:       filters.type }       : {}),
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
  const summary = data?.data?.summary || {} as Record<string, unknown>
  const charts  = data?.data?.charts  || {} as Record<string, unknown>

  const sortedRows = [...rawRows].sort((a, b) => {
    const av = a[sortField as keyof CdrRow] ?? ''
    const bv = b[sortField as keyof CdrRow] ?? ''
    if (sortField === 'duration') return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const rows = globalSearch.trim()
    ? sortedRows.filter((r) => {
        const q = globalSearch.toLowerCase()
        return [
          String(r.number || ''), String(r.extension || ''), String(r.disposition || ''),
          String(r.type || ''), String(r.route || ''), String(r.start_time || ''),
          String(r.call_recording || ''), String(r.duration || ''), String(r.id || ''),
          String(r.campaign_id || ''),
        ].some((v) => v.toLowerCase().includes(q))
      })
    : sortedRows

  // Stats from server-side summary (covers ALL records, not just current page)
  const answeredCalls = Number(summary.answered_calls || 0)
  const totalDuration = Number(summary.total_duration || 0)
  const avgDuration   = total > 0 ? Math.round(totalDuration / total) : 0

  // Route breakdown from server-side charts
  const routeData = (Array.isArray(charts.route) ? charts.route : []) as Array<{ name: string; count: number }>
  const inboundCalls  = routeData.find((r) => String(r.name).toUpperCase() === 'IN')?.count || 0
  const outboundCalls = total - inboundCalls

  // Disposition chart from server
  const chartData = ((Array.isArray(charts.disposition) ? charts.disposition : []) as Array<{ name: string; count: number }>)
    .map((d) => ({ name: String(d.name || 'Not Set'), count: Number(d.count) }))

  // Call Type chart from server
  const typeLabels: Record<string, string> = {
    manual: 'Manual', dialer: 'Dialer', predictive_dial: 'Predictive', c2c: 'C2C', outbound_ai: 'AI',
  }
  const typeChartData = ((Array.isArray(charts.type) ? charts.type : []) as Array<{ name: string; count: number }>)
    .map((t) => ({ name: typeLabels[t.name] ?? t.name ?? 'Other', value: Number(t.count) }))

  // Campaign chart from server (top 10)
  const campaignChartData = ((Array.isArray(charts.campaign) ? charts.campaign : []) as Array<{ name: string; total: number; answered: number }>)
    .map((c) => {
      const n = String(c.name || '—')
      return { name: n.length > 15 ? n.slice(0, 14) + '…' : n, Total: Number(c.total), Answered: Number(c.answered) }
    })

  // Agent chart from server (top 10)
  const agentChartData = ((Array.isArray(charts.agent) ? charts.agent : []) as Array<{ name: string; total: number; answered: number }>)
    .map((a) => {
      const n = String(a.name || '—').trim()
      return { name: n.split(' ')[0] || n, Total: Number(a.total), Answered: Number(a.answered) }
    })

  const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6']

  const handlePreset = (preset: { label: string; days: number }) => {
    setActivePreset(preset.label)
    setFilters((f) => ({
      ...f,
      start_date: preset.days === 0 ? today() : daysAgo(preset.days),
      end_date:   today(),
    }))
    setPage(1)
  }

  const handleExportCsv = async () => {
    setShowExportMenu(false)
    try {
      const exportParams: Record<string, unknown> = {
        start_date: filters.start_date, end_date: filters.end_date,
        ...(filters.number      ? { number: filters.number }                : {}),
        ...(filters.extension   ? { extension: filters.extension }          : {}),
        ...(filters.route       ? { route: filters.route }                  : {}),
        ...(filters.type        ? { type: filters.type }                    : {}),
        ...(filters.campaign_id       ? { campaign_id: filters.campaign_id }      : {}),
        ...(filters.disposition_name  ? { disposition_name: filters.disposition_name } : {}),
        ...(filters.call_status       ? { status: filters.call_status }      : {}),
      }
      const res = await reportService.exportCsv(exportParams)
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url; a.download = `cdr-report-${filters.start_date}-to-${filters.end_date}.csv`
      a.click(); URL.revokeObjectURL(url)
      toast.success('CSV export started')
    } catch { toast.error('Export failed') }
  }

  const handleExportExcel = () => {
    setShowExportMenu(false)
    try {
      const BOM = '\uFEFF'
      const header = ['Start Time','Number','Extension','Direction','Type','Duration','Disposition','Campaign ID','Recording'].join(',')
      const csvRows = rows.map((r) => [
        `"${r.start_time ? formatDateTime(r.start_time) : ''}"`,
        `"${r.number || ''}"`, `"${r.extension || ''}"`,
        (r.route || 'OUT').toUpperCase(), `"${r.type || ''}"`,
        formatDuration(Number(r.duration || 0)), `"${r.disposition || ''}"`,
        r.campaign_id || '', `"${r.call_recording || ''}"`,
      ].join(','))
      const blob = new Blob([BOM + [header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `cdr-report-${filters.start_date}-to-${filters.end_date}.xlsx`
      a.click(); URL.revokeObjectURL(url)
      toast.success('Excel export downloaded')
    } catch { toast.error('Export failed') }
  }

  const activeFilterCount = [
    filters.number, filters.extension, filters.route, filters.type,
    filters.campaign_id, filters.disposition_name, filters.call_status,
  ].filter(Boolean).length

  const handleClearFilters = () => {
    setFilters((f) => ({
      ...f, number: '', extension: '', route: '', type: '',
      campaign_id: '', disposition_name: '', call_status: '',
    }))
    setPage(1)
  }

  const columns: Column<CdrRow>[] = [
    {
      key: 'id', header: 'Call ID',
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400">
          <Hash size={10} />{r.id}
        </span>
      ),
    },
    {
      key: 'route', header: 'Direction', sortable: true,
      render: (r) => <DirectionBadge route={r.route} />,
    },
    {
      key: 'number', header: 'Number', sortable: true,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {(r.route || '').toUpperCase() === 'IN'
            ? <PhoneIncoming size={13} className="text-blue-400 flex-shrink-0" />
            : <PhoneOutgoing size={13} className="text-emerald-400 flex-shrink-0" />
          }
          <span className="font-mono text-sm font-semibold text-slate-900">{formatPhoneNumber(r.number != null ? String(r.number) : null)}</span>
        </div>
      ),
    },
    {
      key: 'extension', header: 'Extension', sortable: true,
      render: (r) => <span className="font-mono text-sm text-slate-700">{r.extension || '—'}</span>,
    },
    {
      key: 'type', header: 'Type',
      render: (r) => {
        const typeMap: Record<string, string> = {
          manual: 'Manual', dialer: 'Dialer', predictive_dial: 'Predictive', c2c: 'C2C', outbound_ai: 'AI',
        }
        return <span className="text-xs text-slate-600">{r.type ? (typeMap[r.type] ?? r.type) : '—'}</span>
      },
    },
    {
      key: 'campaign_id', header: 'Campaign',
      render: (r) => {
        const name = (r as Record<string, unknown>).campaign_name as string | undefined
        return name
          ? <span className="text-sm text-slate-600 truncate block max-w-[140px]" title={name}>{name}</span>
          : r.campaign_id
            ? <Badge variant="blue">#{r.campaign_id}</Badge>
            : <span className="text-slate-300 text-xs">—</span>
      },
    },
    {
      key: 'duration', header: 'Duration', sortable: true,
      render: (r) => <span className="text-sm font-mono text-slate-700">{formatDuration(Number(r.duration || 0))}</span>,
    },
    {
      key: 'disposition', header: 'Disposition', sortable: true,
      render: (r) => {
        const d = r.disposition || '—'
        const upper = d.toUpperCase()
        const variant = upper === 'ANSWERED' ? 'green' : upper === 'NO ANSWER' || upper === 'NO_ANSWER' ? 'yellow' : upper === 'BUSY' ? 'red' : 'gray'
        return d !== '—' ? <Badge variant={variant}>{d}</Badge> : <span className="text-slate-300 text-xs">—</span>
      },
    },
    {
      key: 'start_time', header: 'Date / Time', sortable: true,
      render: (r) => (
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {r.start_time ? formatDateTime(r.start_time) : '—'}
        </span>
      ),
    },
    {
      key: 'call_recording', header: 'Recording',
      render: (r) => r.call_recording ? (
        <button
          onClick={() => setPlayingUrl(r.call_recording as string)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200"
          title="Play recording"
        >
          <Play size={11} /> Play
        </button>
      ) : <span className="text-slate-200 text-xs">—</span>,
    },
  ]

  // ─── Toolbar ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setToolbar(
      <div className="lt-right" style={{ gap: 6 }}>
        {/* Graph / Table toggle */}
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
          <button
            onClick={() => setViewTab('graph')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
              viewTab === 'graph'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <BarChart3 size={12} /> Graph
          </button>
          <button
            onClick={() => setViewTab('table')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
              viewTab === 'table'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Table2 size={12} /> Table
          </button>
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className="lt-b relative">
          <SlidersHorizontal size={13} /> Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button onClick={() => refetch()} disabled={isFetching} className="lt-b" title="Refresh">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <div className="relative">
          <button onClick={() => setShowExportMenu((v) => !v)} className="lt-b">
            <Download size={13} /> Export <ChevronDown size={11} />
          </button>
          {showExportMenu && (
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
  }, [viewTab, activeFilterCount, isFetching, showExportMenu]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drawer input classes
  const drawerInput = 'w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400'
  const drawerSelect = cn(drawerInput, 'appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8')

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ─── Right-side Filter Drawer ─────────────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity duration-300',
          showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setShowFilters(false)}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[360px] max-w-[92vw] z-50 flex flex-col transition-transform duration-300 ease-out',
          'bg-white border-l border-slate-200 shadow-[-8px_0_30px_rgba(0,0,0,0.08)]',
          showFilters ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Drawer header + action buttons */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <SlidersHorizontal size={13} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-[13px]">Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearFilters}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5"
            >
              <RotateCcw size={11} /> Reset
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1.5"
            >
              Apply <ChevronRight size={11} />
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Date range row */}
          <div className="grid grid-cols-2 gap-3">
            <FilterDrawerField label="From">
              <input
                type="date" className={drawerInput} value={filters.start_date}
                onChange={(e) => { setFilters((f) => ({ ...f, start_date: e.target.value })); setActivePreset('Custom'); setPage(1) }}
              />
            </FilterDrawerField>
            <FilterDrawerField label="To">
              <input
                type="date" className={drawerInput} value={filters.end_date}
                onChange={(e) => { setFilters((f) => ({ ...f, end_date: e.target.value })); setActivePreset('Custom'); setPage(1) }}
              />
            </FilterDrawerField>
          </div>

          {/* Quick date presets */}
          <div className="flex gap-1.5 flex-wrap">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-md transition-all',
                  activePreset === preset.label
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="h-px bg-slate-100" />

          <FilterDrawerField label="Direction">
            <select className={drawerSelect} value={filters.route}
              onChange={(e) => { setFilters((f) => ({ ...f, route: e.target.value })); setPage(1) }}>
              <option value="">All Directions</option>
              <option value="IN">Inbound</option>
              <option value="OUT">Outbound</option>
            </select>
          </FilterDrawerField>

          <FilterDrawerField label="Call Type">
            <select className={drawerSelect} value={filters.type}
              onChange={(e) => { setFilters((f) => ({ ...f, type: e.target.value })); setPage(1) }}>
              <option value="">All Types</option>
              <option value="manual">Manual</option>
              <option value="dialer">Dialer</option>
              <option value="predictive_dial">Predictive</option>
              <option value="c2c">C2C</option>
              <option value="outbound_ai">AI</option>
            </select>
          </FilterDrawerField>

          <FilterDrawerField label="Campaign">
            <select className={drawerSelect} value={filters.campaign_id}
              onChange={(e) => { setFilters((f) => ({ ...f, campaign_id: e.target.value ? Number(e.target.value) : '' })); setPage(1) }}>
              <option value="">All Campaigns</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </FilterDrawerField>

          <FilterDrawerField label="Extension / Agent">
            <select className={drawerSelect} value={filters.extension}
              onChange={(e) => { setFilters((f) => ({ ...f, extension: e.target.value })); setPage(1) }}>
              <option value="">All Extensions</option>
              {extensions.map((ext) => {
                const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
                return (
                  <option key={ext.id} value={String(ext.extension)}>
                    {name ? `${name} (${ext.extension})` : `Ext ${ext.extension}`}
                  </option>
                )
              })}
            </select>
          </FilterDrawerField>

          <FilterDrawerField label="Phone Number">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className={cn(drawerInput, 'pl-8')} placeholder="Search number..."
                value={filters.number}
                onChange={(e) => { setFilters((f) => ({ ...f, number: e.target.value })); setPage(1) }}
              />
            </div>
          </FilterDrawerField>

          <FilterDrawerField label="Disposition">
            <select className={drawerSelect} value={filters.disposition_name}
              onChange={(e) => { setFilters((f) => ({ ...f, disposition_name: e.target.value })); setPage(1) }}>
              <option value="">All Dispositions</option>
              {dispositionOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </FilterDrawerField>
        </div>

      </div>

      {/* ─── Page Content ─────────────────────────────────────────────────── */}
      <div className="space-y-5 flex-1">

        {/* Date presets (left) + Compact Stats (right) */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  activePreset === preset.label
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                )}
              >
                {preset.label}
              </button>
            ))}
            {activeFilterCount > 0 && (
              <>
                <span className="text-[10px] text-slate-300 mx-1">|</span>
                <span className="text-[11px] text-slate-400">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}</span>
                <button onClick={handleClearFilters} className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                  Clear
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
              <PhoneCall size={13} className="text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">{total.toLocaleString()}</span>
              <span className="text-[10px] text-indigo-500">Calls</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
              <TrendingUp size={13} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-900">{answeredCalls.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-500">Answered</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
              <PhoneIncoming size={13} className="text-blue-600" />
              <span className="text-xs font-bold text-blue-900">{inboundCalls.toLocaleString()}</span>
              <span className="text-[10px] text-blue-500">Inbound</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
              <Clock size={13} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-900">{formatDuration(avgDuration)}</span>
              <span className="text-[10px] text-amber-500">Avg</span>
            </div>
          </div>
        </div>

        {/* View Content */}
        {viewTab === 'graph' ? (
          total > 0 ? (
            <div className="space-y-4 animate-fadeIn">
              {/* Row 1: Direction bar + Call Type pie + Disposition pie */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChartCard title="Call Direction" icon={PhoneIncoming} iconBg="bg-blue-50 text-blue-600">
                  <div className="space-y-4 mt-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-blue-700 flex items-center gap-1"><ArrowDownLeft size={11} /> Inbound</span>
                        <span className="font-bold text-slate-900">{inboundCalls}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                          style={{ width: `${total > 0 ? (inboundCalls / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-emerald-700 flex items-center gap-1"><ArrowUpRight size={11} /> Outbound</span>
                        <span className="font-bold text-slate-900">{outboundCalls}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${total > 0 ? (outboundCalls / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Answered</span>
                        <span className="font-bold text-emerald-600">{answeredCalls} ({total > 0 ? Math.round((answeredCalls / total) * 100) : 0}%)</span>
                      </div>
                    </div>
                  </div>
                </ChartCard>
                <ChartCard title="Call Type" icon={Layers} iconBg="bg-purple-50 text-purple-600">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        innerRadius={50} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                        {typeChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend iconType="circle" iconSize={8}
                        formatter={(v: string) => <span className="text-[11px] text-slate-600">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Disposition" icon={PieChartIcon} iconBg="bg-indigo-50 text-indigo-600">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={chartData.slice(0, 8)} dataKey="count" nameKey="name" cx="50%" cy="50%"
                        innerRadius={50} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                        {chartData.slice(0, 8).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend iconType="circle" iconSize={8}
                        formatter={(v: string) => <span className="text-[11px] text-slate-600">{v.length > 12 ? v.slice(0, 11) + '…' : v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
              {/* Row 2: Campaign bar + Agent bar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Top Campaigns" icon={BarChart2} iconBg="bg-cyan-50 text-cyan-600">
                  {campaignChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={campaignChartData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="Total" name="Total Calls" radius={[4, 4, 0, 0]} fill="#0ea5e9" />
                        <Bar dataKey="Answered" name="Answered" radius={[4, 4, 0, 0]} fill="#10b981" />
                        <Legend iconType="circle" iconSize={8}
                          formatter={(v: string) => <span className="text-[11px] text-slate-600">{v}</span>} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-xs text-slate-400">No campaign data</div>
                  )}
                </ChartCard>
                <ChartCard title="Top Agents" icon={Users} iconBg="bg-amber-50 text-amber-600">
                  {agentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={agentChartData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="Total" name="Total Calls" radius={[4, 4, 0, 0]} fill="#6366f1" />
                        <Bar dataKey="Answered" name="Answered" radius={[4, 4, 0, 0]} fill="#22c55e" />
                        <Legend iconType="circle" iconSize={8}
                          formatter={(v: string) => <span className="text-[11px] text-slate-600">{v}</span>} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-xs text-slate-400">No agent data</div>
                  )}
                </ChartCard>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <BarChart2 size={24} className="text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No chart data available</h3>
              <p className="text-xs text-slate-400 max-w-xs">Adjust the date range or filters to load call records.</p>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white animate-fadeIn">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 gap-3">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                {isLoading ? 'Loading...' : `${globalSearch ? rows.length.toLocaleString() + ' of ' : ''}${total.toLocaleString()} records`}
              </span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    className="h-7 w-52 pl-8 pr-7 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 placeholder:text-slate-400 transition-all"
                    placeholder="Search in results..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                  />
                  {globalSearch && (
                    <button onClick={() => setGlobalSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
                {isFetching && !isLoading && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <RefreshCw size={11} className="animate-spin" /> Updating...
                  </span>
                )}
              </div>
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
        )}
      </div>

      {/* Recording player modal */}
      {playingUrl && <AudioPlayerModal url={playingUrl} onClose={() => setPlayingUrl(null)} />}
    </div>
  )
}
