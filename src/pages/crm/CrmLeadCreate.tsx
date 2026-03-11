import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Tag, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { DynamicFieldForm } from '../../components/crm/DynamicFieldForm'
import type { CrmLabel, CrmLead } from '../../types/crm.types'

// Only sidebar system fields need schema-level validation; all other fields are driven by lead-fields config
const schema = z.object({
  lead_status: z.string().min(1, 'Status is required'),
  lead_type:   z.string().optional(),
  assigned_to: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Section wrapper (sidebar only) ────────────────────────────────────────────
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

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
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
    register, handleSubmit, setValue, watch, getValues, setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { lead_status: 'new_lead' },
  })

  const inp = (hasError?: boolean) =>
    hasError ? 'input-error w-full' : 'input w-full'

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

  // Set sidebar fields when lead data loads; DynamicFieldForm's own useEffect handles all body fields
  useEffect(() => {
    if (existing) {
      setValue('lead_status', String(existing.lead_status))
      setValue('lead_type', existing.lead_type ? String(existing.lead_type) : '')
      setValue('assigned_to', existing.assigned_to ? String(existing.assigned_to) : '')
    }
  }, [existing, setValue])

  const handleApiError = (err: unknown): string | null => {
    if (err && typeof err === 'object' && 'response' in err) {
      const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response
      const fieldErrors = res?.data?.errors
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        // First error message for the toast
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
      setApiError(null) // field errors shown inline; only set banner for generic errors
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
    // getValues() includes EAV fields registered by DynamicFieldForm (zod strips unknown keys from `data`)
    const rawAll = getValues() as Record<string, unknown>
    // Normalize checkbox booleans → "1"/"0" strings for EAV storage
    const payload: Record<string, unknown> = {}
    Object.entries({ ...rawAll, ...data } as Record<string, unknown>).forEach(([k, v]) => {
      payload[k] = v === true ? '1' : v === false ? '0' : v
    })
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

            {/* All lead fields — column + EAV — driven by lead-fields configuration */}
            <div className="detail-section">
              <div className="detail-section-body">
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
                <Field label="Lead Type" error={errors.lead_type?.message}>
                  <select {...register('lead_type')} className={inp(!!errors.lead_type)}>
                    <option value="">— Select type —</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </Field>
                <Field label="Assigned To" error={errors.assigned_to?.message}>
                  <select {...register('assigned_to')} className={inp(!!errors.assigned_to)}>
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
