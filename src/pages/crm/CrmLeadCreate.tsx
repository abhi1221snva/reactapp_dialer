import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft, Loader2, AlertCircle, Check, Save, User, Tag,
  Thermometer, Snowflake, Flame, ChevronRight, Calendar, Clock,
  UserCheck, Hash, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { DynamicFieldForm } from '../../components/crm/DynamicFieldForm'
import type { CrmLabel, CrmLead } from '../../types/crm.types'

const schema = z.object({
  lead_status: z.string().min(1, 'Status is required'),
  lead_type:   z.string().optional(),
  assigned_to: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Helpers ────────────────────────────────────────────────────────────────────
const AVATAR_BG = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500']

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

const LEAD_TYPE_OPTIONS = [
  {
    value: 'hot', label: 'Hot', Icon: Flame,
    idle: 'border-red-200 bg-red-50 text-red-500',
    active: 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-200',
  },
  {
    value: 'warm', label: 'Warm', Icon: Thermometer,
    idle: 'border-orange-200 bg-orange-50 text-orange-500',
    active: 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-200',
  },
  {
    value: 'cold', label: 'Cold', Icon: Snowflake,
    idle: 'border-blue-200 bg-blue-50 text-blue-500',
    active: 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-200',
  },
]

// ── Main ───────────────────────────────────────────────────────────────────────
export function CrmLeadCreate() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const isEdit    = Boolean(id)
  const leadId    = id ? Number(id) : undefined
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register, handleSubmit, setValue, watch, getValues, setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { lead_status: 'new_lead' },
  })

  const leadStatus = watch('lead_status')
  const leadType   = watch('lead_type')
  const assignedTo = watch('assigned_to')

  const { data: leadFields } = useQuery({
    queryKey: ['crm-lead-fields'],
    queryFn: async () => {
      const res = await crmService.getLeadFields()
      return (res.data?.data ?? res.data ?? []) as CrmLabel[]
    },
    staleTime: 0,
  })

  const { data: statuses } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: () => crmService.getLeadStatuses(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: agents } = useQuery({
    queryKey: ['crm-users'],
    queryFn: () => crmService.getUsers(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: existing } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => {
      const res = await leadService.getById(leadId!)
      return (res.data?.data ?? res.data) as CrmLead
    },
    enabled: isEdit && !!leadId,
  })

  useEffect(() => {
    if (existing) {
      setValue('lead_status', String(existing.lead_status))
      setValue('lead_type',   existing.lead_type   ? String(existing.lead_type)   : '')
      setValue('assigned_to', existing.assigned_to ? String(existing.assigned_to) : '')
    }
  }, [existing, setValue])

  const handleApiError = (err: unknown): string | null => {
    if (err && typeof err === 'object' && 'response' in err) {
      const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response
      const fieldErrors = res?.data?.errors
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        const firstMsg = Object.values(fieldErrors).flat()[0]
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages[0] : String(messages)
          setError(field as keyof FormData, { type: 'server', message: msg })
        })
        return firstMsg ?? res?.data?.message ?? null
      }
      if (res?.data?.message) return res.data.message
    }
    return 'An unexpected error occurred. Please try again.'
  }

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => leadService.create(data),
    onSuccess: (res) => {
      setApiError(null)
      toast.success('Lead created successfully')
      const newId = res.data?.data?.id ?? res.data?.id
      if (newId) navigate(`/crm/leads/${newId}`)
      else navigate('/crm/leads')
    },
    onError: (err) => {
      const msg = handleApiError(err)
      toast.error(msg ?? 'Failed to create lead')
      setApiError(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => leadService.update(leadId!, data),
    onSuccess: () => {
      setApiError(null)
      toast.success('Lead updated successfully')
      navigate(`/crm/leads/${leadId}`)
    },
    onError: (err) => {
      const msg = handleApiError(err)
      toast.error(msg ?? 'Failed to update lead')
      setApiError(null)
    },
  })

  const onSubmit = (data: FormData) => {
    setApiError(null)
    const rawAll = getValues() as Record<string, unknown>
    const payload: Record<string, unknown> = {}
    Object.entries({ ...rawAll, ...data } as Record<string, unknown>).forEach(([k, v]) => {
      payload[k] = v === true ? '1' : v === false ? '0' : v
    })

    // ── Manual EAV field validation ───────────────────────────────────────────
    // zodResolver ignores RegisterOptions passed to register(), so we validate
    // dynamic fields explicitly here before sending to the backend.
    if (leadFields && leadFields.length > 0) {
      const activeFields = leadFields.filter(
        f => f.status === true || (f.status as unknown) == 1,
      )
      let hasErrors = false

      for (const field of activeFields) {
        if (field.field_type === 'checkbox') continue // checkboxes are always '0' or '1'

        const rawVal = payload[field.field_key]
        const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : ''
        const isRequired = field.required === true || (field.required as unknown) == 1

        if (isRequired && strVal === '') {
          setError(field.field_key as keyof FormData, {
            type: 'manual',
            message: `${field.label_name} is required`,
          })
          hasErrors = true
          continue
        }

        if (!strVal) continue // optional + empty → skip type check

        let fieldError: string | null = null
        switch (field.field_type) {
          case 'email':
            if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(strVal))
              fieldError = `${field.label_name} must be a valid email address`
            break
          case 'phone_number':
          case 'phone':
            if (strVal.replace(/\D/g, '').length !== 10)
              fieldError = `${field.label_name} must be exactly 10 digits`
            break
          case 'number':
            if (isNaN(Number(strVal)))
              fieldError = `${field.label_name} must be a numeric value`
            break
        }

        if (fieldError) {
          setError(field.field_key as keyof FormData, { type: 'manual', message: fieldError })
          hasErrors = true
        }
      }

      if (hasErrors) return // stop — do not submit
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (isEdit) updateMutation.mutate(payload)
    else createMutation.mutate(payload)
  }

  const isPending     = createMutation.isPending || updateMutation.isPending
  const fullName      = isEdit && existing ? [existing.first_name, existing.last_name].filter(Boolean).join(' ') || `Lead #${leadId}` : ''
  const avatarBg      = AVATAR_BG[(leadId ?? 0) % AVATAR_BG.length]
  const currentStatus = (statuses ?? []).find(s => s.lead_title_url === leadStatus)
  const statusColor   = currentStatus?.color_code ?? currentStatus?.color ?? '#6366f1'
  const assignedAgent = (agents ?? []).find(a => String(a.id) === String(assignedTo))

  function goBack() {
    navigate(isEdit && leadId ? `/crm/leads/${leadId}` : '/crm/leads')
  }

  return (
    <div className="min-h-screen bg-slate-50/40 -mx-5 -mt-5" style={{ paddingBottom: '90px' }}>

      {/* ═══════════════════════════════════════════════════
          HERO BANNER
      ═══════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{
          background: isEdit
            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4c1d95 100%)'
            : 'linear-gradient(135deg, #1e40af 0%, #4338ca 60%, #312e81 100%)',
        }}
      >
        {/* Decorative orbs */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-12 left-1/3 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' }}
        />

        <div className="relative px-6 pt-5 pb-7 max-w-[1600px] mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-6">
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium transition-colors"
            >
              <ArrowLeft size={13} />
              {isEdit ? 'Lead' : 'Leads'}
            </button>
            <ChevronRight size={11} className="text-white/30" />
            <span className="text-white/40 text-xs">CRM</span>
            <ChevronRight size={11} className="text-white/30" />
            <span className="text-white text-xs font-semibold">
              {isEdit ? 'Edit Lead' : 'New Lead'}
            </span>
          </div>

          {/* Lead identity */}
          <div className="flex items-center gap-5">
            {/* Avatar */}
            {isEdit && fullName ? (
              <div
                className={`w-16 h-16 rounded-2xl ${avatarBg} flex items-center justify-center flex-shrink-0 shadow-2xl`}
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.1)' }}
              >
                <span className="text-2xl font-bold text-white leading-none">{initials(fullName)}</span>
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/20"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <User size={26} className="text-white/50" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white leading-tight truncate">
                {isEdit ? (fullName || `Lead #${leadId}`) : 'Create New Lead'}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {isEdit && leadId && (
                  <span className="flex items-center gap-1 text-white/50 text-xs font-mono">
                    <Hash size={10} /> #{leadId}
                  </span>
                )}
                {currentStatus && (
                  <span
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: `${statusColor}33`,
                      color: '#fff',
                      border: `1px solid ${statusColor}55`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                    {currentStatus.lead_title}
                  </span>
                )}
                {isEdit && existing?.created_at && (
                  <span className="flex items-center gap-1 text-white/40 text-xs">
                    <Calendar size={10} />
                    {new Date(existing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {assignedAgent && (
                  <span className="flex items-center gap-1 text-white/40 text-xs">
                    <UserCheck size={10} /> {assignedAgent.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          STICKY SAVE BAR
      ═══════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">
              {isEdit ? 'Editing Lead' : 'New Lead'}
            </span>
            {errors.lead_status && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-red-500">
                <AlertCircle size={11} /> Status required
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              className="btn-outline text-sm hidden sm:flex"
            >
              Cancel
            </button>
            <button
              form="lead-form"
              type="submit"
              disabled={isPending}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isEdit ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════ */}
      <div className="px-5 py-6 max-w-[1600px] mx-auto">

        {/* API error */}
        {apiError && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 mb-5">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        <form id="lead-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-6">

            {/* ── LEFT: Dynamic field form ─────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Card header */}
              <div
                className="px-6 py-4 border-b border-slate-100 flex items-center gap-3"
                style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)' }}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Tag size={16} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Lead Information</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isEdit ? 'Update the fields below to save changes' : 'Fill in all required fields to create the lead'}
                  </p>
                </div>
              </div>

              <div className="p-6">
                <DynamicFieldForm
                  register={register}
                  setValue={setValue}
                  defaultValues={existing as Record<string, unknown> | undefined}
                  labels={leadFields}
                  errors={errors}
                  formValues={watch() as Record<string, unknown>}
                />
              </div>
            </div>

            {/* ── RIGHT: Sidebar ─────────────────────────────────────────── */}
            <div className="space-y-4 lg:sticky lg:top-[57px] lg:self-start lg:max-h-[calc(100vh-75px)] lg:overflow-y-auto lg:pb-6">

              {/* ── Status Picker ── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white">
                  <div className="w-6 h-6 rounded-md bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                    <Zap size={12} className="text-violet-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Lead Status</span>
                  <span className="ml-auto text-red-400 text-xs font-bold">*</span>
                </div>
                <div className="p-4">
                  {errors.lead_status && (
                    <p className="flex items-center gap-1 text-xs text-red-500 mb-3 px-1">
                      <AlertCircle size={11} /> {errors.lead_status.message}
                    </p>
                  )}
                  {(statuses ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">Loading statuses…</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {(statuses ?? []).map(s => {
                        const color     = s.color_code ?? s.color ?? '#6366f1'
                        const isSelected = leadStatus === s.lead_title_url
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setValue('lead_status', s.lead_title_url, { shouldValidate: true })}
                            className={[
                              'flex items-center gap-2 px-2.5 py-2 rounded-xl border-2 text-left transition-all text-xs font-medium',
                              isSelected
                                ? 'shadow-md'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                            ].join(' ')}
                            style={isSelected ? {
                              borderColor: color,
                              background: `${color}18`,
                              color,
                            } : {}}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: color }}
                            />
                            <span className="truncate leading-tight">{s.lead_title}</span>
                            {isSelected && (
                              <Check size={10} className="ml-auto flex-shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Lead Temperature ── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-orange-50/60 to-white">
                  <div className="w-6 h-6 rounded-md bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                    <Thermometer size={12} className="text-orange-500" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Temperature</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {LEAD_TYPE_OPTIONS.map(({ value, label, Icon, idle, active }) => {
                      const isSelected = leadType === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setValue('lead_type', isSelected ? '' : value)}
                          className={[
                            'flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition-all',
                            isSelected ? active : idle,
                          ].join(' ')}
                        >
                          <Icon size={20} />
                          <span className="text-xs font-semibold">{label}</span>
                        </button>
                      )
                    })}
                  </div>
                  {!leadType && (
                    <p className="text-xs text-slate-400 text-center mt-2 py-0.5">No temperature selected</p>
                  )}
                </div>
              </div>

              {/* ── Assigned Agent ── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-sky-50/60 to-white">
                  <div className="w-6 h-6 rounded-md bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
                    <UserCheck size={12} className="text-sky-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Assigned To</span>
                </div>
                <div className="p-4 space-y-3">
                  {assignedAgent && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-sky-50 border border-sky-200">
                      <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-xs font-bold text-white leading-none">
                          {(assignedAgent.name ?? 'A').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-sky-800 leading-none">{assignedAgent.name}</p>
                        <p className="text-xs text-sky-400 mt-0.5">Assigned agent</p>
                      </div>
                    </div>
                  )}
                  <select
                    {...register('assigned_to')}
                    className="input w-full text-sm"
                  >
                    <option value="">— Unassigned —</option>
                    {(agents ?? []).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Audit Info (edit mode) ── */}
              {isEdit && existing && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Clock size={12} className="text-slate-500" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Audit Trail</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      { label: 'Created by', value: existing.created_by_name as string | undefined },
                      {
                        label: 'Created at',
                        value: existing.created_at
                          ? new Date(existing.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : undefined,
                      },
                      { label: 'Updated by', value: existing.updated_by_name as string | undefined },
                      {
                        label: 'Updated at',
                        value: (existing.updated_at as string | undefined)
                          ? new Date(existing.updated_at as string).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : undefined,
                      },
                    ]
                      .filter(r => r.value)
                      .map(row => (
                        <div key={row.label} className="flex items-start justify-between gap-3">
                          <span className="text-xs text-slate-400 flex-shrink-0">{row.label}</span>
                          <span className="text-xs font-medium text-slate-700 text-right leading-relaxed">{row.value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Desktop save buttons */}
              <div className="hidden lg:flex flex-col gap-2 sticky bottom-0">
                <button
                  form="lead-form"
                  type="submit"
                  disabled={isPending}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  {isEdit ? 'Save Changes' : 'Create Lead'}
                </button>
                <button
                  type="button"
                  onClick={goBack}
                  className="btn-outline w-full justify-center"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE SAVE BAR
      ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center gap-3 px-5 py-4 bg-white border-t border-slate-200 shadow-lg z-20">
        <button
          form="lead-form"
          type="submit"
          disabled={isPending}
          className="btn-primary flex-1 justify-center disabled:opacity-50"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Lead'}
        </button>
        <button type="button" onClick={goBack} className="btn-outline">
          Cancel
        </button>
      </div>

    </div>
  )
}
