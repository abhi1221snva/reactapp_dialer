/**
 * CampaignAutoDialer
 *
 * Campaign management panel for the click-to-call auto-dialer.
 * Supervisors can start/stop campaigns, assign agents, and monitor queue stats.
 *
 * Route: /dialer/campaign-auto
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, RefreshCw, Phone, UserPlus, UserMinus } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  campaignDialerService,
  type CampaignQueueStats,
  type CampaignAgentInfo,
} from '../../services/campaignDialer.service'
import { dialerService } from '../../services/dialer.service'
import { crmService } from '../../services/crm.service'
import type { Campaign } from '../../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  available:       'bg-green-900 text-green-300',
  on_call:         'bg-blue-900 text-blue-300',
  on_break:        'bg-yellow-900 text-yellow-300',
  after_call_work: 'bg-purple-900 text-purple-300',
  offline:         'bg-gray-700 text-gray-400',
}

function AgentStatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status] ?? STATUS_COLOR.offline}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function StatBox({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-lg ${cls}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs opacity-70 mt-0.5">{label}</span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CampaignAutoDialer() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [newAgentId, setNewAgentId] = useState<number | ''>('')

  // ── Data queries ───────────────────────────────────────────────────────────

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['agent-campaigns'],
    queryFn: () => dialerService.getAgentCampaigns(),
  })

  const campaigns: Campaign[] = (campaignsData?.data?.data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    campaign_name: (c.campaign_name ?? c.title ?? '') as string,
    status:        (c.campaign_status ?? (Number(c.status) === 1 ? 'active' : 'inactive')) as string,
  }))

  // Queue status (polled every 5s)
  const { data: statusData } = useQuery({
    queryKey: ['campaign-dialer-status', selectedId],
    queryFn: () => campaignDialerService.getCampaignStatus(selectedId!),
    enabled: !!selectedId,
    refetchInterval: 5000,
  })

  // Assigned agents for the selected campaign
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['campaign-agents', selectedId],
    queryFn: () => campaignDialerService.listAgents(selectedId!),
    enabled: !!selectedId,
    refetchInterval: 10000,
  })

  // All users (for the "add agent" dropdown)
  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => crmService.getUsers(),
    enabled: !!selectedId,
    staleTime: 60_000,
  })

  const stats: CampaignQueueStats | null = statusData?.data?.stats ?? null
  const liveCalls: Array<Record<string, unknown>> = (statusData?.data?.live_calls ?? []) as Array<Record<string, unknown>>
  const assignedAgents: CampaignAgentInfo[] = agentsData?.data?.agents ?? []
  // dialer_status comes from the polled /status endpoint (not the campaign list which has a boolean `status`)
  const dialerStatus: string = statusData?.data?.dialer_status ?? ''

  const selected   = campaigns.find((c) => c.id === selectedId)
  const isRunning  = dialerStatus === 'running'
  const pct        = stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0

  // Unassigned users for the dropdown (exclude already-assigned)
  const assignedIds = new Set(assignedAgents.map((a) => a.user_id))
  const unassignedUsers = (allUsers ?? []).filter((u) => !assignedIds.has(u.id))

  // ── Mutations ──────────────────────────────────────────────────────────────

  const startMutation = useMutation({
    mutationFn: (id: number) => campaignDialerService.startCampaign(id),
    onSuccess: (res) => {
      toast.success(`Campaign started — ${res.data.queue_count} leads queued`)
      qc.invalidateQueries({ queryKey: ['campaign-dialer-status', selectedId] })
    },
    onError: () => toast.error('Failed to start campaign'),
  })

  const stopMutation = useMutation({
    mutationFn: (id: number) => campaignDialerService.stopCampaign(id),
    onSuccess: () => {
      toast.success('Campaign paused')
      qc.invalidateQueries({ queryKey: ['campaign-dialer-status', selectedId] })
    },
    onError: () => toast.error('Failed to pause campaign'),
  })

  const populateMutation = useMutation({
    mutationFn: (id: number) => campaignDialerService.populateQueue(id),
    onSuccess: (res) => {
      toast.success(`Queue populated — ${res.data.total_leads} leads`)
      qc.invalidateQueries({ queryKey: ['campaign-dialer-status', selectedId] })
    },
    onError: () => toast.error('Failed to populate queue'),
  })

  const assignMutation = useMutation({
    mutationFn: ({ campaignId, userId }: { campaignId: number; userId: number }) =>
      campaignDialerService.assignAgent(campaignId, userId),
    onSuccess: () => {
      toast.success('Agent assigned')
      setNewAgentId('')
      qc.invalidateQueries({ queryKey: ['campaign-agents', selectedId] })
    },
    onError: () => toast.error('Failed to assign agent'),
  })

  const removeMutation = useMutation({
    mutationFn: ({ campaignId, userId }: { campaignId: number; userId: number }) =>
      campaignDialerService.removeAgent(campaignId, userId),
    onSuccess: () => {
      toast.success('Agent removed')
      qc.invalidateQueries({ queryKey: ['campaign-agents', selectedId] })
    },
    onError: () => toast.error('Failed to remove agent'),
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="animate-spin w-5 h-5 mr-2" />Loading campaigns…
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Campaign Auto-Dialer</h1>
        <p className="text-sm text-gray-400 mt-1">
          Agent-first click-to-call — backend dials the agent first, then auto-connects the customer.
        </p>
      </div>

      {/* Campaign selector */}
      <div className="bg-gray-800 rounded-xl p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-300">Select Campaign</label>
        <select
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          value={selectedId ?? ''}
          onChange={(e) => { setSelectedId(e.target.value ? Number(e.target.value) : null); setNewAgentId('') }}
        >
          <option value="">— Choose a campaign —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.campaign_name} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {selectedId && (
        <>
          {/* Controls row */}
          <div className="bg-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">{selected?.campaign_name}</h2>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                dialerStatus === 'running'   ? 'bg-green-900 text-green-300' :
                dialerStatus === 'paused'    ? 'bg-yellow-900 text-yellow-300' :
                dialerStatus === 'completed' ? 'bg-blue-900 text-blue-300' :
                'bg-gray-700 text-gray-400'
              }`}>
                {dialerStatus === 'running'   ? '● Running' :
                 dialerStatus === 'paused'    ? '⏸ Paused' :
                 dialerStatus === 'completed' ? '✓ Completed' :
                 'Not started'}
              </span>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => populateMutation.mutate(selectedId)}
                disabled={populateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${populateMutation.isPending ? 'animate-spin' : ''}`} />
                Populate Queue
              </button>

              <button
                onClick={() => startMutation.mutate(selectedId)}
                disabled={isRunning || startMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Start
              </button>

              <button
                onClick={() => stopMutation.mutate(selectedId)}
                disabled={!isRunning || stopMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                Pause
              </button>
            </div>
          </div>

          {/* Assigned agents */}
          <div className="bg-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-400" />
              Assigned Agents
              <span className="text-xs text-gray-400 font-normal ml-1">
                (agents the dialer will ring for this campaign)
              </span>
            </h3>

            {/* Add agent row */}
            <div className="flex gap-2">
              <select
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">— Select agent to add —</option>
                {unassignedUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (newAgentId && selectedId) {
                    assignMutation.mutate({ campaignId: selectedId, userId: newAgentId as number })
                  }
                }}
                disabled={!newAgentId || assignMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Agent list */}
            {agentsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : assignedAgents.length === 0 ? (
              <p className="text-sm text-yellow-400">
                ⚠ No agents assigned — the dialer will not make any calls until you add at least one agent.
              </p>
            ) : (
              <div className="space-y-2">
                {assignedAgents.map((agent) => (
                  <div key={agent.user_id} className="flex items-center gap-3 bg-gray-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-white font-medium">{agent.name}</span>
                    <span className="text-gray-400 text-xs">ext {agent.extension ?? '—'}</span>
                    <AgentStatusBadge status={agent.status} />
                    <button
                      onClick={() => removeMutation.mutate({ campaignId: selectedId, userId: agent.user_id })}
                      disabled={removeMutation.isPending}
                      className="ml-auto text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Remove agent"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Queue stats */}
          {stats && (
            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-white">Queue Statistics</h3>
              <div className="flex gap-3 flex-wrap">
                <StatBox label="Total"     value={stats.total}     cls="bg-slate-700 text-white" />
                <StatBox label="Pending"   value={stats.pending}   cls="bg-yellow-900 text-yellow-200" />
                <StatBox label="Calling"   value={stats.calling}   cls="bg-blue-900 text-blue-200" />
                <StatBox label="Completed" value={stats.completed} cls="bg-green-900 text-green-200" />
                <StatBox label="Failed"    value={stats.failed}    cls="bg-red-900 text-red-200" />
              </div>
              {stats.total > 0 && (
                <>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{pct}% complete</p>
                </>
              )}
            </div>
          )}

          {/* Live calls */}
          {liveCalls.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-400 animate-pulse" />
                Live Calls ({liveCalls.length})
              </h3>
              <div className="space-y-2">
                {liveCalls.map((call, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-300">Ext {String(call.extension)}</span>
                    <span className="text-gray-400">→ Lead #{String(call.lead_id)}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                      call.call_status === 'bridged' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                    }`}>
                      {String(call.call_status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 text-sm text-gray-400 space-y-2">
            <p className="font-medium text-gray-300">Setup checklist:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Add at least one agent above (they must be logged in + WebPhone registered)</li>
              <li>Click <strong className="text-white">Populate Queue</strong> to load leads</li>
              <li>Click <strong className="text-white">Start</strong> — system rings the agent's WebPhone</li>
              <li>Agent answers → Asterisk auto-connects the customer → lead info appears</li>
              <li>After hang-up + disposition → next lead is auto-dialed</li>
            </ol>
            <p className="mt-2 text-xs text-gray-500">
              AMI listener must be running: <code className="bg-gray-800 px-1 rounded">php artisan ami:listen --client=CLIENT_ID</code>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
