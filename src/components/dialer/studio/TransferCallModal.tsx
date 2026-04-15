import { useState, useEffect } from 'react'
import { X, Users, Phone, Search, ArrowRightLeft, Circle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'
import type { StudioAgent } from './types'

interface Props {
  isOpen: boolean
  onClose: () => void
  agents: StudioAgent[]
}

type TransferTab = 'agents' | 'mobile'

const STATUS_DOT: Record<StudioAgent['status'], string> = {
  available: 'bg-emerald-400',
  busy:      'bg-red-400',
  away:      'bg-amber-400',
  offline:   'bg-slate-400',
}
const STATUS_LABEL: Record<StudioAgent['status'], string> = {
  available: 'Available',
  busy:      'On Call',
  away:      'Away',
  offline:   'Offline',
}

export function TransferCallModal({ isOpen, onClose, agents }: Props) {
  const [tab, setTab] = useState<TransferTab>('agents')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [mobileNumber, setMobileNumber] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Lock body scroll + ESC to close
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filtered = agents.filter((a) => {
    const q = query.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      a.department.toLowerCase().includes(q) ||
      a.extension.includes(q)
    )
  })

  const handleTransfer = () => {
    if (tab === 'agents' && !selected) return
    if (tab === 'mobile' && !mobileNumber.trim()) return
    setTransferring(true)
    setTimeout(() => {
      setTransferring(false)
      toast.success('Call transferred successfully')
      setSelected(null)
      setMobileNumber('')
      onClose()
    }, 900)
  }

  const canTransfer = tab === 'agents' ? selected !== null : mobileNumber.trim().length >= 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-slideUp overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <ArrowRightLeft size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Transfer Call</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select where to route this call</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="tab-bar">
            <button
              onClick={() => setTab('agents')}
              className={cn('tab-btn flex items-center gap-2', tab === 'agents' && 'tab-btn-active')}
            >
              <Users size={13} /> Agents
              <span className="text-[10px] font-bold px-1.5 rounded-full bg-indigo-100 text-indigo-700">
                {agents.filter((a) => a.status === 'available').length}
              </span>
            </button>
            <button
              onClick={() => setTab('mobile')}
              className={cn('tab-btn flex items-center gap-2', tab === 'mobile' && 'tab-btn-active')}
            >
              <Phone size={13} /> Mobile Number
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {tab === 'agents' ? (
            <>
              {/* Search */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by name, department, or extension…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                />
              </div>

              {/* Agents list */}
              <div className="max-h-[320px] overflow-y-auto pr-1 -mr-1 space-y-1.5">
                {filtered.length === 0 ? (
                  <div className="py-10 text-center">
                    <Users size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No agents found</p>
                  </div>
                ) : (
                  filtered.map((a) => {
                    const isSelected = selected === a.id
                    const isDisabled = a.status === 'offline' || a.status === 'busy'
                    return (
                      <button
                        key={a.id}
                        onClick={() => !isDisabled && setSelected(a.id)}
                        disabled={isDisabled}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                            : isDisabled
                              ? 'border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed'
                              : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30',
                        )}
                      >
                        {/* Radio */}
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                          isSelected ? 'border-indigo-600' : 'border-slate-300',
                        )}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </div>

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white">
                            {a.avatar}
                          </div>
                          <span className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white',
                            STATUS_DOT[a.status],
                          )} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {a.department} · Ext. {a.extension}
                          </p>
                        </div>

                        {/* Status chip */}
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0',
                          a.status === 'available' && 'bg-emerald-50 text-emerald-700',
                          a.status === 'busy'      && 'bg-red-50 text-red-700',
                          a.status === 'away'      && 'bg-amber-50 text-amber-700',
                          a.status === 'offline'   && 'bg-slate-100 text-slate-500',
                        )}>
                          <Circle size={6} className={cn('fill-current', a.status === 'available' && 'animate-pulse')} />
                          {STATUS_LABEL[a.status]}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <div className="animate-fadeIn">
              <label className="label-xs">Mobile Number</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  autoFocus
                  placeholder="+1 (555) 123-4567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-base font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Include country code. The call will be warm-transferred to this number.
              </p>

              {/* Quick recent */}
              <div className="mt-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Recent</p>
                <div className="flex flex-wrap gap-1.5">
                  {['+1 (415) 555-0142', '+1 (212) 555-0170', '+1 (305) 555-0111'].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMobileNumber(num)}
                      className="chip"
                    >
                      <Phone size={10} /> {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button
            onClick={handleTransfer}
            disabled={!canTransfer || transferring}
            className="btn-primary gap-2"
          >
            <ArrowRightLeft size={14} />
            {transferring ? 'Transferring…' : 'Transfer Call'}
          </button>
        </div>
      </div>
    </div>
  )
}
