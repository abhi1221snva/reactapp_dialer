import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Loader2, X, DollarSign, TrendingUp, Trash2,
  FileText, Calendar, Hash, Building2, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { FundedDeal, FundedDealStatus, MerchantPosition } from '../../types/crm.types'
import { FundingCalculatorWidget } from './FundingCalculatorWidget'

interface Props { leadId: number }

const DEAL_STATUS_CFG: Record<FundedDealStatus, { label: string; bg: string; text: string }> = {
  funded:      { label: 'Funded',      bg: 'bg-emerald-50', text: 'text-emerald-700' },
  in_repayment:{ label: 'In Repayment', bg: 'bg-sky-50',     text: 'text-sky-700'     },
  paid_off:    { label: 'Paid Off',     bg: 'bg-slate-100',  text: 'text-slate-600'   },
  defaulted:   { label: 'Defaulted',    bg: 'bg-red-50',     text: 'text-red-700'     },
  renewed:     { label: 'Renewed',      bg: 'bg-violet-50',  text: 'text-violet-700'  },
}

const fmt = (n?: number | null) => n != null
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—'

const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

function StatusPill({ status }: { status: FundedDealStatus }) {
  const cfg = DEAL_STATUS_CFG[status]
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

function RecordFundingForm({ leadId }: { leadId: number }) {
  const qc = useQueryClient()
  const [lenderName, setLenderName]       = useState('')
  const [fundedAmount, setFundedAmount]   = useState('')
  const [factorRate, setFactorRate]       = useState('')
  const [termDays, setTermDays]           = useState('')
  const [fundingDate, setFundingDate]     = useState('')
  const [contractNum, setContractNum]     = useState('')
  const [wireConfirm, setWireConfirm]     = useState('')

  const mutation = useMutation({
    mutationFn: (data: Partial<FundedDeal>) => crmService.fundDeal(leadId, data),
    onSuccess: () => {
      toast.success('Deal recorded successfully')
      qc.invalidateQueries({ queryKey: ['funded-deal', leadId] })
    },
    onError: () => toast.error('Failed to record deal'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      lender_name:      lenderName,
      funded_amount:    parseFloat(fundedAmount),
      factor_rate:      parseFloat(factorRate),
      term_days:        parseInt(termDays),
      funding_date:     fundingDate || undefined,
      contract_number:  contractNum || undefined,
      wire_confirmation:wireConfirm || undefined,
    } as Partial<FundedDeal>)
  }

  const inp = (label: string, val: string, set: (v:string)=>void, opts?: {type?:string; step?:string; placeholder?:string; req?:boolean}) => (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
      <input type={opts?.type??'text'} step={opts?.step} value={val} onChange={e => set(e.target.value)}
        placeholder={opts?.placeholder} required={opts?.req!==false}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
    </div>
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={16} className="text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-800">Record Funding</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {inp('Lender Name', lenderName, setLenderName, { placeholder: 'e.g. First Choice Funding' })}
        <div className="grid grid-cols-2 gap-3">
          {inp('Funded Amount ($)', fundedAmount, setFundedAmount, { type: 'number', placeholder: '50000' })}
          {inp('Factor Rate', factorRate, setFactorRate, { type: 'number', step: '0.01', placeholder: '1.35' })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {inp('Term (Days)', termDays, setTermDays, { type: 'number', placeholder: '180' })}
          {inp('Funding Date', fundingDate, setFundingDate, { type: 'date', req: false })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {inp('Contract #', contractNum, setContractNum, { placeholder: 'Optional', req: false })}
          {inp('Wire Confirmation', wireConfirm, setWireConfirm, { placeholder: 'Optional', req: false })}
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={mutation.isPending}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Record Deal
          </button>
        </div>
      </form>
    </div>
  )
}

function DealDetailsCard({ deal, leadId }: { deal: FundedDeal; leadId: number }) {
  const qc = useQueryClient()
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const statusMutation = useMutation({
    mutationFn: (status: FundedDealStatus) => crmService.updateFundedDeal(leadId, deal.id, { status }),
    onSuccess: () => { toast.success('Deal status updated'); qc.invalidateQueries({ queryKey: ['funded-deal', leadId] }) },
    onError: () => toast.error('Failed to update status'),
    onSettled: () => setUpdatingStatus(false),
  })

  const rows = [
    { icon: Building2,  label: 'Lender',           value: deal.lender_name ?? '—'                },
    { icon: DollarSign, label: 'Funded Amount',     value: fmt(deal.funded_amount)                },
    { icon: TrendingUp, label: 'Factor Rate',       value: Number(deal.factor_rate ?? 0).toFixed(2) },
    { icon: Calendar,   label: 'Term',              value: (deal.term_days ?? 0) + ' days'        },
    { icon: DollarSign, label: 'Total Payback',     value: fmt(deal.total_payback)                },
    { icon: DollarSign, label: 'Daily Payment',     value: fmt(deal.daily_payment)                },
    { icon: Calendar,   label: 'Funding Date',      value: fmtDate(deal.funding_date)             },
    { icon: Hash,       label: 'Contract #',        value: deal.contract_number ?? '—'            },
    { icon: FileText,   label: 'Wire Confirmation', value: deal.wire_confirmation ?? '—'          },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-800">Funded Deal</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={deal.status} />
          {updatingStatus ? (
            <select defaultValue={deal.status} onChange={e => { statusMutation.mutate(e.target.value as FundedDealStatus); setUpdatingStatus(false) }}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {(['funded','in_repayment','paid_off','defaulted','renewed'] as FundedDealStatus[]).map(s => (
                <option key={s} value={s}>{DEAL_STATUS_CFG[s].label}</option>
              ))}
            </select>
          ) : (
            <button onClick={() => setUpdatingStatus(true)}
              className="text-xs text-slate-400 hover:text-slate-600 underline">Update Status</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <Icon size={11} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">{label}</span>
            </div>
            <div className="text-sm font-semibold text-slate-700">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddPositionModal({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [lenderName, setLenderName]         = useState('')
  const [dailyPayment, setDailyPayment]     = useState('')
  const [remainingBalance, setRemainingBal] = useState('')
  const [notes, setNotes]                   = useState('')

  const mutation = useMutation({
    mutationFn: (data: Partial<MerchantPosition>) => crmService.addPosition(leadId, data),
    onSuccess: () => { toast.success('Position added'); qc.invalidateQueries({ queryKey: ['positions', leadId] }); onClose() },
    onError: () => toast.error('Failed to add position'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ lender_name: lenderName, daily_payment: parseFloat(dailyPayment), remaining_balance: parseFloat(remainingBalance) || undefined, notes: notes || undefined } as Partial<MerchantPosition>)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Add Merchant Position</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Lender Name</label>
            <input value={lenderName} onChange={e => setLenderName(e.target.value)} placeholder="Lender / MCA company" required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Daily Payment</label>
              <input type="number" value={dailyPayment} onChange={e => setDailyPayment(e.target.value)} placeholder="500" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Remaining Balance</label>
              <input type="number" value={remainingBalance} onChange={e => setRemainingBal(e.target.value)} placeholder="Optional"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Add Position
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MerchantPositionsTable({ leadId }: { leadId: number }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: positions = [], isLoading } = useQuery<MerchantPosition[]>({
    queryKey: ['positions', leadId],
    queryFn: async () => { const r = await crmService.getPositions(leadId); return r.data?.data ?? r.data ?? [] },
  })

  const deleteMutation = useMutation({
    mutationFn: (posId: number) => crmService.deletePosition(leadId, posId),
    onSuccess: () => { toast.success('Position removed'); qc.invalidateQueries({ queryKey: ['positions', leadId] }) },
    onError: () => toast.error('Failed to remove position'),
  })

  const totalDaily = positions.reduce((s, p) => s + (p.daily_payment ?? 0), 0)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Merchant Positions</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{positions.length}</span>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={13} /> Add Position
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
      ) : positions.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">No existing positions on file.</div>
      ) : (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Lender</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Daily Payment</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Remaining</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {positions.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2 text-slate-700 font-medium">{p.lender_name ?? '—'}</td>
                  <td className="py-2 text-right text-emerald-700 font-semibold">{fmt(p.daily_payment)}</td>
                  <td className="py-2 text-right text-slate-500">{p.remaining_balance != null ? fmt(p.remaining_balance) : '—'}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => deleteMutation.mutate(p.id)} disabled={deleteMutation.isPending}
                      className="text-red-400 hover:text-red-600 p-1 rounded transition-colors disabled:opacity-40">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Total Daily Burden</td>
                <td className="py-2 text-right text-red-600 font-bold">{fmt(totalDaily)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {showAdd && <AddPositionModal leadId={leadId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

export function DealTab({ leadId }: Props) {
  const { data: deal, isLoading } = useQuery<FundedDeal | null>({
    queryKey: ['funded-deal', leadId],
    queryFn: async () => {
      const r = await crmService.getFundedDeal(leadId)
      const d = r.data?.data
      if (!d || (Array.isArray(d) && d.length === 0)) return null
      return d as FundedDeal
    },
    retry: false,
  })

  if (isLoading) return (
    <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  )

  return (
    <div className="space-y-5">
      {deal ? <DealDetailsCard deal={deal} leadId={leadId} /> : <RecordFundingForm leadId={leadId} />}
      <FundingCalculatorWidget />
      <MerchantPositionsTable leadId={leadId} />
    </div>
  )
}
