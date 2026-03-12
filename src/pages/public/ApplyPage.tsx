import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { publicAppService, type PublicFormSection, type PublicFormField } from '../../services/publicApp.service'
import { CheckCircle, ChevronRight, ChevronLeft, Loader2, AlertCircle, Copy, ExternalLink, Building2, User, Phone, DollarSign } from 'lucide-react'

// ── Section icon map ──────────────────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ElementType> = {
  'Business Information': Building2,
  'Owner Information': User,
  'Contact Information': Phone,
  'Funding Request': DollarSign,
}

// ── Company Header ────────────────────────────────────────────────────────────
function CompanyHeader({ company }: { company: { company_name: string; logo_url: string | null; support_email: string | null } }) {
  return (
    <div className="flex items-center justify-between py-4 px-6 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3">
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.company_name} className="h-10 object-contain" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
            {company.company_name?.charAt(0) ?? 'A'}
          </div>
        )}
        <span className="font-bold text-slate-900 text-lg">{company.company_name}</span>
      </div>
      {company.support_email && (
        <a href={`mailto:${company.support_email}`} className="text-xs text-slate-500 hover:text-emerald-600 transition-colors">
          {company.support_email}
        </a>
      )}
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ sections, currentStep }: { sections: PublicFormSection[]; currentStep: number }) {
  return (
    <div className="px-6 py-5 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center gap-2 max-w-2xl mx-auto">
        {sections.map((s, i) => {
          const Icon = SECTION_ICONS[s.title] ?? Building2
          const done    = i < currentStep
          const active  = i === currentStep
          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  done   ? 'bg-emerald-500 border-emerald-500 text-white' :
                  active ? 'bg-white border-emerald-500 text-emerald-600' :
                           'bg-white border-slate-300 text-slate-400'
                }`}>
                  {done ? <CheckCircle size={16} /> : <Icon size={16} />}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-emerald-700' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {s.title.split(' ')[0]}
                </span>
              </div>
              {i < sections.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded transition-all ${i < currentStep ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Single field renderer ─────────────────────────────────────────────────────
function FieldInput({ field, value, onChange }: {
  field: PublicFormField
  value: string
  onChange: (v: string) => void
}) {
  const base = 'w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all bg-white'

  if (field.type === 'select' && field.options?.length) {
    return (
      <select className={base} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select {field.label}</option>
        {field.options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${base} resize-none`}
        rows={3}
        value={value}
        placeholder={field.placeholder || `Enter ${field.label}`}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  return (
    <input
      type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'number' ? 'text' : 'text'}
      className={base}
      value={value}
      placeholder={field.placeholder || `Enter ${field.label}`}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Section form ──────────────────────────────────────────────────────────────
function SectionForm({ section, formData, onChange }: {
  section: PublicFormSection
  formData: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  const Icon = SECTION_ICONS[section.title] ?? Building2
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Icon size={18} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">{section.title}</h3>
          <p className="text-xs text-slate-500">Please fill in all required fields</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {section.fields.map(field => (
          <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <FieldInput
              field={field}
              value={formData[field.key] ?? ''}
              onChange={v => onChange(field.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ merchantUrl, companyName }: { merchantUrl: string; companyName: string }) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(merchantUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
        <CheckCircle size={40} className="text-emerald-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
        <p className="text-slate-600 max-w-sm">
          Thank you for applying with <strong>{companyName}</strong>. Your application is under review.
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Your Merchant Portal Link</p>
        <p className="text-xs text-slate-500">Save this link to view or update your application anytime — no login required.</p>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
          <span className="flex-1 text-xs text-slate-600 truncate font-mono">{merchantUrl}</span>
          <button onClick={copyLink} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
            {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <a
          href={merchantUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <ExternalLink size={14} />
          Open My Portal
        </a>
      </div>
    </div>
  )
}

// ── Main Apply Page ───────────────────────────────────────────────────────────
export function ApplyPage() {
  const { affiliateCode = '' } = useParams<{ affiliateCode: string }>()
  const [step, setStep]         = useState(0)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [merchantUrl, setMerchantUrl] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-apply', affiliateCode],
    queryFn: async () => {
      const res = await publicAppService.getApplyForm(affiliateCode)
      return res.data.data
    },
    retry: false,
    staleTime: 10 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: () => publicAppService.submitApplication(affiliateCode, formData),
    onSuccess: (res) => {
      const url = res.data.merchant_url ?? (res.data as unknown as { data?: { merchant_url?: string } }).data?.merchant_url ?? ''
      setMerchantUrl(url)
    },
  })

  function setField(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  function validateStep(section: PublicFormSection): string | null {
    for (const field of section.fields) {
      if (field.required && !formData[field.key]?.trim()) {
        return `${field.label} is required`
      }
    }
    return null
  }

  function handleNext() {
    if (!data) return
    const err = validateStep(data.sections[step])
    if (err) {
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 right-4 z-50 bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in'
      toast.textContent = err
      document.body.appendChild(toast)
      setTimeout(() => document.body.removeChild(toast), 3000)
      return
    }
    if (step < data.sections.length - 1) {
      setStep(s => s + 1)
      window.scrollTo(0, 0)
    } else {
      mutation.mutate()
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="text-emerald-500 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Loading application form…</p>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError || !data) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'This application link is invalid or has expired.'
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-10 max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Link Not Found</h2>
          <p className="text-slate-500 text-sm">{msg}</p>
        </div>
      </div>
    )
  }

  const { company, sections, affiliate_user } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 shadow-sm">
        <CompanyHeader company={company} />
        {!merchantUrl && <ProgressBar sections={sections} currentStep={step} />}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        {step === 0 && !merchantUrl && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Apply for Business Funding</h1>
            <p className="text-slate-500">
              Referred by <strong className="text-emerald-700">{affiliate_user.name}</strong> ·{' '}
              {sections.reduce((n, s) => n + s.fields.length, 0)} fields · Takes ~5 minutes
            </p>
          </div>
        )}

        {/* Success screen */}
        {merchantUrl ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <SuccessScreen merchantUrl={merchantUrl} companyName={company.company_name} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Form body */}
            <div className="p-6 sm:p-8">
              {mutation.isError && (
                <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle size={16} />
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Submission failed. Please try again.'}
                </div>
              )}

              <SectionForm
                section={sections[step]}
                formData={formData}
                onChange={setField}
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => { setStep(s => s - 1); window.scrollTo(0, 0) }}
                disabled={step === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium text-sm"
              >
                <ChevronLeft size={16} />
                Back
              </button>

              <span className="text-xs text-slate-400">Step {step + 1} of {sections.length}</span>

              <button
                onClick={handleNext}
                disabled={mutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-sm"
              >
                {mutation.isPending ? (
                  <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                ) : step < sections.length - 1 ? (
                  <>Next <ChevronRight size={16} /></>
                ) : (
                  <>Submit Application <CheckCircle size={15} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-slate-400">
        {company.company_name} · Powered by RocketDialer CRM
        {company.support_email && (
          <> · <a href={`mailto:${company.support_email}`} className="hover:text-slate-600">{company.support_email}</a></>
        )}
      </div>
    </div>
  )
}
