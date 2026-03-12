import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Save, Loader2, Globe, Mail, Building2, Link2, Copy, Check,
  ExternalLink, AlertCircle, Zap, ShieldCheck, Sparkles, ArrowUpRight,
  Phone, MapPin, Upload, Trash2, ImageIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCrmHeader } from '../../layouts/CrmLayout'
import api from '../../api/axios'

interface CompanySettings {
  id: number | null
  company_name: string
  company_email: string
  company_phone: string
  company_address: string
  state: string
  city: string
  zipcode: string
  company_domain: string
  logo: string | null
  logo_url: string | null
  website_url: string | null
  support_email: string | null
  affiliate_url_example: string | null
  merchant_url_example: string | null
}

type FormState = {
  company_name: string
  company_email: string
  company_phone: string
  company_address: string
  state: string
  city: string
  zipcode: string
  company_domain: string
}

const settingsApi = {
  get: () => api.get<{ success: boolean; data: CompanySettings }>('/crm/company-settings'),
  update: (payload: Partial<FormState>) =>
    api.put<{ success: boolean; message: string }>('/crm/company-settings', payload),
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all border
        ${copied
          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
        }`}
    >
      {copied ? <Check size={10} strokeWidth={3} /> : <Copy size={10} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Logo Upload Card ──────────────────────────────────────────────────────────
function LogoUploadCard({ logoUrl, onChanged }: { logoUrl: string | null; onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(logoUrl)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Keep preview in sync when server data changes
  useEffect(() => { setPreview(logoUrl) }, [logoUrl])

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return }

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      await api.post('/crm/company-settings/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Logo uploaded!')
      onChanged()
    } catch {
      toast.error('Upload failed')
      setPreview(logoUrl) // revert preview
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!preview) return
    setDeleting(true)
    try {
      await api.delete('/crm/company-settings/logo')
      setPreview(null)
      toast.success('Logo removed')
      onChanged()
    } catch {
      toast.error('Failed to remove logo')
    } finally {
      setDeleting(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
          <ImageIcon size={15} className="text-amber-600" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">Company Logo</p>
          <p className="text-slate-400 text-xs">Shown on application forms &amp; PDF documents</p>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-5">

          {/* Preview box */}
          <div
            className="flex-shrink-0 w-28 h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50
              flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/40 transition-all group"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            {preview ? (
              <img src={preview} alt="Company Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-slate-300 group-hover:text-emerald-400 transition-colors">
                <ImageIcon size={28} />
                <span className="text-[10px] font-medium">Click to upload</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-1 space-y-3">
            {/* Drop zone text */}
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer
                hover:border-emerald-300 hover:bg-emerald-50/40 transition-all"
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs font-medium">Uploading…</span>
                </div>
              ) : (
                <>
                  <Upload size={16} className="mx-auto mb-1.5 text-slate-400" />
                  <p className="text-xs font-medium text-slate-600">Drag &amp; drop or <span className="text-emerald-600 underline">browse</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, GIF, WEBP, SVG — max 2 MB</p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40
                  text-white text-xs font-semibold rounded-lg transition-all"
              >
                <Upload size={11} />
                {preview ? 'Replace Logo' : 'Upload Logo'}
              </button>

              {preview && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-40
                    text-red-600 text-xs font-semibold rounded-lg border border-red-100 transition-all"
                >
                  {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />
      </div>
    </div>
  )
}

const EMPTY_FORM: FormState = {
  company_name: '',
  company_email: '',
  company_phone: '',
  company_address: '',
  state: '',
  city: '',
  zipcode: '',
  company_domain: '',
}

export function CrmCompanySettings() {
  useCrmHeader()
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const res = await settingsApi.get()
      return res.data.data
    },
  })

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [initialized, setInitialized] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data && !initialized) {
      setForm({
        company_name:    data.company_name    ?? '',
        company_email:   data.company_email   ?? data.support_email ?? '',
        company_phone:   data.company_phone   ?? '',
        company_address: data.company_address ?? '',
        state:           data.state           ?? '',
        city:            data.city            ?? '',
        zipcode:         data.zipcode         ?? '',
        company_domain:  data.company_domain  ?? data.website_url ?? '',
      })
      setInitialized(true)
    }
  }, [data, initialized])

  function handleChange(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setDirty(true)
  }

  const mutation = useMutation({
    mutationFn: () => settingsApi.update(form),
    onSuccess: () => {
      toast.success('Settings saved!')
      qc.invalidateQueries({ queryKey: ['company-settings'] })
      setInitialized(false)
      setDirty(false)
    },
    onError: () => toast.error('Failed to save settings'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-emerald-600" />
          </div>
          <p className="text-sm text-slate-400">Loading settings…</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4 max-w-lg">
        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle size={16} className="text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-red-800 text-sm">Failed to load settings</p>
          <p className="text-red-400 text-xs mt-0.5">Please refresh the page.</p>
        </div>
      </div>
    )
  }

  const checklist = [
    { label: 'Company name',       done: !!form.company_name    },
    { label: 'Application domain', done: !!form.company_domain  },
    { label: 'Support email',      done: !!form.company_email   },
    { label: 'Phone number',       done: !!form.company_phone   },
    { label: 'Address',            done: !!form.company_address },
  ]
  const allDone = checklist.every(c => c.done)

  const domain = form.company_domain || data?.website_url || ''

  return (
    <div className="space-y-5">

      {/* ── Summary banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {data?.logo_url ? (
              <div className="w-14 h-14 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden">
                <img src={data.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center">
                <Building2 size={24} className="text-white/70" />
              </div>
            )}
            <div>
              <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-0.5">Company Profile</p>
              <h2 className="text-xl font-bold text-white">{form.company_name || 'Your Company'}</h2>
              <p className="text-emerald-200 text-sm mt-0.5">{domain || 'No domain configured'}</p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col gap-1.5">
            {checklist.slice(0, 3).map(c => (
              <div key={c.label} className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border transition-all
                ${c.done ? 'bg-white/15 border-white/25 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.done ? 'bg-emerald-300' : 'bg-white/20'}`} />
                {c.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two-column content ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Form (2 cols) ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Card: Basic Info ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Building2 size={15} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Company Information</p>
                <p className="text-slate-400 text-xs">Basic details used across the platform</p>
              </div>
            </div>

            <div className="p-6 space-y-5">

              {/* Company Name */}
              <div>
                <label className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-700">Company Name</span>
                  {form.company_name && <Check size={11} className="text-emerald-500" strokeWidth={3} />}
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={e => handleChange('company_name', e.target.value)}
                    placeholder="e.g. Fund My Biz LLC"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white
                      text-slate-800 font-medium placeholder:text-slate-300 transition-all"
                  />
                </div>
              </div>

              {/* Email + Phone in a row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">Support Email</span>
                    {form.company_email && <Check size={11} className="text-emerald-500" strokeWidth={3} />}
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={form.company_email}
                      onChange={e => handleChange('company_email', e.target.value)}
                      placeholder="funding@yourdomain.com"
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50
                        focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white
                        text-slate-800 placeholder:text-slate-300 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">Company Phone</span>
                    {form.company_phone && <Check size={11} className="text-emerald-500" strokeWidth={3} />}
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={form.company_phone}
                      onChange={e => handleChange('company_phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50
                        focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white
                        text-slate-800 placeholder:text-slate-300 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Street Address
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={form.company_address}
                    onChange={e => handleChange('company_address', e.target.value)}
                    placeholder="123 Main St, Suite 100"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white
                      text-slate-800 placeholder:text-slate-300 transition-all"
                  />
                </div>
              </div>

              {/* City / State / Zip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => handleChange('city', e.target.value)}
                    placeholder="New York"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white
                      text-slate-800 placeholder:text-slate-300 transition-all"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={e => handleChange('state', e.target.value)}
                    placeholder="NY"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white
                      text-slate-800 placeholder:text-slate-300 transition-all"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Zip Code</label>
                  <input
                    type="text"
                    value={form.zipcode}
                    onChange={e => handleChange('zipcode', e.target.value)}
                    placeholder="10001"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white
                      text-slate-800 placeholder:text-slate-300 transition-all"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ── Card: Logo ───────────────────────────────────────────── */}
          <LogoUploadCard logoUrl={data?.logo_url ?? null} onChanged={() => qc.invalidateQueries({ queryKey: ['company-settings'] })} />

          {/* ── Card: Domain ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Globe size={15} className="text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Application Domain</p>
                <p className="text-slate-400 text-xs">Controls affiliate &amp; merchant link URLs</p>
              </div>
            </div>

            <div className="p-6">
              <div className="relative">
                <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="url"
                  value={form.company_domain}
                  onChange={e => handleChange('company_domain', e.target.value)}
                  placeholder="https://crm.yourdomain.com"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white
                    text-slate-800 font-mono placeholder:text-slate-300 transition-all"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <Zap size={10} className="text-amber-400 flex-shrink-0" />
                Changes take effect immediately — all affiliate &amp; merchant links update automatically
              </p>

              {form.company_domain && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <Link2 size={10} className="text-emerald-500 flex-shrink-0" />
                    <span className="flex-1 text-[10px] font-mono text-slate-500 truncate">
                      {form.company_domain.replace(/\/$/, '')}/apply/&#123;code&#125;
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                    <ExternalLink size={10} className="text-indigo-500 flex-shrink-0" />
                    <span className="flex-1 text-[10px] font-mono text-slate-500 truncate">
                      {form.company_domain.replace(/\/$/, '')}/merchant/&#123;token&#125;
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Save footer ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-6 py-4">
            <span className={`text-xs font-medium flex items-center gap-1.5 transition-opacity ${dirty ? 'opacity-100' : 'opacity-0'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-600">Unsaved changes</span>
            </span>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !dirty}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              {mutation.isPending
                ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                : <><Save size={13} /> Save Settings</>
              }
            </button>
          </div>
        </div>

        {/* ── Right: Info panel (1 col) ──────────────────────────────── */}
        <div className="space-y-5">

          {/* Setup checklist */}
          <div className="bg-slate-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={13} className="text-amber-400" />
              <p className="text-sm font-bold text-white">Setup Checklist</p>
            </div>
            <div className="space-y-3">
              {checklist.map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                    ${c.done ? 'bg-emerald-500' : 'bg-white/10 border border-white/20'}`}>
                    {c.done && <Check size={9} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className={`text-sm transition-colors ${c.done ? 'text-white font-medium' : 'text-white/35'}`}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
            {allDone && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                <Sparkles size={12} className="text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-emerald-300 font-semibold">All set — you're good to go!</span>
              </div>
            )}
          </div>

          {/* Generated links */}
          {(data?.affiliate_url_example || data?.merchant_url_example) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Sparkles size={14} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Generated Links</p>
                  <p className="text-slate-400 text-xs">Live from your domain</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {data?.affiliate_url_example && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Link2 size={11} className="text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Affiliate Apply</span>
                      </div>
                      <a href={data.affiliate_url_example} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-500 transition-colors">
                        <ArrowUpRight size={12} />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-100 px-2.5 py-1.5">
                      <p className="flex-1 text-[10px] font-mono text-slate-500 truncate">{data.affiliate_url_example}</p>
                      <CopyBtn text={data.affiliate_url_example} />
                    </div>
                  </div>
                )}

                {data?.merchant_url_example && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <ExternalLink size={11} className="text-indigo-600" />
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Merchant Portal</span>
                      </div>
                      <a href={data.merchant_url_example} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-500 transition-colors">
                        <ArrowUpRight size={12} />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-indigo-100 px-2.5 py-1.5">
                      <p className="flex-1 text-[10px] font-mono text-slate-500 truncate">{data.merchant_url_example}</p>
                      <CopyBtn text={data.merchant_url_example} />
                    </div>
                  </div>
                )}

                {form.company_domain && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700">
                      <p className="font-bold mb-0.5">DNS setup required</p>
                      <p>Point <span className="font-mono bg-amber-100 px-1 rounded text-[10px]">{form.company_domain.replace(/^https?:\/\//, '')}</span> to your frontend server.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PDF Placeholders info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                <ShieldCheck size={14} className="text-purple-600" />
              </div>
              <p className="font-bold text-slate-800 text-sm">PDF Placeholders</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Company details are available in PDF templates as <code className="bg-slate-100 px-1 rounded text-[10px]">[office_*]</code> placeholders.
            </p>
            <div className="space-y-1.5">
              {[
                ['office_name',    'Company name'],
                ['office_email',   'Support email'],
                ['office_phone',   'Company phone'],
                ['office_address', 'Street address'],
                ['office_city',    'City'],
                ['office_state',   'State'],
                ['office_zip',     'Zip code'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-purple-50 border border-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                    [{key}]
                  </span>
                  <span className="text-[11px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
