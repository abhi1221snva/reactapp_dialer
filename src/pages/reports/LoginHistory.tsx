import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LogIn, Users, Activity, Search, RefreshCw, Monitor, Smartphone, Tablet,
  Calendar, Filter, Globe, Hash, Clock, Shield, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, X,
} from 'lucide-react'
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

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  if (!ua) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' }
  let browser = 'Unknown'
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera'

  let device = 'Desktop'
  if (/Mobile|Android|iPhone/i.test(ua)) device = 'Mobile'
  else if (/Tablet|iPad/i.test(ua)) device = 'Tablet'

  let os = 'Unknown'
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS'

  return { device, browser, os }
}

function DeviceIcon({ device }: { device: string }) {
  if (device === 'Mobile') return <Smartphone size={14} />
  if (device === 'Tablet') return <Tablet size={14} />
  return <Monitor size={14} />
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const applyPreset = useCallback((label: string, days: number) => {
    setActivePreset(label)
    setFilters(f => ({
      ...f,
      date_from: days === 0 ? today() : daysAgo(days),
      date_to: today(),
    }))
    setPage(1)
  }, [today, daysAgo])

  const hasActiveFilters = filters.ip || filters.extension
  const clearFilters = () => {
    setFilters(f => ({ ...f, ip: '', extension: '' }))
    setPage(1)
  }

  // ─── Queries ──────────────────────────────────────────────────────────

  const queryParams = {
    start_date: filters.date_from,
    end_date: filters.date_to,
    ...(filters.ip ? { ip: filters.ip } : {}),
    ...(filters.extension ? { extension: filters.extension } : {}),
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
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

  const filtered = records

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Toolbar */}
      <div className="lt">
        <div className="lt-title">
          <h1>Login History</h1>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, background: '#f1f5f9', padding: '1px 7px', borderRadius: 8, lineHeight: '16px' }}>
            {totalCount}
          </span>
        </div>

        <div className="lt-right">
          {DATE_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.label, p.days)}
              className={cn('lt-b', activePreset === p.label && 'active')}
            >
              {p.label}
            </button>
          ))}

          <div className="lt-divider" />

          <button
            onClick={() => setShowFilters(f => !f)}
            className={cn('lt-b', (showFilters || hasActiveFilters) && 'active')}
          >
            <Filter size={12} />
            Filters
            {hasActiveFilters && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
            )}
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="lt-b"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div className="lt-accent lt-accent-blue" />

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {/* Total Logins */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', color: '#4f46e5', flexShrink: 0,
            }}>
              <LogIn size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Logins</div>
              {isLoading ? (
                <div className="skeleton" style={{ width: 60, height: 24, marginTop: 2 }} />
              ) : (
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{totalCount.toLocaleString()}</div>
              )}
            </div>
          </div>

          {/* Unique Users */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669', flexShrink: 0,
            }}>
              <Users size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unique Users</div>
              {isLoading ? (
                <div className="skeleton" style={{ width: 40, height: 24, marginTop: 2 }} />
              ) : (
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{uniqueUsers}</div>
              )}
            </div>
          </div>

          {/* Active Now */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeCount > 0
                ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
                : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
              color: activeCount > 0 ? '#059669' : '#94a3b8', flexShrink: 0,
            }}>
              <Activity size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Now</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{activeCount}</div>
                {activeCount > 0 && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)', animation: 'pulse 2s infinite' }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Users Panel */}
        {activeCount > 0 && (
          <div className="card" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={14} style={{ color: '#059669' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Currently Active Users</span>
              <span className="badge-green" style={{ fontSize: 10 }}>{activeCount} online</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {activeUsers.slice(0, 20).map(u => (
                <div key={u.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#ecfdf5', color: '#059669', fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                      {u.first_name} {u.last_name}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{u.browser || u.device_type}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                      <span>{u.ip_address}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                    {u.last_active_at ? formatTimeAgo(u.last_active_at) : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={13} style={{ color: '#6366f1' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Filters</span>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#ef4444',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6,
                }}>
                  <X size={11} /> Clear
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={e => { setFilters(f => ({ ...f, date_from: e.target.value })); setActivePreset(''); setPage(1) }}
                  className="input-sm"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={e => { setFilters(f => ({ ...f, date_to: e.target.value })); setActivePreset(''); setPage(1) }}
                  className="input-sm"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Hash size={11} /> Extension
                </label>
                <input
                  type="text"
                  placeholder="e.g. 101"
                  value={filters.extension}
                  onChange={e => { setFilters(f => ({ ...f, extension: e.target.value })); setPage(1) }}
                  className="input-sm"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={11} /> IP Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.1"
                  value={filters.ip}
                  onChange={e => { setFilters(f => ({ ...f, ip: e.target.value })); setPage(1) }}
                  className="input-sm"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Table Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={13} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Login Records</span>
            </div>
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search name, IP, ext..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', height: 30, paddingLeft: 30, paddingRight: 10,
                  border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#0f172a',
                  background: '#fff', outline: 'none', transition: 'border-color 0.12s',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>User</th>
                  <th>Login Time</th>
                  <th>IP Address</th>
                  <th>Device / Browser</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
                          <div>
                            <div className="skeleton" style={{ width: 100, height: 12, marginBottom: 4 }} />
                            <div className="skeleton" style={{ width: 50, height: 10 }} />
                          </div>
                        </div>
                      </td>
                      <td><div className="skeleton" style={{ width: 130, height: 12 }} /></td>
                      <td><div className="skeleton" style={{ width: 100, height: 12 }} /></td>
                      <td><div className="skeleton" style={{ width: 110, height: 12 }} /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '48px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: '#f8fafc', color: '#cbd5e1',
                        }}>
                          <LogIn size={22} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>No login records found</span>
                        <span style={{ fontSize: 11, color: '#cbd5e1' }}>Try adjusting your filters or date range</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const { device, browser, os } = parseUserAgent(r.user_agent)
                    const initials = `${r.first_name?.[0] || ''}${r.last_name?.[0] || ''}`
                    return (
                      <tr key={i}>
                        <td style={{ paddingLeft: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#eef2ff', color: '#4f46e5', fontSize: 11, fontWeight: 700, flexShrink: 0, letterSpacing: '0.02em',
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
                                {r.first_name} {r.last_name}
                              </div>
                              {r.extension && (
                                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>Ext {r.extension}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: '#475569', fontFamily: 'ui-monospace, monospace' }}>
                            {fmtDateTime(r.created_at)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Globe size={12} style={{ color: '#94a3b8' }} />
                            <span style={{ fontSize: 12, color: '#475569', fontFamily: 'ui-monospace, monospace' }}>{r.ip}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#f8fafc', color: '#64748b', flexShrink: 0,
                            }}>
                              <DeviceIcon device={device} />
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', lineHeight: 1.3 }}>{browser}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.3 }}>{os} / {device}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 20px', borderTop: '1px solid #f1f5f9', background: '#fafbfc',
            }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Showing{' '}
                <span style={{ fontWeight: 600, color: '#475569' }}>
                  {((page - 1) * PER_PAGE + 1).toLocaleString()}
                </span>
                {' - '}
                <span style={{ fontWeight: 600, color: '#475569' }}>
                  {Math.min(page * PER_PAGE, totalCount).toLocaleString()}
                </span>
                {' of '}
                <span style={{ fontWeight: 600, color: '#475569' }}>{totalCount.toLocaleString()}</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="btn-ghost btn-sm"
                  style={{ padding: '0 6px', height: 28, minWidth: 0, borderRadius: 6 }}
                >
                  <ChevronsLeft size={13} />
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost btn-sm"
                  style={{ padding: '0 6px', height: 28, minWidth: 0, borderRadius: 6 }}
                >
                  <ChevronLeft size={13} />
                </button>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`e-${i}`} style={{ padding: '0 4px', fontSize: 11, color: '#94a3b8' }}>...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, fontSize: 11, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                        background: p === page ? '#4f46e5' : 'transparent',
                        color: p === page ? '#fff' : '#64748b',
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost btn-sm"
                  style={{ padding: '0 6px', height: 28, minWidth: 0, borderRadius: 6 }}
                >
                  <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="btn-ghost btn-sm"
                  style={{ padding: '0 6px', height: 28, minWidth: 0, borderRadius: 6 }}
                >
                  <ChevronsRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
