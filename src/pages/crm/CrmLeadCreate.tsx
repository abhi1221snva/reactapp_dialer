import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Loader2, AlertCircle, Save,
  Thermometer, Snowflake, Flame, Clock,
  UserCheck, Zap, User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { DynamicFieldForm } from '../../components/crm/DynamicFieldForm'
import { scrollToFirstError } from '../../utils/publicFormValidation'
import AddressAutocomplete from '../../components/ui/AddressAutocomplete'
import { resolveAddressGroup, type ParsedPlace } from '../../utils/addressFieldMapping'
import type { CrmLabel, CrmLead } from '../../types/crm.types'
import { useAuthStore } from '../../stores/auth.store'
import { LEVELS } from '../../utils/permissions'

const schema = z.object({
  lead_status:    z.string().min(1, 'Status is required'),
  lead_source_id: z.string().min(1, 'Lead Source is required'),
  lead_type:      z.string().optional(),
  assigned_to:    z.string().optional(),
  // Core lead fields — always editable regardless of crm_labels configuration
  first_name:     z.string().optional(),
  last_name:      z.string().optional(),
  email:          z.string().optional(),
  phone_number:   z.string().optional(),
  company_name:   z.string().optional(),
  address:        z.string().optional(),
  city:           z.string().optional(),
  state:          z.string().optional(),
})

type FormData = z.infer<typeof schema>

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

// ── Core fields (static — defined outside component so reference is stable) ──
const CORE_FIELD_DEFS: { key: string; label: string; type?: string; placeholder?: string; span?: number; maxLength?: number }[] = [
  { key: 'first_name',   label: 'First Name',    placeholder: 'First name',           span: 3 },
  { key: 'last_name',    label: 'Last Name',      placeholder: 'Last name',            span: 3 },
  { key: 'email',        label: 'Email',          type: 'email',  placeholder: 'Email address', span: 3 },
  { key: 'phone_number', label: 'Phone',          type: 'tel',    placeholder: '10-digit phone', span: 3 },
  { key: 'company_name', label: 'Company Name',   placeholder: 'Business / DBA name',  span: 6 },
  { key: 'address',      label: 'Address',        placeholder: 'Street address',       span: 6 },
  { key: 'city',         label: 'City',           placeholder: 'City',                 span: 3 },
  { key: 'state',        label: 'State',          placeholder: 'State', maxLength: 2,  span: 3 },
]

// Field grid columns — 4 per row on desktop, 2 on tablet, 1 on mobile
const FIELD_GRID = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3'

// ── Section category buckets ────────────────────────────────────────────────
const PERSONAL_SECTIONS  = new Set(['owner', 'contact', 'address', 'general', 'other'])
const BUSINESS_SECTIONS  = new Set(['business', 'funding', 'financial', 'documents', 'custom'])
const SECOND_OWNER_SECTIONS = new Set(['second_owner'])

function bucketFields(fields: CrmLabel[] = []) {
  const personal: CrmLabel[]     = []
  const business: CrmLabel[]     = []
  const secondOwner: CrmLabel[]  = []

  for (const f of fields) {
    const sec = f.section || 'other'
    if (SECOND_OWNER_SECTIONS.has(sec))      secondOwner.push(f)
    else if (BUSINESS_SECTIONS.has(sec))     business.push(f)
    else                                      personal.push(f)
  }
  return { personal, business, secondOwner }
}

// ── Main ───────────────────────────────────────────────────────────────────
export function CrmLeadCreate() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const isEdit    = Boolean(id)
  const leadId    = id ? Number(id) : undefined
  const qc = useQueryClient()
  const [apiError,         setApiError]         = useState<string | null>(null)
  const [hasSecondOwner,   setHasSecondOwner]   = useState(false)
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const agentDropdownRef = useRef<HTMLDivElement>(null)
  const formScrollRef    = useRef<HTMLDivElement>(null)
  const owner2Ref        = useRef<HTMLElement>(null)
  const [formErrorCount, setFormErrorCount] = useState(0)
  const authLevel = useAuthStore(s => s.user?.level) ?? 0
  const isAgentRole = authLevel < LEVELS.MANAGER

  const {
    register, handleSubmit, setValue, watch, getValues, setError, unregister,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { lead_status: 'new_lead', lead_source_id: '' },
  })

  const leadStatus   = watch('lead_status')
  const leadSourceId = watch('lead_source_id')
  const leadType     = watch('lead_type')
  const assignedTo   = watch('assigned_to')

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

  const { data: leadSources } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: async () => {
      const res = await leadService.getLeadSources()
      return (res.data?.data ?? res.data ?? []) as Array<{ id: number; source_title: string }>
    },
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

  // Memoize so array references stay stable across re-renders (watch() causes re-renders on every
  // keystroke; unstable references would trigger DynamicFieldForm's useEffect on every keystroke,
  // resetting all EAV field values back to their original DB values and making fields uneditable).
  const { personal, business, secondOwner } = useMemo(() => bucketFields(leadFields), [leadFields])

  // Keys already covered by crm_labels — don't render them again in the core section
  // Memoized so the set is stable and doesn't cause downstream re-effects
  const labelKeys = useMemo(() => new Set((leadFields ?? []).map(f => f.field_key)), [leadFields])
  // Only show core fields that are NOT already in crm_labels (avoids duplicate RHF registration)
  const visibleCoreFields = useMemo(
    () => CORE_FIELD_DEFS.filter(f => !labelKeys.has(f.key)),
    [labelKeys],
  )

  const hasOwnerSection   = visibleCoreFields.length > 0 || personal.length > 0
  const hasBusinessSection = business.length > 0
  const hasOwner2Section   = secondOwner.length > 0

  // Auto-enable second owner in edit mode if that data is populated
  useEffect(() => {
    if (existing && secondOwner.length > 0) {
      const hasData = secondOwner.some(f => {
        const val = (existing as Record<string, unknown>)[f.field_key]
        return val !== null && val !== undefined && String(val).trim() !== ''
      })
      if (hasData) {
        setHasSecondOwner(true)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing])

  useEffect(() => {
    if (!existing) return
    const ex = existing as Record<string, unknown>
    setValue('lead_status',    String(existing.lead_status))
    setValue('lead_source_id', existing.lead_source_id ? String(existing.lead_source_id) : '')
    setValue('lead_type',      existing.lead_type   ? String(existing.lead_type)   : '')
    setValue('assigned_to',    existing.assigned_to ? String(existing.assigned_to) : '')
    // Core fields
    const coreKeys = ['first_name','last_name','email','phone_number','company_name','address','city','state'] as const
    for (const k of coreKeys) {
      const v = ex[k]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue(k as any, v !== null && v !== undefined ? String(v) : '')
    }
    // Pre-populate ALL EAV fields into the RHF store so inactive tabs are
    // included in the payload and their existing values are preserved on save.
    if (leadFields) {
      for (const f of leadFields) {
        const v = ex[f.field_key]
        if (f.field_type === 'checkbox') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(setValue as (n: string, v: unknown) => void)(f.field_key, v === '1' || v === 1 || v === true)
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(setValue as (n: string, v: unknown) => void)(f.field_key, v !== null && v !== undefined ? String(v) : '')
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, leadFields])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setAgentDropdownOpen(false)
      }
    }
    if (agentDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [agentDropdownOpen])

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
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
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

    // Build set of second-owner field keys to skip when checkbox is off
    const secondOwnerKeys = new Set(secondOwner.map(f => f.field_key))

    // Clear second-owner values when unchecked (send empty strings so backend wipes them)
    if (!hasSecondOwner) {
      for (const k of secondOwnerKeys) {
        payload[k] = ''
      }
    }

    if (leadFields && leadFields.length > 0) {
      const activeFields = leadFields.filter(
        f => f.status === true || (f.status as unknown) == 1,
      )
      const errorKeys: string[] = []

      for (const field of activeFields) {
        if (field.field_type === 'checkbox') continue
        // Skip validation for second-owner fields when unchecked
        if (!hasSecondOwner && secondOwnerKeys.has(field.field_key)) continue

        const rawVal = payload[field.field_key]
        const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : ''
        const isRequired = field.required === true || (field.required as unknown) == 1

        if (isRequired && strVal === '') {
          setError(field.field_key as keyof FormData, {
            type: 'manual',
            message: `${field.label_name} is required`,
          })
          errorKeys.push(field.field_key)
          continue
        }

        if (!strVal) continue

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
          errorKeys.push(field.field_key)
        }
      }

      if (errorKeys.length > 0) {
        setFormErrorCount(errorKeys.length)
        scrollToFirstError(errorKeys, formScrollRef.current)
        return
      }
    }

    setFormErrorCount(0)

    if (isEdit) updateMutation.mutate(payload)
    else createMutation.mutate(payload)
  }

  const isPending     = createMutation.isPending || updateMutation.isPending
  const currentStatus = (statuses ?? []).find(s => s.lead_title_url === leadStatus)
  const assignedAgent = (agents ?? []).find(a => String(a.id) === String(assignedTo))

  function goBack() {
    navigate(isEdit && leadId ? `/crm/leads/${leadId}` : '/crm/leads')
  }

  return (
    <div className="-mx-5 -mt-5 flex flex-col" style={{ height: 'calc(100vh - 70px)' }}>

      {/* ── Compact header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-slate-800 leading-tight">
              {isEdit ? 'Edit Lead' : 'Create a new lead'}
            </h1>
            {errors.lead_status && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                <AlertCircle size={10} /> Status required
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="btn-outline text-xs px-3 py-1.5 h-auto hidden sm:flex"
          >
            Cancel
          </button>
          <button
            form="lead-form"
            type="submit"
            disabled={isPending}
            className="btn-success flex items-center gap-1.5 text-xs px-3 py-1.5 h-auto disabled:opacity-50"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {isEdit ? 'Save Changes' : 'Create Lead'}
          </button>
        </div>
      </div>

      {/* ── Green accent line ───────────────────────────────────────────────── */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, #cfe4d7, #4ade80)', margin: 0, borderRadius: 1 }} />

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <form id="lead-form" onSubmit={handleSubmit(onSubmit)} className="h-full">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] gap-0">

            {/* ── LEFT: multi-column section form ────────────────── */}
            <div ref={formScrollRef} className="overflow-y-auto scroll-smooth border-r border-slate-200 bg-white">
              <div className="p-5">

                {formErrorCount > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 13px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    Please fix {formErrorCount} error{formErrorCount > 1 ? 's' : ''} before saving.
                  </div>
                )}
                {apiError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 13px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    {apiError}
                  </div>
                )}

                <div className="space-y-8">

                  {/* ═══ Section: Owner Information ═══ */}
                  {hasOwnerSection && (
                    <section>
                      <div style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #16a34a', paddingLeft: 10, lineHeight: 1.3 }}>
                          Owner Information
                        </h3>
                        <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                      </div>

                      {/* Core system fields */}
                      {visibleCoreFields.length > 0 && (
                        <div className={FIELD_GRID}>
                          {visibleCoreFields.map(f => {
                            const isWide = f.key === 'company_name' || f.key === 'address'
                            return (
                              <div key={f.key} className={isWide ? 'sm:col-span-2' : ''} data-field-key={f.key}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: errors[f.key as keyof FormData] ? '#ef4444' : '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>{f.label}</label>
                                {f.key === 'address' ? (
                                  <AddressAutocomplete
                                    value={watch('address') ?? ''}
                                    onChange={v => setValue('address', v)}
                                    onPlaceSelect={(parsed: ParsedPlace) => {
                                      const group = resolveAddressGroup('address')
                                      if (group) {
                                        setValue('city', parsed.city)
                                        setValue('state', parsed.state)
                                      }
                                    }}
                                    placeholder={f.placeholder}
                                  />
                                ) : (
                                  <input
                                    type={f.type ?? 'text'}
                                    {...register(f.key as keyof FormData)}
                                    className="crm-fi"
                                    placeholder={f.placeholder}
                                    maxLength={f.maxLength}
                                    autoComplete={f.type === 'email' ? 'email' : undefined}
                                  />
                                )}
                                {errors[f.key as keyof FormData]?.message && (
                                  <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                    <AlertCircle size={11} />{String(errors[f.key as keyof FormData]?.message)}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Dynamic owner/personal fields */}
                      {personal.length > 0 && (
                        <div className={visibleCoreFields.length > 0 ? 'mt-4' : ''}>
                          <DynamicFieldForm
                            register={register}
                            setValue={setValue}
                            defaultValues={existing as Record<string, unknown> | undefined}
                            labels={personal}
                            errors={errors}
                            formValues={watch() as Record<string, unknown>}
                            columns={4}
                            hideSectionHeaders
                          />
                        </div>
                      )}
                    </section>
                  )}

                  {/* ═══ Section: Business Information ═══ */}
                  {hasBusinessSection && (
                    <section>
                      <DynamicFieldForm
                        register={register}
                        setValue={setValue}
                        defaultValues={existing as Record<string, unknown> | undefined}
                        labels={business}
                        errors={errors}
                        formValues={watch() as Record<string, unknown>}
                        columns={4}
                      />
                    </section>
                  )}

                  {/* ═══ Section: Owner2 Information ═══ */}
                  {hasOwner2Section && (
                    <section ref={owner2Ref}>
                      <label className="flex items-center gap-2 cursor-pointer select-none w-fit mb-3" title="Enable second owner fields">
                        <input
                          type="checkbox"
                          checked={hasSecondOwner}
                          onChange={e => {
                            const checked = e.target.checked
                            setHasSecondOwner(checked)
                            if (!checked) {
                              // Unregister Owner2 fields so their validation rules are removed
                              secondOwner.forEach(f => unregister(f.field_key as keyof FormData))
                            }
                            setTimeout(() => {
                              owner2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }, 50)
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', lineHeight: 1 }}>
                          Owner2 Information
                        </span>
                      </label>
                      {hasSecondOwner && (
                        <DynamicFieldForm
                          register={register}
                          setValue={setValue}
                          defaultValues={existing as Record<string, unknown> | undefined}
                          labels={secondOwner}
                          errors={errors}
                          formValues={watch() as Record<string, unknown>}
                          columns={4}
                          hideSectionHeaders
                        />
                      )}
                    </section>
                  )}

                  {/* Fallback: no section metadata on fields */}
                  {!hasOwnerSection && !hasBusinessSection && !hasOwner2Section && (
                    <DynamicFieldForm
                      register={register}
                      setValue={setValue}
                      defaultValues={existing as Record<string, unknown> | undefined}
                      labels={leadFields}
                      errors={errors}
                      formValues={watch() as Record<string, unknown>}
                      columns={4}
                    />
                  )}

                </div>

              </div>
            </div>

            {/* ── RIGHT: metadata sidebar ──────────────────────────── */}
            <div className="overflow-y-auto bg-white">
              <div className="p-4 space-y-2.5">

                {/* Status */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={10} className="text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Lead Status</span>
                    <span className="text-red-400 text-[10px]">*</span>
                  </div>
                  {errors.lead_status && (
                    <p className="flex items-center gap-1 text-[11px] text-red-500 mb-1">
                      <AlertCircle size={9} /> {errors.lead_status.message}
                    </p>
                  )}
                  <div className="relative">
                    {currentStatus && (
                      <span
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none z-10"
                        style={{ background: currentStatus.color_code ?? currentStatus.color ?? '#6366f1' }}
                      />
                    )}
                    <select
                      value={leadStatus}
                      onChange={e => setValue('lead_status', e.target.value, { shouldValidate: true })}
                      className={`input w-full text-xs ${currentStatus ? 'pl-7' : ''}`}
                    >
                      <option value="">— Select status —</option>
                      {(statuses ?? []).map(s => (
                        <option key={s.id} value={s.lead_title_url}>{s.lead_title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lead Source */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={10} className="text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Lead Source</span>
                    <span className="text-red-400 text-[10px]">*</span>
                  </div>
                  {errors.lead_source_id && (
                    <p className="flex items-center gap-1 text-[11px] text-red-500 mb-1">
                      <AlertCircle size={9} /> {errors.lead_source_id.message}
                    </p>
                  )}
                  <select
                    value={leadSourceId}
                    onChange={e => setValue('lead_source_id', e.target.value, { shouldValidate: true })}
                    className="input w-full text-xs"
                  >
                    <option value="">— Select source —</option>
                    {(leadSources ?? []).map(s => (
                      <option key={s.id} value={String(s.id)}>{s.source_title}</option>
                    ))}
                  </select>
                </div>

                {/* Temperature — inline chips */}
                <div className="flex flex-wrap gap-1.5">
                  {LEAD_TYPE_OPTIONS.map(({ value, label, Icon, idle, active }) => {
                    const isSelected = leadType === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue('lead_type', isSelected ? '' : value)}
                        className={[
                          'inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all',
                          isSelected ? active : idle,
                        ].join(' ')}
                      >
                        <Icon size={12} />
                        {label}
                      </button>
                    )
                  })}
                </div>

                {/* Assigned Agent — hidden for agent role */}
                {!isAgentRole && <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <UserCheck size={10} className="text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Assigned To</span>
                  </div>
                  <div className="relative" ref={agentDropdownRef}>
                      {/* Clickable card — shows selected agent or unassigned placeholder */}
                      <button
                        type="button"
                        onClick={() => setAgentDropdownOpen(o => !o)}
                        className={[
                          'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors',
                          agentDropdownOpen
                            ? 'bg-sky-100 border-sky-300 ring-1 ring-sky-300'
                            : 'bg-sky-50 border-sky-200 hover:bg-sky-100 hover:border-sky-300',
                        ].join(' ')}
                      >
                        {assignedAgent ? (
                          <>
                            <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white leading-none">
                                {(assignedAgent.name ?? 'A').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-sky-800 leading-none truncate">{assignedAgent.name}</p>
                              <p className="text-xs text-sky-400 mt-0.5">Assigned agent</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                              <User size={13} className="text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-400 leading-none">Unassigned</p>
                              <p className="text-xs text-slate-300 mt-0.5">Click to assign</p>
                            </div>
                          </>
                        )}
                        <svg
                          className={['w-3.5 h-3.5 text-sky-400 flex-shrink-0 transition-transform duration-200', agentDropdownOpen ? 'rotate-180' : ''].join(' ')}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Custom dropdown */}
                      {agentDropdownOpen && (
                        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-sky-200 bg-white shadow-lg overflow-hidden">
                          <div className="max-h-52 overflow-y-auto py-1">
                            {/* Unassigned option */}
                            <button
                              type="button"
                              onClick={() => { setValue('assigned_to', ''); setAgentDropdownOpen(false) }}
                              className={[
                                'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                                !assignedTo ? 'bg-sky-50' : 'hover:bg-slate-50',
                              ].join(' ')}
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <User size={13} className="text-slate-400" />
                              </div>
                              <span className="text-xs font-medium text-slate-400">— Unassigned —</span>
                            </button>

                            {(agents ?? []).map(a => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => { setValue('assigned_to', String(a.id)); setAgentDropdownOpen(false) }}
                                className={[
                                  'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                                  String(assignedTo) === String(a.id) ? 'bg-sky-50' : 'hover:bg-slate-50',
                                ].join(' ')}
                              >
                                <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-white leading-none">
                                    {(a.name ?? 'A').slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-700 leading-none truncate">{a.name}</p>
                                </div>
                                {String(assignedTo) === String(a.id) && (
                                  <svg className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                </div>}

                {/* Audit Trail (edit mode) */}
                {isEdit && existing && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Clock size={10} className="text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Audit Trail</span>
                    </div>
                    <div className="space-y-1.5">
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
                          <div key={row.label} className="flex items-start justify-between gap-2">
                            <span className="text-[11px] text-slate-400 flex-shrink-0">{row.label}</span>
                            <span className="text-[11px] font-medium text-slate-600 text-right">{row.value}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </form>
      </div>

      {/* ── Mobile save bar ──────────────────────────────────────────────── */}
      <div className="lg:hidden flex items-center gap-3 px-5 py-3 bg-white border-t border-slate-200 shadow-lg flex-shrink-0">
        <button
          form="lead-form"
          type="submit"
          disabled={isPending}
          className="btn-success flex-1 justify-center disabled:opacity-50"
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
