import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Loader2, X, Building2, TrendingUp,
  CheckCircle2, XCircle, FileText, ChevronDown, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { LenderOffer, OfferStatus, DealStip, StipStatus, StipType } from '../../types/crm.types'

interface Props { leadId: number }

/* ── Status config ────────────────────────────────────────────────────── */

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

/* ── Formatters ───────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtDec = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : ''

/* ── Lender group type ────────────────────────────────────────────────── */

interface LenderGroup {
  lenderKey: string
  lenderName: string
  lenderId?: number
  offers: LenderOffer[]
  stips: DealStip[]
}

/* ── Small components ─────────────────────────────────────────────────── */

function StatusPill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${bg} ${text}`}>
      {label}
    </span>
  )
}

/* ── Add Offer Modal ──────────────────────────────────────────────────── */

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

/* ── Add Stip Modal ───────────────────────────────────────────────────── */

const STIP_OPTIONS: { type: StipType; name: string }[] = [
  { type: 'bank_statement',            name: 'Bank Statements'           },
  { type: 'voided_check',              name: 'Voided Check'              },
  { type: 'drivers_license',           name: 'Driver License'            },
  { type: 'tax_return',                name: 'Tax Returns'               },
  { type: 'lease_agreement',           name: 'Lease Agreement'           },
  { type: 'business_license',          name: 'Business License'          },
  { type: 'articles_of_incorporation', name: 'Articles of Incorporation' },
]

function AddStipModal({ leadId, lenderId, onClose }: { leadId: number; lenderId?: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<StipType>>(new Set())
  const [customName, setCustomName] = useState('')

  const mutation = useMutation({
    mutationFn: (data: { lender_id?: number; stip_names: string[]; stip_type: StipType }) =>
      crmService.bulkCreateStips(leadId, data),
    onSuccess: () => {
      toast.success('Stips added')
      qc.invalidateQueries({ queryKey: ['lead-stips', leadId] })
      onClose()
    },
    onError: () => toast.error('Failed to add stips'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const names = STIP_OPTIONS.filter(s => selected.has(s.type)).map(s => s.name)
    if (customName.trim()) names.push(customName.trim())
    if (names.length === 0) return
    mutation.mutate({ lender_id: lenderId, stip_names: names, stip_type: 'custom' })
  }

  const toggle = (t: StipType) => {
    const next = new Set(selected)
    next.has(t) ? next.delete(t) : next.add(t)
    setSelected(next)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Add Stipulations</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="space-y-1.5">
            {STIP_OPTIONS.map(s => (
              <label key={s.type} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.has(s.type)} onChange={() => toggle(s.type)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm text-slate-700">{s.name}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Custom Stip (optional)</label>
            <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Proof of Address"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" disabled={mutation.isPending || (selected.size === 0 && !customName.trim())}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Add Stips
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Offer row inside lender card ─────────────────────────────────────── */

function OfferRow({ offer, leadId }: { offer: LenderOffer; leadId: number }) {
  const qc = useQueryClient()
  const cfg = OFFER_STATUS_CFG[offer.status]
  const dailyPayment = offer.offered_amount && offer.factor_rate && offer.term_days
    ? (offer.offered_amount * offer.factor_rate) / offer.term_days : 0

  const acceptMut = useMutation({
    mutationFn: () => crmService.updateOffer(leadId, offer.id, { status: 'accepted' as OfferStatus }),
    onSuccess: () => { toast.success('Offer accepted'); qc.invalidateQueries({ queryKey: ['lead-offers', leadId] }) },
    onError: () => toast.error('Failed to update offer'),
  })
  const declineMut = useMutation({
    mutationFn: () => crmService.updateOffer(leadId, offer.id, { status: 'declined' as OfferStatus }),
    onSuccess: () => { toast.success('Offer declined'); qc.invalidateQueries({ queryKey: ['lead-offers', leadId] }) },
    onError: () => toast.error('Failed to update offer'),
  })

  const canAccept  = offer.status === 'received' || offer.status === 'pending'
  const canDecline = offer.status !== 'declined' && offer.status !== 'expired'
  const busy = acceptMut.isPending || declineMut.isPending

  return (
    <div className="border border-slate-100 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{fmtDate(offer.created_at)}</span>
          <StatusPill {...cfg} />
        </div>
        {(canAccept || canDecline) && (
          <div className="flex gap-1.5">
            {canAccept && (
              <button onClick={() => acceptMut.mutate()} disabled={busy}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md disabled:opacity-50">
                {acceptMut.isPending ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                Accept
              </button>
            )}
            {canDecline && (
              <button onClick={() => declineMut.mutate()} disabled={busy}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md disabled:opacity-50">
                {declineMut.isPending ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                Decline
              </button>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Amount',      value: fmt(offer.offered_amount) },
          { label: 'Factor Rate', value: Number(offer.factor_rate ?? 0).toFixed(2) },
          { label: 'Term',        value: (offer.term_days ?? 0) + ' days' },
          { label: 'Daily Pmt',   value: dailyPayment ? fmtDec(dailyPayment) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded-md p-2 text-center">
            <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
            <div className="text-xs font-bold text-slate-700">{value}</div>
          </div>
        ))}
      </div>
      {offer.notes && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-1.5 mt-2">{offer.notes}</p>
      )}
    </div>
  )
}

/* ── Stip row inside lender card ──────────────────────────────────────── */

function StipRow({ stip, leadId }: { stip: DealStip; leadId: number }) {
  const qc = useQueryClient()
  const cfg = STIP_STATUS_CFG[stip.status]

  const updateMut = useMutation({
    mutationFn: (status: StipStatus) => crmService.updateStip(leadId, stip.id, { status }),
    onSuccess: () => { toast.success('Stip updated'); qc.invalidateQueries({ queryKey: ['lead-stips', leadId] }) },
    onError: () => toast.error('Failed to update stip'),
  })

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white border border-slate-100 rounded-lg">
      <div className="flex items-center gap-2.5">
        <FileText size={13} className="text-slate-400" />
        <span className="text-sm text-slate-700">{stip.stip_name}</span>
        <StatusPill {...cfg} />
      </div>
      <div className="flex items-center gap-1.5">
        {stip.status === 'requested' && (
          <button onClick={() => updateMut.mutate('uploaded')} disabled={updateMut.isPending}
            className="text-[11px] font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-md disabled:opacity-50">
            Mark Uploaded
          </button>
        )}
        {stip.status === 'uploaded' && (
          <>
            <button onClick={() => updateMut.mutate('approved')} disabled={updateMut.isPending}
              className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md disabled:opacity-50">
              Approve
            </button>
            <button onClick={() => updateMut.mutate('rejected')} disabled={updateMut.isPending}
              className="text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md disabled:opacity-50">
              Reject
            </button>
          </>
        )}
        {stip.notes && <span className="text-[11px] text-slate-400 ml-1">{stip.notes}</span>}
      </div>
    </div>
  )
}

/* ── Lender accordion card ────────────────────────────────────────────── */

function LenderCard({ group, leadId, defaultOpen }: { group: LenderGroup; leadId: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [showStipModal, setShowStipModal] = useState(false)
  const offerCount = group.offers.length
  const stipCount  = group.stips.length
  const bestOffer  = group.offers.reduce<LenderOffer | null>((best, o) =>
    !best || o.offered_amount > best.offered_amount ? o : best, null)

  const hasAccepted = group.offers.some(o => o.status === 'accepted')
  const borderColor = hasAccepted ? 'border-emerald-200' : 'border-slate-200'

  return (
    <div className={`border ${borderColor} rounded-xl bg-white overflow-hidden`}>
      {/* Header — always visible */}
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${hasAccepted ? 'bg-emerald-50' : 'bg-slate-100'}`}>
            <Building2 size={16} className={hasAccepted ? 'text-emerald-600' : 'text-slate-500'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{group.lenderName}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] text-slate-400">{offerCount} offer{offerCount !== 1 ? 's' : ''}</span>
              {stipCount > 0 && <span className="text-[11px] text-slate-400">{stipCount} stip{stipCount !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {bestOffer && (
            <span className="text-sm font-bold text-slate-700">{fmt(bestOffer.offered_amount)}</span>
          )}
          {hasAccepted && <StatusPill label="Accepted" bg="bg-emerald-50" text="text-emerald-700" />}
          {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100">
          {/* Offers */}
          {offerCount > 0 && (
            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Offers</span>
              </div>
              <div className="space-y-2">
                {group.offers.map(o => <OfferRow key={o.id} offer={o} leadId={leadId} />)}
              </div>
            </div>
          )}

          {/* Stips */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stipulations</span>
              <button onClick={() => setShowStipModal(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors">
                <Plus size={11} /> Add Stip
              </button>
            </div>
            {stipCount > 0 ? (
              <div className="space-y-1.5">
                {group.stips.map(s => <StipRow key={s.id} stip={s} leadId={leadId} />)}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">No stipulations yet.</p>
            )}
          </div>
        </div>
      )}

      {showStipModal && <AddStipModal leadId={leadId} lenderId={group.lenderId} onClose={() => setShowStipModal(false)} />}
    </div>
  )
}

/* ── Main tab component ───────────────────────────────────────────────── */

export function OffersStipsTab({ leadId }: Props) {
  const [showOfferModal, setShowOfferModal] = useState(false)

  const offersQ = useQuery<LenderOffer[]>({
    queryKey: ['lead-offers', leadId],
    queryFn: async () => { const r = await crmService.getOffers(leadId); return r.data?.data ?? r.data ?? [] },
  })

  const stipsQ = useQuery<DealStip[]>({
    queryKey: ['lead-stips', leadId],
    queryFn: async () => { const r = await crmService.getStips(leadId); return r.data?.data ?? r.data ?? [] },
  })

  const offers: LenderOffer[] = offersQ.data ?? []
  const stips: DealStip[] = stipsQ.data ?? []
  const loading = offersQ.isLoading || stipsQ.isLoading

  /* Group by lender */
  const groups: LenderGroup[] = useMemo(() => {
    const map = new Map<string, LenderGroup>()

    for (const o of offers) {
      if (o.status === 'declined') continue
      const key = o.lender_name ?? `lender-${o.lender_id ?? 'unknown'}`
      if (!map.has(key)) {
        map.set(key, { lenderKey: key, lenderName: o.lender_name ?? 'Unknown Lender', lenderId: o.lender_id, offers: [], stips: [] })
      }
      map.get(key)!.offers.push(o)
    }

    for (const s of stips) {
      // Match stip to lender group by lender_id
      let placed = false
      if (s.lender_id) {
        for (const g of map.values()) {
          if (g.lenderId === s.lender_id) { g.stips.push(s); placed = true; break }
        }
      }
      if (!placed) {
        const key = s.lender_id ? `lender-${s.lender_id}` : 'unassigned'
        if (!map.has(key)) {
          map.set(key, { lenderKey: key, lenderName: s.lender_id ? `Lender #${s.lender_id}` : 'General', lenderId: s.lender_id, offers: [], stips: [] })
        }
        map.get(key)!.stips.push(s)
      }
    }

    // Sort: accepted offers first, then by most recent offer
    return Array.from(map.values()).sort((a, b) => {
      const aAccepted = a.offers.some(o => o.status === 'accepted') ? 1 : 0
      const bAccepted = b.offers.some(o => o.status === 'accepted') ? 1 : 0
      if (aAccepted !== bAccepted) return bAccepted - aAccepted
      const aDate = a.offers[0]?.created_at ?? ''
      const bDate = b.offers[0]?.created_at ?? ''
      return bDate.localeCompare(aDate)
    })
  }, [offers, stips])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Offers & Stipulations</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
            {groups.length} lender{groups.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={() => setShowOfferModal(true)}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={13} /> Add Offer
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400">
          <TrendingUp size={28} className="mx-auto mb-2 text-slate-200" />
          No offers or stipulations yet.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <LenderCard key={g.lenderKey} group={g} leadId={leadId} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {showOfferModal && <AddOfferModal leadId={leadId} onClose={() => setShowOfferModal(false)} />}
    </div>
  )
}
