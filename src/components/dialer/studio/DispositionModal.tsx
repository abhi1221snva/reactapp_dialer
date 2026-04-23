import { useState } from 'react'
import {
  X, CheckCircle2, Clock, XCircle, PauseCircle, Save, RotateCcw, Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'
import type { StudioDisposition } from './types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (dispoId: string, pauseCalling: boolean, notes: string) => void
  onRedial: () => void
  dispositions: StudioDisposition[]
  leadName?: string
  callDuration?: number
}

const GROUP_META: Record<StudioDisposition['group'], { label: string; icon: React.ElementType; color: string }> = {
  positive: { label: 'Positive',  icon: CheckCircle2, color: 'text-emerald-600' },
  neutral:  { label: 'Neutral',   icon: Clock,        color: 'text-slate-500'   },
  negative: { label: 'Negative',  icon: XCircle,      color: 'text-rose-600'    },
}

const COLOR_CLASSES: Record<string, { base: string; active: string; icon: string }> = {
  emerald: { base: 'hover:border-emerald-300 hover:bg-emerald-50/40', active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/15', icon: 'bg-emerald-100 text-emerald-600' },
  sky:     { base: 'hover:border-sky-300 hover:bg-sky-50/40',         active: 'border-sky-500 bg-sky-50 ring-2 ring-sky-500/15',             icon: 'bg-sky-100 text-sky-600'         },
  violet:  { base: 'hover:border-violet-300 hover:bg-violet-50/40',   active: 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/15',    icon: 'bg-violet-100 text-violet-600'   },
  amber:   { base: 'hover:border-amber-300 hover:bg-amber-50/40',     active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/15',       icon: 'bg-amber-100 text-amber-600'     },
  slate:   { base: 'hover:border-slate-300 hover:bg-slate-50',        active: 'border-slate-500 bg-slate-100 ring-2 ring-slate-500/15',      icon: 'bg-slate-200 text-slate-600'     },
  orange:  { base: 'hover:border-orange-300 hover:bg-orange-50/40',   active: 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/15',    icon: 'bg-orange-100 text-orange-600'   },
  rose:    { base: 'hover:border-rose-300 hover:bg-rose-50/40',       active: 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/15',          icon: 'bg-rose-100 text-rose-600'       },
  red:     { base: 'hover:border-red-300 hover:bg-red-50/40',         active: 'border-red-500 bg-red-50 ring-2 ring-red-500/15',             icon: 'bg-red-100 text-red-600'         },
}

export function DispositionModal({
  isOpen, onClose, onSave, onRedial, dispositions, leadName, callDuration,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pause, setPause] = useState(false)
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const grouped = dispositions.reduce<Record<string, StudioDisposition[]>>((acc, d) => {
    ;(acc[d.group] = acc[d.group] ?? []).push(d)
    return acc
  }, {})

  const handleSave = () => {
    if (!selectedId) {
      toast.error('Please select a disposition')
      return
    }
    onSave(selectedId, pause, notes)
    setSelectedId(null)
    setNotes('')
    setPause(false)
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-slideUp overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <Tag size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Call Wrap-up</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {leadName && <>Select outcome for <span className="font-semibold text-slate-700">{leadName}</span></>}
                {callDuration !== undefined && <> · {fmt(callDuration)}</>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body (scroll) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {(['positive', 'neutral', 'negative'] as const).map((group) => {
            const items = grouped[group] || []
            if (!items.length) return null
            const meta = GROUP_META[group]
            const Icon = meta.icon
            return (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Icon size={13} className={meta.color} />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {meta.label}
                  </h4>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map((d) => {
                    const classes = COLOR_CLASSES[d.color] || COLOR_CLASSES.slate
                    const isSelected = selectedId === d.id
                    return (
                      <button
                        key={d.id}
                        onClick={() => setSelectedId(d.id)}
                        className={cn(
                          'group relative rounded-xl border-2 p-3 text-left transition-all',
                          isSelected ? classes.active : 'border-slate-200 ' + classes.base,
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                            classes.icon,
                          )}>
                            <Icon size={12} />
                          </div>
                          <span className="text-xs font-semibold text-slate-800">{d.label}</span>
                        </div>
                        {isSelected && (
                          <span className="absolute top-2 right-2">
                            <CheckCircle2 size={13} className="text-emerald-600 fill-white" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Optional notes */}
          <div>
            <label className="label-xs">Wrap-up notes <span className="text-slate-300 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the next agent should know…"
              rows={2}
              className="input resize-none"
            />
          </div>

          {/* Pause toggle */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50/60 border border-amber-200/60">
            <div className="flex items-center gap-2.5">
              <PauseCircle size={16} className="text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Pause Calling</p>
                <p className="text-[11px] text-amber-700">Take a break after saving — no auto-dial to next lead</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={pause}
              onClick={() => setPause(!pause)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors shrink-0',
                pause ? 'bg-amber-500' : 'bg-slate-300',
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                pause && 'translate-x-5',
              )} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button onClick={onRedial} className="btn-outline gap-2">
            <RotateCcw size={14} /> Redial
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={handleSave}
              disabled={!selectedId}
              className="btn-primary gap-2"
            >
              <Save size={14} /> Save &amp; Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
