import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Loader2, AlertCircle, Save,
  Thermometer, Snowflake, Flame, Clock,
  UserCheck, Zap, User, Building2, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { DynamicFieldForm } from '../../components/crm/DynamicFieldForm'
import type { CrmLabel, CrmLead } from '../../types/crm.types'

const schema = z.object({
  lead_status:  z.string().min(1, 'Status is required'),
  lead_type:    z.string().optional(),
  assigned_to:  z.string().optional(),
  // Core lead fields — always editable regardless of crm_labels configuration
  first_name:   z.string().optional(),
  last_name:    z.string().optional(),
  email:        z.string().optional(),
  phone_number: z.string().optional(),
  company_name: z.string().optional(),
  address:      z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
  zip:          z.string().optional(),
  loan_amount:  z.string().optional(),
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
  const [activeTab,        setActiveTab]        = useState<'personal' | 'business' | 'second_owner'>('personal')
  const [hasSecondOwner,   setHasSecondOwner]   = useState(false)

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

  const { personal, business, secondOwner } = bucketFields(leadFields)

  // Keys already covered by crm_labels — don't render them again in the core section
  const labelKeys = new Set((leadFields ?? []).map(f => f.field_key))
  const CORE_FIELD_DEFS: { key: keyof FormData; label: string; type?: string; placeholder?: string; colSpan?: boolean; maxLength?: number }[] = [
    { key: 'first_name',   label: 'First Name',    placeholder: 'First name' },
    { key: 'last_name',    label: 'Last Name',      placeholder: 'Last name' },
    { key: 'email',        label: 'Email',          type: 'email',  placeholder: 'Email address' },
    { key: 'phone_number', label: 'Phone',          type: 'tel',    placeholder: '10-digit phone' },
    { key: 'company_name', label: 'Company Name',   placeholder: 'Business / DBA name' },
    { key: 'loan_amount',  label: 'Loan Amount',    placeholder: 'e.g. 50000' },
    { key: 'address',      label: 'Address',        placeholder: 'Street address', colSpan: true },
    { key: 'city',         label: 'City',           placeholder: 'City' },
    { key: 'state',        label: 'State',          placeholder: 'State', maxLength: 2 },
    { key: 'zip',          label: 'ZIP',            placeholder: 'ZIP' },
  ]
  // Only show core fields that are NOT already in crm_labels (avoids duplicate RHF registration)
  const visibleCoreFields = CORE_FIELD_DEFS.filter(f => !labelKeys.has(f.key))

  // Auto-enable second owner in edit mode if that data is populated
  useEffect(() => {
    if (existing && secondOwner.length > 0) {
      const hasData = secondOwner.some(f => {
        const val = (existing as Record<string, unknown>)[f.field_key]
        return val !== null && val !== undefined && String(val).trim() !== ''
      })
      if (hasData) {
        setHasSecondOwner(true)
        setActiveTab('second_owner')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing])

  useEffect(() => {
    if (!existing) return
    const ex = existing as Record<string, unknown>
    setValue('lead_status',  String(existing.lead_status))
    setValue('lead_type',    existing.lead_type   ? String(existing.lead_type)   : '')
    setValue('assigned_to',  existing.assigned_to ? String(existing.assigned_to) : '')
    // Core fields
    const coreKeys = ['first_name','last_name','email','phone_number','company_name','address','city','state','zip','loan_amount'] as const
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

    if (leadFields && leadFields.length > 0) {
      const activeFields = leadFields.filter(
        f => f.status === true || (f.status as unknown) == 1,
      )
      let hasErrors = false

      for (const field of activeFields) {
        if (field.field_type === 'checkbox') continue

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
          hasErrors = true
        }
      }

      if (hasErrors) return
    }

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
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 h-auto disabled:opacity-50"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {isEdit ? 'Save Changes' : 'Create Lead'}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <form id="lead-form" onSubmit={handleSubmit(onSubmit)} className="h-full">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] gap-0">

            {/* ── LEFT: tabbed field panel ───────────────────────── */}
            <div className="flex flex-col overflow-hidden border-r border-slate-200 bg-white">

              {/* Tab bar */}
              {(personal.length > 0 || business.length > 0 || secondOwner.length > 0) && (
                <div className="flex items-stretch border-b border-slate-200 bg-slate-50/70 flex-shrink-0 px-4 pt-3 gap-1">
                  {personal.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('personal')}
                      className={[
                        'flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg border border-b-0 transition-all -mb-px',
                        activeTab === 'personal'
                          ? 'bg-white border-slate-200 text-blue-600 shadow-sm'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60',
                      ].join(' ')}
                    >
                      <User size={13} className={activeTab === 'personal' ? 'text-blue-500' : 'text-slate-400'} />
                      Personal
                    </button>
                  )}
                  {business.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('business')}
                      className={[
                        'flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg border border-b-0 transition-all -mb-px',
                        activeTab === 'business'
                          ? 'bg-white border-slate-200 text-emerald-600 shadow-sm'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60',
                      ].join(' ')}
                    >
                      <Building2 size={13} className={activeTab === 'business' ? 'text-emerald-500' : 'text-slate-400'} />
                      Business
                    </button>
                  )}
                  {secondOwner.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('second_owner')}
                      className={[
                        'flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg border border-b-0 transition-all -mb-px',
                        activeTab === 'second_owner'
                          ? 'bg-white border-slate-200 text-violet-600 shadow-sm'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60',
                      ].join(' ')}
                    >
                      <Users size={13} className={activeTab === 'second_owner' ? 'text-violet-500' : 'text-slate-400'} />
                      2nd Owner
                      {hasSecondOwner && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Tab content — scrollable, includes both core fields and dynamic fields */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">

                  {apiError && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 mb-4">
                      <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-red-500" />
                      <p className="text-sm text-red-700">{apiError}</p>
                    </div>
                  )}

                  {/* Core fields not covered by crm_labels — shown here to ensure they're always editable */}
                  {visibleCoreFields.length > 0 && (
                    <div className="mb-5 pb-5 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Lead Information</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
                        {visibleCoreFields.map(f => (
                          <div key={f.key} className={f.colSpan ? 'sm:col-span-2' : ''}>
                            <label className="block text-xs font-medium text-slate-600 mb-0.5">{f.label}</label>
                            <input
                              type={f.type ?? 'text'}
                              {...register(f.key)}
                              className="input w-full"
                              placeholder={f.placeholder}
                              maxLength={f.maxLength}
                              autoComplete={f.type === 'email' ? 'email' : undefined}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(personal.length > 0 || business.length > 0 || secondOwner.length > 0) ? (
                    <>
                      {activeTab === 'personal' && personal.length > 0 && (
                        <DynamicFieldForm
                          register={register}
                          setValue={setValue}
                          defaultValues={existing as Record<string, unknown> | undefined}
                          labels={personal}
                          errors={errors}
                          formValues={watch() as Record<string, unknown>}
                        />
                      )}
                      {activeTab === 'business' && business.length > 0 && (
                        <DynamicFieldForm
                          register={register}
                          setValue={setValue}
                          defaultValues={existing as Record<string, unknown> | undefined}
                          labels={business}
                          errors={errors}
                          formValues={watch() as Record<string, unknown>}
                        />
                      )}
                      {activeTab === 'second_owner' && secondOwner.length > 0 && (
                        <div>
                          {/* Toggle */}
                          <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none w-fit">
                            <input
                              type="checkbox"
                              checked={hasSecondOwner}
                              onChange={e => setHasSecondOwner(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            />
                            <span className="text-xs font-medium text-slate-700">This lead has a second owner</span>
                          </label>

                          {hasSecondOwner ? (
                            <DynamicFieldForm
                              register={register}
                              setValue={setValue}
                              defaultValues={existing as Record<string, unknown> | undefined}
                              labels={secondOwner}
                              errors={errors}
                              formValues={watch() as Record<string, unknown>}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                <Users size={18} className="text-slate-400" />
                              </div>
                              <p className="text-xs text-slate-400">Check the box above to add a second owner</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Fallback: no section metadata on fields */
                    <DynamicFieldForm
                      register={register}
                      setValue={setValue}
                      defaultValues={existing as Record<string, unknown> | undefined}
                      labels={leadFields}
                      errors={errors}
                      formValues={watch() as Record<string, unknown>}
                    />
                  )}

                </div>
              </div>

            </div>

            {/* ── RIGHT: metadata sidebar ──────────────────────────── */}
            <div className="overflow-y-auto bg-white">
              <div className="p-4 space-y-3">

                {/* Status */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white">
                    <div className="w-5 h-5 rounded-md bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                      <Zap size={11} className="text-violet-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Lead Status</span>
                    <span className="ml-auto text-red-400 text-xs font-bold">*</span>
                  </div>
                  <div className="p-3">
                    {errors.lead_status && (
                      <p className="flex items-center gap-1 text-xs text-red-500 mb-2">
                        <AlertCircle size={10} /> {errors.lead_status.message}
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
                </div>

                {/* Temperature */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-orange-50/60 to-white">
                    <div className="w-5 h-5 rounded-md bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                      <Thermometer size={11} className="text-orange-500" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Temperature</span>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {LEAD_TYPE_OPTIONS.map(({ value, label, Icon, idle, active }) => {
                        const isSelected = leadType === value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setValue('lead_type', isSelected ? '' : value)}
                            className={[
                              'flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all',
                              isSelected ? active : idle,
                            ].join(' ')}
                          >
                            <Icon size={16} />
                            <span className="text-xs font-semibold">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {!leadType && (
                      <p className="text-xs text-slate-400 text-center mt-1.5">No temperature selected</p>
                    )}
                  </div>
                </div>

                {/* Assigned Agent */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-sky-50/60 to-white">
                    <div className="w-5 h-5 rounded-md bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
                      <UserCheck size={11} className="text-sky-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Assigned To</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {assignedAgent && (
                      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-sky-50 border border-sky-200">
                        <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
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
                    <select {...register('assigned_to')} className="input w-full text-xs">
                      <option value="">— Unassigned —</option>
                      {(agents ?? []).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Audit Trail (edit mode) */}
                {isEdit && existing && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                      <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Clock size={11} className="text-slate-500" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Audit Trail</span>
                    </div>
                    <div className="p-3 space-y-2">
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
                            <span className="text-xs text-slate-400 flex-shrink-0">{row.label}</span>
                            <span className="text-xs font-medium text-slate-700 text-right leading-relaxed">{row.value}</span>
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
