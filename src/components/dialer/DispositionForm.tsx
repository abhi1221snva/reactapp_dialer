import { useState } from 'react'
import { Save, Calendar, CheckCircle2, XCircle, PhoneMissed, PhoneCall, Clock, HelpCircle } from 'lucide-react'
import { useDialerStore } from '../../stores/dialer.store'
import { cn } from '../../utils/cn'
import type { Disposition } from '../../types'

interface Props {
  onSave: (data: { disposition_id: number; notes: string; callback_date?: string; callback_time?: string }) => void
  loading?: boolean
}

function getDispositionIcon(type: string | undefined | null) {
  const t = (type ?? '').toLowerCase()
  if (t.includes('answer') && !t.includes('no')) return CheckCircle2
  if (t.includes('no answer') || t.includes('noanswer')) return PhoneMissed
  if (t.includes('busy')) return XCircle
  if (t.includes('callback')) return Calendar
  if (t.includes('inbound') || t.includes('call')) return PhoneCall
  if (t.includes('wait') || t.includes('later')) return Clock
  return HelpCircle
}

function getDispositionColors(type: string | undefined | null, selected: boolean) {
  const t = (type ?? '').toLowerCase()
  if (selected) {
    if (t.includes('answer') && !t.includes('no')) return 'border-emerald-500 bg-emerald-50 text-emerald-700'
    if (t.includes('no answer') || t.includes('noanswer')) return 'border-slate-400 bg-slate-50 text-slate-700'
    if (t.includes('busy')) return 'border-red-400 bg-red-50 text-red-700'
    if (t.includes('callback')) return 'border-amber-500 bg-amber-50 text-amber-700'
    return 'border-indigo-500 bg-indigo-50 text-indigo-700'
  }
  return 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
}

const MAX_NOTES = 500

export function DispositionForm({ onSave, loading }: Props) {
  const { dispositions } = useDialerStore()
  const [selected, setSelected] = useState<Disposition | null>(null)
  const [notes, setNotes] = useState('')
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('')

  const isCallback = selected?.d_type?.toLowerCase().includes('callback')

  const handleSave = () => {
    if (!selected) return
    onSave({
      disposition_id: selected.id,
      notes,
      callback_date: isCallback ? callbackDate : undefined,
      callback_time: isCallback ? callbackTime : undefined,
    })
    setSelected(null)
    setNotes('')
    setCallbackDate('')
    setCallbackTime('')
  }

  return (
    <div className="space-y-4">
      {/* Disposition grid */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Select Outcome
        </label>
        <div className="grid grid-cols-2 gap-2">
          {dispositions.map((d) => {
            const isSelected = selected?.id === d.id
            const Icon = getDispositionIcon(d.d_type)
            const colorClasses = getDispositionColors(d.d_type, isSelected)
            return (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left',
                  colorClasses
                )}
              >
                <Icon size={13} className="flex-shrink-0" />
                <span className="truncate">{d.disposition}</span>
              </button>
            )
          })}
          {dispositions.length === 0 && (
            <p className="col-span-2 text-xs text-slate-400 text-center py-6">No dispositions available</p>
          )}
        </div>
      </div>

      {/* Callback scheduler */}
      {isCallback && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold mb-1">
            <Calendar size={13} /> Schedule Callback
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="form-group">
              <label className="label">Date</label>
              <input
                type="date"
                className="input text-xs"
                value={callbackDate}
                onChange={e => setCallbackDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Time</label>
              <input
                type="time"
                className="input text-xs"
                value={callbackTime}
                onChange={e => setCallbackTime(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="form-group">
        <div className="flex items-center justify-between mb-1">
          <label className="label !mb-0">Notes</label>
          <span className={`text-[10px] font-medium ${notes.length > MAX_NOTES * 0.9 ? 'text-amber-500' : 'text-slate-400'}`}>
            {notes.length}/{MAX_NOTES}
          </span>
        </div>
        <textarea
          className="input resize-none text-sm"
          rows={3}
          placeholder="Add call notes…"
          maxLength={MAX_NOTES}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!selected || loading}
        className="btn-primary w-full gap-2"
      >
        <Save size={15} />
        {loading ? 'Saving…' : 'Save Disposition'}
      </button>
    </div>
  )
}
