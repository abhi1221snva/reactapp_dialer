import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Save, PhoneOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { dncService } from '../../services/dnc.service'
import { useAuthStore } from '../../stores/auth.store'
import { formatPhoneUS } from '../../utils/format'

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

interface ExtItem {
  id: number
  first_name: string
  last_name: string
  extension: string
  [key: string]: unknown
}

export function EditDncModal({ item, onClose, onSaved }: Props) {
  const [comment, setComment] = useState(item.comment ?? '')
  const [extension, setExtension] = useState(String(item.extension ?? ''))
  const clientId = useAuthStore(s => s.user?.parent_id)

  const { data: extRes } = useQuery({
    queryKey: ['extensions', clientId],
    queryFn: () => dncService.getExtensions(),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions: ExtItem[] = (extRes as any)?.data?.data ?? []

  useEffect(() => {
    const val = String(item.extension ?? '')
    if (val && extensions.some(e => String(e.extension) === val)) {
      setExtension(val)
    }
  }, [extensions]) // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: () =>
      dncService.edit(String(item.number), comment.trim(), extension || undefined),
    onSuccess: () => {
      toast.success('DNC entry updated')
      onSaved()
    },
    onError: () => toast.error('Failed to update DNC entry'),
  })

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
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">Edit DNC Entry</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{formatPhoneUS(item.number)}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Number (read-only) — shown as a styled info row, not a field */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <PhoneOff size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-400 mr-auto">Phone Number</span>
            <span className="text-sm font-mono font-medium text-slate-700">{formatPhoneUS(item.number)}</span>
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
                  {ext.first_name} {ext.last_name} ({ext.extension})
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
              onKeyDown={e => { if (e.key === 'Enter') mutation.mutate() }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
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
