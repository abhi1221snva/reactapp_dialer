import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, User, BarChart2, DollarSign, Landmark, FileText,
  ChevronDown, ChevronUp, Edit3, Check, X, Upload, Eye, EyeOff, Printer, ExternalLink, Clock, AlertCircle
} from 'lucide-react'
import { publicAppService, PublicFormSection, MerchantDocument, PublicDocumentType } from '../../services/publicApp.service'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  navy: '#0f172a', navyMid: '#1e293b', indigo: '#4f46e5', indigoLt: '#e0e7ff', indigoPale: '#f5f3ff',
  slate: '#64748b', slateLt: '#f8fafc', border: '#e2e8f0', white: '#ffffff',
  success: '#10b981', successBg: '#ecfdf5', error: '#ef4444', errorBg: '#fef2f2',
  text: '#1e293b', muted: '#64748b', amber: '#f59e0b', amberBg: '#fffbeb',
  emerald: '#059669',
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'Business Information': <Building2 size={17} />,
  'Owner Information':    <User size={17} />,
  'Business Details':     <BarChart2 size={17} />,
  'Funding Request':      <DollarSign size={17} />,
  'Bank Information':     <Landmark size={17} />,
}


// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  new_lead:     { label: 'New Application',  bg: '#e0e7ff', color: '#4338ca' },
  in_progress:  { label: 'In Progress',      bg: '#fef9c3', color: '#a16207' },
  under_review: { label: 'Under Review',     bg: '#fef3c7', color: '#b45309' },
  approved:     { label: 'Approved',         bg: '#d1fae5', color: '#065f46' },
  funded:       { label: 'Funded! 🎉',       bg: '#bbf7d0', color: '#064e3b' },
  declined:     { label: 'Declined',         bg: '#fee2e2', color: '#991b1b' },
  warm:         { label: 'In Review',        bg: '#fef3c7', color: '#b45309' },
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_MAP[status] ?? { label: status.replace(/_/g, ' '), bg: C.indigoLt, color: C.indigo }
  return (
    <span style={{ background: m.bg, color: m.color, fontWeight: 700, fontSize: 13, padding: '5px 14px', borderRadius: 20, display: 'inline-block', textTransform: 'capitalize' }}>
      {m.label}
    </span>
  )
}

// ─── Field input (shared) ─────────────────────────────────────────────────────
function EditableField({ label, fieldKey, type, value, options, onChange, required }: {
  label: string; fieldKey: string; type: string; value: string; options?: string[]
  onChange: (k: string, v: string) => void; required?: boolean
}) {
  const [show, setShow] = useState(false)
  const base: React.CSSProperties = { width: '100%', padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, color: C.text, background: C.white, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  const input = (() => {
    if (type === 'select') {
      return (
        <select value={value} onChange={e => onChange(fieldKey, e.target.value)}
          style={{ ...base, appearance: 'none', cursor: 'pointer', paddingRight: 36,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: 16 }}>
          <option value="">Select…</option>
          {(options ?? []).map(o => <option key={o}>{o}</option>)}
        </select>
      )
    }
    if (type === 'textarea') return <textarea rows={3} value={value} onChange={e => onChange(fieldKey, e.target.value)} style={{ ...base, resize: 'vertical' }} />
    if (type === 'ssn') return (
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={value} maxLength={11} onChange={e => onChange(fieldKey, e.target.value)} style={{ ...base, paddingRight: 40 }} />
        <button type="button" onClick={() => setShow(x => !x)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 2 }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    )
    const t = { tel: 'tel', email: 'email', date: 'date', number: 'number' }[type] ?? 'text'
    return <input type={t} value={value} onChange={e => onChange(fieldKey, e.target.value)} style={base} />
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}{required && <span style={{ color: C.error }}>*</span>}
      </label>
      {input}
    </div>
  )
}

// ─── Editable section ─────────────────────────────────────────────────────────
interface SectionProps {
  section: PublicFormSection
  fields: Record<string, string>
  token: string
  onSaved: () => void
}

function EditableSection({ section, fields, token, onSaved }: SectionProps) {
  const [open, setOpen]           = useState(false)
  const [editing, setEdit]        = useState(false)
  const [local, setLocal]         = useState<Record<string, string>>({})
  const [savedFields, setSavedFields] = useState<Record<string, string> | null>(null)
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')
  const [ok, setOk]               = useState(false)

  const startEdit = () => {
    const init: Record<string, string> = {}
    section.fields.forEach(f => { init[f.key] = fields[f.key] || '' })
    setLocal(init); setEdit(true); setOpen(true); setErr(''); setOk(false)
  }

  const cancel = () => { setEdit(false); setErr('') }

  const save = async () => {
    setSaving(true); setErr('')
    try {
      await publicAppService.updateMerchant(token, local)
      // Show saved values immediately in display mode — don't wait for refetch
      setSavedFields({ ...local })
      setEdit(false); setOk(true); onSaved()
      setTimeout(() => setOk(false), 3000)
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { message?: string } } }
      setErr(ex?.response?.data?.message || 'Failed to save. Please try again.')
    } finally { setSaving(false) }
  }

  // Display value: prefer just-saved values, then parent query data
  const display = (k: string) => (savedFields ? savedFields[k] : fields[k]) || '—'

  return (
    <div style={{ border: `1.5px solid ${ok ? C.success : C.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color .3s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', background: open ? C.indigoPale : C.white, cursor: 'pointer' }}
        onClick={() => !editing && setOpen(x => !x)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: C.indigoLt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.indigo }}>
            {SECTION_ICONS[section.title] ?? <FileText size={17} />}
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{section.title}</span>
          {ok && <span style={{ color: C.success, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Check size={14} /> Saved</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!editing && (
            <button type="button" onClick={e => { e.stopPropagation(); startEdit() }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', border: `1.5px solid ${C.indigo}`, borderRadius: 8, background: 'transparent', color: C.indigo, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Edit3 size={14} /> Edit
            </button>
          )}
          {open ? <ChevronUp size={18} color={C.muted} /> : <ChevronDown size={18} color={C.muted} />}
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: '22px', borderTop: `1px solid ${C.border}` }}>
          {editing ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16, marginBottom: 20 }}>
                {section.fields.map(f => (
                  <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
                    <EditableField
                      label={f.label} fieldKey={f.key} type={f.type}
                      value={local[f.key] || ''} options={f.options}
                      onChange={(k, v) => setLocal(l => ({ ...l, [k]: v }))}
                      required={f.required}
                    />
                  </div>
                ))}
              </div>
              {err && <div style={{ background: C.errorBg, border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#991b1b', fontSize: 13, marginBottom: 14 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={cancel} style={{ padding: '9px 20px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.text, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <X size={15} /> Cancel
                </button>
                <button type="button" onClick={save} disabled={saving}
                  style={{ padding: '9px 22px', border: 'none', borderRadius: 8, background: saving ? '#a5b4fc' : C.indigo, color: C.white, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? 'Saving…' : <><Check size={15} /> Save Changes</>}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
              {section.fields.map(f => (
                <div key={f.key} style={{ background: C.slateLt, border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 14px', gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
                    {f.type === 'ssn' && display(f.key) !== '—'
                      ? `***-**-${display(f.key).slice(-4)}`
                      : display(f.key)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Document manager ─────────────────────────────────────────────────────────
function DocManager({ token, docs, onUploaded }: { token: string; docs: MerchantDocument[]; onUploaded: () => void }) {
  const [over, setOver]     = useState(false)
  const [docType, setDocType] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data: typeData } = useQuery({
    queryKey: ['public-doc-types', token],
    queryFn: async () => {
      const res = await publicAppService.getDocumentTypes(token)
      return (res.data?.data ?? []) as PublicDocumentType[]
    },
    staleTime: 5 * 60 * 1000,
  })
  const docTypes = typeData ?? []
  const [err, setErr]       = useState('')
  const inp = useRef<HTMLInputElement>(null)
  const fmtSize = (n: number) => n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const upload = async (file: File) => {
    setUploading(true); setErr('')
    try {
      await publicAppService.uploadDocument(token, file, docType)
      onUploaded()
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { message?: string } } }
      setErr(ex?.response?.data?.message || 'Upload failed.')
    } finally { setUploading(false) }
  }

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) upload(f) }

  return (
    <div>
      {/* Existing docs */}
      {docs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navyMid, margin: '0 0 12px' }}>Uploaded Documents</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.slateLt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 16px' }}>
                <FileText size={20} style={{ color: C.indigo, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.filename}</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{d.doc_type} · {fmtDate(d.uploaded)}</p>
                </div>
                <a href={d.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, fontWeight: 500, textDecoration: 'none', flexShrink: 0 }}>
                  <ExternalLink size={14} /> View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload area */}
      <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navyMid, margin: '0 0 12px' }}>Upload Additional Documents</h4>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Document Type</label>
        <select value={docType} onChange={e => setDocType(e.target.value)}
          style={{ padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, background: C.white, width: '100%', cursor: 'pointer', outline: 'none' }}>
          <option value="">— Select type —</option>
          {docTypes.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
        </select>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inp.current?.click()}
        style={{ border: `2px dashed ${over ? C.indigo : C.border}`, borderRadius: 13, background: over ? C.indigoPale : C.slateLt, padding: '36px 24px', textAlign: 'center', cursor: uploading ? 'wait' : 'pointer', transition: 'all .2s' }}>
        {uploading
          ? <><div style={{ width: 32, height: 32, border: `3px solid ${C.indigoLt}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 10px' }} /><p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Uploading…</p></>
          : <><Upload size={32} style={{ color: over ? C.indigo : C.slate, margin: '0 auto 10px', display: 'block' }} /><p style={{ fontWeight: 600, color: over ? C.indigo : C.text, margin: '0 0 4px', fontSize: 15 }}>{over ? 'Drop to upload' : 'Drag & drop or click to upload'}</p><p style={{ color: C.muted, fontSize: 13, margin: 0 }}>PDF, JPG, PNG, DOC, DOCX — max 10 MB</p></>
        }
        <input ref={inp} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {err && <div style={{ marginTop: 10, background: C.errorBg, border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#991b1b', fontSize: 13 }}>{err}</div>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MerchantPage() {
  const { leadToken } = useParams<{ leadToken: string }>()
  const qc = useQueryClient()
  const apiBase = import.meta.env.VITE_API_URL ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: ['merchantPortal', leadToken],
    queryFn: () => publicAppService.getMerchantPortal(leadToken!).then(r => r.data.data),
    enabled: !!leadToken,
    retry: false,
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['merchantPortal', leadToken] })

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: `4px solid ${C.indigoLt}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: C.muted, fontSize: 15 }}>Loading your application…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Application not found or link expired.'
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff', padding: 24 }}>
        <div style={{ background: C.white, borderRadius: 18, padding: '48px 40px', textAlign: 'center', maxWidth: 440, boxShadow: '0 4px 32px rgba(0,0,0,.08)' }}>
          <AlertCircle size={52} color={C.error} style={{ margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>Link Not Found</h2>
          <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>{msg}</p>
        </div>
      </div>
    )
  }

  const { company, lead, sections } = data
  const pdfUrl = `${apiBase}/public/apply/${lead.lead_token}/pdf`
  const sigPath = lead.fields['signature_image']
  const sigUrl  = sigPath ? `${apiBase.replace('/api', '')}/storage/${sigPath}` : null

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f0f4ff,#f8fafc)', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`
        *{box-sizing:border-box}
        input:focus,select:focus,textarea:focus{border-color:#4f46e5!important;box-shadow:0 0 0 3px rgba(79,70,229,.14)!important;outline:none}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <header style={{ background: C.navy, height: 64, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 14px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {company.logo_url
            ? <img src={company.logo_url} alt="logo" style={{ height: 36, borderRadius: 6, objectFit: 'contain', background: C.white, padding: 2 }} />
            : <div style={{ width: 38, height: 38, borderRadius: 9, background: C.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontWeight: 800, fontSize: 17 }}>{(company.company_name || 'F').slice(0, 1)}</div>
          }
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>{company.company_name}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Merchant Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, color: C.white, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <Printer size={15} /> Print PDF
          </a>
        </div>
      </header>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Status hero */}
        <div style={{ background: `linear-gradient(135deg,${C.navy},${C.navyMid})`, borderRadius: 20, padding: '30px 34px', marginBottom: 26, color: C.white, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, boxShadow: '0 4px 28px rgba(15,23,42,.18)' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Application Status</p>
            <StatusBadge status={lead.lead_status} />
            <div style={{ marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} /> Submitted {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              {lead.affiliate_code && (
                <div style={{ fontSize: 13, color: '#cbd5e1' }}>Ref: {lead.affiliate_code}</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 9, color: C.white, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              <Printer size={16} /> Download PDF
            </a>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ background: C.amberBg, border: `1px solid #fde68a`, borderRadius: 12, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#92400e' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          You can edit your application details and upload additional documents below. Changes save instantly.
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {sections.map((sec: PublicFormSection) => (
            <EditableSection key={sec.title} section={sec} fields={lead.fields} token={leadToken!} onSaved={refresh} />
          ))}
        </div>

        {/* Signature */}
        {sigUrl && (
          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 26, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navyMid, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: C.indigoLt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.indigo }}>✍️</div>
              Digital Signature
            </h3>
            <div style={{ background: C.slateLt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: 'inline-block' }}>
              <img src={sigUrl} alt="Signature" style={{ maxHeight: 100, maxWidth: '100%', display: 'block' }} />
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: '10px 0 0' }}>Signature on file — submitted with original application.</p>
          </div>
        )}

        {/* Documents */}
        <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 26 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navyMid, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: C.indigoLt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.indigo }}>
              <FileText size={17} />
            </div>
            Documents
          </h3>
          <DocManager token={leadToken!} docs={lead.documents} onUploaded={refresh} />
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 32 }}>
          Questions?{' '}
          {company.support_email
            ? <a href={`mailto:${company.support_email}`} style={{ color: C.indigo }}>{company.support_email}</a>
            : 'Contact your representative.'}
        </p>
      </div>
    </div>
  )
}
