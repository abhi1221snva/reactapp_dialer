import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, X, DollarSign, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { confirmDelete } from '../../utils/confirmDelete'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommissionRule {
  id: number
  lender_id?: number | null
  lender_name?: string
  deal_type: string
  commission_type: 'percentage' | 'flat'
  value: number
  split_agent_pct: number
  status: 0 | 1
  [key: string]: unknown
}

export interface CommissionLedgerItem {
  id: number
  lead_id: number
  funded_amount: number
  gross_commission: number
  agent_commission: number
  company_commission: number
  status: 'pending' | 'paid'
  paid_at?: string
  agent_name?: string
  [key: string]: unknown
}

export interface CommissionSummary {
  total_gross: number
  total_agent: number
  total_company: number
}

type LedgerStatus = 'all' | 'pending' | 'paid'
type LedgerPeriod = 'week' | 'month' | 'quarter'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const DEAL_TYPES = ['MCA', 'Term Loan', 'Line of Credit', 'SBA', 'Equipment', 'Invoice Factoring', 'Other']
const COMMISSION_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'flat',       label: 'Flat Amount ($)' },
]

interface RuleFormState {
  lender_id: string
  deal_type: string
  commission_type: 'percentage' | 'flat'
  value: string
  split_agent_pct: string
}

const EMPTY_RULE_FORM: RuleFormState = {
  lender_id:       '',
  deal_type:       'MCA',
  commission_type: 'percentage',
  value:           '',
  split_agent_pct: '50',
}

// ─── Rule Modal ───────────────────────────────────────────────────────────────

function RuleModal({
  editing,
  onClose,
  onSaved,
}: {
  editing?: CommissionRule | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [form, setForm] = useState<RuleFormState>(
    editing
      ? {
          lender_id:       editing.lender_id ? String(editing.lender_id) : '',
          deal_type:       editing.deal_type,
          commission_type: editing.commission_type,
          value:           String(editing.value),
          split_agent_pct: String(editing.split_agent_pct),
        }
      : EMPTY_RULE_FORM
  )

  const set = (k: keyof RuleFormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        lender_id:       form.lender_id ? Number(form.lender_id) : null,
        deal_type:       form.deal_type,
        commission_type: form.commission_type,
        value:           Number(form.value),
        split_agent_pct: Number(form.split_agent_pct),
      }
      return isEdit
        ? crmService.updateCommissionRule(editing!.id, payload)
        : crmService.createCommissionRule(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Rule updated' : 'Rule created')
      qc.invalidateQueries({ queryKey: ['commission-rules'] })
      onSaved()
    },
    onError: () => toast.error('Failed to save rule'),
  })

  const isValid = form.deal_type && form.value && Number(form.value) > 0 &&
    Number(form.split_agent_pct) >= 0 && Number(form.split_agent_pct) <= 100

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit Commission Rule' : 'Add Commission Rule'}
          </h2>
          <button onClick={onClose} className="action-btn"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Deal Type <span className="text-red-500">*</span></label>
            <select
              className="input w-full"
              value={form.deal_type}
              onChange={e => set('deal_type', e.target.value)}
            >
              {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Commission Type <span className="text-red-500">*</span></label>
            <select
              className="input w-full"
              value={form.commission_type}
              onChange={e => set('commission_type', e.target.value as 'percentage' | 'flat')}
            >
              {COMMISSION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              Value <span className="text-red-500">*</span>
              <span className="ml-1 text-slate-400 font-normal">
                {form.commission_type === 'percentage' ? '(%)' : '($)'}
              </span>
            </label>
            <input
              className="input w-full"
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={e => set('value', e.target.value)}
              placeholder={form.commission_type === 'percentage' ? 'e.g. 5.5' : 'e.g. 500'}
            />
          </div>

          <div>
            <label className="label">
              Agent Split % <span className="text-red-500">*</span>
              <span className="ml-1 text-slate-400 font-normal">(0–100)</span>
            </label>
            <input
              className="input w-full"
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.split_agent_pct}
              onChange={e => set('split_agent_pct', e.target.value)}
              placeholder="e.g. 50"
            />
          </div>

          <div>
            <label className="label">Lender (optional)</label>
            <input
              className="input w-full"
              type="number"
              min="1"
              value={form.lender_id}
              onChange={e => set('lender_id', e.target.value)}
              placeholder="Lender ID — leave blank for Global rule"
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank to apply this rule to all lenders.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Rule'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────

function RulesTab() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CommissionRule | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['commission-rules'],
    queryFn: async () => {
      const res = await crmService.getCommissionRules()
      const d = res.data?.data ?? res.data
      return (d?.rules ?? d ?? []) as CommissionRule[]
    },
    staleTime: 30 * 1000,
  })

  const rules: CommissionRule[] = Array.isArray(data) ? data : []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteCommissionRule(id),
    onSuccess: () => {
      toast.success('Rule deleted')
      qc.invalidateQueries({ queryKey: ['commission-rules'] })
    },
    onError: () => toast.error('Failed to delete rule'),
  })

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={15} /> Add Rule
        </button>
      </div>

      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Lender', 'Deal Type', 'Commission Type', 'Value', 'Agent Split %', 'Status', 'Actions'].map(h => (
                  <th key={h} className={h === 'Actions' ? 'text-right' : ''}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex justify-center">
                      <Loader2 size={20} className="animate-spin text-emerald-500" />
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-red-500">
                    Failed to load commission rules.
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                        <DollarSign size={22} className="text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">No commission rules yet</p>
                      <p className="text-xs text-slate-400 mt-1">Add a rule to start tracking commissions automatically.</p>
                    </div>
                  </td>
                </tr>
              ) : rules.map(rule => (
                <tr key={rule.id}>
                  <td>
                    <span className="text-sm text-slate-700">
                      {rule.lender_name || (rule.lender_id ? `Lender #${rule.lender_id}` : 'Global')}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm font-medium text-slate-800">{rule.deal_type}</span>
                  </td>
                  <td>
                    <span className="text-sm text-slate-600 capitalize">{rule.commission_type}</span>
                  </td>
                  <td>
                    <span className="text-sm font-semibold text-slate-800">
                      {rule.commission_type === 'percentage'
                        ? `${rule.value}%`
                        : usd(rule.value)}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm text-slate-700">{rule.split_agent_pct}%</span>
                  </td>
                  <td>
                    {rule.status === 1 ? (
                      <span className="badge badge-green">Active</span>
                    ) : (
                      <span className="badge badge-gray">Inactive</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditing(rule); setShowModal(true) }}
                        className="action-btn"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirmDelete(`Rule for ${rule.deal_type}`)) {
                            deleteMutation.mutate(rule.id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="action-btn text-red-400 hover:text-red-600"
                        title="Delete"
                      >
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
        <RuleModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </>
  )
}

// ─── Ledger Tab ───────────────────────────────────────────────────────────────

function LedgerTab() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<LedgerStatus>('all')
  const [period, setPeriod] = useState<LedgerPeriod>('month')

  const { data: summaryData } = useQuery({
    queryKey: ['commission-summary', period],
    queryFn: async () => {
      const res = await crmService.getCommissionSummary(period)
      const d = res.data?.data ?? res.data
      return (d?.totals ?? d ?? { total_gross: 0, total_agent: 0, total_company: 0 }) as CommissionSummary
    },
    staleTime: 30 * 1000,
  })

  const summary: CommissionSummary = summaryData ?? { total_gross: 0, total_agent: 0, total_company: 0 }

  const { data: ledgerData, isLoading, isError } = useQuery({
    queryKey: ['commissions', statusFilter, period],
    queryFn: async () => {
      const res = await crmService.getCommissions({ status: statusFilter === 'all' ? undefined : statusFilter })
      const d = res.data?.data ?? res.data
      return (d?.commissions ?? d ?? []) as CommissionLedgerItem[]
    },
    staleTime: 30 * 1000,
  })

  const items: CommissionLedgerItem[] = Array.isArray(ledgerData) ? ledgerData : []

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => crmService.markCommissionPaid(id),
    onSuccess: () => {
      toast.success('Commission marked as paid')
      qc.invalidateQueries({ queryKey: ['commissions'] })
      qc.invalidateQueries({ queryKey: ['commission-summary'] })
    },
    onError: () => toast.error('Failed to mark as paid'),
  })

  const PERIOD_OPTIONS: { label: string; value: LedgerPeriod }[] = [
    { label: 'This Week',    value: 'week' },
    { label: 'This Month',   value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
  ]

  const STATUS_OPTIONS: { label: string; value: LedgerStatus }[] = [
    { label: 'All',     value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Paid',    value: 'paid' },
  ]

  return (
    <div className="space-y-5">
      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Gross Commission', value: usd(summary.total_gross), color: 'text-emerald-600' },
          { label: 'Total Agent Commission', value: usd(summary.total_agent), color: 'text-indigo-600' },
          { label: 'Total Company Revenue',  value: usd(summary.total_company), color: 'text-slate-700' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                statusFilter === opt.value
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                period === opt.value
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Lead ID', 'Funded Amount', 'Gross Commission', 'Agent Commission',
                  'Company Commission', 'Status', 'Action'].map(h => (
                  <th key={h} className={h === 'Action' ? 'text-right' : ''}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex justify-center">
                      <Loader2 size={20} className="animate-spin text-emerald-500" />
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-red-500">
                    Failed to load commission ledger.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle size={22} className="text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">No commission records found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Adjust the filters to see commission records.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td>
                    <span className="text-sm font-mono text-slate-700">#{item.lead_id}</span>
                  </td>
                  <td>
                    <span className="text-sm font-semibold text-slate-800">{usd(item.funded_amount)}</span>
                  </td>
                  <td>
                    <span className="text-sm font-semibold text-emerald-700">{usd(item.gross_commission)}</span>
                  </td>
                  <td>
                    <span className="text-sm text-indigo-700">{usd(item.agent_commission)}</span>
                  </td>
                  <td>
                    <span className="text-sm text-slate-700">{usd(item.company_commission)}</span>
                  </td>
                  <td>
                    {item.status === 'paid' ? (
                      <span className="badge badge-green flex items-center gap-1 w-fit">
                        <CheckCircle size={10} /> Paid
                      </span>
                    ) : (
                      <span className="badge badge-amber">Pending</span>
                    )}
                  </td>
                  <td className="text-right">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => markPaidMutation.mutate(item.id)}
                        disabled={markPaidMutation.isPending}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 ml-auto disabled:opacity-50"
                      >
                        {markPaidMutation.isPending
                          ? <Loader2 size={11} className="animate-spin" />
                          : <CheckCircle size={11} />}
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Page Component ───────────────────────────────────────────────────────────

type Tab = 'rules' | 'ledger'

export function CrmCommissions() {
  const { setDescription, setActions } = useCrmHeader()
  const [activeTab, setActiveTab] = useState<Tab>('rules')

  useEffect(() => {
    setDescription('Manage commission rules and track payouts')
    setActions(undefined)
    return () => {
      setDescription(undefined)
      setActions(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tabs: { label: string; value: Tab }[] = [
    { label: 'Rules',  value: 'rules' },
    { label: 'Ledger', value: 'ledger' },
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
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.value
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && <RulesTab />}
      {activeTab === 'ledger' && <LedgerTab />}
    </div>
  )
}
