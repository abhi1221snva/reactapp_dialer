import { useState, useEffect, useRef } from 'react'
import { X, ArrowRightLeft, Phone, Users, Hash, Loader2, CheckCircle2, AlertCircle, LogOut, ChevronDown } from 'lucide-react'
import { useDialerStore } from '../../stores/dialer.store'
import { useAuthStore } from '../../stores/auth.store'
import { dialerService } from '../../services/dialer.service'
import { ringgroupService } from '../../services/ringgroup.service'
import { cn } from '../../utils/cn'

type TransferType = 'extension' | 'ring_group' | 'did'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const TRANSFER_TYPES: { id: TransferType; label: string; description: string; icon: React.ElementType }[] = [
  {
    id: 'extension',
    label: 'Extension',
    description: 'Transfer to an agent extension',
    icon: Phone,
  },
  {
    id: 'ring_group',
    label: 'Ring Group',
    description: 'Transfer to a ring group',
    icon: Users,
  },
  {
    id: 'did',
    label: 'External DID',
    description: 'Transfer to an external number',
    icon: Hash,
  },
]

export function TransferModal({ isOpen, onClose }: Props) {
  const { activeLead, activeCampaign, transferState, setTransferState, setTransferSessionId } =
    useDialerStore()
  const user = useAuthStore((s) => s.user)

  const [transferType, setTransferType] = useState<TransferType>('extension')
  const [target, setTarget] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ringGroups, setRingGroups] = useState<Array<{ id: number; title?: string; name?: string }>>([])
  const [rgLoading, setRgLoading] = useState(false)
  const rgFetchedRef = useRef(false)

  // Fetch ring groups when ring_group type is selected
  useEffect(() => {
    if (!isOpen) { rgFetchedRef.current = false; return }
    if (transferType !== 'ring_group' || rgFetchedRef.current) return
    rgFetchedRef.current = true
    setRgLoading(true)
    ringgroupService.list({ page: 1, limit: 200, search: '' } as never)
      .then((res: unknown) => {
        const data = (res as { data?: { data?: Array<{ id: number; title?: string; name?: string }> } })?.data?.data ?? []
        setRingGroups(data)
      })
      .catch(() => setRingGroups([]))
      .finally(() => setRgLoading(false))
  }, [isOpen, transferType])

  if (!isOpen) return null

  const isInitiated = transferState === 'ringing' || transferState === 'merged'
  const isMerged = transferState === 'merged'

  const handleInitiate = async () => {
    if (!activeLead || !activeCampaign || !user) return
    if (!target.trim()) {
      setError('Please enter a target')
      return
    }

    setError(null)
    setIsSubmitting(true)
    setTransferState('initiating')

    try {
      const payload = {
        lead_id: activeLead.lead_id ?? activeLead.id,
        alt_extension: user.alt_extension,
        customer_phone_number: activeLead.phone_number,
        campaign_id: activeCampaign.id,
        domain: user.domain || 'dialer',
        warm_call_transfer_type: transferType,
        ...(transferType === 'extension' ? { forward_extension: target } : {}),
        ...(transferType === 'ring_group' ? { forward_extension: target, ring_group: target } : {}),
        ...(transferType === 'did' ? { did_number: target, forward_extension: undefined } : {}),
      }

      const res = await dialerService.initiateTransfer(payload)
      const sessionId: string = res.data?.transfer_session_id ?? ''
      setTransferSessionId(sessionId)
      setTransferState('ringing')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Transfer failed. Please try again.'
      setError(msg)
      setTransferState('idle')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMerge = async () => {
    if (!activeLead || !activeCampaign || !user) return
    setIsSubmitting(true)
    try {
      await dialerService.mergeTransfer({
        lead_id: activeLead.lead_id ?? activeLead.id,
        customer_phone_number: activeLead.phone_number,
        warm_call_transfer_type: transferType,
        domain: user.domain || 'dialer',
      })
      setTransferState('merged')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Merge failed.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLeave = async () => {
    if (!activeLead || !user) return
    setIsSubmitting(true)
    try {
      await dialerService.leaveTransfer({
        lead_id: activeLead.lead_id ?? activeLead.id,
        customer_phone_number: activeLead.phone_number,
        domain: user.domain || 'dialer',
      })
      setTransferState('idle')
      setTransferSessionId(null)
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Leave failed.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (transferState === 'initiating') return // block close during API call
    setTransferState('idle')
    setTransferSessionId(null)
    setTarget('')
    setError(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ArrowRightLeft size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Transfer Call</h2>
              {activeLead && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {[activeLead.first_name, activeLead.last_name].filter(Boolean).join(' ') || 'Unknown'}{' '}
                  · {activeLead.phone_number}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={transferState === 'initiating'}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Transfer type selector (disabled once initiated) */}
          {!isInitiated && (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                Transfer Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TRANSFER_TYPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setTransferType(id); setTarget('') }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                      transferType === id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Target input (disabled once initiated) */}
          {!isInitiated && (
            <div className="form-group">
              <label className="label">
                {transferType === 'extension' && 'Extension Number'}
                {transferType === 'ring_group' && 'Ring Group'}
                {transferType === 'did' && 'External Phone Number'}
              </label>
              {transferType === 'ring_group' ? (
                <div className="relative">
                  <select
                    className="input appearance-none pr-8"
                    value={target}
                    onChange={(e) => { setTarget(e.target.value); setError(null) }}
                    disabled={rgLoading}
                  >
                    <option value="">{rgLoading ? 'Loading ring groups…' : 'Select a ring group'}</option>
                    {ringGroups.map(rg => (
                      <option key={rg.id} value={rg.title ?? rg.name ?? String(rg.id)}>
                        {rg.title ?? rg.name ?? `Ring Group #${rg.id}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              ) : (
                <input
                  type="text"
                  className="input"
                  placeholder={
                    transferType === 'extension' ? 'e.g. 1002' :
                    'e.g. +12125551234'
                  }
                  value={target}
                  onChange={(e) => { setTarget(e.target.value); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && handleInitiate()}
                />
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Status: ringing */}
          {transferState === 'ringing' && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Ringing {target} ({TRANSFER_TYPES.find(t => t.id === transferType)?.label})
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Merge when target answers</p>
              </div>
            </div>
          )}

          {/* Status: merged */}
          {isMerged && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Conference active</p>
                <p className="text-xs text-emerald-600 mt-0.5">All three parties are connected</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {!isInitiated && (
              <button
                onClick={handleInitiate}
                disabled={isSubmitting || !target.trim()}
                className="btn-primary flex-1 gap-2"
              >
                {isSubmitting
                  ? <><Loader2 size={14} className="animate-spin" /> Initiating…</>
                  : <><ArrowRightLeft size={14} /> Transfer</>
                }
              </button>
            )}

            {transferState === 'ringing' && (
              <button
                onClick={handleMerge}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {isSubmitting
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Users size={14} />
                }
                Merge Call
              </button>
            )}

            {isMerged && (
              <button
                onClick={handleLeave}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {isSubmitting
                  ? <Loader2 size={14} className="animate-spin" />
                  : <LogOut size={14} />
                }
                Leave Conference
              </button>
            )}

            <button
              onClick={handleClose}
              disabled={transferState === 'initiating'}
              className="btn-outline flex items-center gap-2"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
