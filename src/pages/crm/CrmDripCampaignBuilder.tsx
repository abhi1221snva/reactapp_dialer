import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Play, Plus, Trash2, GripVertical, Mail,
  MessageSquare, Clock, ChevronDown, ChevronUp, Eye, Loader2,
  Settings2, Zap, Target, ShieldCheck, Bell, Moon, AlertCircle,
  Send, CheckCircle2, XCircle, Users, Hash, ArrowDown, Smartphone,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { dripService } from '../../services/drip.service'
import { crmService } from '../../services/crm.service'
import type { DripStep, DripStepChannel, DripDelayUnit, DripChannel, TriggerRule, MergeTag } from '../../types/drip.types'

const DELAY_UNITS: { value: DripDelayUnit; label: string }[] = [
  { value: 'minutes', label: 'Min' },
  { value: 'hours',   label: 'Hrs' },
  { value: 'days',    label: 'Days' },
]

const TRIGGER_TYPES = [
  { value: 'lead_created',    label: 'Lead Created',    description: 'When a new lead is added' },
  { value: 'status_changed',  label: 'Status Changed',  description: 'When lead status changes to...' },
  { value: 'field_updated',   label: 'Field Updated',   description: 'When a specific field is updated' },
]

function emptyStep(pos: number, channel: DripStepChannel = 'email'): DripStep {
  return {
    position: pos,
    channel,
    delay_value: pos === 1 ? 0 : 1,
    delay_unit: pos === 1 ? 'minutes' : 'days',
    send_at_time: null,
    subject: null,
    body_html: null,
    body_plain: null,
    email_template_id: null,
    sms_template_id: null,
    is_active: true,
  }
}

export function CrmDripCampaignBuilder() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [channel, setChannel] = useState<DripChannel>('email')
  const [emailSettingId, setEmailSettingId] = useState<number | null>(null)
  const [smsFromNumber, setSmsFromNumber] = useState('')
  const [steps, setSteps] = useState<DripStep[]>([emptyStep(1)])
  const [entryConditions, setEntryConditions] = useState<Record<string, unknown>>({})
  const [exitConditions, setExitConditions] = useState<Record<string, unknown>>({})
  const [triggerRules, setTriggerRules] = useState<TriggerRule[]>([])
  const [quietStart, setQuietStart] = useState('')
  const [quietEnd, setQuietEnd] = useState('')
  const [quietTz, setQuietTz] = useState('America/New_York')
  const [expandedStep, setExpandedStep] = useState<number>(0)
  const [activeSection, setActiveSection] = useState<string>('settings')
  const [selectedPreviewStep, setSelectedPreviewStep] = useState<number>(0)

  const { data: existing, isLoading: loadingCampaign } = useQuery({
    queryKey: ['drip-campaign', id],
    queryFn: () => dripService.getCampaign(Number(id)).then(r => r.data.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setDescription(existing.description || '')
      setChannel(existing.channel)
      setEmailSettingId(existing.email_setting_id)
      setSmsFromNumber(existing.sms_from_number || '')
      setSteps(existing.steps && existing.steps.length > 0 ? existing.steps : [emptyStep(1)])
      setEntryConditions(existing.entry_conditions || {})
      setExitConditions(existing.exit_conditions || {})
      setTriggerRules(existing.trigger_rules || [])
      setQuietStart(existing.quiet_hours_start || '')
      setQuietEnd(existing.quiet_hours_end || '')
      setQuietTz(existing.quiet_hours_tz || 'America/New_York')
    }
  }, [existing])

  const { data: senderOpts } = useQuery({
    queryKey: ['drip-sender-options'],
    queryFn: () => dripService.getSenderOptions().then(r => r.data.data),
  })

  const { data: mergeTags } = useQuery({
    queryKey: ['drip-merge-tags'],
    queryFn: () => dripService.getMergeTags().then(r => r.data.data),
  })

  const { data: leadStatuses } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: () => crmService.getLeadStatuses(),
  })

  const { data: leadFields } = useQuery({
    queryKey: ['crm-lead-fields'],
    queryFn: () => crmService.getLeadFields().then(r => r.data?.data ?? r.data ?? []),
  })

  const saveMut = useMutation({
    mutationFn: (activate: boolean) => {
      const mappedSteps = steps.map((s, i) => ({
        channel: s.channel,
        delay_value: s.delay_value,
        delay_unit: s.delay_unit,
        send_at_time: s.send_at_time || null,
        subject: s.subject || null,
        body_html: s.body_html || null,
        body_plain: s.body_plain || null,
        email_template_id: s.email_template_id || null,
        sms_template_id: s.sms_template_id || null,
        is_active: s.is_active !== false,
        position: i + 1,
      }))
      const payload = {
        name, description: description || null, channel,
        email_setting_id: emailSettingId,
        sms_from_number: smsFromNumber || null,
        entry_conditions: Object.keys(entryConditions).length ? entryConditions : null,
        exit_conditions: Object.keys(exitConditions).length ? exitConditions : null,
        trigger_rules: triggerRules.length ? triggerRules : null,
        quiet_hours_start: quietStart || null,
        quiet_hours_end: quietEnd || null,
        quiet_hours_tz: quietTz || null,
        steps: mappedSteps,
      }
      console.log('[DripSave] payload:', JSON.stringify(payload, null, 2))
      if (isEdit) {
        return dripService.updateCampaign(Number(id), payload).then(r => {
          if (activate) return dripService.activateCampaign(r.data.data.id)
          return r
        })
      }
      return dripService.createCampaign(payload).then(r => {
        if (activate) return dripService.activateCampaign(r.data.data.id)
        return r
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drip-campaigns'] })
      toast.success(isEdit ? 'Campaign updated' : 'Campaign created')
      navigate('/crm/drip-campaigns')
    },
    onError: (e: unknown) => toast.error((e as Error)?.message || 'Failed to save campaign'),
  })

  const addStep = (ch: DripStepChannel = channel === 'sms' ? 'sms' : 'email') => {
    setSteps(prev => [...prev, emptyStep(prev.length + 1, ch)])
    setExpandedStep(steps.length)
    setSelectedPreviewStep(steps.length)
  }
  const removeStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx))
    if (selectedPreviewStep >= steps.length - 1) setSelectedPreviewStep(Math.max(0, steps.length - 2))
  }
  const updateStep = (idx: number, field: keyof DripStep, value: unknown) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }
  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= steps.length) return
    setSteps(prev => {
      const arr = [...prev]
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
    setExpandedStep(target)
    setSelectedPreviewStep(target)
  }

  const addTrigger = () => setTriggerRules(prev => [...prev, { type: 'lead_created' }])
  const removeTrigger = (idx: number) => setTriggerRules(prev => prev.filter((_, i) => i !== idx))
  const updateTrigger = (idx: number, field: string, value: string) => {
    setTriggerRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  if (isEdit && loadingCampaign) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
  }

  const NAV_ITEMS = [
    { key: 'settings', label: 'Settings', icon: Settings2 },
    { key: 'steps', label: `Steps (${steps.length})`, icon: Zap },
    { key: 'conditions', label: 'Conditions', icon: Target },
    { key: 'triggers', label: 'Triggers', icon: Bell },
    { key: 'quiet', label: 'Quiet Hours', icon: Moon },
  ]

  // Email settings — handle both field names from API
  const emailSettings = (senderOpts as Record<string, unknown[]> | undefined)?.email_settings
    || (senderOpts as Record<string, unknown[]> | undefined)?.smtp_settings
    || []
  const twilioNumbers = (senderOpts as Record<string, unknown[]> | undefined)?.twilio_numbers || []

  // Current preview step
  const previewStep = steps[selectedPreviewStep] || null

  // Calculate total campaign duration
  const totalDuration = steps.reduce((acc, s) => {
    const v = s.delay_value || 0
    if (s.delay_unit === 'days') return acc + v * 1440
    if (s.delay_unit === 'hours') return acc + v * 60
    return acc + v
  }, 0)
  const durationLabel = totalDuration >= 1440
    ? `${Math.round(totalDuration / 1440)} days`
    : totalDuration >= 60
      ? `${Math.round(totalDuration / 60)} hours`
      : `${totalDuration} minutes`

  return (
    <div className="h-full flex flex-col">
      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/crm/drip-campaigns')}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Campaign' : 'Create Drip Campaign'}</h1>
          {name && <p className="text-[11px] text-slate-400 truncate">{name}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => saveMut.mutate(false)} disabled={saveMut.isPending || !name}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all">
            <Save size={14} /> Save Draft
          </button>
          <button onClick={() => saveMut.mutate(true)} disabled={saveMut.isPending || !name || steps.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-40 shadow-sm transition-all">
            <Play size={14} /> Save &amp; Activate
          </button>
        </div>
      </div>

      {/* ── Body: Side Nav + Editor + Preview ─────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Section Nav */}
        <div className="w-44 shrink-0 border-r border-slate-200 bg-slate-50/50 py-3 px-2 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = activeSection === item.key
            return (
              <button key={item.key} onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold mb-0.5 transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-white hover:text-slate-700'
                }`}>
                <Icon size={14} /> {item.label}
              </button>
            )
          })}

          {!name && (
            <div className="mt-4 mx-1 p-2.5 bg-amber-50 rounded-lg">
              <div className="flex items-start gap-1.5">
                <AlertCircle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700 leading-tight">Enter a campaign name to enable saving.</p>
              </div>
            </div>
          )}

          {/* Campaign Summary */}
          <div className="mt-4 mx-1 p-3 bg-white border border-slate-200 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Summary</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px]">
                <Hash size={10} className="text-slate-400" />
                <span className="text-slate-500">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Clock size={10} className="text-slate-400" />
                <span className="text-slate-500">{totalDuration > 0 ? durationLabel : 'Instant'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                {channel === 'email' ? <Mail size={10} className="text-sky-500" /> : channel === 'sms' ? <MessageSquare size={10} className="text-violet-500" /> : <Zap size={10} className="text-indigo-500" />}
                <span className="text-slate-500 capitalize">{channel === 'both' ? 'Email + SMS' : channel}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Bell size={10} className="text-slate-400" />
                <span className="text-slate-500">{triggerRules.length} trigger{triggerRules.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 overflow-y-auto p-6" style={{ minWidth: 0 }}>
          {/* ── SETTINGS ──────────────────────────────────────────── */}
          {activeSection === 'settings' && (
            <div className="max-w-2xl">
              <SectionTitle icon={Settings2} title="Campaign Settings" subtitle="Configure the basic campaign details" />
              <div className="space-y-4">
                <Field label="Campaign Name *">
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="input-field" placeholder="e.g. New Lead Welcome Sequence" />
                </Field>
                <Field label="Description">
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    className="input-field" placeholder="Brief description of this campaign's purpose" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Channel">
                    <select value={channel} onChange={e => setChannel(e.target.value as DripChannel)} className="input-field">
                      <option value="email">Email Only</option>
                      <option value="sms">SMS Only</option>
                      <option value="both">Email + SMS</option>
                    </select>
                  </Field>
                  {(channel === 'email' || channel === 'both') && (
                    <Field label="SMTP Setting">
                      <select value={emailSettingId ?? ''} onChange={e => setEmailSettingId(e.target.value ? Number(e.target.value) : null)}
                        className="input-field">
                        <option value="">Default SMTP</option>
                        {(emailSettings as Array<{id: number; sender_name: string; sender_email: string}>).map(s => (
                          <option key={s.id} value={s.id}>{s.sender_name} ({s.sender_email})</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {(channel === 'sms' || channel === 'both') && (
                    <Field label="SMS From Number">
                      <select value={smsFromNumber} onChange={e => setSmsFromNumber(e.target.value)} className="input-field">
                        <option value="">Select number...</option>
                        {(twilioNumbers as Array<{id: number; phone_number: string; friendly_name: string}>).map(n => (
                          <option key={n.id} value={n.phone_number}>{n.friendly_name || n.phone_number}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEPS ─────────────────────────────────────────────── */}
          {activeSection === 'steps' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={Zap} title="Campaign Steps" subtitle="Define the sequence of messages to send" />
                <div className="flex items-center gap-2">
                  {channel === 'both' ? (
                    <>
                      <button onClick={() => addStep('email')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors">
                        <Mail size={13} /> Add Email
                      </button>
                      <button onClick={() => addStep('sms')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors">
                        <MessageSquare size={13} /> Add SMS
                      </button>
                    </>
                  ) : (
                    <button onClick={() => addStep()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                      <Plus size={14} /> Add Step
                    </button>
                  )}
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-0">
                {steps.map((step, idx) => {
                  const isExpanded = expandedStep === idx
                  const isEmail = step.channel === 'email'
                  const isPreview = selectedPreviewStep === idx
                  return (
                    <div key={idx} className="relative">
                      {/* Timeline connector */}
                      {idx > 0 && (
                        <div className="flex items-center gap-2 py-2 pl-5">
                          <div className="w-px h-4 bg-slate-200 ml-3" />
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                            <Clock size={11} />
                            {step.delay_value > 0
                              ? `Wait ${step.delay_value} ${step.delay_unit}`
                              : 'Send immediately'}
                          </div>
                        </div>
                      )}

                      {/* Step Card */}
                      <div className={`border rounded-xl overflow-hidden transition-all ${
                        isPreview ? 'border-indigo-300 ring-2 ring-indigo-100' : isExpanded ? 'border-indigo-200 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                        {/* Step header */}
                        <div className={`flex items-center gap-2.5 px-4 py-3 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50/50'
                        }`} onClick={() => { setExpandedStep(isExpanded ? -1 : idx); setSelectedPreviewStep(idx) }}>
                          <GripVertical size={14} className="text-slate-300 shrink-0" />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isEmail ? 'bg-sky-100' : 'bg-violet-100'
                          }`}>
                            {isEmail ? <Mail size={14} className="text-sky-600" /> : <MessageSquare size={14} className="text-violet-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-700">Step {idx + 1}</span>
                            <span className={`ml-2 text-[11px] font-medium ${isEmail ? 'text-sky-600' : 'text-violet-600'}`}>
                              {isEmail ? 'Email' : 'SMS'}
                            </span>
                            {step.subject && <span className="ml-2 text-[11px] text-slate-400 truncate">— {step.subject}</span>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {idx > 0 && <button onClick={e => { e.stopPropagation(); moveStep(idx, -1) }}
                              className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronUp size={14} className="text-slate-400" /></button>}
                            {idx < steps.length - 1 && <button onClick={e => { e.stopPropagation(); moveStep(idx, 1) }}
                              className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronDown size={14} className="text-slate-400" /></button>}
                            {steps.length > 1 && <button onClick={e => { e.stopPropagation(); removeStep(idx) }}
                              className="p-1 hover:bg-red-50 text-red-400 rounded-lg transition-colors"><Trash2 size={14} /></button>}
                            {isExpanded ? <ChevronUp size={15} className="text-slate-400 ml-1" /> : <ChevronDown size={15} className="text-slate-400 ml-1" />}
                          </div>
                        </div>

                        {/* Step body */}
                        {isExpanded && (
                          <div className="p-5 bg-white border-t border-slate-100 space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                              <Field label="Channel">
                                <select value={step.channel} onChange={e => updateStep(idx, 'channel', e.target.value as DripStepChannel)}
                                  className="input-field-sm">
                                  <option value="email">Email</option>
                                  <option value="sms">SMS</option>
                                </select>
                              </Field>
                              <Field label="Delay">
                                <div className="flex gap-1">
                                  <input type="number" min={0} value={step.delay_value}
                                    onChange={e => updateStep(idx, 'delay_value', parseInt(e.target.value) || 0)}
                                    className="input-field-sm w-16" />
                                  <select value={step.delay_unit} onChange={e => updateStep(idx, 'delay_unit', e.target.value)}
                                    className="input-field-sm flex-1">
                                    {DELAY_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                  </select>
                                </div>
                              </Field>
                              <Field label="Send at Time">
                                <input type="time" value={step.send_at_time || ''} onChange={e => updateStep(idx, 'send_at_time', e.target.value || null)}
                                  className="input-field-sm" />
                              </Field>
                              <Field label="Active">
                                <label className="inline-flex items-center gap-2 mt-1.5">
                                  <input type="checkbox" checked={step.is_active !== false}
                                    onChange={e => updateStep(idx, 'is_active', e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200" />
                                  <span className="text-xs text-slate-600">{step.is_active !== false ? 'Enabled' : 'Disabled'}</span>
                                </label>
                              </Field>
                            </div>

                            {step.channel === 'email' && (
                              <Field label="Subject Line">
                                <input type="text" value={step.subject || ''} onChange={e => updateStep(idx, 'subject', e.target.value)}
                                  className="input-field" placeholder="Email subject line — use [[first_name]] for merge tags" />
                              </Field>
                            )}

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-semibold text-slate-600">
                                  {step.channel === 'email' ? 'Email Body (HTML)' : 'SMS Message'}
                                </label>
                                {mergeTags && <MergeTagPicker tags={mergeTags} onInsert={(tag) => {
                                  const val = (step.channel === 'email' ? step.body_html : step.body_plain) || ''
                                  if (step.channel === 'email') updateStep(idx, 'body_html', val + `[[${tag}]]`)
                                  else updateStep(idx, 'body_plain', val + `[[${tag}]]`)
                                }} />}
                              </div>
                              <textarea rows={step.channel === 'sms' ? 4 : 8}
                                value={(step.channel === 'email' ? step.body_html : step.body_plain) || ''}
                                onChange={e => updateStep(idx, step.channel === 'email' ? 'body_html' : 'body_plain', e.target.value)}
                                className="input-field font-mono text-xs leading-relaxed"
                                placeholder={step.channel === 'email' ? '<p>Hello [[first_name]],</p>\n<p>Thank you for your interest...</p>' : 'Hi [[first_name]], ...'} />
                              {step.channel === 'sms' && (
                                <p className="text-[10px] text-slate-400 mt-1">{((step.body_plain || '').length)} / 160 characters</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {steps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Zap size={28} className="text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-500 mb-1">No steps yet</p>
                  <p className="text-xs text-slate-400 mb-3">Add at least one step to your campaign sequence</p>
                  <button onClick={() => addStep()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
                    <Plus size={15} /> Add First Step
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── CONDITIONS ─────────────────────────────────────────── */}
          {activeSection === 'conditions' && (
            <div className="max-w-2xl">
              <SectionTitle icon={Target} title="Entry & Exit Conditions" subtitle="Control who enters and when they exit the campaign" />

              <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
                <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <Target size={13} className="text-emerald-500" /> Entry Conditions
                </h3>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Allowed Lead Statuses</label>
                <p className="text-[11px] text-slate-400 mb-3">Only leads with these statuses can be enrolled. Leave all unchecked to allow any status.</p>
                <div className="grid grid-cols-3 gap-2">
                  {leadStatuses?.map(s => {
                    const selected = (entryConditions.lead_statuses as string[] || []).includes(s.lead_title)
                    return (
                      <label key={s.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                          selected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}>
                        <input type="checkbox" checked={selected}
                          onChange={e => {
                            const current = (entryConditions.lead_statuses as string[] || [])
                            setEntryConditions(prev => ({
                              ...prev,
                              lead_statuses: e.target.checked
                                ? [...current, s.lead_title]
                                : current.filter(v => v !== s.lead_title)
                            }))
                          }}
                          className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-200" />
                        <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          {s.color_code && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color_code }} />}
                          {s.lead_title}
                        </span>
                      </label>
                    )
                  })}
                </div>
                {(!leadStatuses || leadStatuses.length === 0) && (
                  <p className="text-[11px] text-slate-400 italic">Loading statuses...</p>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-red-500" /> Exit Conditions
                </h3>
                <p className="text-xs text-slate-500 mb-3">Automatically stop the campaign when any of these conditions are met:</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {['funded', 'dead', 'dnc', 'unsubscribed', 'bounced'].map(cond => (
                    <label key={cond}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        (exitConditions as Record<string, unknown>)[`on_${cond}`]
                          ? 'border-red-200 bg-red-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}>
                      <input type="checkbox"
                        checked={!!(exitConditions as Record<string, unknown>)[`on_${cond}`]}
                        onChange={e => setExitConditions(prev => ({ ...prev, [`on_${cond}`]: e.target.checked }))}
                        className="rounded border-slate-300 text-red-500 focus:ring-red-200" />
                      <span className="text-xs font-semibold capitalize text-slate-700">{cond}</span>
                    </label>
                  ))}
                </div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 mt-4">Exit when status changes to</label>
                <div className="grid grid-cols-3 gap-2">
                  {leadStatuses?.map(s => {
                    const selected = (exitConditions.exit_statuses as string[] || []).includes(s.lead_title)
                    return (
                      <label key={s.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                          selected ? 'border-red-200 bg-red-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}>
                        <input type="checkbox" checked={selected}
                          onChange={e => {
                            const current = (exitConditions.exit_statuses as string[] || [])
                            setExitConditions(prev => ({
                              ...prev,
                              exit_statuses: e.target.checked
                                ? [...current, s.lead_title]
                                : current.filter(v => v !== s.lead_title)
                            }))
                          }}
                          className="rounded border-slate-300 text-red-500 focus:ring-red-200" />
                        <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          {s.color_code && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color_code }} />}
                          {s.lead_title}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TRIGGERS ──────────────────────────────────────────── */}
          {activeSection === 'triggers' && (
            <div className="max-w-2xl">
              <SectionTitle icon={Bell} title="Auto-Enrollment Triggers" subtitle="Automatically enroll leads when specific events occur" />

              {/* Explanation card */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-5">
                <p className="text-xs text-indigo-700 leading-relaxed">
                  Triggers automatically enroll leads into this campaign when certain events happen.
                  Without triggers, leads can only be enrolled manually.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                {triggerRules.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                      <Bell size={22} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">No triggers configured</p>
                    <p className="text-xs text-slate-400 mb-4 max-w-xs">Leads can only be enrolled manually. Add a trigger to automate enrollment.</p>
                    <button onClick={addTrigger}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
                      <Plus size={13} /> Add Trigger
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {triggerRules.map((rule, idx) => {
                      const triggerMeta = TRIGGER_TYPES.find(t => t.value === rule.type)
                      return (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                          {/* Trigger type row */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <Zap size={12} className="text-indigo-600" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trigger Event</label>
                              <select value={rule.type} onChange={e => {
                                updateTrigger(idx, 'type', e.target.value)
                                // Pre-fill first status when switching to status_changed
                                if (e.target.value === 'status_changed' && leadStatuses?.length && !rule.status) {
                                  updateTrigger(idx, 'status', leadStatuses[0].lead_title)
                                }
                                // Pre-fill first field when switching to field_updated
                                if (e.target.value === 'field_updated' && (leadFields as Array<{field_key: string}>)?.length && !rule.field) {
                                  updateTrigger(idx, 'field', (leadFields as Array<{field_key: string}>)[0].field_key)
                                }
                              }}
                                className="input-field-sm mt-1">
                                {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                            <button onClick={() => removeTrigger(idx)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0 self-start">
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Description */}
                          {triggerMeta && (
                            <p className="text-[11px] text-slate-400 mb-3 ml-9">{triggerMeta.description}</p>
                          )}

                          {/* Status Changed → dropdown for status */}
                          {rule.type === 'status_changed' && (
                            <div className="ml-9 bg-white border border-slate-200 rounded-lg p-3">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enroll when status changes to</label>
                              <select
                                value={rule.status || ''}
                                onChange={e => updateTrigger(idx, 'status', e.target.value)}
                                className="input-field-sm mt-1">
                                <option value="">Select a status...</option>
                                {leadStatuses?.map(s => (
                                  <option key={s.id} value={s.lead_title}>
                                    {s.lead_title}
                                  </option>
                                ))}
                              </select>
                              {!rule.status && (
                                <p className="text-[10px] text-amber-500 mt-1.5 flex items-center gap-1">
                                  <AlertCircle size={10} /> Please select a lead status
                                </p>
                              )}
                            </div>
                          )}

                          {/* Field Updated → dropdown for field */}
                          {rule.type === 'field_updated' && (
                            <div className="ml-9 bg-white border border-slate-200 rounded-lg p-3 space-y-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">When this field is updated</label>
                                <select
                                  value={String(rule.field ?? '')}
                                  onChange={e => updateTrigger(idx, 'field', e.target.value)}
                                  className="input-field-sm mt-1">
                                  <option value="">Select a field...</option>
                                  <optgroup label="System Fields">
                                    <option value="lead_status">Lead Status</option>
                                    <option value="assigned_to">Assigned To</option>
                                    <option value="lead_type">Lead Type</option>
                                    <option value="email">Email</option>
                                    <option value="phone_number">Phone Number</option>
                                  </optgroup>
                                  {(leadFields as Array<{field_key: string; label_name: string; section?: string}>)?.length > 0 && (
                                    <optgroup label="Custom Fields">
                                      {(leadFields as Array<{field_key: string; label_name: string; section?: string}>).map(f => (
                                        <option key={f.field_key} value={f.field_key}>
                                          {f.label_name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To value (optional)</label>
                                <input type="text" placeholder="Any value (leave empty for any change)"
                                  value={String(rule.value ?? '')}
                                  onChange={e => updateTrigger(idx, 'value', e.target.value)}
                                  className="input-field-sm mt-1" />
                              </div>
                            </div>
                          )}

                          {/* Lead Created — no extra config needed */}
                          {rule.type === 'lead_created' && (
                            <div className="ml-9 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                              <p className="text-[11px] text-emerald-700 flex items-center gap-1.5">
                                <CheckCircle2 size={12} />
                                Every new lead will be automatically enrolled into this campaign.
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <button onClick={addTrigger}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors w-full justify-center">
                      <Plus size={13} /> Add Another Trigger
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── QUIET HOURS ───────────────────────────────────────── */}
          {activeSection === 'quiet' && (
            <div className="max-w-2xl">
              <SectionTitle icon={Moon} title="Quiet Hours" subtitle="Pause sending during specified hours" />

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Start Time">
                    <input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)}
                      className="input-field" />
                  </Field>
                  <Field label="End Time">
                    <input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)}
                      className="input-field" />
                  </Field>
                  <Field label="Timezone">
                    <input type="text" value={quietTz} onChange={e => setQuietTz(e.target.value)}
                      className="input-field" placeholder="America/New_York" />
                  </Field>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">Messages during quiet hours will be deferred to the next available window.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Preview Panel ─────────────────────────────────── */}
        <div className="w-80 shrink-0 border-l border-slate-200 bg-slate-50/50 overflow-y-auto flex flex-col">
          {/* Preview Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Eye size={13} className="text-indigo-500" /> Campaign Preview
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Visual flow of your campaign</p>
          </div>

          {/* Campaign Flow Visual */}
          <div className="px-4 py-4 flex-1">
            {/* Trigger Entry */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Users size={14} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700">Lead Enters</p>
                <p className="text-[10px] text-slate-400">
                  {triggerRules.length > 0 ? `${triggerRules.length} auto trigger${triggerRules.length > 1 ? 's' : ''}` : 'Manual enrollment'}
                </p>
              </div>
            </div>

            {/* Steps Flow */}
            {steps.map((step, idx) => {
              const isEmail = step.channel === 'email'
              const isSelected = selectedPreviewStep === idx
              return (
                <div key={idx}>
                  {/* Delay connector */}
                  <div className="flex items-center ml-4 py-1">
                    <div className="w-px h-5 bg-slate-300" />
                    {(step.delay_value > 0 || idx > 0) && (
                      <span className="ml-2 text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={9} />
                        {step.delay_value > 0 ? `${step.delay_value} ${step.delay_unit}` : 'Immediate'}
                      </span>
                    )}
                  </div>

                  {/* Step node */}
                  <div
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'bg-white ring-2 ring-indigo-200 shadow-sm' : 'hover:bg-white/80'
                    }`}
                    onClick={() => { setSelectedPreviewStep(idx); setExpandedStep(idx); setActiveSection('steps') }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isEmail ? 'bg-sky-100' : 'bg-violet-100'
                    }`}>
                      {isEmail ? <Mail size={14} className="text-sky-600" /> : <Smartphone size={14} className="text-violet-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-700">
                        Step {idx + 1} · <span className={isEmail ? 'text-sky-600' : 'text-violet-600'}>{isEmail ? 'Email' : 'SMS'}</span>
                      </p>
                      {isEmail && step.subject ? (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{step.subject}</p>
                      ) : !isEmail && step.body_plain ? (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{step.body_plain.substring(0, 60)}...</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">No content yet</p>
                      )}
                      {!step.is_active && (
                        <span className="inline-block mt-1 text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">DISABLED</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Exit node */}
            <div className="flex items-center ml-4 py-1">
              <div className="w-px h-5 bg-slate-300" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} className="text-slate-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500">Campaign Complete</p>
                <p className="text-[10px] text-slate-400">{durationLabel} total duration</p>
              </div>
            </div>

            {/* Step Content Preview */}
            {previewStep && (
              <div className="mt-5 pt-4 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Step {selectedPreviewStep + 1} Preview
                </p>

                {previewStep.channel === 'email' ? (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    {/* Email Header */}
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="font-semibold text-slate-500">Subject:</span>
                        <span className="text-slate-700 truncate">{previewStep.subject || '(no subject)'}</span>
                      </div>
                    </div>
                    {/* Email Body */}
                    <div className="p-3">
                      {previewStep.body_html ? (
                        <div
                          className="text-[11px] text-slate-600 leading-relaxed break-words [&_p]:mb-2 [&_a]:text-indigo-600 [&_a]:underline"
                          dangerouslySetInnerHTML={{
                            __html: previewStep.body_html
                              .replace(/\[\[(\w+)\]\]/g, '<span style="color:#6366f1;font-weight:600">[$1]</span>')
                          }}
                        />
                      ) : (
                        <p className="text-[11px] text-slate-400 italic text-center py-4">
                          Email body is empty. Click to edit this step.
                        </p>
                      )}
                    </div>
                    {/* Unsubscribe footer */}
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                      <p className="text-[9px] text-slate-400 text-center">
                        <span className="underline">Unsubscribe</span> link will be auto-appended
                      </p>
                    </div>
                  </div>
                ) : (
                  /* SMS Preview — phone mockup */
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone size={12} className="text-slate-400" />
                      <span className="text-[10px] font-semibold text-slate-500">SMS Preview</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      {previewStep.body_plain ? (
                        <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                          {previewStep.body_plain.replace(/\[\[(\w+)\]\]/g, '[$1]')}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic text-center py-2">
                          SMS message is empty. Click to edit.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                      <span>{(previewStep.body_plain || '').length} chars</span>
                      <span>{Math.ceil((previewStep.body_plain || '').length / 160) || 1} segment{(previewStep.body_plain || '').length > 160 ? 's' : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Exit Conditions Preview */}
            {Object.keys(exitConditions).length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Exit Conditions</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(exitConditions).filter(([, v]) => v).map(([key]) => (
                    <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-semibold rounded-full">
                      <XCircle size={9} /> {key.replace('on_', '').replace('exit_statuses', 'statuses')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quiet Hours Preview */}
            {(quietStart || quietEnd) && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quiet Hours</p>
                <p className="text-[11px] text-slate-600 flex items-center gap-1">
                  <Moon size={10} className="text-slate-400" />
                  {quietStart || '??:??'} — {quietEnd || '??:??'} ({quietTz})
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline styles for input fields */}
      <style>{`
        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          outline: none;
          transition: all 150ms;
          background: white;
        }
        .input-field:focus {
          border-color: #a5b4fc;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
        }
        .input-field-sm {
          width: 100%;
          padding: 0.375rem 0.5rem;
          font-size: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          outline: none;
          transition: all 150ms;
          background: white;
        }
        .input-field-sm:focus {
          border-color: #a5b4fc;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
        }
        textarea.input-field { resize: vertical; }
      `}</style>
    </div>
  )
}

// ── Reusable components ──────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Settings2; title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Icon size={15} className="text-indigo-500" /> {title}
      </h2>
      <p className="text-xs text-slate-400 mt-0.5 ml-6">{subtitle}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function MergeTagPicker({ tags, onInsert }: { tags: MergeTag[]; onInsert: (key: string) => void }) {
  const [open, setOpen] = useState(false)
  const grouped = tags.reduce<Record<string, MergeTag[]>>((acc, t) => {
    const g = t.group || 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(t)
    return acc
  }, {})

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors">
        <Plus size={11} /> Merge Tag
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1 max-h-64 overflow-auto w-60"
          onMouseLeave={() => setOpen(false)}>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">{group}</div>
              {items.map(t => (
                <button key={t.key} onClick={() => { onInsert(t.key); setOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                  <span className="font-mono text-[11px] text-indigo-500">[[{t.key}]]</span>
                  <span className="text-slate-400 ml-1.5">{t.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
