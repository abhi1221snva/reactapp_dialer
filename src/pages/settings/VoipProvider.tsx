import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/cn'

interface SmsForm {
  provider: string
  auth_id: string
  api_key: string
}

const DEFAULT_SMS: SmsForm = { provider: 'twilio', auth_id: '', api_key: '' }

export function VoipProvider() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [smsForm, setSmsForm] = useState<SmsForm>(DEFAULT_SMS)
  const [showSecret, setShowSecret] = useState(false)

  const { data: smsData } = useQuery({
    queryKey: ['sms-provider', user?.parent_id],
    queryFn: () => api.get(`/sms-provider/${user?.parent_id}`),
    enabled: !!user?.parent_id,
  })

  useEffect(() => {
    const list = smsData?.data?.data
    if (Array.isArray(list) && list.length > 0) {
      const d = list[0]
      setSmsForm({ provider: d.provider || 'twilio', auth_id: d.auth_id || '', api_key: d.api_key || '' })
    }
  }, [smsData])

  const saveSmsMutation = useMutation({
    mutationFn: () => api.put(`/sms-provider/${user?.parent_id}`, {
      ...smsForm,
      label_name: `${smsForm.provider}-client-${user?.parent_id}`,
      host: 'default',
      status: 1,
    }),
    onSuccess: () => { toast.success('SMS provider saved'); qc.invalidateQueries({ queryKey: ['sms-provider'] }) },
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card space-y-5">
        <h3 className="font-semibold text-slate-900 pb-3 border-b border-slate-100">SMS Provider</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group col-span-2">
            <label className="label">Provider</label>
            <div className="grid grid-cols-3 gap-3">
              {['twilio', 'plivo', 'telnyx'].map(p => (
                <label key={p} className={cn(
                  'flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-all capitalize font-medium text-sm',
                  smsForm.provider === p ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}>
                  <input type="radio" name="provider" value={p} checked={smsForm.provider === p} onChange={e => setSmsForm(f => ({ ...f, provider: e.target.value }))} className="accent-indigo-600" />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="label">API Key / Account SID</label>
            <input className="input font-mono" placeholder="Account SID or API key" value={smsForm.auth_id} onChange={e => setSmsForm(f => ({ ...f, auth_id: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">API Secret / Auth Token</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                className="input font-mono pr-10"
                placeholder="Auth token or API secret"
                value={smsForm.api_key}
                onChange={e => setSmsForm(f => ({ ...f, api_key: e.target.value }))}
              />
              <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>
        <button onClick={() => saveSmsMutation.mutate()} disabled={saveSmsMutation.isPending || !smsForm.auth_id || !smsForm.api_key} className="btn-primary gap-2">
          <Save size={15} />
          {saveSmsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
