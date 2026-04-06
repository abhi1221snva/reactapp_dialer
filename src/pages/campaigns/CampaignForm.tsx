import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2, Radio, Phone, Clock, Users, Settings, Zap, Tag, CheckSquare, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { userService } from '../../services/user.service'
import { dispositionService } from '../../services/disposition.service'
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
  disposition_id: [] as number[],
}

const SECTION_HEADER = 'text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-3'
const FIELD_LABEL = 'block text-[11px] font-semibold uppercase text-slate-500 tracking-wide mb-1'

export function CampaignForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const clientId = useAuthStore(s => s.user?.parent_id)
  const [form, setForm] = useState(DEFAULT_FORM)
  const formLoaded = useRef(false)

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignService.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['extension-groups', clientId],
    queryFn: () => userService.getGroups(),
  })

  const { data: dispositionsData } = useQuery({
    queryKey: ['dispositions-all'],
    queryFn: () => dispositionService.list({ page: 1, limit: 500, search: '', filters: {} }),
  })

  useEffect(() => {
    if (existing?.data?.data && !formLoaded.current) {
      formLoaded.current = true
      const c = existing.data.data
      const dispIds = Array.isArray(c.disposition)
        ? c.disposition.map((d: { id?: number; disposition_id?: number }) => d.id ?? d.disposition_id).filter(Boolean)
        : Array.isArray(c.disposition_id)
          ? c.disposition_id
          : []
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
        disposition_id: dispIds,
      })
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = { ...form, campaign_name: form.campaign_name.charAt(0).toUpperCase() + form.campaign_name.slice(1) }
      if (isEdit) {
        return campaignService.update({ ...data, campaign_id: Number(id) })
      }
      return campaignService.create(data)
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

  const dispositions: Array<{ id: number; title: string }> =
    (dispositionsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; title: string }> ?? []

  const toggleDisposition = (dispId: number) =>
    setForm(f => ({
      ...f,
      disposition_id: f.disposition_id.includes(dispId)
        ? f.disposition_id.filter(i => i !== dispId)
        : [...f.disposition_id, dispId],
    }))

  const selectAllDispositions = () =>
    setForm(f => ({ ...f, disposition_id: dispositions.map(d => d.id) }))

  const deselectAllDispositions = () =>
    setForm(f => ({ ...f, disposition_id: [] }))

  if (isEdit && loadingExisting) return <PageLoader />

  return (
    <div className="-mx-5 -mt-3 flex flex-col" style={{ height: 'calc(100vh - 70px)' }}>

      {/* ── Compact header bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-slate-800 leading-tight">
              {isEdit ? 'Edit Campaign' : 'Create a new campaign'}
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isEdit ? `Editing campaign #${id}` : 'Set up your dialing campaign'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            className="btn-outline text-xs px-3 py-1.5 h-auto hidden sm:flex"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!form.campaign_name || saveMutation.isPending}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 h-auto disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {isEdit ? 'Update Campaign' : 'Create Campaign'}
          </button>
        </div>
      </div>

      {/* ── Scrollable form body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="max-w-4xl mx-auto p-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 space-y-7">

              {/* ═══ Section: Basic Information ═══ */}
              <section>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <Radio size={14} className="text-indigo-500" />
                  <h3 className={SECTION_HEADER + ' mb-0 pb-0 border-0'}>Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-4">
                  <div className="sm:col-span-2">
                    <label className={FIELD_LABEL}>Campaign Name *</label>
                    <input className="input" placeholder="e.g. Summer Sales 2025"
                      value={form.campaign_name} onChange={e => set('campaign_name', e.target.value)} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Status</label>
                    <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Max Attempts</label>
                    <input type="number" className="input" min={1} max={99}
                      value={form.max_attempts} onChange={e => set('max_attempts', Number(e.target.value))} />
                  </div>
                  <div className="sm:col-span-2 xl:col-span-4">
                    <label className={FIELD_LABEL}>Description</label>
                    <textarea className="input resize-none" rows={2} placeholder="Brief campaign description..."
                      value={form.description} onChange={e => set('description', e.target.value)} />
                  </div>
                </div>
              </section>

              {/* ═══ Section: Dialing Configuration ═══ */}
              <section>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <Settings size={14} className="text-indigo-500" />
                  <h3 className={SECTION_HEADER + ' mb-0 pb-0 border-0'}>Dialing Configuration</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-4">
                  <div>
                    <label className={FIELD_LABEL}>Dial Mode *</label>
                    <select className="input" value={form.dial_mode} onChange={e => set('dial_mode', e.target.value)}>
                      {DIAL_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Caller ID</label>
                    <input className="input" placeholder="+1XXXXXXXXXX"
                      value={form.caller_id} onChange={e => set('caller_id', e.target.value)} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Agent Group</label>
                    <select className="input" value={form.group_id} onChange={e => set('group_id', e.target.value)}>
                      <option value="">— None —</option>
                      {groups.map((g: { id: number; group_name: string }) => (
                        <option key={g.id} value={g.id}>{g.group_name}</option>
                      ))}
                    </select>
                  </div>
                  {(form.dial_mode === 'predictive_dial' || form.dial_mode === 'super_power_dial') && (
                    <div>
                      <label className={FIELD_LABEL}>Dial Ratio: {form.dial_ratio}:1</label>
                      <div className="pt-2">
                        <input type="range" min={1} max={10} className="w-full accent-indigo-600"
                          value={form.dial_ratio} onChange={e => set('dial_ratio', Number(e.target.value))} />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>1:1</span><span>5:1</span><span>10:1</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ═══ Section: Call Schedule ═══ */}
              <section>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-indigo-500" />
                    <h3 className={SECTION_HEADER + ' mb-0 pb-0 border-0'}>Call Schedule</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={Boolean(form.time_based_calling)}
                      onChange={e => set('time_based_calling', e.target.checked ? 1 : 0)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    <span className="text-xs text-slate-600 font-medium">Enable time-based calling</span>
                  </label>
                </div>

                {Boolean(form.time_based_calling) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-4">
                    <div>
                      <label className={FIELD_LABEL}>Start Time</label>
                      <input type="time" className="input"
                        value={form.call_time_start} onChange={e => set('call_time_start', e.target.value)} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>End Time</label>
                      <input type="time" className="input"
                        value={form.call_time_end} onChange={e => set('call_time_end', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={FIELD_LABEL}>Timezone</label>
                      <select className="input" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {!form.time_based_calling && (
                  <p className="text-xs text-slate-400 italic">Time-based calling is disabled — calls will run all day.</p>
                )}
              </section>

              {/* ═══ Section: Dispositions ═══ */}
              {dispositions.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-indigo-500" />
                      <h3 className={SECTION_HEADER + ' mb-0 pb-0 border-0'}>Dispositions</h3>
                      <span className="text-[10px] text-slate-400 font-medium ml-1">
                        {form.disposition_id.length}/{dispositions.length} selected
                      </span>
                    </div>
                    {form.disposition_id.length === dispositions.length ? (
                      <button
                        type="button"
                        onClick={deselectAllDispositions}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        <Square size={12} />
                        Deselect All
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={selectAllDispositions}
                        className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <CheckSquare size={12} />
                        Select All
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                    {dispositions.map(d => {
                      const isSelected = form.disposition_id.includes(d.id)
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDisposition(d.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all text-xs ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && (
                              <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span className="truncate font-medium">{d.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile save bar ────────────────────────────────────────────── */}
      <div className="sm:hidden flex items-center gap-3 px-5 py-3 bg-white border-t border-slate-200 shadow-lg flex-shrink-0">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!form.campaign_name || saveMutation.isPending}
          className="btn-primary flex-1 justify-center disabled:opacity-50"
        >
          {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Update Campaign' : 'Create Campaign'}
        </button>
        <button onClick={() => navigate('/campaigns')} className="btn-outline">
          Cancel
        </button>
      </div>

    </div>
  )
}
