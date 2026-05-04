import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LogIn, Users, Activity, Search, RefreshCw, Monitor, Smartphone, Tablet,
} from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { loginHistoryService, type LoginHistoryRecord, type ActiveUser } from '../../services/loginHistory.service'
import { useAuthStore } from '../../stores/auth.store'
import { useTimezone } from '../../hooks/useTimezone'
import { cn } from '../../utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Filters {
  date_from: string
  date_to: string
  ip: string
  extension: string
}

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
] as const

const PER_PAGE = 25

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseUserAgent(ua: string): { device: string; browser: string } {
  if (!ua) return { device: 'Unknown', browser: 'Unknown' }
  let browser = 'Unknown'
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera'

  let device = 'Desktop'
  if (/Mobile|Android|iPhone/i.test(ua)) device = 'Mobile'
  else if (/Tablet|iPad/i.test(ua)) device = 'Tablet'

  return { device, browser }
}

function DeviceIcon({ device }: { device: string }) {
  if (device === 'Mobile') return <Smartphone size={14} className="text-slate-400" />
  if (device === 'Tablet') return <Tablet size={14} className="text-slate-400" />
  return <Monitor size={14} className="text-slate-400" />
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

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

export function LoginHistory() {
  const { today, daysAgo, fmtDateTime } = useTimezone()
  const user = useAuthStore(s => s.user)
  const isSuperAdmin = (user?.level ?? 0) >= 9
  const initDates = useMemo(() => ({ from: today(), to: today() }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const [filters, setFilters] = useState<Filters>({
    date_from: initDates.from,
    date_to: initDates.to,
    ip: '',
    extension: '',
  })
  const [activePreset, setActivePreset] = useState<string>('Today')
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

  // ─── Queries ──────────────────────────────────────────────────────────

  const queryParams = {
    start_date: filters.date_from,
    end_date: filters.date_to,
    ...(filters.ip ? { ip: filters.ip } : {}),
    ...(filters.extension ? { extension: filters.extension } : {}),
    lower_limit: (page - 1) * PER_PAGE,
    upper_limit: PER_PAGE,
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['login-history', queryParams],
    queryFn: () => loginHistoryService.getHistory(queryParams),
  })

  const records: LoginHistoryRecord[] = data?.data?.data || []
  const totalCount = data?.data?.record_count || 0

  // Active users (only for superadmin)
  const { data: activeData } = useQuery({
    queryKey: ['active-users'],
    queryFn: () => loginHistoryService.getActiveUsers(),
    enabled: isSuperAdmin,
    retry: false,
    refetchInterval: isSuperAdmin ? 30_000 : false,
  })
  const activeUsers: ActiveUser[] = activeData?.data?.data?.users || []
  const activeCount = activeData?.data?.data?.count || 0

  // ─── Computed ─────────────────────────────────────────────────────────

  const uniqueUsers = useMemo(() => {
    const names = new Set(records.map(r => `${r.first_name} ${r.last_name}`))
    return names.size
  }, [records])

  const filtered = search.trim()
    ? records.filter(r => {
        const s = search.toLowerCase()
        return (
          `${r.first_name} ${r.last_name}`.toLowerCase().includes(s) ||
          (r.ip || '').toLowerCase().includes(s) ||
          (r.extension || '').toLowerCase().includes(s)
        )
      })
    : records

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  // ─── Columns ──────────────────────────────────────────────────────────

  const columns: Column<LoginHistoryRecord>[] = [
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
      key: 'created_at',
      header: 'Login Time',
      render: r => <span className="text-sm text-slate-600 font-mono">{fmtDateTime(r.created_at)}</span>,
    },
    {
      key: 'ip',
      header: 'IP Address',
      render: r => <span className="text-sm text-slate-600 font-mono">{r.ip}</span>,
    },
    {
      key: 'user_agent',
      header: 'Device / Browser',
      render: r => {
        const { device, browser } = parseUserAgent(r.user_agent)
        return (
          <div className="flex items-center gap-2">
            <DeviceIcon device={device} />
            <span className="text-sm text-slate-600">{browser}</span>
            <span className="text-xs text-slate-400">({device})</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={LogIn}
          label="Total Logins"
          value={totalCount}
          color="bg-indigo-50 text-indigo-600"
          loading={isLoading}
        />
        <SummaryCard
          icon={Users}
          label="Unique Users"
          value={uniqueUsers}
          color="bg-emerald-50 text-emerald-600"
          loading={isLoading}
        />
        <SummaryCard
          icon={Activity}
          label="Active Now"
          value={activeCount}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Active Users Pill */}
      {activeCount > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-800">Currently Active ({activeCount})</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeUsers.slice(0, 20).map(u => (
              <span key={u.user_id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {u.first_name} {u.last_name}
              </span>
            ))}
          </div>
        </div>
      )}

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
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Extension</label>
            <input
              type="text"
              placeholder="e.g. 101"
              value={filters.extension}
              onChange={e => { setFilters(f => ({ ...f, extension: e.target.value })); setPage(1) }}
              className="input-field"
            />
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
                placeholder="Search name, IP..."
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
          <h3 className="text-sm font-bold text-slate-900">Login Records</h3>
          <span className="text-xs text-slate-400">{totalCount} total records</span>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          emptyText="No login records found"
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
