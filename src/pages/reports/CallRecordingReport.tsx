import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTimezone } from '../../hooks/useTimezone'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Download, Play, PhoneCall, Clock, TrendingUp,
  ChevronDown, Filter, Calendar, RefreshCw, ArrowDownLeft, ArrowUpRight,
  X, Volume2, PhoneIncoming, PhoneOutgoing, Hash, Eye, RotateCcw,
  Mic, FileText, User, BarChart2, ChevronRight, Pause,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronsLeft, ChevronsRight,
  PhoneMissed, Timer, Download as DownloadIcon,
} from 'lucide-react'
import { useDialerHeader } from '../../layouts/DialerLayout'
import { Badge } from '../../components/ui/Badge'
import { callRecordingReportService, type RecordingReportFilters, type RecordingReportStats } from '../../services/callRecordingReport.service'
import { reportService } from '../../services/report.service'
import { extensiongroupService } from '../../services/extensiongroup.service'
import { formatDateTime, formatDuration, formatPhoneNumber } from '../../utils/format'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallRow {
  id: number
  extension: string | null
  number: string | null
  start_time: string | null
  end_time: string | null
  duration: number | null
  route: string | null
  call_recording: string | null
  campaign_id: number | null
  campaign_name: string | null
  lead_id: number | null
  type: string | null
  disposition: string | null
  disposition_id: number | null
  dnis: string | null
  agent_name: string | null
  call_matrix_reference_id: string | null
  [key: string]: unknown
}

interface Campaign { id: number; title: string; [key: string]: unknown }
interface ExtItem { id: number; extension: string; first_name?: string; last_name?: string }

interface CallDetail {
  call: CallRow
  analysis: Record<string, unknown> | null
  summary: {
    total_score?: string
    max_score?: string
    percentage?: string
    lead_category_emoji?: string
    lead_category_desc?: string
    coaching_recommendation?: string
    agent_total_score?: string
    agent_max_score?: string
    agent_average_score?: string
  } | null
  metrics: Array<{
    category: string
    score: string | null
    score_display: string | null
    notes: string | null
  }>
}

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
]

const CALL_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'answered', label: 'Answered' },
  { value: 'missed', label: 'Missed / No Answer' },
]

const CALL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'manual', label: 'Manual' },
  { value: 'dialer', label: 'Dialer' },
  { value: 'predictive_dial', label: 'Predictive' },
  { value: 'c2c', label: 'C2C' },
  { value: 'outbound_ai', label: 'AI' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function StatusBadge({ duration }: { duration: number | null }) {
  const d = Number(duration || 0)
  if (d > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Answered
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-[11px] font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Missed
    </span>
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

function AudioPlayer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
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

// ─── Detail Drawer ──────────────────────────────────────────────────────────

function DetailDrawer({ callId, onClose }: { callId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['call-detail', callId],
    queryFn: () => callRecordingReportService.getDetail(callId),
    enabled: callId > 0,
  })

  const detail: CallDetail | null = data?.data?.data || null
  const call = detail?.call
  const summary = detail?.summary
  const metrics = detail?.metrics || []
  const analysis = detail?.analysis

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Eye size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Call Details</h2>
              <p className="text-xs text-slate-400">ID #{callId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : !call ? (
            <div className="p-6 text-center text-slate-400 mt-12">
              <PhoneCall size={40} className="mx-auto mb-3 text-slate-300" />
              <p>Call record not found</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Recording Player */}
              {call.call_recording && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Mic size={16} className="text-indigo-600" />
                    <span className="font-semibold text-sm text-indigo-900">Recording</span>
                  </div>
                  <audio controls className="w-full rounded-lg" src={call.call_recording} />
                  <a
                    href={call.call_recording}
                    download
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 transition-colors"
                  >
                    <DownloadIcon size={12} /> Download Recording
                  </a>
                </div>
              )}

              {/* Call Info Grid */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Call Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Phone Number" value={formatPhoneNumber(call.number)} />
                  <InfoCard label="Direction" value={<DirectionBadge route={call.route} />} />
                  <InfoCard label="Status" value={<StatusBadge duration={call.duration} />} />
                  <InfoCard label="Duration" value={formatDuration(Number(call.duration || 0))} />
                  <InfoCard label="Date & Time" value={call.start_time ? formatDateTime(call.start_time) : '—'} />
                  <InfoCard label="End Time" value={call.end_time ? formatDateTime(call.end_time) : '—'} />
                  <InfoCard label="Extension" value={call.extension || '—'} />
                  <InfoCard label="Agent" value={call.agent_name || '—'} />
                  <InfoCard label="Campaign" value={call.campaign_name || '—'} />
                  <InfoCard label="Disposition" value={call.disposition ? <Badge variant={getDispositionVariant(call.disposition)}>{call.disposition}</Badge> : '—'} />
                  <InfoCard label="Call Type" value={formatCallType(call.type)} />
                  <InfoCard label="Lead ID" value={call.lead_id ? `#${call.lead_id}` : '—'} />
                </div>
              </div>

              {/* AI Analysis */}
              {summary && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">AI Analysis</h3>
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100 space-y-4">
                    {/* Score */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-purple-200 flex flex-col items-center justify-center">
                        <span className="text-2xl">{summary.lead_category_emoji || '📊'}</span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-purple-900">{summary.percentage || '—'}%</span>
                          <span className="text-xs text-purple-500">({summary.total_score}/{summary.max_score})</span>
                        </div>
                        <p className="text-sm text-purple-700 font-medium">{summary.lead_category_desc || 'Score'}</p>
                      </div>
                    </div>

                    {/* Agent Performance */}
                    {summary.agent_total_score && (
                      <div className="bg-white/60 rounded-xl p-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Agent Performance</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-slate-900">{summary.agent_average_score}%</span>
                          <span className="text-xs text-slate-400">({summary.agent_total_score}/{summary.agent_max_score})</span>
                        </div>
                      </div>
                    )}

                    {/* Coaching */}
                    {summary.coaching_recommendation && (
                      <div className="bg-white/60 rounded-xl p-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Coaching Recommendation</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{summary.coaching_recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              {metrics.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Performance Scorecard</h3>
                  <div className="space-y-2">
                    {metrics.map((m, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 hover:border-slate-200 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">{m.category}</span>
                          <span className="text-sm font-bold text-indigo-600">{m.score_display || m.score || '—'}</span>
                        </div>
                        {m.notes && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Analysis Data */}
              {analysis && (analysis as Record<string, unknown>).response_data && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Analysis Summary</h3>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    <pre className="whitespace-pre-wrap font-mono">
                      {JSON.stringify((analysis as Record<string, unknown>).response_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  )
}

function getDispositionVariant(d: string): 'green' | 'red' | 'yellow' | 'blue' | 'gray' {
  const upper = d.toUpperCase()
  if (upper === 'ANSWERED' || upper === 'SALE' || upper === 'INTERESTED') return 'green'
  if (upper === 'NO ANSWER' || upper === 'NO_ANSWER') return 'yellow'
  if (upper === 'BUSY' || upper === 'DNC') return 'red'
  if (upper === 'CALLBACK' || upper === 'TRANSFER') return 'blue'
  return 'gray'
}

function formatCallType(type: string | null): string {
  const map: Record<string, string> = {
    manual: 'Manual', dialer: 'Dialer', predictive_dial: 'Predictive', c2c: 'C2C', outbound_ai: 'AI Outbound',
  }
  return type ? (map[type] ?? type) : '—'
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CallRecordingReport() {
  const { setToolbar } = useDialerHeader()
  const { today, daysAgo } = useTimezone()

  const [filters, setFilters] = useState({
    start_date: today(),
    end_date: today(),
    number: '',
    extension: '',
    route: '',
    type: '',
    campaign_id: '' as number | '',
    status: '',
    duration_min: '' as number | '',
    duration_max: '' as number | '',
    search: '',
  })
  const [page, setPage] = useState(1)
  const [activePreset, setActivePreset] = useState('Today')
  const [sortBy, setSortBy] = useState('start_time')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const PER_PAGE = 25
  const filterRef = useRef<HTMLDivElement>(null)

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showExportMenu) setShowExportMenu(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showExportMenu])

  // Close filter panel on outside click
  useEffect(() => {
    if (!showFilters) return
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFilters])

  // Campaigns dropdown
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn: () => reportService.getCampaignList(),
    staleTime: 5 * 60_000,
  })
  const campaigns: Campaign[] = campaignsData?.data?.data || campaignsData?.data || []

  // Extensions dropdown
  const { data: extensionsData } = useQuery({
    queryKey: ['extensions-list'],
    queryFn: () => extensiongroupService.getExtensions(),
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

  // Build query params
  const queryParams: RecordingReportFilters = useMemo(() => ({
    start_date: filters.start_date,
    end_date: filters.end_date,
    page,
    per_page: PER_PAGE,
    sort_by: sortBy,
    sort_dir: sortDir,
    ...(filters.number ? { number: filters.number } : {}),
    ...(filters.extension ? { extension: filters.extension } : {}),
    ...(filters.route ? { route: filters.route } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.campaign_id ? { campaign_id: filters.campaign_id } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.duration_min !== '' ? { duration_min: filters.duration_min } : {}),
    ...(filters.duration_max !== '' ? { duration_max: filters.duration_max } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  }), [filters, page, sortBy, sortDir])

  // Main data query
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['call-recordings', queryParams],
    queryFn: () => callRecordingReportService.getRecords(queryParams),
  })

  const rows: CallRow[] = data?.data?.data || []
  const total = data?.data?.total || 0
  const totalPages = data?.data?.total_pages || 1

  // Stats query
  const { data: statsData } = useQuery({
    queryKey: ['call-recordings-stats', filters.start_date, filters.end_date],
    queryFn: () => callRecordingReportService.getStats({ start_date: filters.start_date, end_date: filters.end_date }),
    staleTime: 30_000,
  })
  const stats: RecordingReportStats = statsData?.data?.data || {
    total_calls: 0, answered: 0, missed: 0, inbound: 0, outbound: 0,
    avg_duration: 0, total_duration: 0, with_recording: 0,
  }

  const handlePreset = (preset: { label: string; days: number }) => {
    setActivePreset(preset.label)
    setFilters(f => ({
      ...f,
      start_date: preset.days === 0 ? today() : daysAgo(preset.days),
      end_date: today(),
    }))
    setPage(1)
  }

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('desc') }
    setPage(1)
  }

  const resetFilters = () => {
    setFilters({
      start_date: today(), end_date: today(), number: '', extension: '',
      route: '', type: '', campaign_id: '', status: '', duration_min: '',
      duration_max: '', search: '',
    })
    setActivePreset('Today')
    setPage(1)
  }

  const hasActiveFilters = filters.number || filters.extension || filters.route || filters.type ||
    filters.campaign_id || filters.status || filters.duration_min !== '' || filters.duration_max !== '' || filters.search

  // Export handlers
  const handleExportCsv = async () => {
    setShowExportMenu(false)
    try {
      const res = await callRecordingReportService.exportCsv(queryParams)
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `call-recordings-${filters.start_date}-to-${filters.end_date}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported successfully')
    } catch {
      toast.error('Export failed')
    }
  }

  const handleExportExcel = () => {
    setShowExportMenu(false)
    try {
      const BOM = '\uFEFF'
      const header = ['Date/Time', 'Phone Number', 'Agent', 'Extension', 'Direction', 'Type', 'Duration', 'Status', 'Disposition', 'Campaign', 'Recording'].join(',')
      const csvRows = rows.map(r => [
        `"${r.start_time ? formatDateTime(r.start_time) : ''}"`,
        `"${r.number || ''}"`,
        `"${r.agent_name || ''}"`,
        `"${r.extension || ''}"`,
        (r.route || 'OUT').toUpperCase(),
        `"${formatCallType(r.type)}"`,
        formatDuration(Number(r.duration || 0)),
        Number(r.duration || 0) > 0 ? 'Answered' : 'Missed',
        `"${r.disposition || ''}"`,
        `"${r.campaign_name || ''}"`,
        `"${r.call_recording || ''}"`,
      ].join(','))
      const blob = new Blob([BOM + [header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `call-recordings-${filters.start_date}-to-${filters.end_date}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel export downloaded')
    } catch {
      toast.error('Export failed')
    }
  }

  // Search debounce
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()
  const handleSearchChange = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: value }))
      setPage(1)
    }, 400)
  }

  // Toolbar
  useEffect(() => {
    setToolbar(
      <div className="lt-right">
        <button onClick={() => refetch()} disabled={isFetching} className="lt-b" title="Refresh">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setShowExportMenu(v => !v)} className="lt-b">
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
  })

  // Highlight search matches in text
  const highlight = (text: string | null | undefined): React.ReactNode => {
    if (!text || !filters.search) return text || '—'
    const regex = new RegExp(`(${filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = String(text).split(regex)
    if (parts.length === 1) return text
    return (
      <span>
        {parts.map((p, i) =>
          regex.test(p) ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{p}</mark> : <span key={i}>{p}</span>
        )}
      </span>
    )
  }

  // Column definitions
  const sortableHeader = (key: string, label: string) => (
    <button
      className="inline-flex items-center gap-1 text-left font-semibold hover:text-indigo-600 transition-colors"
      onClick={() => handleSort(key)}
    >
      {label}
      {sortBy === key
        ? sortDir === 'desc'
          ? <ArrowDown size={12} className="text-indigo-500" />
          : <ArrowUp size={12} className="text-indigo-500" />
        : <ArrowUpDown size={12} className="text-slate-300" />
      }
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Top bar: Date Presets (left) + Stats (right) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Date Presets */}
        <div className="flex items-center gap-2">
          {DATE_PRESETS.map(preset => (
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
        </div>

        {/* Compact Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
            <PhoneCall size={13} className="text-indigo-600" />
            <span className="text-xs font-bold text-indigo-900">{stats.total_calls.toLocaleString()}</span>
            <span className="text-[10px] text-indigo-500">Calls</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
            <TrendingUp size={13} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-900">{stats.answered.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-500">Answered</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
            <PhoneIncoming size={13} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-900">{stats.inbound.toLocaleString()}</span>
            <span className="text-[10px] text-blue-500">Inbound</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
            <Timer size={13} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-900">{formatDuration(stats.avg_duration)}</span>
            <span className="text-[10px] text-amber-500">Avg</span>
          </div>
        </div>
      </div>

      {/* Filters — right-aligned slide panel */}
      <div ref={filterRef} className="relative">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border',
              showFilters
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            )}
          >
            <Filter size={14} />
            Filters
            {hasActiveFilters && (
              <span className={cn('w-2 h-2 rounded-full animate-pulse', showFilters ? 'bg-white' : 'bg-indigo-500')} />
            )}
          </button>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {showFilters && (
          <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-2xl border border-slate-200 shadow-xl z-30 p-5 space-y-3 animate-fadeIn">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">From</label>
                <input type="date" className="input" value={filters.start_date}
                  onChange={e => { setFilters(f => ({ ...f, start_date: e.target.value })); setActivePreset('Custom'); setPage(1) }}
                />
              </div>
              <div className="form-group">
                <label className="label">To</label>
                <input type="date" className="input" value={filters.end_date}
                  onChange={e => { setFilters(f => ({ ...f, end_date: e.target.value })); setActivePreset('Custom'); setPage(1) }}
                />
              </div>
            </div>
            {/* Search */}
            <div className="form-group">
              <label className="label">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9" placeholder="Number, extension, recording..."
                  defaultValue={filters.search}
                  onChange={e => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
            {/* Field filters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">Agent</label>
                <select className="input" value={filters.extension}
                  onChange={e => { setFilters(f => ({ ...f, extension: e.target.value })); setPage(1) }}>
                  <option value="">All Agents</option>
                  {extensions.map(ext => {
                    const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
                    return <option key={ext.id} value={String(ext.extension)}>{name ? `${name} (${ext.extension})` : `Ext ${ext.extension}`}</option>
                  })}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Phone Number</label>
                <input className="input" placeholder="Number..." value={filters.number}
                  onChange={e => { setFilters(f => ({ ...f, number: e.target.value })); setPage(1) }}
                />
              </div>
              <div className="form-group">
                <label className="label">Call Status</label>
                <select className="input" value={filters.status}
                  onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}>
                  {CALL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Direction</label>
                <select className="input" value={filters.route}
                  onChange={e => { setFilters(f => ({ ...f, route: e.target.value })); setPage(1) }}>
                  <option value="">All</option>
                  <option value="IN">Inbound</option>
                  <option value="OUT">Outbound</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Campaign</label>
                <select className="input" value={filters.campaign_id}
                  onChange={e => { setFilters(f => ({ ...f, campaign_id: e.target.value ? Number(e.target.value) : '' })); setPage(1) }}>
                  <option value="">All Campaigns</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Type</label>
                <select className="input" value={filters.type}
                  onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1) }}>
                  {CALL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            {/* Duration range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">Min Duration (sec)</label>
                <input type="number" min="0" className="input" placeholder="0" value={filters.duration_min}
                  onChange={e => { setFilters(f => ({ ...f, duration_min: e.target.value ? Number(e.target.value) : '' })); setPage(1) }}
                />
              </div>
              <div className="form-group">
                <label className="label">Max Duration (sec)</label>
                <input type="number" min="0" className="input" placeholder="∞" value={filters.duration_max}
                  onChange={e => { setFilters(f => ({ ...f, duration_max: e.target.value ? Number(e.target.value) : '' })); setPage(1) }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/80">
          <span className="text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading...' : `${total.toLocaleString()} records found`}
          </span>
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <RefreshCw size={11} className="animate-spin" /> Updating...
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {sortableHeader('start_time', 'Date & Time')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {sortableHeader('number', 'Phone Number')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {sortableHeader('duration', 'Duration')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Direction</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Campaign</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {sortableHeader('disposition', 'Disposition')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Recording</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded-md animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <PhoneCall size={40} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">No call records found</p>
                    <p className="text-slate-300 text-sm mt-1">Try adjusting your filters or date range</p>
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => setDetailId(row.id)}>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 whitespace-nowrap">
                        {row.start_time ? formatDateTime(row.start_time) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {(row.route || '').toUpperCase() === 'IN'
                          ? <PhoneIncoming size={13} className="text-blue-400 flex-shrink-0" />
                          : <PhoneOutgoing size={13} className="text-emerald-400 flex-shrink-0" />
                        }
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          {highlight(row.number)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.agent_name ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <User size={11} className="text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{highlight(row.agent_name)}</p>
                              <p className="text-[10px] text-slate-400">Ext {row.extension}</p>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400 font-mono">{row.extension || '—'}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-slate-700">
                        {formatDuration(Number(row.duration || 0))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge duration={row.duration} />
                    </td>
                    <td className="px-4 py-3">
                      <DirectionBadge route={row.route} />
                    </td>
                    <td className="px-4 py-3">
                      {row.campaign_name
                        ? <span className="text-sm text-slate-600 truncate block max-w-[120px]">{row.campaign_name}</span>
                        : <span className="text-xs text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {row.disposition
                        ? <Badge variant={getDispositionVariant(row.disposition)}>{highlight(row.disposition)}</Badge>
                        : <span className="text-xs text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {row.call_recording ? (
                        <button
                          onClick={() => setPlayingUrl(row.call_recording as string)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-all"
                        >
                          <Play size={11} /> Play
                        </button>
                      ) : (
                        <span className="text-xs text-slate-200">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setDetailId(row.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all group-hover:bg-indigo-50 group-hover:text-indigo-600"
                      >
                        <Eye size={11} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 flex-wrap gap-2">
            <span className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-medium text-slate-700">{((page - 1) * PER_PAGE + 1).toLocaleString()}</span>
              {' – '}
              <span className="font-medium text-slate-700">{Math.min(page * PER_PAGE, total).toLocaleString()}</span>
              {' of '}
              <span className="font-medium text-slate-700">{total.toLocaleString()}</span>
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="btn-ghost btn-sm px-2" title="First">
                <ChevronsLeft size={14} />
              </button>
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-ghost btn-sm px-2">
                <ChevronLeft size={14} />
              </button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} className="px-1 text-xs text-slate-400">...</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={cn(
                      'w-7 h-7 text-xs rounded-lg transition-colors',
                      page === p ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {p}
                  </button>
                )
              )}
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="btn-ghost btn-sm px-2">
                <ChevronRight size={14} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="btn-ghost btn-sm px-2" title="Last">
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audio Player Modal */}
      {playingUrl && <AudioPlayer url={playingUrl} onClose={() => setPlayingUrl(null)} />}

      {/* Detail Drawer */}
      {detailId && <DetailDrawer callId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
