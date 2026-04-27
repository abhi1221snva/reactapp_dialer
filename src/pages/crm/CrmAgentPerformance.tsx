import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, TrendingUp, Users, BarChart3, Trophy, UserPlus,
  Send, ChevronLeft, Loader2, Plus, X, Pencil, Trash2,
  CheckCircle, RefreshCw, Award, Target, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { useAuthStore } from '../../stores/auth.store'
import { LEVELS } from '../../utils/permissions'
import type {
  AgentPerformanceSummary,
  AgentPerformanceRow,
  AgentDetailResponse,
  AgentBonus,
} from '../../types/crm.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function quietFetch<T>(fn: () => Promise<{ data: { data?: T } | T }>): Promise<T | null> {
  try {
    const res = await fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((res.data as any)?.data ?? res.data) as T
  } catch (e: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (e as any)?.response?.status
    if (status === 403 || status === 404) return null
    throw e
  }
}

const pct = (n: number) => `${(n ?? 0).toFixed(1)}%`

const num = (n: number) =>
  new Intl.NumberFormat('en-US').format(n ?? 0)

const usdFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(mo, 10) - 1]} ${y}`
}

const BONUS_TYPE_LABELS: Record<string, string> = {
  monthly_target: 'Monthly Target',
  quarterly_target: 'Quarterly Target',
  spiff: 'SPIFF',
  retention: 'Retention',
  custom: 'Custom',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  clawback: 'bg-red-100 text-red-700',
  funded: 'bg-emerald-100 text-emerald-700',
  submitted: 'bg-amber-100 text-amber-700',
  new_lead: 'bg-slate-100 text-slate-600',
  docs_in: 'bg-blue-100 text-blue-700',
  app_out: 'bg-indigo-100 text-indigo-700',
  declined: 'bg-red-100 text-red-600',
  contract_in: 'bg-cyan-100 text-cyan-700',
  contract_out: 'bg-teal-100 text-teal-700',
}

const TYPE_COLORS: Record<string, string> = {
  hot: 'bg-red-100 text-red-700',
  warm: 'bg-amber-100 text-amber-700',
  cold: 'bg-blue-100 text-blue-700',
}

// ─── Summary Cards ───────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: AgentPerformanceSummary | null }) {
  if (!summary) return null
  const cards = [
    { label: 'Total Leads',     value: num(summary.total_leads), icon: Users,       color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
    { label: 'New Leads',       value: num(summary.new_leads),   icon: UserPlus,    color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'Submitted',       value: num(summary.submitted),   icon: Send,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
    { label: 'Approved',        value: num(summary.approved),    icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Funded',          value: num(summary.funded),      icon: DollarSign,  color: 'text-green-600',   bg: 'bg-green-50'   },
    { label: 'Conversion Rate', value: pct(summary.conversion_rate), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
              <c.icon size={15} className={c.color} />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900">{c.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function Leaderboard({ rows, onSelect }: { rows: AgentPerformanceRow[]; onSelect: (id: number) => void }) {
  return (
    <div className="table-wrapper">
      <div className="overflow-x-auto">
        <table className="table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 70 }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">Rank</th>
              <th className="text-left">Agent</th>
              <th className="text-right">Total Leads</th>
              <th className="text-right">Funded</th>
              <th className="text-right">Approved</th>
              <th className="text-right">Submitted</th>
              <th className="text-right">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.agent_id}
                onClick={() => onSelect(row.agent_id)}
                className="cursor-pointer hover:bg-emerald-50/50 transition-colors"
              >
                <td>
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Trophy size={14} className="text-amber-500" />}
                    {idx === 1 && <Trophy size={14} className="text-slate-400" />}
                    {idx === 2 && <Trophy size={14} className="text-amber-700" />}
                    <span className="text-sm font-semibold text-slate-700">#{idx + 1}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center text-xs font-bold text-emerald-700">
                      {row.agent_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium text-slate-900 truncate">{row.agent_name}</span>
                  </div>
                </td>
                <td className="text-right"><span className="text-sm font-semibold text-slate-800">{num(row.total_leads)}</span></td>
                <td className="text-right"><span className="text-sm font-semibold text-emerald-700">{num(row.funded)}</span></td>
                <td className="text-right"><span className="text-sm font-semibold text-blue-700">{num(row.approved)}</span></td>
                <td className="text-right"><span className="text-sm text-slate-700">{num(row.submitted)}</span></td>
                <td className="text-right"><span className="text-sm text-slate-600">{pct(row.conversion_rate)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Agent Detail View ───────────────────────────────────────────────────────

function AgentDetail({ agentId, onBack }: { agentId: number; onBack: () => void }) {
  const { data: rawDetail, isLoading } = useQuery({
    queryKey: ['agent-detail', agentId],
    queryFn: () => quietFetch<AgentDetailResponse>(() => crmService.getAgentPerformanceDetail(agentId)),
    staleTime: 30_000,
    retry: false,
  })

  const detail = rawDetail ?? null

  if (isLoading && !detail) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-slate-500">No data available for this agent.</p>
        <button onClick={onBack} className="mt-3 text-sm text-emerald-600 underline">Back to Leaderboard</button>
      </div>
    )
  }

  const stats = detail.summary
  const statCards = [
    { label: 'Total Leads',     value: num(stats.total_leads),     icon: Users,       color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
    { label: 'Funded',          value: num(stats.funded),           icon: DollarSign,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Approved',        value: num(stats.approved),         icon: CheckCircle, color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'Submitted',       value: num(stats.submitted),        icon: Send,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
    { label: 'Docs In',         value: num(stats.docs_in),          icon: Target,      color: 'text-slate-600',   bg: 'bg-slate-50'   },
    { label: 'Conversion Rate', value: pct(stats.conversion_rate),  icon: TrendingUp,  color: 'text-purple-600',  bg: 'bg-purple-50'  },
  ]

  // Trend helpers
  const maxLeads = Math.max(...detail.monthly_trend.map(t => t.leads), 1)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="action-btn"><ChevronLeft size={16} /></button>
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
          {detail.agent_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{detail.agent_name}</h2>
          <p className="text-xs text-slate-500">Agent Performance Detail</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-3">
            <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
              <c.icon size={13} className={c.color} />
            </div>
            <p className="text-base font-bold text-slate-900">{c.value}</p>
            <p className="text-[11px] text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Monthly Lead Trend</h3>
        {detail.monthly_trend.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No monthly data available</p>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {detail.monthly_trend.map(t => {
              const h = Math.max((t.leads / maxLeads) * 100, 8)
              return (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-indigo-700">{t.leads}</span>
                  <div
                    className="w-full bg-indigo-200 rounded-t-md transition-all"
                    style={{ height: `${h}%` }}
                    title={`${fmtMonth(t.month)}: ${t.leads} leads`}
                  />
                  <span className="text-[10px] text-slate-500">{fmtMonth(t.month)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Recent Leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Lead ID', 'Business Name', 'Status', 'Type', 'Date'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-400">No leads found</td>
                </tr>
              ) : detail.leads.map(l => (
                <tr key={l.lead_id}>
                  <td><span className="text-sm font-mono text-slate-600">#{l.lead_id}</span></td>
                  <td><span className="text-sm font-medium text-slate-900">{l.business_name || '—'}</span></td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[l.lead_status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {l.lead_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {l.lead_type ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[l.lead_type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {l.lead_type}
                      </span>
                    ) : '—'}
                  </td>
                  <td><span className="text-sm text-slate-600">{fmtDate(l.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Bonus Modal ─────────────────────────────────────────────────────────────

function BonusModal({ editing, onClose, onSaved }: {
  editing?: AgentBonus | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [form, setForm] = useState({
    agent_id: editing ? String(editing.agent_id) : '',
    bonus_type: editing?.bonus_type ?? 'monthly_target',
    description: editing?.description ?? '',
    amount: editing ? String(editing.amount) : '',
    period: editing?.period ?? '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        agent_id: Number(form.agent_id),
        bonus_type: form.bonus_type,
        description: form.description || undefined,
        amount: Number(form.amount),
        period: form.period || undefined,
      }
      return isEdit
        ? crmService.updateAgentBonus(editing!.id, payload)
        : crmService.createAgentBonus(payload as { agent_id: number; bonus_type: string; amount: number; period?: string; description?: string })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Bonus updated' : 'Bonus created')
      qc.invalidateQueries({ queryKey: ['agent-bonuses'] })
      onSaved()
    },
    onError: () => toast.error('Failed to save bonus'),
  })

  const isValid = form.agent_id && Number(form.amount) > 0

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit Bonus' : 'Add Bonus'}
          </h2>
          <button onClick={onClose} className="action-btn"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Agent ID <span className="text-red-500">*</span></label>
            <input className="input w-full" type="number" min="1" value={form.agent_id}
              onChange={e => set('agent_id', e.target.value)} placeholder="Agent user ID" />
          </div>
          <div>
            <label className="label">Bonus Type <span className="text-red-500">*</span></label>
            <select className="input w-full" value={form.bonus_type} onChange={e => set('bonus_type', e.target.value)}>
              {Object.entries(BONUS_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount ($) <span className="text-red-500">*</span></label>
            <input className="input w-full" type="number" min="0" step="0.01" value={form.amount}
              onChange={e => set('amount', e.target.value)} placeholder="e.g. 2500" />
          </div>
          <div>
            <label className="label">Period</label>
            <input className="input w-full" value={form.period} onChange={e => set('period', e.target.value)}
              placeholder="e.g. 2026-03, 2026-Q1" />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input w-full" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Optional note" />
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}
            className="btn-success flex items-center gap-2 disabled:opacity-50">
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Bonus'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Bonuses Tab ─────────────────────────────────────────────────────────────

function BonusesTab() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isManager = (user?.level ?? 1) >= LEVELS.ASSOCIATE
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AgentBonus | null>(null)

  const { data: rawBonuses, isLoading } = useQuery({
    queryKey: ['agent-bonuses'],
    queryFn: () => quietFetch<AgentBonus[]>(() => crmService.getAgentBonuses()),
    staleTime: 30_000,
    retry: false,
  })

  const bonuses = rawBonuses ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteAgentBonus(id),
    onSuccess: () => {
      toast.success('Bonus deleted')
      qc.invalidateQueries({ queryKey: ['agent-bonuses'] })
    },
    onError: () => toast.error('Failed to delete bonus'),
  })

  return (
    <>
      {isManager && (
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="btn-success flex items-center gap-2">
            <Plus size={15} /> Add Bonus
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Agent', 'Type', 'Description', 'Amount', 'Period', 'Status', ...(isManager ? ['Actions'] : [])].map(h => (
                  <th key={h} className={h === 'Actions' ? 'text-right' : ''}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex justify-center"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
                  </td>
                </tr>
              ) : bonuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                        <Award size={22} className="text-amber-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">No bonuses yet</p>
                      <p className="text-xs text-slate-400 mt-1">Add a bonus to reward top performers.</p>
                    </div>
                  </td>
                </tr>
              ) : bonuses.map(b => (
                <tr key={b.id}>
                  <td>
                    <span className="text-sm font-medium text-slate-900">{b.agent_name ?? `Agent #${b.agent_id}`}</span>
                  </td>
                  <td>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {BONUS_TYPE_LABELS[b.bonus_type] ?? b.bonus_type}
                    </span>
                  </td>
                  <td><span className="text-sm text-slate-600">{b.description || '—'}</span></td>
                  <td><span className="text-sm font-semibold text-emerald-700">{usdFull(b.amount)}</span></td>
                  <td><span className="text-sm text-slate-600">{b.period || '—'}</span></td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[b.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {b.status}
                    </span>
                  </td>
                  {isManager && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditing(b); setShowModal(true) }} className="action-btn" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteMutation.mutate(b.id)}
                          disabled={deleteMutation.isPending}
                          className="action-btn text-red-400 hover:text-red-600" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <BonusModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </>
  )
}

// ─── Page Component ──────────────────────────────────────────────────────────

export function CrmAgentPerformance() {
  const { setDescription, setActions } = useCrmHeader()
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null)

  useEffect(() => {
    setDescription('Track agent lead performance and pipeline')
    setActions(undefined)
    return () => { setDescription(undefined); setActions(undefined) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: rawSummary } = useQuery({
    queryKey: ['agent-perf-summary'],
    queryFn: () => quietFetch<AgentPerformanceSummary>(() => crmService.getAgentPerformanceSummary()),
    staleTime: 60_000,
    retry: false,
  })

  const { data: rawLeaderboard } = useQuery({
    queryKey: ['agent-perf-leaderboard'],
    queryFn: () => quietFetch<AgentPerformanceRow[]>(() => crmService.getLeaderboard()),
    staleTime: 60_000,
    retry: false,
  })

  const summary = rawSummary ?? null
  const leaderboard = rawLeaderboard ?? []

  // If an agent is selected, show their detail view
  if (selectedAgent) {
    return (
      <div className="space-y-5">
        <AgentDetail agentId={selectedAgent} onBack={() => setSelectedAgent(null)} />
      </div>
    )
  }

  // Default: overview with summary + leaderboard
  return (
    <div className="space-y-5">
      <SummaryCards summary={summary} />
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Trophy size={15} className="text-amber-500" />
            Agent Leaderboard
          </h3>
          <p className="text-xs text-slate-400">Click a row to view agent detail</p>
        </div>
        <Leaderboard rows={leaderboard} onSelect={setSelectedAgent} />
      </div>
    </div>
  )
}
