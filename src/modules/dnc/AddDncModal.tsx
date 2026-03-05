import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Save, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { dncService } from '../../services/dnc.service'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export function AddDncModal({ onClose, onSaved }: Props) {
  const [number, setNumber] = useState('')
  const [comment, setComment] = useState('')
  const [extension, setExtension] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const mutation = useMutation({
    mutationFn: () => dncService.add(number.trim(), comment.trim(), extension.trim() || undefined),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const success = (res as any)?.data?.success
      if (success === false || success === 'false') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (res as any)?.data?.message || 'Failed to add number'
        toast.error(msg)
        return
      }
      toast.success('Number added to DNC list')
      onSaved()
    },
    onError: () => toast.error('Failed to add number to DNC list'),
  })

  // Number must be at least 10 digits
  const isValid = number.trim().replace(/\D/g, '').length >= 10

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <Phone size={15} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Add to DNC List</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Phone Number */}
        <div className="form-group">
          <label className="label">Phone Number *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. 9876543210"
            value={number}
            onChange={e => setNumber(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && isValid) mutation.mutate() }}
          />
          <p className="text-xs text-slate-400 mt-1">Minimum 10 digits, numbers only</p>
        </div>

        {/* Extension (optional) */}
        <div className="form-group">
          <label className="label">Extension <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            className="input"
            placeholder="e.g. 1001"
            value={extension}
            onChange={e => setExtension(e.target.value)}
          />
        </div>

        {/* Comment */}
        <div className="form-group">
          <label className="label">Comment <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            className="input"
            placeholder="e.g. Customer requested removal"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {mutation.isPending ? 'Adding…' : 'Add to DNC'}
          </button>
        </div>
      </div>
    </div>
  )
}
