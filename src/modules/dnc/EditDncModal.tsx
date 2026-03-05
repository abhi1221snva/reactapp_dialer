import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { dncService } from '../../services/dnc.service'

export interface DncItem {
  number: string | number
  extension: string | number
  comment: string
  updated_at?: string
  [key: string]: unknown
}

interface Props {
  item: DncItem
  onClose: () => void
  onSaved: () => void
}

export function EditDncModal({ item, onClose, onSaved }: Props) {
  const [comment, setComment] = useState(item.comment ?? '')
  const [extension, setExtension] = useState(String(item.extension ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const mutation = useMutation({
    mutationFn: () =>
      dncService.edit(String(item.number), comment.trim(), extension.trim() || undefined),
    onSuccess: () => {
      toast.success('DNC entry updated')
      onSaved()
    },
    onError: () => toast.error('Failed to update DNC entry'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">Edit DNC Entry</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Number (read-only) */}
        <div className="form-group">
          <label className="label">Phone Number</label>
          <input
            className="input bg-slate-50 text-slate-500 cursor-not-allowed"
            value={String(item.number)}
            readOnly
          />
        </div>

        {/* Extension */}
        <div className="form-group">
          <label className="label">Extension</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. 1001"
            value={extension}
            onChange={e => setExtension(e.target.value)}
          />
        </div>

        {/* Comment */}
        <div className="form-group">
          <label className="label">Comment</label>
          <input
            className="input"
            placeholder="e.g. Customer requested removal"
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') mutation.mutate() }}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
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
