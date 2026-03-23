import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Save, PhoneOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { dncService } from '../../services/dnc.service'
import { useAuthStore } from '../../stores/auth.store'

interface Props {
  onClose: () => void
  onSaved: () => void
}

interface ExtItem {
  id: number
  name: string
  extension: string
  [key: string]: unknown
}

export function AddDncModal({ onClose, onSaved }: Props) {
  const [rawDigits, setRawDigits] = useState('')
  const [comment, setComment] = useState('')
  const [extension, setExtension] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const clientId = useAuthStore(s => s.user?.parent_id)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  const { data: extRes } = useQuery({
    queryKey: ['extensions', clientId],
    queryFn: () => dncService.getExtensions(),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions: ExtItem[] = (extRes as any)?.data?.data ?? []

  const mutation = useMutation({
    mutationFn: () => dncService.add(rawDigits, comment.trim(), extension || undefined),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = res as any
      if (r?.data?.success === false || r?.data?.success === 'false') {
        toast.error(r?.data?.message || 'Failed to add number')
        return
      }
      toast.success('Number added to DNC list')
      onSaved()
    },
    onError: () => toast.error('Failed to add number to DNC list'),
  })

  const isValid = rawDigits.length === 10
  const remaining = 10 - rawDigits.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <PhoneOff size={15} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">Add to DNC List</h3>
              <p className="text-xs text-slate-400 mt-0.5">Block a number from being dialed</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Phone Number */}
          <div className="form-group">
            <label className="label">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              className="input font-mono"
              placeholder="e.g. 9876543210"
              value={rawDigits}
              inputMode="numeric"
              maxLength={10}
              onChange={e => setRawDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onKeyDown={e => { if (e.key === 'Enter' && isValid) mutation.mutate() }}
            />
            {rawDigits.length > 0 && rawDigits.length < 10 && (
              <p className="text-xs text-amber-500 mt-1">
                {remaining} more digit{remaining > 1 ? 's' : ''} needed
              </p>
            )}
          </div>

          {/* Extension */}
          <div className="form-group">
            <label className="label">
              Extension <span className="text-xs text-slate-400 font-normal">— optional</span>
            </label>
            <select
              className="input"
              value={extension}
              onChange={e => setExtension(e.target.value)}
            >
              <option value="">None</option>
              {extensions.map(ext => (
                <option key={ext.id} value={String(ext.extension)}>
                  {ext.name} ({ext.extension})
                </option>
              ))}
            </select>
          </div>

          {/* Comment */}
          <div className="form-group">
            <label className="label">
              Comment <span className="text-xs text-slate-400 font-normal">— optional</span>
            </label>
            <input
              className="input"
              placeholder="e.g. Customer requested removal"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && isValid) mutation.mutate() }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
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
