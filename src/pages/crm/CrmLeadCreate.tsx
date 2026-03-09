import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Loader2, User, Building2, MapPin, Mail, Tag, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { DynamicFieldForm } from '../../components/crm/DynamicFieldForm'
import type { CrmLead } from '../../types/crm.types'

const schema = z.object({
  first_name:   z.string().min(1, 'First name is required'),
  last_name:    z.string().optional(),
  email:        z.string().email('Invalid email').or(z.literal('')).optional(),
  phone_number: z.string().optional(),
  company_name: z.string().optional(),
  lead_status:  z.string().min(1, 'Status is required'),
  lead_type:    z.string().optional(),
  gender:       z.string().optional(),
  dob:          z.string().optional(),
  assigned_to:  z.string().optional(),
  address:      z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
  country:      z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Section wrapper ────────────────────────────────────────────────────────────
interface SectionProps { icon: React.ReactNode; title: string; children: React.ReactNode }

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="detail-section">
      <div className="detail-section-header">
        <span className="text-indigo-500">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="detail-section-body">{children}</div>
    </div>
  )
}

// ── Field wrapper ──────────────────────────────────────────────────────────────
function Field({
  label, required, error, children, className,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <label className="label">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs mt-1 text-red-500">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

// ── Main form ──────────────────────────────────────────────────────────────────
export function CrmLeadCreate() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const leadId = id ? Number(id) : undefined
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { lead_status: 'new_lead' },
  })

  const inp = (hasError?: boolean) =>
    hasError ? 'input-error w-full' : 'input w-full'

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
      reset({
        first_name:   existing.first_name,
        last_name:    existing.last_name ?? '',
        email:        existing.email ? String(existing.email) : '',
        phone_number: existing.phone_number ? String(existing.phone_number) : '',
        company_name: existing.company_name ? String(existing.company_name) : '',
        lead_status:  String(existing.lead_status),
        lead_type:    existing.lead_type ? String(existing.lead_type) : '',
        gender:       existing.gender ? String(existing.gender) : '',
        dob:          existing.dob ? String(existing.dob) : '',
        assigned_to:  existing.assigned_to ? String(existing.assigned_to) : '',
        address:      existing.address ? String(existing.address) : '',
        city:         existing.city ? String(existing.city) : '',
        state:        existing.state ? String(existing.state) : '',
        country:      existing.country ? String(existing.country) : '',
      })
    }
  }, [existing, reset])

  const extractApiError = (err: unknown): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const res = (err as { response?: { data?: { message?: string } } }).response
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
    onError: (err) => { setApiError(extractApiError(err)); toast.error('Failed to create lead') },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => leadService.update(leadId!, data),
    onSuccess: () => {
      setApiError(null)
      toast.success('Lead updated successfully')
      navigate(`/crm/leads/${leadId}`)
    },
    onError: (err) => { setApiError(extractApiError(err)); toast.error('Failed to update lead') },
  })

  const onSubmit = (data: FormData) => {
    setApiError(null)
    const payload: Record<string, unknown> = { ...data }
    if (isEdit) updateMutation.mutate(payload)
    else createMutation.mutate(payload)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-5">

      {/* Back + Title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate(isEdit && leadId ? `/crm/leads/${leadId}` : '/crm/leads')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> {isEdit ? 'Back to Lead' : 'Back to Leads'}
        </button>
        <div className="text-right">
          <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Lead' : 'New Lead'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEdit ? 'Update lead information' : 'Fill in the details to create a new lead'}
          </p>
        </div>
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: Main content ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic Information */}
            <Section icon={<User size={16} />} title="Basic Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <Field label="First Name" required error={errors.first_name?.message}>
                  <input {...register('first_name')} className={inp(!!errors.first_name)} placeholder="First name" />
                </Field>
                <Field label="Last Name">
                  <input {...register('last_name')} className={inp()} placeholder="Last name" />
                </Field>
                <Field label="Gender">
                  <select {...register('gender')} className={inp()}>
                    <option value="">— Select —</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Date of Birth">
                  <input type="date" {...register('dob')} className={inp()} />
                </Field>
              </div>
            </Section>

            {/* Contact Details */}
            <Section icon={<Mail size={16} />} title="Contact Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <Field label="Email" error={errors.email?.message}>
                  <input type="email" {...register('email')} className={inp(!!errors.email)} placeholder="email@example.com" />
                </Field>
                <Field label="Phone Number">
                  <input type="tel" {...register('phone_number')} className={inp()} placeholder="+1 (555) 000-0000" />
                </Field>
                <Field label="Company Name">
                  <input {...register('company_name')} className={inp()} placeholder="Company name" />
                </Field>
              </div>
            </Section>

            {/* Address */}
            <Section icon={<MapPin size={16} />} title="Address">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <Field label="Street Address" className="sm:col-span-2 xl:col-span-3">
                  <input {...register('address')} className={inp()} placeholder="123 Main St" />
                </Field>
                <Field label="City">
                  <input {...register('city')} className={inp()} placeholder="City" />
                </Field>
                <Field label="State / Province">
                  <input {...register('state')} className={inp()} placeholder="State" />
                </Field>
                <Field label="Country">
                  <input {...register('country')} className={inp()} placeholder="Country" />
                </Field>
              </div>
            </Section>

            {/* Custom Fields (EAV) */}
            <Section icon={<Building2 size={16} />} title="Custom Fields">
              <DynamicFieldForm
                register={register}
                setValue={setValue}
                watch={watch}
                defaultValues={existing as Record<string, unknown> | undefined}
              />
            </Section>
          </div>

          {/* ── RIGHT: Sidebar ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Lead Details */}
            <Section icon={<Tag size={16} />} title="Lead Details">
              <div className="space-y-4">
                <Field label="Status" required error={errors.lead_status?.message}>
                  <select {...register('lead_status')} className={inp(!!errors.lead_status)}>
                    <option value="">— Select status —</option>
                    {(statuses ?? []).map(s => (
                      <option key={s.id} value={s.lead_title_url}>{s.lead_title}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Lead Type">
                  <select {...register('lead_type')} className={inp()}>
                    <option value="">— Select type —</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </Field>
                <Field label="Assigned To">
                  <select {...register('assigned_to')} className={inp()}>
                    <option value="">— Unassigned —</option>
                    {(agents ?? []).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            {/* Audit info (edit mode only) */}
            {isEdit && existing && (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                <p className="section-label">Audit Info</p>
                {(existing.created_by_name as string | undefined) && (
                  <div>
                    <p className="field-label">Created by</p>
                    <p className="field-value">{existing.created_by_name as string}</p>
                  </div>
                )}
                {existing.created_at && (
                  <div>
                    <p className="field-label">Created at</p>
                    <p className="field-value">{new Date(existing.created_at).toLocaleString()}</p>
                  </div>
                )}
                {(existing.updated_by_name as string | undefined) && (
                  <div>
                    <p className="field-label">Last updated by</p>
                    <p className="field-value">{existing.updated_by_name as string}</p>
                  </div>
                )}
                {(existing.updated_at as string | undefined) && (
                  <div>
                    <p className="field-label">Last updated at</p>
                    <p className="field-value">{new Date(existing.updated_at as string).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {/* Desktop action buttons */}
            <div className="hidden lg:flex flex-col gap-2 sticky top-4">
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full justify-center"
              >
                {isPending && <Loader2 size={15} className="animate-spin" />}
                {isEdit ? 'Save Changes' : 'Create Lead'}
              </button>
              <button
                type="button"
                onClick={() => navigate(isEdit && leadId ? `/crm/leads/${leadId}` : '/crm/leads')}
                className="btn-outline w-full justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Mobile action bar */}
        <div
          className="lg:hidden flex items-center gap-3 sticky bottom-0 py-4 border-t border-slate-200 bg-slate-50 mt-5"
          style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
        >
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending && <Loader2 size={15} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Lead'}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit && leadId ? `/crm/leads/${leadId}` : '/crm/leads')}
            className="btn-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
