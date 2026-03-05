import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Phone, PhoneIncoming, PhoneOutgoing, Play, Square, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { reportService } from '../../services/report.service'
import { formatDateTime, formatDuration } from '../../utils/format'
import { CdrFilters, FilterState, getDateRange } from './CdrFilters'
import { CdrSummaryCards, CdrSummary } from './CdrSummaryCards'

export interface CdrRow {
  id: number
  extension: string | null
  cli: string | null
  number: string | null
  area_code: string | null
  city: string | null
  state: string | null
  start_time: string | null
  end_time: string | null
  duration: number | null
  route: string | null
  call_recording: string | null
  campaign_id: number | null
  campaign_name: string | null
  lead_id: number | null
  type: string | null
  disposition_id: number | null
  dispostion_name: string | null
  billable_minutes: number | null
  billable_charge: string | null
  amd_status: string | null
  [key: string]: unknown
}

const PER_PAGE = 25

function RouteBadge({ route }: { route: string | null }) {
  if (!route) return <span className="text-slate-400 text-xs">—</span>
  if (route === 'IN') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
      <PhoneIncoming size={10} /> IN
    </span>
  )
  if (route === 'OUT') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      <PhoneOutgoing size={10} /> OUT
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
      <Phone size={10} /> {route}
    </span>
  )
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-slate-400 text-xs">—</span>
  const map: Record<string, string> = {
    manual: 'Manual',
    dialer: 'Dialer',
    predictive_dial: 'Predictive',
    c2c: 'C2C',
    outbound_ai: 'AI',
  }
  return <Badge variant="gray">{map[type] ?? type}</Badge>
}

function AmdBadge({ status }: { status: string | null }) {
  if (status === null || status === undefined) return <span className="text-slate-400 text-xs">—</span>
  return status === '1'
    ? <Badge variant="yellow">AMD</Badge>
    : <Badge variant="gray">Human</Badge>
}

function RecordingCell({ row, playingId, onPlay, onStop }: {
  row: CdrRow
  playingId: number | null
  onPlay: (id: number) => void
  onStop: () => void
}) {
  if (!row.call_recording) {
    return <span className="text-slate-300 text-xs">—</span>
  }

  if (playingId === row.id) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={onStop}
          className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0 hover:bg-red-600"
          title="Stop"
        >
          <Square size={8} fill="white" />
        </button>
        <audio
          src={row.call_recording}
          autoPlay
          controls
          className="h-7 w-40 text-xs"
          onEnded={onStop}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => onPlay(row.id)}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium transition-colors"
      title="Play recording"
    >
      <Play size={11} fill="currentColor" /> Play
    </button>
  )
}

function buildApiParams(filters: FilterState, page: number) {
  const lower = (page - 1) * PER_PAGE
  const params: Record<string, unknown> = {
    lower_limit: lower,
    upper_limit: PER_PAGE,
  }
  if (filters.start_date) params.start_date = filters.start_date
  if (filters.end_date) params.end_date = filters.end_date
  if (filters.extension) params.extension = filters.extension
  if (filters.campaign) params.campaign = Number(filters.campaign)
  if (filters.disposition) params.disposition = [Number(filters.disposition)]
  if (filters.route) params.route = filters.route
  if (filters.type) params.type = filters.type
  if (filters.number) params.number = filters.number
  if (filters.cli_filter) params.cli_filter = filters.cli_filter
  return params
}

function getDefaultFilters(): FilterState {
  const { start, end } = getDateRange('today')
  return {
    date_preset: 'today',
    start_date: start,
    end_date: end,
    extension: '',
    campaign: '',
    disposition: '',
    route: '',
    type: '',
    number: '',
    cli_filter: '',
  }
}

export function CdrReport() {
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(getDefaultFilters)
  const [page, setPage] = useState(1)
  const [playingId, setPlayingId] = useState<number | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cdr-report', appliedFilters, page],
    queryFn: () => reportService.getCdr(buildApiParams(appliedFilters, page) as any),
    keepPreviousData: true,
  } as any)

  const responseData = (data as any)?.data ?? {}
  const rows: CdrRow[] = responseData?.data ?? []
  const total: number = Number(responseData?.record_count ?? 0)
  const summary: CdrSummary | null = responseData?.summary ?? null

  const handleApply = () => {
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  const handleReset = () => {
    const defaults = getDefaultFilters()
    setFilters(defaults)
    setAppliedFilters(defaults)
    setPage(1)
  }

  const handleExportCsv = () => {
    if (!rows.length) { toast.error('No data to export'); return }
    const headers = [
      'Extension', 'Route', 'Type', 'Number', 'CLI', 'Duration (s)',
      'Billable Minutes', 'Charge', 'Campaign', 'Disposition',
      'Start Time', 'End Time', 'Area Code', 'AMD Status', 'Recording',
    ]
    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csvRows = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.extension, r.route, r.type, r.number, r.cli,
          r.duration, r.billable_minutes, r.billable_charge,
          r.campaign_name, r.dispostion_name,
          r.start_time, r.end_time, r.area_code,
          r.amd_status === '1' ? 'AMD' : r.amd_status === '0' ? 'Human' : '',
          r.call_recording ?? '',
        ].map(escape).join(',')
      ),
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cdr-report-${appliedFilters.start_date}-to-${appliedFilters.end_date}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const handleExportExcel = () => {
    if (!rows.length) { toast.error('No data to export'); return }
    const headers = [
      'Extension', 'Route', 'Type', 'Number', 'CLI', 'Duration (s)',
      'Billable Minutes', 'Charge', 'Campaign', 'Disposition',
      'Start Time', 'End Time', 'Area Code', 'AMD Status',
    ]
    const tableRows = rows.map((r) => [
      r.extension ?? '', r.route ?? '', r.type ?? '', r.number ?? '', r.cli ?? '',
      r.duration ?? '', r.billable_minutes ?? '', r.billable_charge ?? '',
      r.campaign_name ?? '', r.dispostion_name ?? '',
      r.start_time ?? '', r.end_time ?? '', r.area_code ?? '',
      r.amd_status === '1' ? 'AMD' : r.amd_status === '0' ? 'Human' : '',
    ])
    let html = '<table><thead><tr>'
    html += headers.map((h) => `<th>${h}</th>`).join('')
    html += '</tr></thead><tbody>'
    html += tableRows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
    html += '</tbody></table>'
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cdr-report-${appliedFilters.start_date}-to-${appliedFilters.end_date}.xls`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Excel exported')
  }

  const columns: Column<CdrRow>[] = [
    {
      key: 'extension',
      header: 'Extension',
      render: (r) => (
        <span className="text-sm font-mono font-medium text-slate-700">{r.extension ?? '—'}</span>
      ),
    },
    {
      key: 'route',
      header: 'Route',
      render: (r) => <RouteBadge route={r.route} />,
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <TypeBadge type={r.type} />,
    },
    {
      key: 'number',
      header: 'Number',
      render: (r) => (
        <div>
          <span className="text-sm font-mono text-slate-800">{r.number ?? '—'}</span>
          {r.area_code && (
            <span className="text-xs text-slate-400 ml-1">({r.area_code})</span>
          )}
        </div>
      ),
    },
    {
      key: 'cli',
      header: 'CLI',
      render: (r) => (
        <span className="text-sm font-mono text-slate-500">{r.cli ?? '—'}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (r) => r.duration != null
        ? <span className="text-sm text-slate-700 font-medium">{formatDuration(r.duration)}</span>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      key: 'billable_minutes',
      header: 'Bill. Min',
      render: (r) => (
        <span className="text-sm text-slate-600">{r.billable_minutes ?? '—'}</span>
      ),
    },
    {
      key: 'billable_charge',
      header: 'Charge',
      render: (r) => r.billable_charge != null
        ? <span className="text-sm font-medium text-slate-700">${Number(r.billable_charge).toFixed(4)}</span>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      key: 'campaign_name',
      header: 'Campaign',
      render: (r) => r.campaign_name
        ? <span className="text-sm text-slate-700">{r.campaign_name}</span>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      key: 'dispostion_name',
      header: 'Disposition',
      render: (r) => r.dispostion_name
        ? <Badge variant="blue">{r.dispostion_name}</Badge>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      key: 'start_time',
      header: 'Start Time',
      render: (r) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {r.start_time ? formatDateTime(r.start_time) : '—'}
        </span>
      ),
    },
    {
      key: 'end_time',
      header: 'End Time',
      render: (r) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {r.end_time ? formatDateTime(r.end_time) : '—'}
        </span>
      ),
    },
    {
      key: 'area_code',
      header: 'Area Code',
      render: (r) => (
        <span className="text-sm text-slate-500">{r.area_code ?? '—'}</span>
      ),
    },
    {
      key: 'amd_status',
      header: 'AMD',
      render: (r) => <AmdBadge status={r.amd_status} />,
    },
    {
      key: 'call_recording',
      header: 'Recording',
      render: (r) => (
        <RecordingCell
          row={r}
          playingId={playingId}
          onPlay={setPlayingId}
          onStop={() => setPlayingId(null)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">CDR Report</h1>
          <p className="page-subtitle">Call Detail Records — {total.toLocaleString()} total records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={!rows.length}
            className="btn-outline gap-2 text-sm"
          >
            <FileText size={14} /> Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!rows.length}
            className="btn-outline gap-2 text-sm"
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <CdrSummaryCards summary={summary} loading={isLoading} />

      {/* Filters */}
      <CdrFilters
        filters={filters}
        onChange={setFilters}
        onApply={handleApply}
        onReset={handleReset}
      />

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-600">
            {isFetching && !isLoading ? (
              <span className="text-indigo-600">Refreshing…</span>
            ) : (
              <>Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total.toLocaleString()} records</>
            )}
          </span>
          <span className="text-xs text-slate-400">
            {appliedFilters.start_date && appliedFilters.end_date
              ? `${appliedFilters.start_date} → ${appliedFilters.end_date}`
              : 'No date filter'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <DataTable<CdrRow>
            columns={columns}
            data={rows}
            loading={isLoading}
            emptyText="No call records found. Adjust filters and apply."
            pagination={{ page, total, perPage: PER_PAGE, onChange: (p) => { setPage(p); setPlayingId(null) } }}
          />
        </div>
      </div>
    </div>
  )
}
