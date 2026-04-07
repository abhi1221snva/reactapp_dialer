import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Save, MinusCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { excludeListService } from '../../services/excludeList.service'
import { campaignService } from '../../services/campaign.service'
import { formatPartialPhoneUS } from '../../utils/format'
import { SearchableSelect } from '../../components/ui/SearchableSelect'

interface Props {
  onClose: () => void
  onSaved: () => void
}

interface Campaign {
  id: number
  title: string
  [key: string]: unknown
}

export function AddExcludeModal({ onClose, onSaved }: Props) {
  const [rawDigits, setRawDigits] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [campaignId, setCampaignId] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  const { data: campaignRes } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignService.getAll(),
    staleTime: 60_000,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaigns: Campaign[] = (campaignRes as any)?.data?.data ?? []

  const mutation = useMutation({
    mutationFn: () =>
      excludeListService.add({
        number: rawDigits,
        campaign_id: campaignId,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        company_name: companyName.trim() || undefined,
      }),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = res as any
      if (r?.data?.success === 'false' || r?.data?.success === false) {
        toast.error(r?.data?.message || 'Failed to add number')
        return
      }
      toast.success('Number added to Exclude List')
      onSaved()
    },
    onError: () => toast.error('Failed to add number to Exclude List'),
  })

  const isValid = rawDigits.length === 10
  const remaining = 10 - rawDigits.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MinusCircle size={15} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">Add to Exclude List</h3>
              <p className="text-xs text-slate-400 mt-0.5">Exclude a number from campaign dialing</p>
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
              placeholder="(XXX) XXX-XXXX"
              value={formatPartialPhoneUS(rawDigits)}
              inputMode="tel"
              onChange={e => setRawDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onKeyDown={e => {
                if (e.key === 'Backspace') { e.preventDefault(); setRawDigits(prev => prev.slice(0, -1)); return }
                if (e.key === 'Enter' && isValid) mutation.mutate()
              }}
            />
            {rawDigits.length > 0 && rawDigits.length < 10 && (
              <p className="text-xs text-amber-500 mt-1">
                {remaining} more digit{remaining > 1 ? 's' : ''} needed
              </p>
            )}
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
            <SearchableSelect
              value={String(campaignId)}
              onChange={v => setCampaignId(Number(v))}
              options={campaigns.map(c => ({
                value: String(c.id),
                label: c.title,
              }))}
              placeholder="Select campaign"
              className="input"
              emptyLabel="Global (all campaigns)"
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
            {mutation.isPending ? 'Adding…' : 'Add to List'}
          </button>
        </div>
      </div>
    </div>
  )
}
