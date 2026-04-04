import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/auth.store'
import { workforceService, type AgentRow } from '../../services/workforce.service'
import { cn } from '../../utils/cn'
import { formatDuration } from '../../utils/format'
import toast from 'react-hot-toast'
import Pusher from 'pusher-js'
import {
  Users, Phone, Coffee, AlertTriangle, RefreshCw, Activity,
  Clock, TrendingUp, ChevronDown, UserCheck,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type DialerStatus = 'available' | 'on_call' | 'on_break' | 'after_call_work' | 'offline'

const STATUS_CONFIG: Record<DialerStatus, { label: string; color: string; dot: string; bg: string }> = {
  available:       { label: 'Available',       color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  on_call:         { label: 'On Call',          color: 'text-blue-700',    dot: 'bg-blue-500',    bg: 'bg-blue-50 border-blue-200' },
  on_break:        { label: 'On Break',         color: 'text-amber-700',   dot: 'bg-amber-500',   bg: 'bg-amber-50 border-amber-200' },
  after_call_work: { label: 'After Call Work',  color: 'text-purple-700',  dot: 'bg-purple-500',  bg: 'bg-purple-50 border-purple-200' },
  offline:         { label: 'Offline',          color: 'text-slate-500',   dot: 'bg-slate-400',   bg: 'bg-slate-50 border-slate-200' },
}

function avatarColor(name: string): string {
  const colors = ['bg-indigo-500','bg-violet-500','bg-pink-500','bg-teal-500','bg-cyan-500','bg-amber-500','bg-rose-500','bg-emerald-500']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="card flex items-center gap-4 py-4 px-5">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: DialerStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', cfg.bg, cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function AgentCard({ agent, onStatusChange }: { agent: AgentRow; onStatusChange: (id: number, s: string) => void }) {
  const [open, setOpen] = useState(false)
  const initials = agent.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
  const talkHrs  = agent.talk_time_today > 0 ? formatDuration(agent.talk_time_today) : '—'
  const loginStr = agent.login_time ? new Date(agent.login_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'

  const statuses: DialerStatus[] = ['available', 'on_call', 'on_break', 'after_call_work', 'offline']

  return (
    <div className={cn('card border transition-shadow hover:shadow-md', STATUS_CONFIG[agent.dialer_status]?.bg ?? 'border-slate-200')}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={cn('w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold', avatarColor(agent.name))}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 text-sm truncate">{agent.name}</p>
            <div className="relative">
              <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1"
                title="Change status"
              >
                <StatusBadge status={agent.dialer_status as DialerStatus} />
                <ChevronDown size={12} className="text-slate-400" />
              </button>
              {open && (
                <div className="absolute right-0 top-8 z-10 bg-white border border-slate-200 rounded-xl shadow-xl p-1 w-44">
                  {statuses.map(s => (
                    <button
                      key={s}
                      onClick={() => { onStatusChange(agent.id, s); setOpen(false) }}
                      className={cn('w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 flex items-center gap-2',
                        agent.dialer_status === s && 'bg-slate-100')}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[s]?.dot)} />
                      {STATUS_CONFIG[s]?.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-0.5">Ext: {agent.extension || '—'}</p>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Login: {loginStr}
            </span>
            <span className="flex items-center gap-1">
              <Phone size={10} />
              {agent.calls_today} calls
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp size={10} />
              {talkHrs}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StaffingWarning({ warnings }: { warnings: Array<{ campaign_name: string; required_agents: number; available_agents: number; shortage: number; severity: string }> }) {
  if (!warnings.length) return null
  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm',
            w.severity === 'critical'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          )}
        >
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            <strong>{w.campaign_name}</strong> requires <strong>{w.required_agents}</strong> agents but only{' '}
            <strong>{w.available_agents}</strong> are currently active.{' '}
            <span className="font-semibold">({w.shortage} short)</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function WorkforceDashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<DialerStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const pusherRef = useRef<Pusher | null>(null)

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['workforce-dashboard'],
    queryFn: () => workforceService.getDashboard().then(r => r.data.data),
    refetchInterval: 30_000, // poll every 30s as fallback
  })

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) =>
      workforceService.updateAgentStatus(userId, status),
    onSuccess: () => {
      toast.success('Agent status updated')
      refetch()
    },
    onError: () => toast.error('Failed to update status'),
  })

  // Real-time Pusher subscription for instant status updates
  useEffect(() => {
    if (!user?.parent_id || !import.meta.env.VITE_PUSHER_APP_KEY) return

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY, {
      cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
    })

    const channel = pusher.subscribe(`workforce-${user.parent_id}`)

    channel.bind('agent-status-update', () => {
      // Invalidate dashboard query to trigger refetch with latest data
      queryClient.invalidateQueries({ queryKey: ['workforce-dashboard'] })
    })

    pusherRef.current = pusher

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`workforce-${user.parent_id}`)
      pusher.disconnect()
    }
  }, [user?.parent_id])

  const agents = data?.agents ?? []
  const summary = data?.summary ?? { total: 0, clocked_in: 0, available: 0, on_call: 0, on_break: 0, after_call_work: 0, offline: 0 }

  const filtered = agents.filter(a => {
    const matchStatus  = filterStatus === 'all' || a.dialer_status === filterStatus
    const matchSearch  = !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.extension?.includes(searchTerm)
    return matchStatus && matchSearch
  })

  const updatedStr = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Activity size={12} /> Updated {updatedStr}
          </span>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn-outline gap-2 text-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
      </div>

      {/* Staffing warnings */}
      {data?.staffing_warnings?.length ? (
        <StaffingWarning warnings={data.staffing_warnings} />
      ) : null}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total Agents"    value={summary.total}     icon={Users}      color="bg-indigo-500" />
        <SummaryCard label="Clocked In"      value={summary.clocked_in} icon={UserCheck} color="bg-teal-500" />
        <SummaryCard label="Available"       value={summary.available}  icon={Activity}  color="bg-emerald-500" />
        <SummaryCard label="On Call"         value={summary.on_call}    icon={Phone}     color="bg-blue-500" />
        <SummaryCard label="On Break"        value={summary.on_break}   icon={Coffee}    color="bg-amber-500" />
        <SummaryCard label="Offline"         value={summary.offline}    icon={Users}     color="bg-slate-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search agent or extension…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {(['all', 'available', 'on_call', 'on_break', 'after_call_work', 'offline'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              filterStatus === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
            {s !== 'all' && (
              <span className="ml-1 opacity-70">
                ({summary[s as keyof typeof summary] ?? 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Agent grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <Users size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No agents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStatusChange={(id, status) => statusMutation.mutate({ userId: id, status })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
