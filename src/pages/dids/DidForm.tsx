import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { didService } from '../../services/did.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'

const DEST_TYPES = [
  { value: 'extension', label: 'Extension' },
  { value: 'ivr', label: 'IVR' },
  { value: 'queue', label: 'Queue' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'external', label: 'External Number' },
]

const OPERATORS = ['twilio', 'plivo', 'telnyx', 'vonage', 'other']

const DEFAULT_FORM = {
  cli: '',
  cnam: '',
  dest_type: 'extension',
  extension: '',
  forward_number: '',
  operator: '',
  sms: 0,
  default_did: 0,
}

export function DidForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(DEFAULT_FORM)

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['did', id],
    queryFn: () => didService.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: extensionsData } = useQuery({
    queryKey: ['extensions'],
    queryFn: () => didService.getExtensions(),
  })

  useEffect(() => {
    if (existing?.data?.data) {
      const d = existing.data.data
      setForm({
        cli: d.cli || '',
        cnam: d.cnam || '',
        dest_type: d.dest_type || 'extension',
        extension: d.extension || '',
        forward_number: d.forward_number || '',
        operator: d.operator || '',
        sms: d.sms ? 1 : 0,
        default_did: d.default_did ? 1 : 0,
      })
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, ...(isEdit ? { id: Number(id) } : {}) }
      if (isEdit) {
        return didService.update(payload as Record<string, unknown>)
      }
      return didService.create(payload as Record<string, unknown>)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'DID updated' : 'DID added')
      navigate('/dids')
    },
    onError: () => {
      toast.error('Failed to save DID')
    },
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const extensions: Array<{ id: number; extension: string; first_name?: string; last_name?: string }> =
    extensionsData?.data?.data || extensionsData?.data || []

  if (isEdit && loadingExisting) return <PageLoader />

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dids')} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit DID' : 'Add DID'}</h1>
          <p className="page-subtitle">{isEdit ? `Editing DID #${id}` : 'Configure a new phone number'}</p>
        </div>
      </div>

      <div className="card space-y-5">
        <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">Phone Number</h3>

        <div className="form-group">
          <label className="label">Phone Number (CLI) *</label>
          <input className="input font-mono" value={form.cli}
            onChange={e => set('cli', e.target.value)}
            placeholder="+1XXXXXXXXXX" disabled={isEdit} />
          {isEdit && <p className="text-xs text-slate-400 mt-1">Phone number cannot be changed after creation</p>}
        </div>

        <div className="form-group">
          <label className="label">CNAM (Caller ID Name)</label>
          <input className="input" value={form.cnam}
            onChange={e => set('cnam', e.target.value)}
            placeholder="Company Name" />
        </div>

        <div className="form-group">
          <label className="label">Operator / Provider</label>
          <select className="input" value={form.operator} onChange={e => set('operator', e.target.value)}>
            <option value="">-- Select Operator --</option>
            {OPERATORS.map(op => (
              <option key={op} value={op} className="capitalize">{op}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-5">
        <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">Routing</h3>

        <div className="form-group">
          <label className="label">Destination Type</label>
          <select className="input" value={form.dest_type} onChange={e => set('dest_type', e.target.value)}>
            {DEST_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        {form.dest_type === 'extension' && (
          <div className="form-group">
            <label className="label">Extension</label>
            <select className="input" value={form.extension} onChange={e => set('extension', e.target.value)}>
              <option value="">-- Select Extension --</option>
              {extensions.map((ext: { id: number; extension: string; first_name?: string; last_name?: string }) => {
                const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
                return (
                  <option key={ext.id} value={ext.extension}>
                    {ext.extension}{name ? ` (${name})` : ''}
                  </option>
                )
              })}
            </select>
          </div>
        )}

        {form.dest_type === 'external' && (
          <div className="form-group">
            <label className="label">Forward Number</label>
            <input className="input font-mono" value={form.forward_number}
              onChange={e => set('forward_number', e.target.value)}
              placeholder="+1XXXXXXXXXX" />
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">Options</h3>

        <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
          Boolean(form.sms) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
        }`}>
          <input type="checkbox" checked={Boolean(form.sms)}
            onChange={e => set('sms', e.target.checked ? 1 : 0)}
            className="rounded accent-indigo-600 w-4 h-4 flex-shrink-0" />
          <div>
            <p className={`text-sm font-semibold ${Boolean(form.sms) ? 'text-indigo-700' : 'text-slate-700'}`}>Enable SMS</p>
            <p className="text-xs text-slate-400">Allow sending and receiving SMS on this number</p>
          </div>
        </label>

        <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
          Boolean(form.default_did) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
        }`}>
          <input type="checkbox" checked={Boolean(form.default_did)}
            onChange={e => set('default_did', e.target.checked ? 1 : 0)}
            className="rounded accent-indigo-600 w-4 h-4 flex-shrink-0" />
          <div>
            <p className={`text-sm font-semibold ${Boolean(form.default_did) ? 'text-indigo-700' : 'text-slate-700'}`}>Set as Default</p>
            <p className="text-xs text-slate-400">Use this number as the default outbound caller ID</p>
          </div>
        </label>
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate('/dids')} className="btn-outline flex-1">Cancel</button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!form.cli || saveMutation.isPending}
          className="btn-primary flex-1"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update DID' : 'Add DID'}
        </button>
      </div>
    </div>
  )
}
