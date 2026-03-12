import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { publicAppService, type PublicFormSection, type PublicFormField, type MerchantDocument } from '../../services/publicApp.service'
import {
  Loader2, AlertCircle, CheckCircle, Save, Upload, FileText,
  Clock, Building2, User, ChevronDown, ChevronUp, Edit3, X
} from 'lucide-react'

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  new_lead:              'bg-blue-100 text-blue-700',
  in_progress:           'bg-indigo-100 text-indigo-700',
  under_review:          'bg-amber-100 text-amber-700',
  docs_in:               'bg-purple-100 text-purple-700',
  approved:              'bg-emerald-100 text-emerald-700',
  funded:                'bg-green-100 text-green-700',
  declined:              'bg-red-100 text-red-700',
  closed:                'bg-slate-100 text-slate-600',
}

const STATUS_LABELS: Record<string, string> = {
  new_lead:    'New Application',
  in_progress: 'In Progress',
  under_review:'Under Review',
  docs_in:     'Documents Received',
  approved:    'Approved',
  funded:      'Funded',
  declined:    'Declined',
  closed:      'Closed',
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  )
}

// ── Company Header ────────────────────────────────────────────────────────────
function CompanyHeader({ company }: { company: { company_name: string; logo_url: string | null } }) {
  return (
    <div className="flex items-center gap-3 py-4 px-6 bg-white border-b border-slate-200">
      {company.logo_url ? (
        <img src={company.logo_url} alt={company.company_name} className="h-10 object-contain" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
          {company.company_name?.charAt(0) ?? 'M'}
        </div>
      )}
      <div>
        <p className="font-bold text-slate-900">{company.company_name}</p>
        <p className="text-xs text-slate-400">Merchant Application Portal</p>
      </div>
    </div>
  )
}

// ── Editable section ──────────────────────────────────────────────────────────
function EditableSection({
  section, fields, onSave, saving,
}: {
  section: PublicFormSection
  fields: Record<string, string>
  onSave: (data: Record<string, string>) => void
  saving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [localData, setLocalData] = useState<Record<string, string>>(fields)
  const [open, setOpen] = useState(true)
  const Icon = section.title.includes('Business') ? Building2 : User

  function handleSave() {
    onSave(localData)
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Section header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Icon size={15} className="text-indigo-600" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">{section.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {!editing && open && (
            <button
              onClick={e => { e.stopPropagation(); setEditing(true) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
            >
              <Edit3 size={12} />
              Edit
            </button>
          )}
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map((field: PublicFormField) => {
              const value = localData[field.key] ?? fields[field.key] ?? ''
              if (!editing) {
                return (
                  <div key={field.key}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{field.label}</p>
                    <p className="text-sm text-slate-800 font-medium min-h-[20px]">{value || <span className="text-slate-400 italic">—</span>}</p>
                  </div>
                )
              }
              return (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={e => setLocalData(d => ({ ...d, [field.key]: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
              )
            })}
          </div>

          {editing && (
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
              <button
                onClick={() => { setEditing(false); setLocalData(fields) }}
                className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm transition-all"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Document upload ───────────────────────────────────────────────────────────
function DocumentUpload({ token }: { token: string }) {
  const qc = useQueryClient()
  const [docType, setDocType] = useState('general')
  const [file, setFile]       = useState<File | null>(null)
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: () => publicAppService.uploadDocument(token, file!, docType),
    onSuccess: () => {
      setSuccess(true)
      setFile(null)
      qc.invalidateQueries({ queryKey: ['merchant-portal', token] })
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Upload size={15} className="text-emerald-600" />
        </div>
        <h3 className="font-bold text-slate-800 text-sm">Upload Documents</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Document Type</label>
          <select
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={docType}
            onChange={e => setDocType(e.target.value)}
          >
            <option value="bank_statement">Bank Statement</option>
            <option value="drivers_license">Driver's License</option>
            <option value="voided_check">Voided Check</option>
            <option value="tax_return">Tax Return</option>
            <option value="business_license">Business License</option>
            <option value="general">Other Document</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">File</label>
          <div
            className="border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-xl p-6 text-center cursor-pointer transition-colors"
            onClick={() => document.getElementById('merchant-file-input')?.click()}
          >
            <input
              id="merchant-file-input"
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                <FileText size={16} className="text-emerald-600" />
                {file.name}
              </div>
            ) : (
              <div className="text-slate-400 text-sm">
                <Upload size={24} className="mx-auto mb-2 opacity-50" />
                Click to select a file (PDF, JPG, PNG, DOC)
              </div>
            )}
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <CheckCircle size={14} />
            Document uploaded successfully!
          </div>
        )}

        {mutation.isError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <AlertCircle size={14} />
            Upload failed. Please try again.
          </div>
        )}

        <button
          disabled={!file || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
        >
          {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Upload Document
        </button>
      </div>
    </div>
  )
}

// ── Document list ─────────────────────────────────────────────────────────────
function DocumentList({ documents }: { documents: MerchantDocument[] }) {
  if (!documents.length) return null
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
        <FileText size={15} className="text-slate-500" />
        Uploaded Documents ({documents.length})
      </h3>
      <div className="space-y-2">
        {documents.map(doc => (
          <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-indigo-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">{doc.filename}</p>
                <p className="text-xs text-slate-400">{doc.doc_type.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              View
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Merchant Page ────────────────────────────────────────────────────────
export function MerchantPage() {
  const { leadToken = '' } = useParams<{ leadToken: string }>()
  const qc = useQueryClient()
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess]     = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['merchant-portal', leadToken],
    queryFn: async () => {
      const res = await publicAppService.getMerchantPortal(leadToken)
      return res.data.data
    },
    retry: false,
    staleTime: 2 * 60 * 1000,
  })

  const updateMutation = useMutation({
    mutationFn: (formData: Record<string, string>) =>
      publicAppService.updateMerchant(leadToken, formData),
    onSuccess: () => {
      setSaveSuccess(true)
      qc.invalidateQueries({ queryKey: ['merchant-portal', leadToken] })
      setTimeout(() => setSaveSuccess(false), 3000)
    },
    onSettled: () => setSavingSection(null),
  })

  function handleSaveSection(sectionTitle: string, sectionData: Record<string, string>) {
    setSavingSection(sectionTitle)
    updateMutation.mutate(sectionData)
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="text-indigo-500 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Loading your application…</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !data) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'This merchant link is invalid or has expired.'
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-10 max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Portal Not Found</h2>
          <p className="text-slate-500 text-sm">{msg}</p>
        </div>
      </div>
    )
  }

  const { company, lead, sections } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="sticky top-0 z-10 shadow-sm">
        <CompanyHeader company={company} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Application status card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide mb-1">Application Status</p>
              <h2 className="text-xl font-bold mb-3">
                {lead.fields['first_name'] || lead.fields['legal_company_name'] || 'Your Application'}
              </h2>
              <StatusBadge status={lead.lead_status} />
            </div>
            <div className="text-right text-indigo-200 text-xs">
              <p className="flex items-center gap-1 justify-end"><Clock size={11} /> Submitted</p>
              <p className="font-medium text-white mt-0.5">
                {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Global save success */}
        {saveSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle size={15} />
            Changes saved successfully!
          </div>
        )}

        {/* Editable sections */}
        {sections.map(section => (
          <EditableSection
            key={section.title}
            section={section}
            fields={lead.fields}
            onSave={(d) => handleSaveSection(section.title, d)}
            saving={savingSection === section.title && updateMutation.isPending}
          />
        ))}

        {/* Documents */}
        <DocumentList documents={lead.documents} />
        <DocumentUpload token={leadToken} />
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-slate-400">
        {company.company_name} · Merchant Application Portal · Powered by RocketDialer CRM
      </div>
    </div>
  )
}
