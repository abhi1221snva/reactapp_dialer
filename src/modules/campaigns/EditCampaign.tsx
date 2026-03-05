import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Save, Radio, Phone, Clock, Settings2, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { dispositionService } from '../../services/disposition.service'
import { userService } from '../../services/user.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const DIAL_MODES = [
  { value: 'preview_and_dial', label: 'Preview & Dial' },
  { value: 'power_dial', label: 'Power Dial' },
  { value: 'super_power_dial', label: 'Super Power Dial' },
  { value: 'predictive_dial', label: 'Predictive Dial' },
  { value: 'outbound_ai', label: 'Outbound AI' },
]

const AMD_DROP_ACTIONS = [
  { value: 1, label: 'Hang Up' },
  { value: 2, label: 'Leave Voicemail' },
  { value: 3, label: 'Play Message' },
]

const NO_AGENT_ACTIONS = [
  { value: 0, label: 'Hang Up' },
  { value: 1, label: 'Redirect' },
  { value: 2, label: 'Play Message' },
]

// ─────────────────────────────────────────────
//  Zod Schema
// ─────────────────────────────────────────────
const editCampaignSchema = z
  .object({
    campaign_id: z.number().int(),
    title: z.string().min(1, 'Campaign title is required').max(255, 'Title must be 255 characters or less'),
    description: z.string().max(255, 'Description must be 255 characters or less').optional().default(''),
    status: z.number().int().default(1),
    dial_mode: z.enum(['preview_and_dial', 'power_dial', 'super_power_dial', 'predictive_dial', 'outbound_ai'], {
      required_error: 'Dial mode is required',
    }),
    group_id: z.string().or(z.number()).optional().nullable(),
    call_ratio: z.string().optional().default(''),
    duration: z.string().optional().default(''),
    automated_duration: z.string().optional().default(''),
    hopper_mode: z.number().int().optional().nullable(),
    max_lead_temp: z.number().int().min(0).max(10000).default(100),
    min_lead_temp: z.number().int().min(0).max(10000).default(500),
    caller_id: z.enum(['area_code', 'custom']).default('area_code'),
    custom_caller_id: z.string().optional().default(''),
    country_code: z.string().optional().default(''),
    voip_configuration_id: z.string().or(z.number()).optional().nullable(),
    time_based_calling: z.number().int().default(0),
    call_time_start: z.string().optional().nullable(),
    call_time_end: z.string().optional().nullable(),
    amd: z.enum(['0', '1']).default('0'),
    amd_drop_action: z.number().int().optional().nullable(),
    voicedrop_option_user_id: z.string().or(z.number()).optional().nullable(),
    no_agent_available_action: z.number().int().optional().nullable(),
    redirect_to: z.string().optional().default(''),
    call_transfer: z.number().int().default(0),
    percentage_inc_dec: z.string().optional().default(''),
    call_metric: z.enum(['0', '1']).default('0'),
    send_report: z.number().int().default(0),
    api: z.number().int().default(1),
    disposition_id: z.array(z.number()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.dial_mode === 'super_power_dial' && (!data.group_id || data.group_id === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Agent group is required for Super Power Dial', path: ['group_id'] })
    }
    if (data.caller_id === 'custom' && (!data.custom_caller_id || data.custom_caller_id.trim() === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Custom caller ID is required when caller type is Custom', path: ['custom_caller_id'] })
    }
    if (data.time_based_calling === 1) {
      if (!data.call_time_start) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Start time is required', path: ['call_time_start'] })
      if (!data.call_time_end) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End time is required', path: ['call_time_end'] })
    }
    if (data.call_ratio && data.call_ratio.trim() !== '' && !/^\d+$/.test(data.call_ratio.trim()) && !/^\d+:\d+$/.test(data.call_ratio.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Call ratio must be numeric (e.g. 2 or 2:1)', path: ['call_ratio'] })
    }
  })

type EditCampaignFormValues = z.infer<typeof editCampaignSchema>

// ─────────────────────────────────────────────
//  Type for API campaign data
// ─────────────────────────────────────────────
interface CampaignApiData {
  id?: number; title?: string; description?: string; status?: number | string
  dial_mode?: string; group_id?: number | string | null; call_ratio?: string | null
  duration?: string | null; automated_duration?: string | null; hopper_mode?: number | null
  max_lead_temp?: number; min_lead_temp?: number; caller_id?: string
  custom_caller_id?: number | string | null; country_code?: number | string | null
  voip_configuration_id?: number | string | null; time_based_calling?: number | string
  call_time_start?: string | null; call_time_end?: string | null; amd?: string | number
  amd_drop_action?: number | null; voicedrop_option_user_id?: number | string | null
  no_agent_available_action?: number | null; redirect_to?: string | null
  call_transfer?: number | string; percentage_inc_dec?: string | null
  call_metric?: string | number; send_report?: number | string; api?: number | string
  disposition?: Array<{ id: number; title: string }>
}

// ─────────────────────────────────────────────
//  Sub-components (identical to CreateCampaign)
// ─────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-[11px] text-red-500">{message}</p>
}

function CardSection({
  icon: Icon, title, description, children, className = '',
}: {
  icon: React.ElementType
  title: string; description?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}
      style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-800 leading-none">{title}</h3>
          {description && <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (val: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      {label && <span className={`text-xs font-medium ${checked ? 'text-indigo-700' : 'text-slate-400'}`}>{label}</span>}
    </div>
  )
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium text-slate-700 leading-none">{label}</p>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={checked ? 'On' : 'Off'} />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export function EditCampaign() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const campaignId = Number(id)

  const {
    register, handleSubmit, control, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<EditCampaignFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editCampaignSchema) as any,
    defaultValues: {
      campaign_id: campaignId, title: '', description: '', status: 1,
      dial_mode: 'power_dial', group_id: '', call_ratio: '', duration: '',
      automated_duration: '', max_lead_temp: 100, min_lead_temp: 500,
      caller_id: 'area_code', custom_caller_id: '', country_code: '',
      voip_configuration_id: '', time_based_calling: 0,
      call_time_start: '08:00', call_time_end: '20:00', amd: '0',
      amd_drop_action: null, voicedrop_option_user_id: '', no_agent_available_action: null,
      redirect_to: '', call_transfer: 0, percentage_inc_dec: '', call_metric: '0',
      send_report: 0, api: 1, disposition_id: [],
    },
  })

  const dialMode = watch('dial_mode')
  const callerIdType = watch('caller_id')
  const timeBasedCalling = watch('time_based_calling')
  const amd = watch('amd')

  const { data: campaignData, isLoading: loadingCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignService.getById(campaignId),
    enabled: Boolean(campaignId),
  })

  const { data: groupsData } = useQuery({
    queryKey: ['extension-groups'],
    queryFn: () => userService.getGroups(),
  })
  const groups: Array<{ id: number; group_name: string }> =
    (groupsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; group_name: string }> ?? []

  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => userService.getAll(),
  })
  const users: Array<{ id: number; name?: string; first_name?: string; username?: string }> =
    (usersData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; name?: string; first_name?: string; username?: string }> ?? []

  const { data: dispositionsData } = useQuery({
    queryKey: ['dispositions-all'],
    queryFn: () => dispositionService.list({ page: 1, limit: 200, search: '', filters: {} }),
  })
  const dispositions: Array<{ id: number; title: string }> =
    (dispositionsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; title: string }> ?? []

  useEffect(() => {
    const raw = (campaignData as { data?: { data?: CampaignApiData } })?.data?.data
    if (!raw) return
    const c = raw as CampaignApiData
    const existingDispositionIds = Array.isArray(c.disposition) ? c.disposition.map(d => d.id) : []
    reset({
      campaign_id: campaignId,
      title: c.title ?? '',
      description: c.description ?? '',
      status: Number(c.status ?? 1),
      dial_mode: (c.dial_mode as EditCampaignFormValues['dial_mode']) ?? 'power_dial',
      group_id: c.group_id != null ? String(c.group_id) : '',
      call_ratio: c.call_ratio ?? '',
      duration: c.duration ?? '',
      automated_duration: c.automated_duration ?? '',
      hopper_mode: c.hopper_mode ?? null,
      max_lead_temp: Number(c.max_lead_temp ?? 100),
      min_lead_temp: Number(c.min_lead_temp ?? 500),
      caller_id: (c.caller_id as 'area_code' | 'custom') ?? 'area_code',
      custom_caller_id: c.custom_caller_id != null ? String(c.custom_caller_id) : '',
      country_code: c.country_code != null ? String(c.country_code) : '',
      voip_configuration_id: c.voip_configuration_id != null ? String(c.voip_configuration_id) : '',
      time_based_calling: Number(c.time_based_calling ?? 0),
      call_time_start: c.call_time_start ?? '08:00',
      call_time_end: c.call_time_end ?? '20:00',
      amd: (String(c.amd ?? '0') as '0' | '1'),
      amd_drop_action: c.amd_drop_action ?? null,
      voicedrop_option_user_id: c.voicedrop_option_user_id != null ? String(c.voicedrop_option_user_id) : '',
      no_agent_available_action: c.no_agent_available_action ?? null,
      redirect_to: c.redirect_to ?? '',
      call_transfer: Number(c.call_transfer ?? 0),
      percentage_inc_dec: c.percentage_inc_dec ?? '',
      call_metric: (String(c.call_metric ?? '0') as '0' | '1'),
      send_report: Number(c.send_report ?? 0),
      api: Number(c.api ?? 1),
      disposition_id: existingDispositionIds,
    })
  }, [campaignData, campaignId, reset])

  const updateMutation = useMutation({
    mutationFn: (data: EditCampaignFormValues) => {
      const payload: Record<string, unknown> = {
        ...data,
        group_id: data.group_id ? Number(data.group_id) : 0,
        custom_caller_id: data.custom_caller_id ? Number(data.custom_caller_id) : undefined,
        country_code: data.country_code ? Number(data.country_code) : undefined,
        voip_configuration_id: data.voip_configuration_id ? Number(data.voip_configuration_id) : undefined,
        voicedrop_option_user_id: data.voicedrop_option_user_id ? Number(data.voicedrop_option_user_id) : undefined,
      }
      return campaignService.update(payload)
    },
    onSuccess: () => {
      toast.success('Campaign updated successfully')
      navigate('/campaigns')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to update campaign')
    },
  })

  const onSubmit = (data: EditCampaignFormValues) => updateMutation.mutate(data)

  const watchedDispositions = watch('disposition_id') ?? []
  const toggleDisposition = (dispId: number) => {
    const current = watchedDispositions
    setValue('disposition_id', current.includes(dispId) ? current.filter(d => d !== dispId) : [...current, dispId])
  }

  if (loadingCampaign) return <PageLoader />

  const isPending = isSubmitting || updateMutation.isPending

  return (
    <div className="w-full space-y-4 animate-fadeIn">

      {/* ── Page Header with actions ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/campaigns')} className="btn-ghost p-2 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">Edit Campaign</h1>
            <p className="text-xs text-slate-500 mt-1">Campaign #{campaignId}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <input type="hidden" {...register('campaign_id', { valueAsNumber: true })} />

        {/* ── Row 1: Campaign Overview ── */}
        <CardSection icon={Radio} title="Campaign Overview" description="Name and basic configuration" className="mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 form-group">
              <label className="label text-xs">Campaign Title <span className="text-red-500">*</span></label>
              <input {...register('title')} className={`input text-sm py-2 ${errors.title ? 'border-red-400' : ''}`} placeholder="e.g. Summer Sales 2025" />
              <FieldError message={errors.title?.message} />
            </div>
            <div className="lg:col-span-5 form-group">
              <label className="label text-xs">Description</label>
              <input {...register('description')} className={`input text-sm py-2 ${errors.description ? 'border-red-400' : ''}`} placeholder="Brief campaign description (optional)" />
              <FieldError message={errors.description?.message} />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-3 justify-center">
              <Controller name="status" control={control}
                render={({ field }) => (
                  <ToggleRow label="Active" checked={field.value === 1} onChange={val => field.onChange(val ? 1 : 0)} />
                )}
              />
              <Controller name="send_report" control={control}
                render={({ field }) => (
                  <ToggleRow label="Send Report" checked={field.value === 1} onChange={val => field.onChange(val ? 1 : 0)} />
                )}
              />
            </div>
          </div>
        </CardSection>

        {/* ── Row 2: Three-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Dialing Configuration */}
          <CardSection icon={Phone} title="Dialing" description="Dial mode & call behavior">
            <div className="space-y-3">
              <div className="form-group">
                <label className="label text-xs">Dial Mode <span className="text-red-500">*</span></label>
                <select {...register('dial_mode')} className={`input text-sm py-2 ${errors.dial_mode ? 'border-red-400' : ''}`}>
                  {DIAL_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <FieldError message={errors.dial_mode?.message} />
              </div>

              <div className="form-group">
                <label className="label text-xs">
                  Agent Group {dialMode === 'super_power_dial' && <span className="text-red-500">*</span>}
                </label>
                <select {...register('group_id')} className={`input text-sm py-2 ${errors.group_id ? 'border-red-400' : ''}`}>
                  <option value="">— None —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.group_name}</option>)}
                </select>
                <FieldError message={errors.group_id?.message as string} />
              </div>

              {dialMode === 'predictive_dial' && (
                <div className="form-group">
                  <label className="label text-xs">Call Ratio</label>
                  <input {...register('call_ratio')} className={`input text-sm py-2 ${errors.call_ratio ? 'border-red-400' : ''}`} placeholder="e.g. 2:1" />
                  <FieldError message={errors.call_ratio?.message} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="label text-xs">Duration <span className="text-slate-400 font-normal">(sec)</span></label>
                  <input {...register('duration')} className="input text-sm py-2" placeholder="60" />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Auto Duration <span className="text-slate-400 font-normal">(sec)</span></label>
                  <input {...register('automated_duration')} className="input text-sm py-2" placeholder="30" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="label text-xs">% Inc/Dec</label>
                  <input {...register('percentage_inc_dec')} className="input text-sm py-2" placeholder="10" />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Hopper Mode</label>
                  <select {...register('hopper_mode', { setValueAs: v => v === '' ? null : Number(v) })} className="input text-sm py-2">
                    <option value="">— None —</option>
                    <option value="0">Disabled</option>
                    <option value="1">Enabled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="label text-xs">Max Lead Temp</label>
                  <input type="number" {...register('max_lead_temp', { valueAsNumber: true })} className="input text-sm py-2" min={0} />
                  <FieldError message={errors.max_lead_temp?.message} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Min Lead Temp</label>
                  <input type="number" {...register('min_lead_temp', { valueAsNumber: true })} className="input text-sm py-2" min={0} />
                  <FieldError message={errors.min_lead_temp?.message} />
                </div>
              </div>
            </div>
          </CardSection>

          {/* Caller ID */}
          <CardSection icon={Radio} title="Caller ID" description="Outbound caller identification">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="label text-xs">Caller ID Type <span className="text-red-500">*</span></label>
                  <select {...register('caller_id')} className={`input text-sm py-2 ${errors.caller_id ? 'border-red-400' : ''}`}>
                    <option value="area_code">Area Code</option>
                    <option value="custom">Custom</option>
                  </select>
                  <FieldError message={errors.caller_id?.message} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Country Code</label>
                  <input {...register('country_code')} className="input text-sm py-2" placeholder="e.g. 1" />
                </div>
              </div>

              {callerIdType === 'custom' && (
                <div className="form-group">
                  <label className="label text-xs">Custom Caller ID <span className="text-red-500">*</span></label>
                  <input {...register('custom_caller_id')} type="tel" className={`input text-sm py-2 ${errors.custom_caller_id ? 'border-red-400' : ''}`} placeholder="e.g. 5551234567" />
                  <FieldError message={errors.custom_caller_id?.message} />
                </div>
              )}

              <div className="form-group">
                <label className="label text-xs">VoIP Configuration ID</label>
                <input {...register('voip_configuration_id')} type="number" className="input text-sm py-2" placeholder="VoIP config ID" />
              </div>

              <div className="pt-1">
                <Controller name="call_transfer" control={control}
                  render={({ field }) => (
                    <ToggleRow label="Call Transfer" checked={field.value === 1} onChange={val => field.onChange(val ? 1 : 0)} />
                  )}
                />
              </div>
            </div>
          </CardSection>

          {/* Schedule & System */}
          <CardSection icon={Clock} title="Schedule & Limits" description="Call timing and lead controls">
            <div className="space-y-3">
              <Controller name="time_based_calling" control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Time-Based Calling</p>
                      <p className="text-[11px] text-slate-400">Restrict calls to set hours</p>
                    </div>
                    <Toggle checked={field.value === 1} onChange={val => field.onChange(val ? 1 : 0)} label={field.value === 1 ? 'On' : 'Off'} />
                  </div>
                )}
              />

              {timeBasedCalling === 1 ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="form-group">
                    <label className="label text-xs">Start Time <span className="text-red-500">*</span></label>
                    <input type="time" {...register('call_time_start')} className={`input text-sm py-2 ${errors.call_time_start ? 'border-red-400' : ''}`} />
                    <FieldError message={errors.call_time_start?.message} />
                  </div>
                  <div className="form-group">
                    <label className="label text-xs">End Time <span className="text-red-500">*</span></label>
                    <input type="time" {...register('call_time_end')} className={`input text-sm py-2 ${errors.call_time_end ? 'border-red-400' : ''}`} />
                    <FieldError message={errors.call_time_end?.message} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Clock size={13} className="text-slate-300 flex-shrink-0" />
                  <p className="text-xs text-slate-400">Enable to restrict calling hours</p>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">System</p>
                <Controller name="call_metric" control={control}
                  render={({ field }) => (
                    <ToggleRow label="Call Metrics" hint="Track detailed performance" checked={field.value === '1'} onChange={val => field.onChange(val ? '1' : '0')} />
                  )}
                />
                <Controller name="api" control={control}
                  render={({ field }) => (
                    <ToggleRow label="API Access" hint="API-based management" checked={field.value === 1} onChange={val => field.onChange(val ? 1 : 0)} />
                  )}
                />
              </div>
            </div>
          </CardSection>
        </div>

        {/* ── Row 3: Advanced Settings ── */}
        <CardSection icon={Settings2} title="Advanced Settings" description="AMD, routing, voicedrop and agent behavior" className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-3">
              <Controller name="amd" control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">AMD Detection</p>
                      <p className="text-[11px] text-slate-400">Answering machine detection</p>
                    </div>
                    <Toggle checked={field.value === '1'} onChange={val => field.onChange(val ? '1' : '0')} label={field.value === '1' ? 'On' : 'Off'} />
                  </div>
                )}
              />
              {amd === '1' && (
                <div className="form-group">
                  <label className="label text-xs">AMD Drop Action</label>
                  <select {...register('amd_drop_action', { setValueAs: v => v === '' ? null : Number(v) })} className="input text-sm py-2">
                    <option value="">— Select —</option>
                    {AMD_DROP_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="form-group">
                <label className="label text-xs">No Agent Available Action</label>
                <select {...register('no_agent_available_action', { setValueAs: v => v === '' ? null : Number(v) })} className="input text-sm py-2">
                  <option value="">— Select —</option>
                  {NO_AGENT_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label text-xs">Redirect To</label>
                <input {...register('redirect_to')} className="input text-sm py-2" placeholder="Extension, DID, or queue" />
              </div>
            </div>

            <div className="form-group">
              <label className="label text-xs">Voicedrop Option User</label>
              <select {...register('voicedrop_option_user_id')} className="input text-sm py-2">
                <option value="">— Select User —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.first_name ?? u.username ?? `User #${u.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden lg:block" />
          </div>
        </CardSection>

        {/* ── Row 4: Dispositions ── */}
        {dispositions.length > 0 && (
          <CardSection icon={Tag} title="Dispositions" description="Select call outcomes for this campaign" className="mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
              {dispositions.map(d => {
                const isChecked = watchedDispositions.includes(d.id)
                return (
                  <label
                    key={d.id}
                    className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      isChecked
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDisposition(d.id)}
                      className="rounded accent-indigo-600 w-3 h-3 flex-shrink-0"
                    />
                    <span className="truncate">{d.title}</span>
                  </label>
                )
              })}
            </div>
            {errors.disposition_id && <FieldError message="Please select at least one disposition" />}
          </CardSection>
        )}

        {/* ── Bottom Action Row ── */}
        <div className="flex items-center justify-end gap-2.5 py-2">
          <button type="button" onClick={() => navigate('/campaigns')} className="btn-outline px-6">Cancel</button>
          <button type="submit" disabled={isPending} className="btn-primary px-6">
            <Save size={15} />
            {isPending ? 'Saving…' : 'Update Campaign'}
          </button>
        </div>
      </form>
    </div>
  )
}
