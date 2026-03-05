import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
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
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Agent group is required for Super Power Dial',
        path: ['group_id'],
      })
    }
    if (data.caller_id === 'custom' && (!data.custom_caller_id || data.custom_caller_id.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom caller ID is required when caller type is Custom',
        path: ['custom_caller_id'],
      })
    }
    if (data.time_based_calling === 1) {
      if (!data.call_time_start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start time is required when time-based calling is enabled',
          path: ['call_time_start'],
        })
      }
      if (!data.call_time_end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time is required when time-based calling is enabled',
          path: ['call_time_end'],
        })
      }
    }
    if (
      data.call_ratio &&
      data.call_ratio.trim() !== '' &&
      !/^\d+$/.test(data.call_ratio.trim()) &&
      !/^\d+:\d+$/.test(data.call_ratio.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Call ratio must be numeric (e.g. 2 or 2:1)',
        path: ['call_ratio'],
      })
    }
  })

type EditCampaignFormValues = z.infer<typeof editCampaignSchema>

// ─────────────────────────────────────────────
//  Helper components
// ─────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-500">{message}</p>
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-slate-100 pb-3 mb-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

// ─────────────────────────────────────────────
//  Type for API campaign data
// ─────────────────────────────────────────────
interface CampaignApiData {
  id?: number
  title?: string
  description?: string
  status?: number | string
  dial_mode?: string
  group_id?: number | string | null
  call_ratio?: string | null
  duration?: string | null
  automated_duration?: string | null
  hopper_mode?: number | null
  max_lead_temp?: number
  min_lead_temp?: number
  caller_id?: string
  custom_caller_id?: number | string | null
  country_code?: number | string | null
  voip_configuration_id?: number | string | null
  time_based_calling?: number | string
  call_time_start?: string | null
  call_time_end?: string | null
  amd?: string | number
  amd_drop_action?: number | null
  voicedrop_option_user_id?: number | string | null
  no_agent_available_action?: number | null
  redirect_to?: string | null
  call_transfer?: number | string
  percentage_inc_dec?: string | null
  call_metric?: string | number
  send_report?: number | string
  api?: number | string
  disposition?: Array<{ id: number; title: string }>
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export function EditCampaign() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const campaignId = Number(id)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditCampaignFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editCampaignSchema) as any,
    defaultValues: {
      campaign_id: campaignId,
      title: '',
      description: '',
      status: 1,
      dial_mode: 'power_dial',
      group_id: '',
      call_ratio: '',
      duration: '',
      automated_duration: '',
      max_lead_temp: 100,
      min_lead_temp: 500,
      caller_id: 'area_code',
      custom_caller_id: '',
      country_code: '',
      voip_configuration_id: '',
      time_based_calling: 0,
      call_time_start: '08:00',
      call_time_end: '20:00',
      amd: '0',
      amd_drop_action: null,
      voicedrop_option_user_id: '',
      no_agent_available_action: null,
      redirect_to: '',
      call_transfer: 0,
      percentage_inc_dec: '',
      call_metric: '0',
      send_report: 0,
      api: 1,
      disposition_id: [],
    },
  })

  // Watch conditional fields
  const dialMode = watch('dial_mode')
  const callerIdType = watch('caller_id')
  const timeBasedCalling = watch('time_based_calling')
  const amd = watch('amd')

  // Fetch existing campaign data
  const { data: campaignData, isLoading: loadingCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignService.getById(campaignId),
    enabled: Boolean(campaignId),
  })

  // Fetch extension groups
  const { data: groupsData } = useQuery({
    queryKey: ['extension-groups'],
    queryFn: () => userService.getGroups(),
  })
  const groups: Array<{ id: number; group_name: string }> =
    (groupsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; group_name: string }> ?? []

  // Fetch users for voicedrop
  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => userService.getAll(),
  })
  const users: Array<{ id: number; name?: string; first_name?: string; username?: string }> =
    (usersData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; name?: string; first_name?: string; username?: string }> ?? []

  // Fetch dispositions
  const { data: dispositionsData } = useQuery({
    queryKey: ['dispositions-all'],
    queryFn: () => dispositionService.list({ page: 1, limit: 200, search: '', filters: {} }),
  })
  const dispositions: Array<{ id: number; title: string }> =
    (dispositionsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; title: string }> ?? []

  // Populate form when campaign data loads
  useEffect(() => {
    const raw = (campaignData as { data?: { data?: CampaignApiData } })?.data?.data
    if (!raw) return

    const c = raw as CampaignApiData

    // Extract existing disposition IDs from campaign data
    const existingDispositionIds = Array.isArray(c.disposition)
      ? c.disposition.map((d) => d.id)
      : []

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

  const onSubmit = (data: EditCampaignFormValues) => {
    updateMutation.mutate(data)
  }

  const watchedDispositions = watch('disposition_id') ?? []
  const toggleDisposition = (dispId: number) => {
    const current = watchedDispositions
    if (current.includes(dispId)) {
      setValue('disposition_id', current.filter((d) => d !== dispId))
    } else {
      setValue('disposition_id', [...current, dispId])
    }
  }

  if (loadingCampaign) return <PageLoader />

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/campaigns')}
          className="btn-ghost p-2 rounded-lg"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">Edit Campaign</h1>
          <p className="page-subtitle">Editing campaign #{campaignId}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Hidden campaign_id */}
        <input type="hidden" {...register('campaign_id', { valueAsNumber: true })} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Section 1: General Settings ── */}
          <div className="card space-y-4 lg:col-span-2">
            <SectionHeader title="General Settings" description="Basic campaign information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="form-group md:col-span-2">
                <label className="label">Campaign Title <span className="text-red-500">*</span></label>
                <input
                  {...register('title')}
                  className={`input ${errors.title ? 'border-red-400 focus:ring-red-300' : ''}`}
                  placeholder="e.g. Summer Sales 2025"
                />
                <FieldError message={errors.title?.message} />
              </div>

              {/* Description */}
              <div className="form-group md:col-span-2">
                <label className="label">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className={`input resize-none ${errors.description ? 'border-red-400' : ''}`}
                  placeholder="Campaign description..."
                />
                <FieldError message={errors.description?.message} />
              </div>

              {/* Status */}
              <div className="form-group flex items-center justify-between">
                <label className="label mb-0">Status (Active)</label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      label={field.value === 1 ? 'Active' : 'Inactive'}
                      checked={field.value === 1}
                      onChange={(val) => field.onChange(val ? 1 : 0)}
                    />
                  )}
                />
              </div>

              {/* Send Report */}
              <div className="form-group flex items-center justify-between">
                <label className="label mb-0">Send Report</label>
                <Controller
                  name="send_report"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      label={field.value === 1 ? 'Enabled' : 'Disabled'}
                      checked={field.value === 1}
                      onChange={(val) => field.onChange(val ? 1 : 0)}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Dialer Settings ── */}
          <div className="card space-y-4">
            <SectionHeader title="Dialer Settings" description="Configure dial mode and call behavior" />

            {/* Dial Mode */}
            <div className="form-group">
              <label className="label">Dial Mode <span className="text-red-500">*</span></label>
              <select
                {...register('dial_mode')}
                className={`input ${errors.dial_mode ? 'border-red-400' : ''}`}
              >
                {DIAL_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <FieldError message={errors.dial_mode?.message} />
            </div>

            {/* Group ID — required for super_power_dial */}
            <div className="form-group">
              <label className="label">
                Agent Group
                {dialMode === 'super_power_dial' && <span className="text-red-500"> *</span>}
              </label>
              <select
                {...register('group_id')}
                className={`input ${errors.group_id ? 'border-red-400' : ''}`}
              >
                <option value="">-- Select Group --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.group_name}</option>
                ))}
              </select>
              <FieldError message={errors.group_id?.message as string} />
            </div>

            {/* Call Ratio — for predictive_dial */}
            {dialMode === 'predictive_dial' && (
              <div className="form-group">
                <label className="label">Call Ratio</label>
                <input
                  {...register('call_ratio')}
                  className={`input ${errors.call_ratio ? 'border-red-400' : ''}`}
                  placeholder="e.g. 2 or 2:1"
                />
                <FieldError message={errors.call_ratio?.message} />
              </div>
            )}

            {/* Duration */}
            <div className="form-group">
              <label className="label">Duration</label>
              <input
                {...register('duration')}
                className="input"
                placeholder="e.g. 60 (seconds)"
              />
              <FieldError message={errors.duration?.message} />
            </div>

            {/* Automated Duration */}
            <div className="form-group">
              <label className="label">Automated Duration</label>
              <input
                {...register('automated_duration')}
                className="input"
                placeholder="e.g. 30 (seconds)"
              />
              <FieldError message={errors.automated_duration?.message} />
            </div>

            {/* Percentage Inc/Dec */}
            <div className="form-group">
              <label className="label">Percentage Inc/Dec</label>
              <input
                {...register('percentage_inc_dec')}
                className="input"
                placeholder="e.g. 10"
              />
              <FieldError message={errors.percentage_inc_dec?.message} />
            </div>

            {/* Lead Temp Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">Max Lead Temp</label>
                <input
                  type="number"
                  {...register('max_lead_temp', { valueAsNumber: true })}
                  className="input"
                  min={0}
                />
                <FieldError message={errors.max_lead_temp?.message} />
              </div>
              <div className="form-group">
                <label className="label">Min Lead Temp</label>
                <input
                  type="number"
                  {...register('min_lead_temp', { valueAsNumber: true })}
                  className="input"
                  min={0}
                />
                <FieldError message={errors.min_lead_temp?.message} />
              </div>
            </div>

            {/* Hopper Mode */}
            <div className="form-group">
              <label className="label">Hopper Mode</label>
              <select
                {...register('hopper_mode', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                className="input"
              >
                <option value="">-- Select --</option>
                <option value="0">Disabled</option>
                <option value="1">Enabled</option>
              </select>
            </div>
          </div>

          {/* ── Section 3: Caller ID Settings ── */}
          <div className="card space-y-4">
            <SectionHeader title="Caller ID Settings" description="Configure outbound caller identification" />

            {/* Caller ID Type */}
            <div className="form-group">
              <label className="label">Caller ID Type <span className="text-red-500">*</span></label>
              <select
                {...register('caller_id')}
                className={`input ${errors.caller_id ? 'border-red-400' : ''}`}
              >
                <option value="area_code">Area Code</option>
                <option value="custom">Custom</option>
              </select>
              <FieldError message={errors.caller_id?.message} />
            </div>

            {/* Custom Caller ID */}
            {callerIdType === 'custom' && (
              <div className="form-group">
                <label className="label">Custom Caller ID <span className="text-red-500">*</span></label>
                <input
                  {...register('custom_caller_id')}
                  className={`input ${errors.custom_caller_id ? 'border-red-400' : ''}`}
                  placeholder="e.g. 5551234567"
                  type="tel"
                />
                <FieldError message={errors.custom_caller_id?.message} />
              </div>
            )}

            {/* Country Code */}
            <div className="form-group">
              <label className="label">Country Code</label>
              <input
                {...register('country_code')}
                className="input"
                placeholder="e.g. 1"
              />
              <FieldError message={errors.country_code?.message} />
            </div>

            {/* VoIP Configuration */}
            <div className="form-group">
              <label className="label">VoIP Configuration ID</label>
              <input
                {...register('voip_configuration_id')}
                className="input"
                placeholder="VoIP config ID"
                type="number"
              />
              <FieldError message={errors.voip_configuration_id?.message as string} />
            </div>

            {/* Call Transfer */}
            <div className="form-group flex items-center justify-between">
              <label className="label mb-0">Call Transfer</label>
              <Controller
                name="call_transfer"
                control={control}
                render={({ field }) => (
                  <Toggle
                    label={field.value === 1 ? 'Enabled' : 'Disabled'}
                    checked={field.value === 1}
                    onChange={(val) => field.onChange(val ? 1 : 0)}
                  />
                )}
              />
            </div>
          </div>

          {/* ── Section 4: Time Based Calling ── */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-semibold text-slate-900">Time Based Calling</h3>
                <p className="text-xs text-slate-500 mt-0.5">Restrict calls to specific hours</p>
              </div>
              <Controller
                name="time_based_calling"
                control={control}
                render={({ field }) => (
                  <Toggle
                    label={field.value === 1 ? 'On' : 'Off'}
                    checked={field.value === 1}
                    onChange={(val) => field.onChange(val ? 1 : 0)}
                  />
                )}
              />
            </div>

            {timeBasedCalling === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Start Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    {...register('call_time_start')}
                    className={`input ${errors.call_time_start ? 'border-red-400' : ''}`}
                  />
                  <FieldError message={errors.call_time_start?.message} />
                </div>
                <div className="form-group">
                  <label className="label">End Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    {...register('call_time_end')}
                    className={`input ${errors.call_time_end ? 'border-red-400' : ''}`}
                  />
                  <FieldError message={errors.call_time_end?.message} />
                </div>
              </div>
            )}

            {timeBasedCalling === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">
                Enable time-based calling to set call hours
              </p>
            )}
          </div>

          {/* ── Section 5: Advanced Settings ── */}
          <div className="card space-y-4">
            <SectionHeader title="Advanced Settings" description="AMD, voicemail, and routing options" />

            {/* AMD Toggle */}
            <div className="form-group flex items-center justify-between">
              <label className="label mb-0">AMD (Answering Machine Detection)</label>
              <Controller
                name="amd"
                control={control}
                render={({ field }) => (
                  <Toggle
                    label={field.value === '1' ? 'On' : 'Off'}
                    checked={field.value === '1'}
                    onChange={(val) => field.onChange(val ? '1' : '0')}
                  />
                )}
              />
            </div>

            {/* AMD Drop Action */}
            {amd === '1' && (
              <div className="form-group">
                <label className="label">AMD Drop Action</label>
                <select
                  {...register('amd_drop_action', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                  className="input"
                >
                  <option value="">-- Select Action --</option>
                  {AMD_DROP_ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
                <FieldError message={errors.amd_drop_action?.message} />
              </div>
            )}

            {/* Voicedrop User */}
            <div className="form-group">
              <label className="label">Voicedrop Option User</label>
              <select
                {...register('voicedrop_option_user_id')}
                className="input"
              >
                <option value="">-- Select User --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.first_name ?? u.username ?? `User #${u.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* No Agent Available Action */}
            <div className="form-group">
              <label className="label">No Agent Available Action</label>
              <select
                {...register('no_agent_available_action', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                className="input"
              >
                <option value="">-- Select Action --</option>
                {NO_AGENT_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Redirect To */}
            <div className="form-group">
              <label className="label">Redirect To</label>
              <input
                {...register('redirect_to')}
                className="input"
                placeholder="Extension, DID, or queue"
              />
            </div>
          </div>

          {/* ── Section 6: AI / Metrics Settings ── */}
          <div className="card space-y-4">
            <SectionHeader title="AI / Metrics Settings" description="Configure call metrics and API access" />

            {/* Call Metric */}
            <div className="form-group flex items-center justify-between">
              <div>
                <label className="label mb-0">Call Metrics</label>
                <p className="text-xs text-slate-400 mt-0.5">Track detailed call performance data</p>
              </div>
              <Controller
                name="call_metric"
                control={control}
                render={({ field }) => (
                  <Toggle
                    label={field.value === '1' ? 'Enabled' : 'Disabled'}
                    checked={field.value === '1'}
                    onChange={(val) => field.onChange(val ? '1' : '0')}
                  />
                )}
              />
            </div>

            {/* API */}
            <div className="form-group flex items-center justify-between">
              <div>
                <label className="label mb-0">API Access</label>
                <p className="text-xs text-slate-400 mt-0.5">Allow API-based campaign management</p>
              </div>
              <Controller
                name="api"
                control={control}
                render={({ field }) => (
                  <Toggle
                    label={field.value === 1 ? 'Enabled' : 'Disabled'}
                    checked={field.value === 1}
                    onChange={(val) => field.onChange(val ? 1 : 0)}
                  />
                )}
              />
            </div>
          </div>

          {/* ── Section 7: Dispositions ── */}
          {dispositions.length > 0 && (
            <div className="card space-y-4 lg:col-span-2">
              <SectionHeader title="Dispositions" description="Select dispositions available for this campaign" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {dispositions.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={watchedDispositions.includes(d.id)}
                      onChange={() => toggleDisposition(d.id)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-sm text-slate-700 truncate">{d.title}</span>
                  </label>
                ))}
              </div>
              {errors.disposition_id && (
                <p className="mt-1 text-xs text-red-500">Please select at least one disposition</p>
              )}
            </div>
          )}

        </div>

        {/* Submit Row */}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            className="btn-outline flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {updateMutation.isPending ? 'Saving...' : 'Update Campaign'}
          </button>
        </div>
      </form>
    </div>
  )
}
