import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { userService } from '../../services/user.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { useAuthStore } from '../../stores/auth.store'

const DIAL_MODES = [
  { value: 'preview_and_dial', label: 'Preview & Dial' },
  { value: 'power_dial', label: 'Power Dial' },
  { value: 'super_power_dial', label: 'Super Power Dial' },
  { value: 'predictive_dial', label: 'Predictive Dial' },
]

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'UTC',
]

const DEFAULT_FORM = {
  campaign_name: '',
  description: '',
  dial_mode: 'power_dial',
  caller_id: '',
  dial_ratio: 1,
  time_based_calling: 0,
  call_time_start: '08:00',
  call_time_end: '20:00',
  timezone: 'America/New_York',
  group_id: '',
  max_attempts: 3,
  status: 'active',
}

export function CampaignForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const clientId = useAuthStore(s => s.user?.parent_id)
  const [form, setForm] = useState(DEFAULT_FORM)

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignService.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['extension-groups', clientId],
    queryFn: () => userService.getGroups(),
  })

  useEffect(() => {
    if (existing?.data?.data) {
      const c = existing.data.data
      setForm({
        campaign_name: c.campaign_name || '',
        description: c.description || '',
        dial_mode: c.dial_mode || 'power_dial',
        caller_id: c.caller_id || '',
        dial_ratio: c.dial_ratio || 1,
        time_based_calling: c.time_based_calling || 0,
        call_time_start: c.call_time_start || '08:00',
        call_time_end: c.call_time_end || '20:00',
        timezone: c.timezone || 'America/New_York',
        group_id: c.group_id || '',
        max_attempts: c.max_attempts || 3,
        status: c.status || 'active',
      })
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return campaignService.update({ ...form, campaign_id: Number(id) })
      }
      return campaignService.create(form)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Campaign updated' : 'Campaign created')
      navigate('/campaigns')
    },
    onError: () => {
      toast.error('Failed to save campaign')
    },
  })

  const set = (key: string, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }))

  const groups: Array<{ id: number; group_name: string }> =
    groupsData?.data?.data || groupsData?.data || []

  if (isEdit && loadingExisting) return <PageLoader />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/campaigns')} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h1>
          <p className="page-subtitle">{isEdit ? `Editing campaign #${id}` : 'Create a new dialing campaign'}</p>
        </div>
      </div>

      <div className="card space-y-5">
        <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">Basic Info</h3>

        <div className="form-group">
          <label className="label">Campaign Name *</label>
          <input className="input" placeholder="e.g. Summer Sales 2025"
            value={form.campaign_name} onChange={e => set('campaign_name', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={3} placeholder="Campaign description..."
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Dial Mode *</label>
            <select className="input" value={form.dial_mode} onChange={e => set('dial_mode', e.target.value)}>
              {DIAL_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Caller ID</label>
            <input className="input" placeholder="+1XXXXXXXXXX"
              value={form.caller_id} onChange={e => set('caller_id', e.target.value)} />
          </div>
        </div>

        {(form.dial_mode === 'predictive_dial' || form.dial_mode === 'super_power_dial') && (
          <div className="form-group">
            <label className="label">Dial Ratio: {form.dial_ratio}:1</label>
            <input type="range" min={1} max={10} className="w-full accent-indigo-600"
              value={form.dial_ratio} onChange={e => set('dial_ratio', Number(e.target.value))} />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1:1</span><span>5:1</span><span>10:1</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Agent Group</label>
            <select className="input" value={form.group_id} onChange={e => set('group_id', e.target.value)}>
              <option value="">-- None --</option>
              {groups.map((g: { id: number; group_name: string }) => (
                <option key={g.id} value={g.id}>{g.group_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Max Attempts</label>
            <input type="number" className="input" min={1} max={99}
              value={form.max_attempts} onChange={e => set('max_attempts', Number(e.target.value))} />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="card space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-semibold text-slate-900">Call Schedule</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={Boolean(form.time_based_calling)}
              onChange={e => set('time_based_calling', e.target.checked ? 1 : 0)}
              className="rounded" />
            <span className="text-sm text-slate-700">Enable time-based calling</span>
          </label>
        </div>

        {Boolean(form.time_based_calling) && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Start Time</label>
                <input type="time" className="input"
                  value={form.call_time_start} onChange={e => set('call_time_start', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">End Time</label>
                <input type="time" className="input"
                  value={form.call_time_end} onChange={e => set('call_time_end', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Timezone</label>
              <select className="input" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate('/campaigns')} className="btn-outline flex-1">
          Cancel
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!form.campaign_name || saveMutation.isPending}
          className="btn-primary flex-1"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update Campaign' : 'Create Campaign'}
        </button>
      </div>
    </div>
  )
}
