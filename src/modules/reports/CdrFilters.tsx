import { useQuery } from '@tanstack/react-query'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { reportService } from '../../services/report.service'

export type DatePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'

export interface FilterState {
  date_preset: DatePreset
  start_date: string
  end_date: string
  extension: string
  campaign: string
  disposition: string
  route: string
  type: string
  number: string
  cli_filter: string
}

interface Props {
  filters: FilterState
  onChange: (filters: FilterState) => void
  onApply: () => void
  onReset: () => void
}

const ROUTE_OPTIONS = [
  { value: '', label: 'All Routes' },
  { value: 'IN', label: 'Inbound (IN)' },
  { value: 'OUT', label: 'Outbound (OUT)' },
  { value: 'C2C', label: 'Click-to-Call (C2C)' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'manual', label: 'Manual' },
  { value: 'dialer', label: 'Dialer' },
  { value: 'predictive_dial', label: 'Predictive Dial' },
  { value: 'c2c', label: 'Click-to-Call' },
  { value: 'outbound_ai', label: 'Outbound AI' },
]

const PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
]

function fmt(d: Date) {
  return d.toISOString().split('T')[0]
}

export function getDateRange(preset: DatePreset): { start: string; end: string } {
  const today = new Date()
  switch (preset) {
    case 'today':
      return { start: fmt(today), end: fmt(today) }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { start: fmt(y), end: fmt(y) }
    }
    case 'last7': {
      const d = new Date(today)
      d.setDate(d.getDate() - 6)
      return { start: fmt(d), end: fmt(today) }
    }
    case 'last30': {
      const d = new Date(today)
      d.setDate(d.getDate() - 29)
      return { start: fmt(d), end: fmt(today) }
    }
    default:
      return { start: '', end: '' }
  }
}

export function CdrFilters({ filters, onChange, onApply, onReset }: Props) {
  const { data: campaignData } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn: () => reportService.getCampaignList(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: dispositionData } = useQuery({
    queryKey: ['dispositions-list'],
    queryFn: () => reportService.getDispositionList(),
    staleTime: 5 * 60 * 1000,
  })

  const campaigns: { id: number; title: string }[] = (campaignData as any)?.data?.data ?? []
  const dispositions: { id: number; title: string }[] = (dispositionData as any)?.data?.data ?? []

  const set = (key: keyof FilterState, value: string) =>
    onChange({ ...filters, [key]: value })

  const handlePreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      onChange({ ...filters, date_preset: 'custom' })
    } else {
      const { start, end } = getDateRange(preset)
      onChange({ ...filters, date_preset: preset, start_date: start, end_date: end })
    }
  }

  const hasFilters = !!(
    filters.extension || filters.campaign || filters.disposition ||
    filters.route || filters.type || filters.number || filters.cli_filter
  )

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <SlidersHorizontal size={15} />
          Filters
        </div>
        {hasFilters && (
          <button onClick={onReset} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Date Range Row */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Preset buttons */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Date Range</span>
          <div className="flex items-center gap-1 flex-wrap">
            {PRESET_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  filters.date_preset === p.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date inputs (shown when custom selected) */}
        {filters.date_preset === 'custom' && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">From</span>
              <input
                type="date"
                className="input text-sm"
                value={filters.start_date}
                onChange={(e) => set('start_date', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">To</span>
              <input
                type="date"
                className="input text-sm"
                value={filters.end_date}
                onChange={(e) => set('end_date', e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Number search */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Number</span>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input text-sm pl-7"
              placeholder="Search number…"
              value={filters.number}
              onChange={(e) => set('number', e.target.value)}
            />
          </div>
        </div>

        {/* CLI search */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">CLI (DID)</span>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input text-sm pl-7"
              placeholder="Search CLI…"
              value={filters.cli_filter}
              onChange={(e) => set('cli_filter', e.target.value)}
            />
          </div>
        </div>

        {/* Extension */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Extension</span>
          <input
            className="input text-sm"
            placeholder="e.g. 1001"
            value={filters.extension}
            onChange={(e) => set('extension', e.target.value)}
          />
        </div>

        {/* Campaign */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Campaign</span>
          <select className="input text-sm" value={filters.campaign} onChange={(e) => set('campaign', e.target.value)}>
            <option value="">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Disposition */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Disposition</span>
          <select className="input text-sm" value={filters.disposition} onChange={(e) => set('disposition', e.target.value)}>
            <option value="">All Dispositions</option>
            {dispositions.map((d) => (
              <option key={d.id} value={String(d.id)}>{d.title}</option>
            ))}
          </select>
        </div>

        {/* Route */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Route</span>
          <select className="input text-sm" value={filters.route} onChange={(e) => set('route', e.target.value)}>
            {ROUTE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Type row */}
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Call Type</span>
          <div className="flex items-center gap-1 flex-wrap">
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => set('type', o.value)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  filters.type === o.value
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onApply} className="btn-primary ml-auto text-sm">
          Apply Filters
        </button>
      </div>
    </div>
  )
}
