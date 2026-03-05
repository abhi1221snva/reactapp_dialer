import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { dispositionService } from '../../services/disposition.service'

interface Props {
  onClose: () => void
  onSaved: () => void
}

const D_TYPE_OPTIONS = [
  { value: '1', label: 'Standard' },
  { value: '2', label: 'Callback' },
  { value: '3', label: 'DNC' },
]

export function CreateDispositionModal({ onClose, onSaved }: Props) {
  const [title, setTitle] = useState('')
  const [dType, setDType] = useState('1')
  const [enableSms, setEnableSms] = useState(0)
  const [status, setStatus] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const mutation = useMutation({
    mutationFn: () =>
      dispositionService.create({
        title: title.trim(),
        d_type: dType,
        enable_sms: enableSms,
        status,
      }),
    onSuccess: () => {
      toast.success('Disposition created')
      onSaved()
    },
    onError: () => toast.error('Failed to create disposition'),
  })

  const isValid = title.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">New Disposition</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Title */}
        <div className="form-group">
          <label className="label">Disposition Name *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Interested, Callback, Not Interested"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && isValid) mutation.mutate() }}
          />
        </div>

        {/* Disposition Type */}
        <div className="form-group">
          <label className="label">Disposition Type</label>
          <select
            className="input"
            value={dType}
            onChange={e => setDType(e.target.value)}
          >
            {D_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* SMS Enabled */}
        <div className="form-group">
          <label className="label">SMS Enabled</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEnableSms(1)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors ${
                enableSms === 1
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setEnableSms(0)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors ${
                enableSms === 0
                  ? 'bg-slate-500 text-white border-slate-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="form-group">
          <label className="label">Status</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus(1)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors ${
                status === 1
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatus(0)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors ${
                status === 0
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
