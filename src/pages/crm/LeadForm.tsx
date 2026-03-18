import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'

const DEFAULT_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  company_name: '',
  address: '',
  city: '',
  state: '',
  country: '',
  zip: '',
  gender: '',
  dob: '',
  lead_status: '',
  lead_source: '',
  notes: '',
}

type FormErrors = Partial<Record<keyof typeof DEFAULT_FORM, string>>

function validateForm(form: typeof DEFAULT_FORM): FormErrors {
  const errors: FormErrors = {}

  if (form.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email.trim())) {
    errors.email = 'Must be a valid email address'
  }

  if (form.phone_number) {
    const digits = form.phone_number.replace(/\D/g, '')
    if (digits.length !== 10) {
      errors.phone_number = 'Phone number must be exactly 10 digits'
    }
  }

  return errors
}

export function LeadForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadService.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: statusesData } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: () => leadService.getLeadStatuses(),
  })

  const { data: sourcesData } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => leadService.getLeadSources(),
  })

  useEffect(() => {
    if (existing?.data?.data) {
      const l = existing.data.data
      setForm({
        first_name: l.first_name || '',
        last_name: l.last_name || '',
        email: l.email || '',
        phone_number: l.phone_number || '',
        company_name: l.company_name || '',
        address: l.address || '',
        city: l.city || '',
        state: l.state || '',
        country: l.country || '',
        zip: l.zip || '',
        gender: l.gender || '',
        dob: l.dob || '',
        lead_status: l.lead_status || '',
        lead_source: l.lead_source || '',
        notes: l.notes || '',
      })
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return leadService.update(Number(id), form as Record<string, unknown>)
      }
      return leadService.create(form as Record<string, unknown>)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Lead updated' : 'Lead created')
      navigate('/crm')
    },
    onError: () => {
      toast.error('Failed to save lead')
    },
  })

  const set = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    // Clear field error on change
    if (formErrors[key as keyof FormErrors]) {
      setFormErrors(e => { const n = { ...e }; delete n[key as keyof FormErrors]; return n })
    }
  }

  const statuses: Array<{ id: number; lead_status: string }> =
    statusesData?.data?.data || statusesData?.data || []
  const sources: Array<{ id: number; lead_source: string }> =
    sourcesData?.data?.data || sourcesData?.data || []

  if (isEdit && loadingExisting) return <PageLoader />

  return (
    <div className="w-full space-y-5">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/crm')} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Lead' : 'New Lead'}</h1>
          <p className="page-subtitle">{isEdit ? `Editing lead #${id}` : 'Add a new contact to CRM'}</p>
        </div>
      </div>

      {/* Top row: Contact Info + Location side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Contact Info */}
        <div className="card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900">Contact Info</h3>
            <p className="text-xs text-slate-500 mt-0.5">Personal and contact details</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">First Name</label>
              <input className="input" value={form.first_name}
                onChange={e => set('first_name', e.target.value)} placeholder="John" />
            </div>
            <div className="form-group">
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name}
                onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Phone Number <span className="text-red-500">*</span></label>
            <input
              className={`input${formErrors.phone_number ? ' border-red-400 focus:ring-red-400' : ''}`}
              value={form.phone_number}
              onChange={e => set('phone_number', e.target.value)}
              placeholder="10-digit number"
              maxLength={15}
              inputMode="numeric"
            />
            {formErrors.phone_number && (
              <p className="mt-1 text-xs text-red-500">{formErrors.phone_number}</p>
            )}
          </div>

          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              className={`input${formErrors.email ? ' border-red-400 focus:ring-red-400' : ''}`}
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="john@example.com"
              autoComplete="email"
            />
            {formErrors.email && (
              <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
            )}
          </div>

          <div className="form-group">
            <label className="label">Company</label>
            <input className="input" value={form.company_name}
              onChange={e => set('company_name', e.target.value)} placeholder="ACME Corp" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">-- Select --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={form.dob}
                onChange={e => set('dob', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900">Location</h3>
            <p className="text-xs text-slate-500 mt-0.5">Address and geographic information</p>
          </div>

          <div className="form-group">
            <label className="label">Address</label>
            <input className="input" value={form.address}
              onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">City</label>
              <input className="input" value={form.city}
                onChange={e => set('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">State</label>
              <input className="input" value={form.state}
                onChange={e => set('state', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Country</label>
              <input className="input" value={form.country}
                onChange={e => set('country', e.target.value)} placeholder="US" />
            </div>
            <div className="form-group">
              <label className="label">ZIP Code</label>
              <input className="input" value={form.zip}
                onChange={e => set('zip', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Lead Details — full width */}
      <div className="card space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-semibold text-slate-900">Lead Details</h3>
          <p className="text-xs text-slate-500 mt-0.5">Status, source and additional notes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Lead Status</label>
            <select className="input" value={form.lead_status} onChange={e => set('lead_status', e.target.value)}>
              <option value="">-- Select Status --</option>
              {statuses.map((s: { id: number; lead_status: string }) => (
                <option key={s.id} value={s.lead_status}>{s.lead_status}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Lead Source</label>
            <select className="input" value={form.lead_source} onChange={e => set('lead_source', e.target.value)}>
              <option value="">-- Select Source --</option>
              {sources.map((s: { id: number; lead_source: string }) => (
                <option key={s.id} value={s.lead_source}>{s.lead_source}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Notes</label>
          <textarea className="input resize-none" rows={4}
            value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Additional notes..." />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate('/crm')} className="btn-outline flex-1">Cancel</button>
        <button
          onClick={() => {
            const errors = validateForm(form)
            if (Object.keys(errors).length > 0) {
              setFormErrors(errors)
              return
            }
            setFormErrors({})
            saveMutation.mutate()
          }}
          disabled={!form.phone_number || saveMutation.isPending}
          className="btn-primary flex-1"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update Lead' : 'Create Lead'}
        </button>
      </div>
    </div>
  )
}
