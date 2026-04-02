import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Save, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { dispositionService } from '../../services/disposition.service'

export interface DispositionItem {
  id: number
  title: string
  status: number | string | null
  d_type: string | null
  enable_sms: number | string | null
  [key: string]: unknown
}

interface Props {
  disposition: DispositionItem
  onClose: () => void
  onSaved: () => void
}

const D_TYPE_OPTIONS = [
  { value: '1', label: 'Status' },
  { value: '2', label: 'Callback' },
  { value: '3', label: 'DNC' },
]

export function EditDispositionModal({ disposition, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(disposition.title)
  const [dType, setDType] = useState(String(disposition.d_type ?? '2'))
  const [enableSms, setEnableSms] = useState(Number(disposition.enable_sms ?? 0))
  const currentStatus = Number(disposition.status ?? 1) === 1 ? 1 : 0
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const mutation = useMutation({
    mutationFn: () =>
      dispositionService.update(
        disposition.id,
        { title: title.trim(), d_type: dType, enable_sms: enableSms, status: currentStatus },
        currentStatus,
      ),
    onSuccess: () => {
      toast.success('Disposition updated')
      onSaved()
    },
    onError: () => toast.error('Failed to update disposition'),
  })

  const isValid = title.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Pencil size={16} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Edit Disposition</h3>
                <p className="text-xs text-slate-500">Update disposition settings</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div className="form-group">
            <label className="label">Name *</label>
            <input
              ref={inputRef}
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && isValid) mutation.mutate() }}
            />
          </div>

          {/* Type — dropdown */}
          <div className="form-group">
            <label className="label">Type</label>
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

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
