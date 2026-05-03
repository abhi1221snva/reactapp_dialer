import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldAlert, AlertTriangle, Lock, KeyRound, RefreshCw, Search,
} from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { loginHistoryService, type AuthEventRecord } from '../../services/loginHistory.service'
import { useTimezone } from '../../hooks/useTimezone'
import { cn } from '../../utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Filters {
  date_from: string
  date_to: string
  event_type: string
  ip: string
}

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
] as const

const EVENT_TYPES = [
  { value: '', label: 'All Events' },
  { value: 'login.success', label: 'Login Success' },
  { value: 'login.failed', label: 'Login Failed' },
  { value: 'login.locked', label: 'Account Locked' },
  { value: 'logout', label: 'Logout' },
  { value: '2fa.enabled', label: '2FA Enabled' },
  { value: '2fa.disabled', label: '2FA Disabled' },
  { value: '2fa.verified', label: '2FA Verified' },
  { value: '2fa.failed', label: '2FA Failed' },
  { value: 'password.changed', label: 'Password Changed' },
  { value: 'password.reset', label: 'Password Reset' },
  { value: 'session.revoked', label: 'Session Revoked' },
]

const PER_PAGE = 25

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventBadgeVariant(type: string): 'red' | 'green' | 'yellow' | 'blue' | 'gray' {
  if (type.includes('failed') || type.includes('locked')) return 'red'
  if (type.includes('success') || type.includes('verified') || type.includes('enabled')) return 'green'
  if (type.includes('password') || type.includes('revoked')) return 'yellow'
  if (type.includes('2fa')) return 'blue'
  return 'gray'
}

function formatEventType(type: string): string {
  return type.replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Summary Card ────────────────────────────────────────────────────────────��

function SummaryCard({ icon: Icon, label, value, color, loading }: {
  icon: React.ElementType; label: string; value: string | number; color: string; loading?: boolean
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
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AuthEvents() {
  const { today, daysAgo, fmtDateTime } = useTimezone()
  const initDates = useMemo(() => ({ from: daysAgo(7), to: today() }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const [filters, setFilters] = useState<Filters>({
    date_from: initDates.from,
    date_to: initDates.to,
    event_type: '',
    ip: '',
  })
  const [activePreset, setActivePreset] = useState<string>('7 Days')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const applyPreset = useCallback((label: string, days: number) => {
    setActivePreset(label)
    setFilters(f => ({
      ...f,
      date_from: days === 0 ? today() : daysAgo(days),
      date_to: today(),
    }))
    setPage(1)
  }, [today, daysAgo])

  // ─── Query ────────────────────────────────────────────────────────────

  const queryParams = {
    start_date: filters.date_from,
    end_date: filters.date_to,
    ...(filters.event_type ? { event_type: filters.event_type } : {}),
    ...(filters.ip ? { ip: filters.ip } : {}),
    lower_limit: (page - 1) * PER_PAGE,
    upper_limit: PER_PAGE,
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['auth-events', queryParams],
    queryFn: () => loginHistoryService.getAuthEvents(queryParams),
  })

  const records: AuthEventRecord[] = data?.data?.data || []
  const totalCount = data?.data?.total || 0
  const totalPages = Math.ceil(totalCount / PER_PAGE)

  // ─── Computed Stats ───────────────────────────────────────────────────

  const stats = useMemo(() => {
    const failedLogins = records.filter(r => r.event_type === 'login.failed').length
    const lockouts = records.filter(r => r.event_type === 'login.locked').length
    const passwordChanges = records.filter(r => r.event_type.includes('password')).length
    return { failedLogins, lockouts, passwordChanges }
  }, [records])

  // Local search filter
  const filtered = search.trim()
    ? records.filter(r => {
        const s = search.toLowerCase()
        return (
          `${r.first_name} ${r.last_name}`.toLowerCase().includes(s) ||
          (r.event_type || '').toLowerCase().includes(s) ||
          (r.ip_address || '').toLowerCase().includes(s)
        )
      })
    : records

  // ─── Columns ──────────────────────────────────────────────────────────

  const columns: Column<AuthEventRecord>[] = [
    {
      key: 'first_name',
      header: 'User',
      render: r => (
        <div>
          <p className="text-sm font-semibold text-slate-800">{r.first_name} {r.last_name}</p>
          {r.extension && <p className="text-xs text-slate-400">Ext: {r.extension}</p>}
        </div>
      ),
    },
    {
      key: 'event_type',
      header: 'Event',
      render: r => (
        <Badge variant={getEventBadgeVariant(r.event_type)}>
          {formatEventType(r.event_type)}
        </Badge>
      ),
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      render: r => <span className="text-sm text-slate-600 font-mono">{r.ip_address || '—'}</span>,
    },
    {
      key: 'created_at',
      header: 'Time',
      render: r => <span className="text-sm text-slate-600 font-mono">{fmtDateTime(r.created_at)}</span>,
    },
    {
      key: 'metadata',
      header: 'Details',
      render: r => {
        if (!r.metadata) return <span className="text-xs text-slate-400">—</span>
        const entries = Object.entries(r.metadata).slice(0, 2)
        return (
          <div className="text-xs text-slate-500 space-y-0.5">
            {entries.map(([k, v]) => (
              <div key={k}><span className="font-medium">{k}:</span> {String(v)}</div>
            ))}
          </div>
        )
      },
    },
  ]

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Date Presets */}
      <div className="flex flex-wrap items-center gap-2">
        {DATE_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.label, p.days)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
              activePreset === p.label
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={ShieldAlert}
          label="Total Events"
          value={totalCount}
          color="bg-indigo-50 text-indigo-600"
          loading={isLoading}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Failed Logins"
          value={stats.failedLogins}
          color="bg-red-50 text-red-600"
          loading={isLoading}
        />
        <SummaryCard
          icon={Lock}
          label="Lockouts"
          value={stats.lockouts}
          color="bg-amber-50 text-amber-600"
          loading={isLoading}
        />
        <SummaryCard
          icon={KeyRound}
          label="Password Changes"
          value={stats.passwordChanges}
          color="bg-emerald-50 text-emerald-600"
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={e => { setFilters(f => ({ ...f, date_from: e.target.value })); setActivePreset(''); setPage(1) }}
              className="input-field"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={e => { setFilters(f => ({ ...f, date_to: e.target.value })); setActivePreset(''); setPage(1) }}
              className="input-field"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Event Type</label>
            <select
              value={filters.event_type}
              onChange={e => { setFilters(f => ({ ...f, event_type: e.target.value })); setPage(1) }}
              className="input-field"
            >
              {EVENT_TYPES.map(et => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">IP Address</label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.1"
              value={filters.ip}
              onChange={e => { setFilters(f => ({ ...f, ip: e.target.value })); setPage(1) }}
              className="input-field"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, event, IP..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Security Events</h3>
          <span className="text-xs text-slate-400">{totalCount} total events</span>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          emptyText="No auth events found"
        />
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                const p = start + i
                if (p > totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'px-3 py-1 rounded text-sm font-medium',
                      p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
