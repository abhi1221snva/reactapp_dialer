import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Phone, Users, Radio, RefreshCw, Headphones, Mic,
  PhoneCall, Clock, Activity, Wifi, WifiOff, AlertCircle,
  ArrowDownLeft, ArrowUpRight, Filter,
} from 'lucide-react'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { showConfirm } from '../../utils/confirmDelete'
import { dialerService } from '../../services/dialer.service'
import { formatDateTime } from '../../utils/format'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveCall {
  id?: number | string
  agent?: string
  agent_name?: string
  extension?: string
  phone_number?: string
  caller_id?: string
  campaign?: string
  campaign_name?: string
  start_time?: string
  started_at?: string
  duration?: number
  status?: string
  [key: string]: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elapsed(startTime?: string, baseDuration?: number): number {
  if (!startTime) return baseDuration || 0
  const start = new Date(startTime).getTime()
  if (isNaN(start)) return baseDuration || 0
  return Math.floor((Date.now() - start) / 1000)
}

function formatLiveDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Live Duration Counter ────────────────────────────────────────────────────

function LiveDuration({ startTime, baseDuration }: { startTime?: string; baseDuration?: number }) {
  const [secs, setSecs] = useState(() => elapsed(startTime, baseDuration))

  useEffect(() => {
    const interval = setInterval(() => {
      setSecs(elapsed(startTime, baseDuration))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, baseDuration])

  const isLong = secs > 600 // > 10 min
  const isVeryLong = secs > 1800 // > 30 min

  return (
    <span className={cn(
      'font-mono text-sm font-bold tabular-nums',
      isVeryLong ? 'text-red-600' : isLong ? 'text-amber-600' : 'text-emerald-700'
    )}>
      {formatLiveDuration(secs)}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color, pulse,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; pulse?: boolean
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative', color)}>
        <Icon size={20} />
        {pulse && (
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 5000 // 5 seconds

export function LiveCalls() {
  const [tick, setTick]               = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown]     = useState(REFRESH_INTERVAL / 1000)
  const [campaignFilter, setCampaignFilter] = useState('')
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ['live-calls'],
    queryFn:  () => dialerService.getLiveCalls(),
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  })

  // Countdown display
  useEffect(() => {
    if (!autoRefresh) { setCountdown(REFRESH_INTERVAL / 1000); return }
    setCountdown(REFRESH_INTERVAL / 1000)
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) return REFRESH_INTERVAL / 1000
        return c - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [autoRefresh, tick])

  // Force re-render every second so live durations update
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const rawCalls: LiveCall[] = data?.data?.data || data?.data || []
  const allCalls = Array.isArray(rawCalls) ? rawCalls : []

  // Client-side campaign filter
  const calls = campaignFilter
    ? allCalls.filter((c) => {
        const name = (c.campaign_name || c.campaign || '').toString().toLowerCase()
        return name.includes(campaignFilter.toLowerCase())
      })
    : allCalls

  // Unique campaign names for filter dropdown
  const campaignNames = Array.from(
    new Set(allCalls.map((c) => String(c.campaign_name || c.campaign || '')).filter(Boolean))
  )

  const totalLive        = calls.length
  const uniqueAgents     = new Set(calls.map((c) => c.extension || c.agent)).size
  const avgDuration      = totalLive > 0
    ? Math.round(calls.reduce((s, c) => s + elapsed(c.start_time || c.started_at, c.duration), 0) / totalLive)
    : 0
  const longCalls        = calls.filter((c) => elapsed(c.start_time || c.started_at, c.duration) > 300).length

  // Listen / Barge mutations
  const listenMutation = useMutation({
    mutationFn: (data: { extension: string; campaign_id: number }) => dialerService.listenCall(data),
    onSuccess: () => toast.success('Listening to call…'),
    onError:   () => toast.error('Could not connect to call'),
  })

  const bargeMutation = useMutation({
    mutationFn: (data: { extension: string; campaign_id: number }) => dialerService.bargeCall(data),
    onSuccess: () => toast.success('Barge-in connected'),
    onError:   () => toast.error('Could not barge into call'),
  })

  const handleListen = (row: LiveCall) => {
    const ext = row.extension || ''
    const cid = Number(row.campaign_id || 0)
    if (!ext) { toast.error('No extension for this call'); return }
    listenMutation.mutate({ extension: ext, campaign_id: cid })
  }

  const handleBarge = async (row: LiveCall) => {
    const ext = row.extension || ''
    const cid = Number(row.campaign_id || 0)
    if (!ext) { toast.error('No extension for this call'); return }
    if (!await showConfirm({
      title:       'Barge into Call?',
      message:     `Barge into the call with ${row.phone_number || row.caller_id}? They will hear you.`,
      confirmText: 'Yes, barge in',
      danger:      false,
      icon:        'question',
    })) return
    bargeMutation.mutate({ extension: ext, campaign_id: cid })
  }

  const manualRefresh = useCallback(() => {
    refetch()
    setCountdown(REFRESH_INTERVAL / 1000)
  }, [refetch])

  const columns: Column<LiveCall>[] = [
    {
      key: 'agent',
      header: 'Agent',
      render: (r) => {
        const name     = r.agent_name || r.agent || 'Unknown'
        const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        return (
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{name}</p>
              {r.extension && (
                <p className="text-xs text-slate-400">Ext. {r.extension}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'extension',
      header: 'Extension',
      render: (r) => (
        <span className="font-mono text-sm text-slate-700">{r.extension || '—'}</span>
      ),
    },
    {
      key: 'phone_number',
      header: 'Phone Number',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <Phone size={13} className="text-slate-400 flex-shrink-0" />
          <span className="font-mono text-sm font-semibold text-slate-900">
            {r.phone_number || r.caller_id || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'campaign',
      header: 'Campaign',
      render: (r) => (
        <Badge variant="blue">
          {r.campaign_name || r.campaign || 'No Campaign'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const s = (r.status || 'ACTIVE').toUpperCase()
        return (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <Badge variant={s === 'ACTIVE' || s === 'CONNECTED' ? 'green' : 'yellow'}>
              {s}
            </Badge>
          </div>
        )
      },
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (r) => (
        <LiveDuration
          startTime={r.start_time || r.started_at}
          baseDuration={Number(r.duration || 0)}
        />
      ),
    },
    {
      key: 'start_time',
      header: 'Start Time',
      render: (r) => {
        const t = r.start_time || r.started_at
        return (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {t ? formatDateTime(String(t)) : '—'}
          </span>
        )
      },
    },
    {
      key: 'direction',
      header: 'Direction',
      render: (r) => {
        const dir = (r.direction || r.route || r.call_type || '').toString().toUpperCase()
        if (dir === 'IN' || dir === 'INBOUND') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <ArrowDownLeft size={10} /> IN
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <ArrowUpRight size={10} /> OUT
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => handleListen(r)}
            disabled={listenMutation.isPending}
            title="Listen silently"
            className={cn(
              'p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-medium',
              'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
            )}
          >
            <Headphones size={13} />
            <span className="hidden sm:inline">Listen</span>
          </button>
          <button
            onClick={() => handleBarge(r)}
            disabled={bargeMutation.isPending}
            title="Barge in"
            className={cn(
              'p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-medium',
              'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            )}
          >
            <Mic size={13} />
            <span className="hidden sm:inline">Barge</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Live Calls</h1>
            {!isLoading && !isError && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className="page-subtitle">Real-time active call monitor — auto-refreshes every 5 seconds</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            )}
          >
            {autoRefresh ? (
              <><Wifi size={13} /> Auto ({countdown}s)</>
            ) : (
              <><WifiOff size={13} /> Paused</>
            )}
          </button>
          <button
            onClick={manualRefresh}
            disabled={isFetching}
            className="btn-ghost btn-sm p-2 rounded-lg"
            title="Refresh now"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Campaign filter */}
      {campaignNames.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Filter size={12} /> Filter:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setCampaignFilter('')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                campaignFilter === ''
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              )}
            >
              All Campaigns
            </button>
            {campaignNames.map((name) => (
              <button
                key={name}
                onClick={() => setCampaignFilter(name)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  campaignFilter === name
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                )}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={18} className="flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Unable to fetch live calls</p>
            <p className="text-xs mt-0.5 text-red-600">
              The server may be unavailable.{' '}
              <button onClick={() => refetch()} className="underline font-medium hover:no-underline">
                Try again
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Radio}  label="Live Calls"
          value={isLoading ? '—' : totalLive.toLocaleString()}
          sub={totalLive === 1 ? '1 active call' : `${totalLive} active calls`}
          color="bg-emerald-50 text-emerald-600" pulse={totalLive > 0}
        />
        <StatCard
          icon={Users}  label="Agents on Call"
          value={isLoading ? '—' : uniqueAgents.toLocaleString()}
          sub="Currently engaged"
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Clock}  label="Avg Duration"
          value={isLoading ? '—' : formatLiveDuration(avgDuration)}
          sub="Per active call"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Activity} label="Long Calls"
          value={isLoading ? '—' : longCalls.toLocaleString()}
          sub="Over 5 minutes"
          color={longCalls > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}
        />
      </div>

      {/* Calls table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <PhoneCall size={14} className="text-emerald-500" />
            <span className="text-xs font-medium text-slate-700">
              {isLoading ? 'Loading…' : `${totalLive} live call${totalLive !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <RefreshCw size={11} className="animate-spin" /> Updating…
              </span>
            )}
            {autoRefresh && !isFetching && (
              <span className="text-xs text-slate-400">
                Next refresh in {countdown}s
              </span>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={calls as unknown as Record<string, unknown>[]}
          loading={isLoading}
          keyField="id"
          emptyText={isError ? 'Failed to load live calls' : 'No active calls at the moment'}
        />

        {!isLoading && calls.length === 0 && !isError && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Phone size={28} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">No Active Calls</p>
            <p className="text-sm text-slate-400 max-w-xs">
              There are currently no calls in progress. This view will auto-refresh every 5 seconds.
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-500 flex-wrap">
        <span className="font-semibold text-slate-600 uppercase tracking-wide">Legend:</span>
        <span className="flex items-center gap-1.5">
          <Headphones size={13} className="text-blue-500" />
          Listen — monitor call silently (agent/customer cannot hear you)
        </span>
        <span className="flex items-center gap-1.5">
          <Mic size={13} className="text-amber-500" />
          Barge — join call and speak to all parties
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Duration turns amber after 5 min, red after 30 min
        </span>
      </div>
    </div>
  )
}
