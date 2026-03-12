import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Headphones, Mic, Users, RefreshCw, Circle } from 'lucide-react'
import { dialerService } from '../../services/dialer.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { formatDuration } from '../../utils/format'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

interface LiveCall { id: string; agent_name: string; extension: string; phone_number: string; duration: number; campaign: string; campaign_id?: number; [key: string]: unknown }
interface AgentStatus { id: number; name: string; extension: string; status: string; campaign?: string; [key: string]: unknown }

const STATUS_DOT: Record<string, string> = {
  available: 'bg-emerald-500',
  'on-call': 'bg-red-500',
  break: 'bg-amber-500',
  offline: 'bg-slate-400',
}
const STATUS_LABEL: Record<string, string> = {
  available: 'text-emerald-600',
  'on-call': 'text-red-600',
  break: 'text-amber-600',
  offline: 'text-slate-400',
}

export function AgentMonitoring() {
  const [autoRefresh, setAutoRefresh] = useState(true)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['live-calls'],
    queryFn: () => dialerService.getLiveCalls(),
    refetchInterval: autoRefresh ? 5000 : false,
    refetchIntervalInBackground: true,
  })

  const liveCalls: LiveCall[] = data?.data?.data?.live_calls || []
  const agents: AgentStatus[] = data?.data?.data?.agents || []

  const handleListen = async (ext: string, campaignId: string) => {
    try {
      await dialerService.listenCall({ extension: ext, campaign_id: Number(campaignId) })
      toast.success(`Listening to ${ext}`)
    } catch { /* handled by interceptor */ }
  }

  const handleBarge = async (ext: string, campaignId: string) => {
    try {
      await dialerService.bargeCall({ extension: ext, campaign_id: Number(campaignId) })
      toast.success(`Barged into ${ext}`)
    } catch { /* handled by interceptor */ }
  }

  const total = agents.length
  const onCall = agents.filter(a => a.status === 'on-call').length
  const available = agents.filter(a => a.status === 'available').length
  const onBreak = agents.filter(a => a.status === 'break').length

  const callColumns: Column<LiveCall>[] = [
    {
      key: 'agent_name', header: 'Agent',
      render: r => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {(r.agent_name || 'A').charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-900">{r.agent_name}</span>
        </div>
      ),
    },
    {
      key: 'extension', header: 'Extension',
      render: r => <code className="text-xs bg-slate-100 px-2 py-1 rounded-lg font-mono font-semibold text-slate-700">{r.extension}</code>,
    },
    {
      key: 'phone_number', header: 'Number',
      render: r => <span className="text-sm font-mono text-slate-700">{r.phone_number}</span>,
    },
    {
      key: 'campaign', header: 'Campaign',
      render: r => <span className="text-sm text-slate-600">{r.campaign}</span>,
    },
    {
      key: 'duration', header: 'Duration',
      render: r => (
        <span className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {formatDuration(Number(r.duration))}
        </span>
      ),
    },
    {
      key: 'actions', header: '',
      render: r => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleListen(r.extension, String(r.campaign_id ?? 0))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
          >
            <Headphones size={12} /> Listen
          </button>
          <button
            onClick={() => handleBarge(r.extension, String(r.campaign_id ?? 0))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold transition-colors"
          >
            <Mic size={12} /> Barge
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Monitoring</h1>
          <p className="page-subtitle">Real-time supervisor view</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <div
              onClick={() => setAutoRefresh(v => !v)}
              className={cn(
                'w-9 h-5 rounded-full transition-colors relative cursor-pointer',
                autoRefresh ? 'bg-indigo-600' : 'bg-slate-300'
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                autoRefresh ? 'translate-x-4' : 'translate-x-0'
              )} />
            </div>
            Auto-refresh
          </label>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-indigo-600' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: total, icon: Users, gradient: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50', text: 'text-indigo-600' },
          { label: 'On Call', value: onCall, icon: Activity, gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', text: 'text-red-600' },
          { label: 'Available', value: available, icon: Headphones, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'On Break', value: onBreak, icon: Circle, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600' },
        ].map(stat => (
          <div key={stat.label} className="card flex items-center gap-4">
            <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm', stat.gradient)}>
              <stat.icon size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Live calls */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-900">Live Calls</h2>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold">{liveCalls.length}</span>
        </div>
        <DataTable columns={callColumns} data={liveCalls} loading={isLoading} emptyText="No active calls right now" />
      </div>

      {/* Agent grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3 px-1">Agent Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {agents.map((agent) => (
            <div key={agent.id} className="card p-3.5 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                    STATUS_DOT[agent.status] ?? 'bg-slate-400'
                  )} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{agent.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">ext {agent.extension}</p>
                </div>
              </div>
              <p className={cn('text-[11px] font-semibold capitalize', STATUS_LABEL[agent.status] ?? 'text-slate-500')}>
                {agent.status.replace('-', ' ')}
              </p>
              {agent.campaign && (
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{agent.campaign}</p>
              )}
            </div>
          ))}
          {agents.length === 0 && !isLoading && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Users size={32} className="text-slate-300" />
              <p className="text-sm">No agents online</p>
            </div>
          )}
          {agents.length === 0 && isLoading && (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-3.5 animate-pulse">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2.5 bg-slate-200 rounded w-2/3" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
