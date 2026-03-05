import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Send, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { faxService } from '../../services/fax.service'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export function CreateFaxModal({ onClose, onSaved }: Props) {
  const [faxurl, setFaxurl] = useState('')
  const [dialednumber, setDialednumber] = useState('')
  const [callid, setCallid] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const mutation = useMutation({
    mutationFn: () => faxService.send(faxurl.trim(), dialednumber.trim(), callid.trim() || undefined),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res as any)?.data
      if (data?.success === false || data?.success === 'false') {
        toast.error(data?.message || 'Failed to send fax')
        return
      }
      toast.success(data?.message || 'Fax sent successfully')
      onSaved()
    },
    onError: () => toast.error('Failed to send fax'),
  })

  const isValid = faxurl.trim().length > 0 && dialednumber.trim().length >= 10

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Send size={15} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Send Fax</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Billing notice */}
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Sending a fax may incur charges based on your package.
          </p>
        </div>

        {/* Fax URL */}
        <div className="form-group">
          <label className="label">Fax Document URL *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="https://example.com/document.pdf"
            value={faxurl}
            onChange={e => setFaxurl(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Public URL to a PDF file</p>
        </div>

        {/* Dialed Number */}
        <div className="form-group">
          <label className="label">Destination Number *</label>
          <input
            className="input"
            placeholder="e.g. 9876543210"
            value={dialednumber}
            onChange={e => setDialednumber(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Minimum 10 digits</p>
        </div>

        {/* Caller ID */}
        <div className="form-group">
          <label className="label">Caller ID <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            className="input"
            placeholder="e.g. 1234567890"
            value={callid}
            onChange={e => setCallid(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="btn-primary flex-1"
          >
            <Send size={14} />
            {mutation.isPending ? 'Sending…' : 'Send Fax'}
          </button>
        </div>
      </div>
    </div>
  )
}
