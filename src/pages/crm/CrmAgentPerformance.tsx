import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, TrendingUp, Users, BarChart3, Trophy, ArrowUpRight,
  ArrowDownRight, Minus, ChevronLeft, Loader2, Plus, X, Pencil, Trash2,
  CheckCircle, AlertTriangle, RefreshCw, Award, Target, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type {
  AgentPerformanceSummary,
  AgentPerformanceRow,
  AgentDetailResponse,
  AgentBonus,
} from '../../types/crm.types'

// ─── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_SUMMARY: AgentPerformanceSummary = {
  total_funded_volume: 4_250_000,
  total_deals: 47,
  total_commissions: 212_500,
  avg_deal_size: 90_425.53,
  renewal_rate: 32.5,
  default_rate: 4.2,
}

const SAMPLE_LEADERBOARD: AgentPerformanceRow[] = [
  { agent_id: 1, agent_name: 'Marcus Rivera',    deals: 14, funded_volume: 1_450_000, commission: 72_500, conversion_rate: 28.5, avg_deal_size: 103_571 },
  { agent_id: 2, agent_name: 'Sarah Chen',       deals: 12, funded_volume: 1_180_000, commission: 59_000, conversion_rate: 24.0, avg_deal_size: 98_333  },
  { agent_id: 3, agent_name: 'James Okafor',     deals: 9,  funded_volume: 820_000,   commission: 41_000, conversion_rate: 22.1, avg_deal_size: 91_111  },
  { agent_id: 4, agent_name: 'Emily Nguyen',     deals: 7,  funded_volume: 510_000,   commission: 25_500, conversion_rate: 18.7, avg_deal_size: 72_857  },
  { agent_id: 5, agent_name: 'Derek Washington', deals: 5,  funded_volume: 290_000,   commission: 14_500, conversion_rate: 15.2, avg_deal_size: 58_000  },
]

const SAMPLE_DETAIL: AgentDetailResponse = {
  agent_id: 1,
  agent_name: 'Marcus Rivera',
  summary: {
    total_deals: 14,
    funded_volume: 1_450_000,
    total_commission: 72_500,
    avg_deal_size: 103_571,
    pipeline_value: 340_000,
    conversion_rate: 28.5,
  },
  deals: [
    { deal_id: 101, lead_id: 12210, company_name: 'Acme Trucking LLC',       lender_name: 'Libertas Funding',  funded_amount: 125_000, factor_rate: 1.35, commission: 6_250,  status: 'funded',        funding_date: '2026-03-15' },
    { deal_id: 102, lead_id: 12215, company_name: 'Metro Plumbing Inc',      lender_name: 'OnDeck Capital',    funded_amount: 95_000,  factor_rate: 1.28, commission: 4_750,  status: 'in_repayment',  funding_date: '2026-03-10' },
    { deal_id: 103, lead_id: 12220, company_name: 'Sunrise Bakery',          lender_name: 'Clearco',           funded_amount: 150_000, factor_rate: 1.42, commission: 7_500,  status: 'funded',        funding_date: '2026-03-22' },
    { deal_id: 104, lead_id: 12225, company_name: 'Peak Fitness Studio',     lender_name: 'Rapid Finance',     funded_amount: 80_000,  factor_rate: 1.30, commission: 4_000,  status: 'in_repayment',  funding_date: '2026-02-28' },
    { deal_id: 105, lead_id: 12230, company_name: 'Harbor Seafood Restaurant', lender_name: 'Libertas Funding', funded_amount: 200_000, factor_rate: 1.38, commission: 10_000, status: 'funded',        funding_date: '2026-03-25' },
  ],
  monthly_trend: [
    { month: '2025-10', deals: 3, funded_volume: 280_000,  commission: 14_000  },
    { month: '2025-11', deals: 4, funded_volume: 350_000,  commission: 17_500  },
    { month: '2025-12', deals: 2, funded_volume: 190_000,  commission: 9_500   },
    { month: '2026-01', deals: 5, funded_volume: 520_000,  commission: 26_000  },
    { month: '2026-02', deals: 4, funded_volume: 410_000,  commission: 20_500  },
    { month: '2026-03', deals: 5, funded_volume: 450_000,  commission: 22_500  },
  ],
}

const SAMPLE_BONUSES: AgentBonus[] = [
  { id: 1, agent_id: 1, agent_name: 'Marcus Rivera', bonus_type: 'monthly_target', description: 'March 2026 target bonus — 10+ deals', amount: 2_500, period: '2026-03', status: 'pending', created_at: '2026-03-01' },
  { id: 2, agent_id: 2, agent_name: 'Sarah Chen', bonus_type: 'spiff', description: 'Libertas Funding SPIFF — $500 per deal', amount: 1_500, period: '2026-03', status: 'approved', created_at: '2026-03-05' },
  { id: 3, agent_id: 3, agent_name: 'James Okafor', bonus_type: 'retention', description: 'Q1 retention bonus — 0 defaults', amount: 1_000, period: '2026-Q1', status: 'paid', paid_at: '2026-03-28', created_at: '2026-01-01' },
  { id: 4, agent_id: 1, agent_name: 'Marcus Rivera', bonus_type: 'quarterly_target', description: 'Q1 top closer award', amount: 5_000, period: '2026-Q1', status: 'approved', created_at: '2026-01-01' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Silently catch 403/404 from API and return null instead of throwing (avoids global toast). */
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

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0)

const usdFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const pct = (n: number) => `${(n ?? 0).toFixed(1)}%`

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
  in_repayment: 'bg-blue-100 text-blue-700',
  defaulted: 'bg-red-100 text-red-600',
}

// ─── Summary Cards ───────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: AgentPerformanceSummary }) {
  const cards = [
    { label: 'Total Funded Volume', value: usd(summary.total_funded_volume), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Deals',         value: String(summary.total_deals),      icon: Target,     color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
    { label: 'Total Commissions',   value: usd(summary.total_commissions),   icon: Trophy,     color: 'text-amber-600',   bg: 'bg-amber-50'   },
    { label: 'Avg Deal Size',       value: usd(summary.avg_deal_size),       icon: BarChart3,  color: 'text-slate-600',   bg: 'bg-slate-50'   },
    { label: 'Renewal Rate',        value: pct(summary.renewal_rate),        icon: RefreshCw,  color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'Default Rate',        value: pct(summary.default_rate),        icon: AlertTriangle, color: 'text-red-500',  bg: 'bg-red-50'     },
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
            <col style={{ width: 80 }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: 80 }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">Rank</th>
              <th className="text-left">Agent</th>
              <th className="text-right">Deals</th>
              <th className="text-right">Funded Volume</th>
              <th className="text-right">Commission</th>
              <th className="text-right">Conversion</th>
              <th className="text-right">Avg Deal Size</th>
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
                      {row.agent_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm font-medium text-slate-900 truncate">{row.agent_name}</span>
                  </div>
                </td>
                <td className="text-right"><span className="text-sm font-semibold text-slate-800">{row.deals}</span></td>
                <td className="text-right"><span className="text-sm font-semibold text-emerald-700">{usd(row.funded_volume)}</span></td>
                <td className="text-right"><span className="text-sm font-semibold text-indigo-700">{usd(row.commission)}</span></td>
                <td className="text-right"><span className="text-sm text-slate-700">{pct(row.conversion_rate)}</span></td>
                <td className="text-right"><span className="text-sm text-slate-600">{usd(row.avg_deal_size)}</span></td>
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

  const detail = rawDetail ?? (agentId === 1 ? SAMPLE_DETAIL : null)

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
    { label: 'Total Deals', value: String(stats.total_deals), icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Funded Volume', value: usd(stats.funded_volume), icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Commission', value: usd(stats.total_commission), icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Avg Deal Size', value: usd(stats.avg_deal_size), icon: BarChart3, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Pipeline Value', value: usd(stats.pipeline_value), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Conversion Rate', value: pct(stats.conversion_rate), icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  // Trend helpers
  const maxVol = Math.max(...detail.monthly_trend.map(t => t.funded_volume), 1)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="action-btn"><ChevronLeft size={16} /></button>
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
          {detail.agent_name.split(' ').map(n => n[0]).join('')}
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
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Monthly Trend</h3>
        <div className="flex items-end gap-2 h-32">
          {detail.monthly_trend.map(t => {
            const h = Math.max((t.funded_volume / maxVol) * 100, 8)
            return (
              <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-emerald-700">{usd(t.funded_volume)}</span>
                <div
                  className="w-full bg-emerald-200 rounded-t-md transition-all"
                  style={{ height: `${h}%` }}
                  title={`${fmtMonth(t.month)}: ${t.deals} deals, ${usd(t.funded_volume)}`}
                />
                <span className="text-[10px] text-slate-500">{fmtMonth(t.month)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Deal History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Lead', 'Company', 'Lender', 'Funded', 'Factor', 'Commission', 'Status', 'Date'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.deals.map(d => (
                <tr key={d.deal_id}>
                  <td><span className="text-sm font-mono text-slate-600">#{d.lead_id}</span></td>
                  <td><span className="text-sm font-medium text-slate-900">{d.company_name || '—'}</span></td>
                  <td><span className="text-sm text-slate-600">{d.lender_name || '—'}</span></td>
                  <td><span className="text-sm font-semibold text-emerald-700">{usd(d.funded_amount)}</span></td>
                  <td><span className="text-sm text-slate-700">{d.factor_rate?.toFixed(2) ?? '—'}</span></td>
                  <td><span className="text-sm font-semibold text-indigo-700">{usdFull(d.commission)}</span></td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[d.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td><span className="text-sm text-slate-600">{fmtDate(d.funding_date)}</span></td>
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
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AgentBonus | null>(null)

  const { data: rawBonuses, isLoading } = useQuery({
    queryKey: ['agent-bonuses'],
    queryFn: () => quietFetch<AgentBonus[]>(() => crmService.getAgentBonuses()),
    staleTime: 30_000,
    retry: false,
  })

  const bonuses = (rawBonuses ?? []).length > 0 ? rawBonuses! : SAMPLE_BONUSES

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
      <div className="flex items-center justify-end mb-4">
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="btn-success flex items-center gap-2">
          <Plus size={15} /> Add Bonus
        </button>
      </div>

      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Agent', 'Type', 'Description', 'Amount', 'Period', 'Status', 'Actions'].map(h => (
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

type Tab = 'overview' | 'agent' | 'bonuses'

export function CrmAgentPerformance() {
  const { setDescription, setActions } = useCrmHeader()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null)

  useEffect(() => {
    setDescription('Track agent deal performance, commissions, and bonuses')
    setActions(undefined)
    return () => { setDescription(undefined); setActions(undefined) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch data with sample fallback
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

  const summary = rawSummary ?? SAMPLE_SUMMARY
  const leaderboard = (rawLeaderboard ?? []).length > 0 ? rawLeaderboard! : SAMPLE_LEADERBOARD

  const handleAgentSelect = (agentId: number) => {
    setSelectedAgent(agentId)
    setActiveTab('agent')
  }

  const tabs: { label: string; value: Tab; icon: typeof Users }[] = [
    { label: 'Overview',  value: 'overview', icon: BarChart3 },
    { label: 'Agent Detail', value: 'agent', icon: Users },
    { label: 'Bonuses',   value: 'bonuses',  icon: Award },
  ]

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.value
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
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
            <Leaderboard rows={leaderboard} onSelect={handleAgentSelect} />
          </div>
        </div>
      )}

      {/* Agent Detail Tab */}
      {activeTab === 'agent' && (
        selectedAgent ? (
          <AgentDetail agentId={selectedAgent} onBack={() => { setSelectedAgent(null); setActiveTab('overview') }} />
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">Select an agent from the leaderboard</p>
            <p className="text-xs text-slate-400 mt-1">Click on an agent row in the Overview tab to view their details.</p>
            <button onClick={() => setActiveTab('overview')} className="mt-3 text-sm text-emerald-600 underline">
              Go to Overview
            </button>
          </div>
        )
      )}

      {/* Bonuses Tab */}
      {activeTab === 'bonuses' && <BonusesTab />}
    </div>
  )
}
