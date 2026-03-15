import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Loader2, X, Building2, DollarSign, TrendingUp,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { LenderOffer, DealStip, StipType, StipStatus, OfferStatus } from '../../types/crm.types'

interface Props { leadId: number }

const OFFER_STATUS_CFG: Record<OfferStatus, { label: string; bg: string; text: string }> = {
  pending:  { label: 'Pending',  bg: 'bg-amber-50',   text: 'text-amber-700'   },
  received: { label: 'Received', bg: 'bg-sky-50',     text: 'text-sky-700'     },
  accepted: { label: 'Accepted', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  declined: { label: 'Declined', bg: 'bg-red-50',     text: 'text-red-700'     },
  expired:  { label: 'Expired',  bg: 'bg-slate-100',  text: 'text-slate-500'   },
}

const STIP_STATUS_CFG: Record<StipStatus, { label: string; bg: string; text: string }> = {
  requested: { label: 'Requested', bg: 'bg-amber-50',   text: 'text-amber-700'   },
  uploaded:  { label: 'Uploaded',  bg: 'bg-sky-50',     text: 'text-sky-700'     },
  approved:  { label: 'Approved',  bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected:  { label: 'Rejected',  bg: 'bg-red-50',     text: 'text-red-700'     },
}

const STIP_TYPE_LABELS: Partial<Record<StipType, string>> = {
  bank_statement:            'Bank Statement',
  voided_check:              'Voided Check',
  drivers_license:           'Driver License',
  tax_return:                'Tax Return',
  lease_agreement:           'Lease Agreement',
  business_license:          'Business License',
  void_check:                'Void Check',
  articles_of_incorporation: 'Articles of Incorporation',
  custom:                    'Custom',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtDec = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function SectionHeader({ title, count, onAdd }: { title: string; count: number; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{count}</span>
      </div>
      <button onClick={onAdd} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
        <Plus size={13} /> Add
      </button>
    </div>
  )
}

function StatusPill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${bg} ${text}`}>
      {label}
    </span>
  )
}

function AddOfferModal({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [lenderName, setLenderName] = useState('')
  const [amount, setAmount]         = useState('')
  const [factorRate, setFactorRate] = useState('')
  const [termDays, setTermDays]     = useState('')
  const [notes, setNotes]           = useState('')

  const mutation = useMutation({
    mutationFn: (data: Partial<LenderOffer>) => crmService.createOffer(leadId, data),
    onSuccess: () => {
      toast.success('Offer added')
      qc.invalidateQueries({ queryKey: ['lead-offers', leadId] })
      onClose()
    },
    onError: () => toast.error('Failed to add offer'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      lender_name: lenderName, offered_amount: parseFloat(amount),
      factor_rate: parseFloat(factorRate), term_days: parseInt(termDays),
      notes: notes || undefined,
    } as Partial<LenderOffer>)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Add Offer</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Lender Name</label>
            <input value={lenderName} onChange={e => setLenderName(e.target.value)} placeholder="e.g. First Choice Funding" required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Offered Amount</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Factor Rate</label>
              <input type="number" step="0.01" value={factorRate} onChange={e => setFactorRate(e.target.value)} placeholder="1.35" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Term (Days)</label>
            <input type="number" value={termDays} onChange={e => setTermDays(e.target.value)} placeholder="180" required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Save Offer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddStipModal({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName]         = useState('')
  const [stipType, setStipType] = useState<StipType>('bank_statement')
  const [notes, setNotes]       = useState('')

  const mutation = useMutation({
    mutationFn: (data: Partial<DealStip>) => crmService.createStip(leadId, data),
    onSuccess: () => {
      toast.success('Stip added')
      qc.invalidateQueries({ queryKey: ['lead-stips', leadId] })
      onClose()
    },
    onError: () => toast.error('Failed to add stip'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ name, stip_type: stipType, notes: notes || undefined } as Partial<DealStip>)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Add Stipulation</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Stip Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 3 Months Bank Statements" required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Type</label>
            <select value={stipType} onChange={e => setStipType(e.target.value as StipType)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {(Object.keys(STIP_TYPE_LABELS) as StipType[]).map(t => (
                <option key={t} value={t}>{STIP_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Save Stip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function OfferCard({ offer, leadId }: { offer: LenderOffer; leadId: number }) {
  const qc = useQueryClient()
  const cfg = OFFER_STATUS_CFG[offer.status]
  const dailyPayment = offer.offered_amount && offer.factor_rate && offer.term_days
    ? (offer.offered_amount * offer.factor_rate) / offer.term_days : 0

  const acceptMutation = useMutation({
    mutationFn: () => crmService.updateOffer(leadId, offer.id, { status: 'accepted' as OfferStatus }),
    onSuccess: () => { toast.success('Offer accepted'); qc.invalidateQueries({ queryKey: ['lead-offers', leadId] }) },
    onError: () => toast.error('Failed to update offer'),
  })
  const declineMutation = useMutation({
    mutationFn: () => crmService.updateOffer(leadId, offer.id, { status: 'declined' as OfferStatus }),
    onSuccess: () => { toast.success('Offer declined'); qc.invalidateQueries({ queryKey: ['lead-offers', leadId] }) },
    onError: () => toast.error('Failed to update offer'),
  })

  const canAccept  = offer.status === 'received' || offer.status === 'pending'
  const canDecline = offer.status !== 'declined' && offer.status !== 'expired'

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-200 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Building2 size={15} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{offer.lender_name ?? 'Unknown Lender'}</p>
            <p className="text-xs text-slate-400">{offer.created_at ? new Date(offer.created_at).toLocaleDateString() : ''}</p>
          </div>
        </div>
        <StatusPill label={cfg.label} bg={cfg.bg} text={cfg.text} />
      </div>
      {offer.offered_amount != null && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Amount',      value: fmt(offer.offered_amount)               },
            { label: 'Factor Rate', value: Number(offer.factor_rate ?? 0).toFixed(2) },
            { label: 'Term',        value: (offer.term_days ?? 0) + ' days'        },
            { label: 'Daily Pmt',   value: dailyPayment ? fmtDec(dailyPayment) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
              <div className="text-xs font-bold text-slate-700">{value}</div>
            </div>
          ))}
        </div>
      )}
      {offer.notes && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-3">{offer.notes}</p>
      )}
      {(canAccept || canDecline) && (
        <div className="flex gap-2">
          {canAccept && (
            <button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending || declineMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-1.5 rounded-lg transition-colors disabled:opacity-60">
              {acceptMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              Accept
            </button>
          )}
          {canDecline && (
            <button onClick={() => declineMutation.mutate()} disabled={acceptMutation.isPending || declineMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg transition-colors disabled:opacity-60">
              {declineMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
              Decline
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StipRow({ stip, leadId }: { stip: DealStip; leadId: number }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const sCfg = STIP_STATUS_CFG[stip.status]
  const typeLabel = STIP_TYPE_LABELS[stip.stip_type] ?? stip.stip_type

  const mutation = useMutation({
    mutationFn: (status: StipStatus) => crmService.updateStip(leadId, stip.id, { status }),
    onSuccess: () => { toast.success('Stip updated'); qc.invalidateQueries({ queryKey: ['lead-stips', leadId] }) },
    onError: () => toast.error('Failed to update stip'),
  })

  const nextStatuses = (['requested','uploaded','approved','rejected'] as StipStatus[]).filter(s => s !== stip.status)

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 group relative">
      <div className="flex items-center gap-3 min-w-0">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-violet-50 text-violet-700 shrink-0">
          {typeLabel}
        </span>
        <span className="text-sm text-slate-700 truncate">{stip.stip_name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusPill label={sCfg.label} bg={sCfg.bg} text={sCfg.text} />
        <div className="relative">
          <button onClick={() => setOpen(v => !v)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronDown size={13} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 min-w-[130px]">
              {nextStatuses.map(s => (
                <button key={s} onClick={() => { mutation.mutate(s); setOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700 capitalize">
                  Mark {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function OffersStipsTab({ leadId }: Props) {
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showStipModal,  setShowStipModal]  = useState(false)

  const offersQ = useQuery<LenderOffer[]>({
    queryKey: ['lead-offers', leadId],
    queryFn: async () => { const r = await crmService.getOffers(leadId); return r.data?.data ?? r.data ?? [] },
  })
  const stipsQ = useQuery<DealStip[]>({
    queryKey: ['lead-stips', leadId],
    queryFn: async () => { const r = await crmService.getStips(leadId); return r.data?.data ?? r.data ?? [] },
  })

  const offers: LenderOffer[] = offersQ.data ?? []
  const stips:  DealStip[]   = stipsQ.data  ?? []

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader title="Offers" count={offers.length} onAdd={() => setShowOfferModal(true)} />
        {offersQ.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
        ) : offers.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            <TrendingUp size={28} className="mx-auto mb-2 text-slate-200" />
            No offers yet. Add the first one.
          </div>
        ) : (
          <div className="space-y-3">{offers.map(o => <OfferCard key={o.id} offer={o} leadId={leadId} />)}</div>
        )}
      </div>
      <hr className="border-slate-100" />
      <div>
        <SectionHeader title="Stipulations" count={stips.length} onAdd={() => setShowStipModal(true)} />
        {stipsQ.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
        ) : stips.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            <DollarSign size={28} className="mx-auto mb-2 text-slate-200" />
            No stipulations recorded.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {stips.map(s => <StipRow key={s.id} stip={s} leadId={leadId} />)}
          </div>
        )}
      </div>
      {showOfferModal && <AddOfferModal leadId={leadId} onClose={() => setShowOfferModal(false)} />}
      {showStipModal  && <AddStipModal  leadId={leadId} onClose={() => setShowStipModal(false)}  />}
    </div>
  )
}
