import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Save, MinusCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { excludeListService } from '../../services/excludeList.service'
import { campaignService } from '../../services/campaign.service'

export interface ExcludeItem {
  number: string | number
  campaign_id: string | number
  first_name?: string
  last_name?: string
  company_name?: string
  updated_at?: string
  [key: string]: unknown
}

interface Props {
  item: ExcludeItem
  onClose: () => void
  onSaved: () => void
}

interface Campaign {
  id: number
  title: string
  [key: string]: unknown
}

export function EditExcludeModal({ item, onClose, onSaved }: Props) {
  const [firstName, setFirstName] = useState(item.first_name ?? '')
  const [lastName, setLastName] = useState(item.last_name ?? '')
  const [companyName, setCompanyName] = useState(item.company_name ?? '')
  const [campaignId, setCampaignId] = useState<number>(Number(item.campaign_id ?? 0))

  const { data: campaignRes } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignService.getAll(),
    staleTime: 60_000,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaigns: Campaign[] = (campaignRes as any)?.data?.data ?? []

  const mutation = useMutation({
    mutationFn: () =>
      excludeListService.edit({
        number: String(item.number),
        campaign_id: Number(item.campaign_id),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        company_name: companyName.trim() || undefined,
      }),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = res as any
      if (r?.data?.success === false || r?.data?.success === 'false') {
        toast.error(r?.data?.message || 'Failed to update')
        return
      }
      toast.success('Exclude entry updated')
      onSaved()
    },
    onError: () => toast.error('Failed to update exclude entry'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MinusCircle size={15} className="text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">Edit Exclude Entry</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{String(item.number)}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Number (read-only) — info row */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <MinusCircle size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-400 mr-auto">Phone Number</span>
            <span className="text-sm font-mono font-medium text-slate-700">{String(item.number)}</span>
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">First Name</label>
              <input
                className="input"
                placeholder="John"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Last Name</label>
              <input
                className="input"
                placeholder="Doe"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Company */}
          <div className="form-group">
            <label className="label">Company Legal Name</label>
            <input
              className="input"
              placeholder="e.g. Acme Corp LLC"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          {/* Campaign */}
          <div className="form-group">
            <label className="label">
              Campaign <span className="text-xs text-slate-400 font-normal">— optional</span>
            </label>
            <select
              className="input"
              value={campaignId}
              onChange={e => setCampaignId(Number(e.target.value))}
            >
              <option value={0}>Global (all campaigns)</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
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
