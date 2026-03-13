import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, User, BarChart2, DollarSign, Landmark, PenLine, FileText,
  ChevronLeft, ChevronRight, Check, Eye, EyeOff, Upload, X, Copy, ExternalLink, Printer, Lock, Shield
} from 'lucide-react'
import { publicAppService, PublicFormSection, PublicCompany, SubmitResult } from '../../services/publicApp.service'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  navy: '#0f172a', navyMid: '#1e293b', indigo: '#4f46e5', indigoHov: '#4338ca',
  indigoLt: '#e0e7ff', indigoPale: '#f5f3ff', slate: '#64748b', slateLt: '#f8fafc',
  border: '#e2e8f0', white: '#ffffff', success: '#10b981', successBg: '#ecfdf5',
  error: '#ef4444', errorBg: '#fef2f2', text: '#1e293b', muted: '#64748b',
}

// ─── Step icons ───────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ReactNode> = {
  'Business Information': <Building2 size={18} />,
  'Owner Information':    <User size={18} />,
  'Business Details':     <BarChart2 size={18} />,
  'Funding Request':      <DollarSign size={18} />,
  'Bank Information':     <Landmark size={18} />,
  'Digital Signature':    <PenLine size={18} />,
  'Documents':            <FileText size={18} />,
}

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
]

const DOC_TYPES = ['Bank Statement','Driver License','Business License','Tax Return','Voided Check','Profit & Loss','Other']

// ─── Field ────────────────────────────────────────────────────────────────────
interface FieldDef { key: string; label: string; type: string; required: boolean; placeholder?: string; options?: string[] }

function FieldInput({ f, val, onChange, err }: { f: FieldDef; val: string; onChange: (k: string, v: string) => void; err: boolean }) {
  const [show, setShow] = useState(false)
  const s: React.CSSProperties = {
    width: '100%', padding: '13px 16px', border: `1.5px solid ${err ? C.error : C.border}`,
    borderRadius: 10, fontSize: 15, color: C.text, background: C.white, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s',
  }

  if (f.type === 'select') {
    const opts = f.options?.length ? f.options : f.key.toLowerCase().includes('state') ? US_STATES : []
    return (
      <select value={val} onChange={e => onChange(f.key, e.target.value)}
        style={{ ...s, appearance: 'none', cursor: 'pointer', paddingRight: 40,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: 18 }}>
        <option value="">Select…</option>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    )
  }
  if (f.type === 'textarea') {
    return <textarea rows={4} value={val} placeholder={f.placeholder} onChange={e => onChange(f.key, e.target.value)}
      style={{ ...s, resize: 'vertical', minHeight: 100 }} />
  }
  if (f.type === 'ssn') {
    return (
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={val} maxLength={11} placeholder="•••–••–••••"
          onChange={e => onChange(f.key, e.target.value)}
          style={{ ...s, paddingRight: 46, letterSpacing: show ? 'normal' : 3 }} />
        <button type="button" onClick={() => setShow(x => !x)}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, display: 'flex' }}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    )
  }
  const t = { tel: 'tel', email: 'email', date: 'date', number: 'number' }[f.type] ?? 'text'
  return <input type={t} value={val} placeholder={f.placeholder} onChange={e => onChange(f.key, e.target.value)} style={s} />
}

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({ onSave, saved }: { onSave: (d: string) => void; saved: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const pt = (e: MouseEvent | TouchEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return 'touches' in e
      ? { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top }
      : { x: (e as MouseEvent).clientX - r.left, y: (e as MouseEvent).clientY - r.top }
  }

  const start = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault(); drawing.current = true
    const p = pt(e); last.current = p
    const ctx = ref.current!.getContext('2d')!
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
    ctx.fillStyle = '#1e293b'; ctx.fill()
  }, [])

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    if (!drawing.current || !last.current) return
    const p = pt(e)
    const ctx = ref.current!.getContext('2d')!
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.stroke(); last.current = p
  }, [])

  const stop = useCallback(() => { drawing.current = false; last.current = null }, [])

  useEffect(() => {
    const c = ref.current!
    c.addEventListener('mousedown', start); c.addEventListener('mousemove', draw)
    c.addEventListener('mouseup', stop); c.addEventListener('mouseleave', stop)
    c.addEventListener('touchstart', start, { passive: false })
    c.addEventListener('touchmove', draw, { passive: false })
    c.addEventListener('touchend', stop)
    return () => {
      c.removeEventListener('mousedown', start); c.removeEventListener('mousemove', draw)
      c.removeEventListener('mouseup', stop); c.removeEventListener('mouseleave', stop)
      c.removeEventListener('touchstart', start); c.removeEventListener('touchmove', draw)
      c.removeEventListener('touchend', stop)
    }
  }, [start, draw, stop])

  const clear = () => { const c = ref.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height) }

  return (
    <div>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>
        Sign using your mouse or finger. Your signature will be attached to the application.
      </p>
      <div style={{ border: `2px dashed ${saved ? C.success : C.indigo}`, borderRadius: 14, overflow: 'hidden', background: '#fafbff', position: 'relative' }}>
        <canvas ref={ref} width={700} height={220}
          style={{ display: 'block', width: '100%', height: 220, cursor: 'crosshair', touchAction: 'none' }} />
        {!saved && (
          <span style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', color: '#c7d2e8', fontSize: 13, fontStyle: 'italic', pointerEvents: 'none' }}>
            Sign here
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button type="button" onClick={clear}
          style={{ flex: 1, padding: '11px 0', border: `1.5px solid ${C.border}`, borderRadius: 9, background: C.white, color: C.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Clear
        </button>
        <button type="button" onClick={() => onSave(ref.current!.toDataURL('image/png'))}
          style={{ flex: 2, padding: '11px 0', border: 'none', borderRadius: 9, background: saved ? C.success : C.indigo, color: C.white, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {saved ? '✓ Signature Saved' : 'Save Signature'}
        </button>
      </div>
      {saved && (
        <p style={{ color: C.success, fontSize: 13, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={15} /> Signature captured successfully
        </p>
      )}
    </div>
  )
}

// ─── Document Upload ──────────────────────────────────────────────────────────
interface UploadFile { id: string; file: File; docType: string }

function DocUpload({ files, onChange }: { files: UploadFile[]; onChange: (f: UploadFile[]) => void }) {
  const [over, setOver] = useState(false)
  const inp = useRef<HTMLInputElement>(null)

  const add = (fs: File[]) => onChange([...files, ...fs.map(f => ({ id: Math.random().toString(36).slice(2), file: f, docType: 'Bank Statement' }))])
  const fmtSize = (n: number) => n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`

  return (
    <div>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>
        Upload supporting documents (PDF, JPG, PNG, DOC, DOCX — max 10 MB each). You can also upload more documents after submission.
      </p>
      <div
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files)) }}
        onClick={() => inp.current?.click()}
        style={{ border: `2px dashed ${over ? C.indigo : C.border}`, borderRadius: 14, background: over ? C.indigoPale : C.slateLt, padding: '44px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }}>
        <Upload size={36} style={{ color: over ? C.indigo : C.slate, margin: '0 auto 10px', display: 'block' }} />
        <p style={{ fontWeight: 700, fontSize: 15, color: over ? C.indigo : C.text, margin: '0 0 4px' }}>
          {over ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>or click to browse</p>
        <input ref={inp} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }}
          onChange={e => e.target.files && add(Array.from(e.target.files))} />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {files.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.slateLt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
              <FileText size={20} style={{ color: C.indigo, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{fmtSize(f.file.size)}</p>
              </div>
              <select value={f.docType} onChange={e => onChange(files.map(x => x.id === f.id ? { ...x, docType: e.target.value } : x))}
                style={{ fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <button type="button" onClick={() => onChange(files.filter(x => x.id !== f.id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ steps, cur, onGo }: { steps: string[]; cur: number; onGo: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 2 }}>
      {steps.map((s, i) => {
        const done = i < cur; const active = i === cur
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <button type="button" onClick={() => done && onGo(i)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: done ? 'pointer' : 'default', padding: '0 4px', flexShrink: 0 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? C.success : active ? C.indigo : C.border,
                color: done || active ? C.white : C.muted, fontWeight: 700, fontSize: 13, transition: 'all .2s',
                boxShadow: active ? `0 0 0 4px ${C.indigoLt}` : 'none',
              }}>
                {done ? <Check size={17} strokeWidth={2.5} /> : (ICONS[s] ?? <span>{i + 1}</span>)}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: done ? C.success : active ? C.indigo : C.muted, whiteSpace: 'nowrap', maxWidth: 72, textAlign: 'center', lineHeight: 1.2 }}>
                {s}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < cur ? C.success : C.border, margin: '0 2px 18px', minWidth: 6, transition: 'background .3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ res, company, apiBase }: { res: SubmitResult; company: PublicCompany | null; apiBase: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { await navigator.clipboard.writeText(res.merchant_url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const pdfUrl = `${apiBase}/public/apply/${res.lead_token}/pdf`

  return (
    <div style={{ textAlign: 'center', padding: '56px 32px' }}>
      <div style={{ width: 88, height: 88, borderRadius: '50%', background: C.successBg, border: `2px solid ${C.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <Check size={40} color={C.success} strokeWidth={2.5} />
      </div>
      <h2 style={{ fontSize: 30, fontWeight: 800, color: C.text, margin: '0 0 10px' }}>Application Submitted!</h2>
      <p style={{ fontSize: 16, color: C.muted, maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.7 }}>
        Your funding application has been received. Save the link below to track your application status and upload additional documents at any time.
      </p>

      <div style={{ background: C.slateLt, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '22px 26px', maxWidth: 580, margin: '0 auto 24px', textAlign: 'left' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Your Merchant Portal Link</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 14, wordBreak: 'break-all' }}>
            {res.merchant_url}
          </div>
          <button onClick={copy}
            style={{ padding: '10px 18px', border: 'none', borderRadius: 8, background: copied ? C.success : C.navyMid, color: C.white, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0' }}>
          Save this link — it's your unique access to view and update your application.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={res.merchant_url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 26px', background: C.indigo, color: C.white, borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 16px rgba(79,70,229,.3)' }}>
          <ExternalLink size={17} /> Open My Portal
        </a>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 26px', background: C.white, color: C.text, border: `1.5px solid ${C.border}`, borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
          <Printer size={17} /> Print / Save PDF
        </a>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ApplyPage() {
  const { affiliateCode } = useParams<{ affiliateCode: string }>()
  const apiBase = import.meta.env.VITE_API_URL ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: ['applyForm', affiliateCode],
    queryFn: () => publicAppService.getApplyForm(affiliateCode!).then(r => r.data.data),
    enabled: !!affiliateCode,
    retry: false,
  })

  const company: PublicCompany | null = data?.company ?? null
  const sections: PublicFormSection[] = data?.sections ?? []

  const [step, setStep]       = useState(0)
  const [form, setForm]       = useState<Record<string, string>>({})
  const [errs, setErrs]       = useState<Record<string, boolean>>({})
  const [sig, setSig]         = useState('')
  const [sigSaved, setSigSaved] = useState(false)
  const [docs, setDocs]       = useState<UploadFile[]>([])
  const [submitting, setSub]  = useState(false)
  const [subErr, setSubErr]   = useState('')
  const [result, setResult]   = useState<SubmitResult | null>(null)

  const allSteps = [...sections.map(s => s.title), 'Digital Signature', 'Documents']
  const isSig    = step === sections.length
  const isDoc    = step === sections.length + 1
  const isLast   = step === allSteps.length - 1
  const progress = allSteps.length > 0 ? Math.round((step / allSteps.length) * 100) : 0

  const change = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errs[k]) setErrs(e => { const n = { ...e }; delete n[k]; return n })
  }

  const validate = () => {
    if (step >= sections.length) return true
    const sec = sections[step]
    const ne: Record<string, boolean> = {}
    sec.fields.forEach(f => { if (f.required && !form[f.key]?.trim()) ne[f.key] = true })
    setErrs(ne)
    return !Object.keys(ne).length
  }

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, allSteps.length - 1)) }
  const prev = () => setStep(s => Math.max(s - 1, 0))

  const submit = async () => {
    setSubErr(''); setSub(true)
    try {
      const payload = { ...form }
      if (sig) payload['signature_image'] = sig

      const res = await publicAppService.submitApplication(affiliateCode!, payload)
      // backend returns flat shape (not nested data)
      const out = (res.data as unknown as SubmitResult).lead_token
        ? (res.data as unknown as SubmitResult)
        : (res.data as { data: SubmitResult }).data

      if (docs.length && out.lead_token) {
        for (const d of docs) {
          try { await publicAppService.uploadDocument(out.lead_token, d.file, d.docType) } catch { /* non-fatal */ }
        }
      }
      setResult(out)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setSubErr(err?.response?.data?.message || 'Submission failed. Please try again.')
    } finally { setSub(false) }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: `4px solid ${C.indigoLt}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: C.muted, fontSize: 15 }}>Loading application form…</p>
        </div>
      </div>
    )
  }

  if (error) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Application link not found or expired.'
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff', padding: 24 }}>
        <div style={{ background: C.white, borderRadius: 18, padding: '48px 40px', textAlign: 'center', maxWidth: 440, boxShadow: '0 4px 32px rgba(0,0,0,.08)' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔗</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>Link Not Found</h2>
          <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>{msg}</p>
        </div>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0f4ff,#fafafe)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: C.navy, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 14 }}>
          {company?.logo_url && <img src={company.logo_url} alt="logo" style={{ height: 36, borderRadius: 6 }} />}
          <span style={{ color: C.white, fontWeight: 700, fontSize: 18 }}>{company?.company_name}</span>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: C.white, borderRadius: 22, boxShadow: '0 8px 48px rgba(0,0,0,.08)', maxWidth: 700, width: '100%' }}>
            <SuccessScreen res={result} company={company} apiBase={apiBase} />
          </div>
        </div>
        {company?.support_email && (
          <footer style={{ textAlign: 'center', padding: '14px 24px', color: C.muted, fontSize: 12 }}>
            Questions? Email {company.support_email}
          </footer>
        )}
      </div>
    )
  }

  const curSec = sections[step]

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f0f4ff,#f8fafc)', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`
        *{box-sizing:border-box}
        input:focus,select:focus,textarea:focus{border-color:#4f46e5!important;box-shadow:0 0 0 3px rgba(79,70,229,.14)!important;outline:none}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        @media(max-width:580px){.fgrid{grid-template-columns:1fr!important}}
      `}</style>

      {/* Header */}
      <header style={{ background: C.navy, height: 64, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 99, boxShadow: '0 2px 14px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {company?.logo_url
            ? <img src={company.logo_url} alt="logo" style={{ height: 36, borderRadius: 6, objectFit: 'contain', background: C.white, padding: 2 }} />
            : <div style={{ width: 38, height: 38, borderRadius: 9, background: C.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontWeight: 800, fontSize: 17 }}>
                {(company?.company_name || 'F').slice(0, 1)}
              </div>
          }
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>{company?.company_name}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Funding Application</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {company?.support_email && (
            <a href={`mailto:${company.support_email}`} style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              {company.support_email}
            </a>
          )}
          <div style={{ background: C.indigo, color: C.white, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Lock size={11} /> SECURE
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ height: 3, background: C.border }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg,${C.indigo},#818cf8)`, width: `${progress}%`, transition: 'width .4s ease' }} />
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 20px 80px' }}>
        {/* Stepper */}
        <div style={{ background: C.white, borderRadius: 16, padding: '18px 22px', boxShadow: '0 2px 14px rgba(0,0,0,.05)', marginBottom: 22 }}>
          <Stepper steps={allSteps} cur={step} onGo={setStep} />
        </div>

        {/* Form card */}
        <div key={step} style={{ background: C.white, borderRadius: 20, boxShadow: '0 4px 32px rgba(79,70,229,.07)', overflow: 'hidden', animation: 'fadeIn .25s ease' }}>
          {/* Card header */}
          <div style={{ background: `linear-gradient(135deg,${C.navy},${C.navyMid})`, padding: '26px 34px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 50, height: 50, borderRadius: 13, background: 'rgba(99,102,241,.22)', border: '1px solid rgba(99,102,241,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', flexShrink: 0 }}>
              {ICONS[allSteps[step]] ?? <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 18 }}>{step + 1}</span>}
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Step {step + 1} of {allSteps.length}
              </div>
              <h2 style={{ color: C.white, fontSize: 23, fontWeight: 800, margin: 0 }}>{allSteps[step]}</h2>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: 34 }}>
            {curSec && !isSig && !isDoc && (
              <div className="fgrid">
                {curSec.fields.map(f => (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: C.navyMid, display: 'flex', gap: 4, alignItems: 'center' }}>
                      {f.label}{f.required && <span style={{ color: C.error, fontSize: 12 }}>*</span>}
                    </label>
                    <FieldInput f={f} val={form[f.key] || ''} onChange={change} err={!!errs[f.key]} />
                    {errs[f.key] && <span style={{ fontSize: 12, color: C.error }}>{f.label} is required.</span>}
                  </div>
                ))}
              </div>
            )}

            {isSig && <SignaturePad onSave={(d) => { setSig(d); setSigSaved(true) }} saved={sigSaved} />}
            {isDoc  && <DocUpload files={docs} onChange={setDocs} />}

            {subErr && (
              <div style={{ marginTop: 20, background: C.errorBg, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', color: '#991b1b', fontSize: 14 }}>
                {subErr}
              </div>
            )}

            {/* Nav */}
            <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 22 }}>
              {step > 0
                ? <button type="button" onClick={prev} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.white, color: C.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                    <ChevronLeft size={18} /> Previous
                  </button>
                : <div />}

              {isLast
                ? <button type="button" onClick={submit} disabled={submitting}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 30px', border: 'none', borderRadius: 10, background: submitting ? '#a5b4fc' : C.indigo, color: C.white, fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 18px rgba(79,70,229,.35)' }}>
                    {submitting
                      ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.4)', borderTopColor: C.white, borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> Submitting…</>
                      : <><Check size={18} strokeWidth={2.5} /> Submit Application</>}
                  </button>
                : <button type="button" onClick={next}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 26px', border: 'none', borderRadius: 10, background: C.indigo, color: C.white, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(79,70,229,.25)' }}>
                    Continue <ChevronRight size={18} />
                  </button>
              }
            </div>
          </div>
        </div>

        {/* Trust row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 26, flexWrap: 'wrap' }}>
          {[
            { Icon: Lock,   label: 'SSL Encrypted' },
            { Icon: Shield, label: 'Secure & Private' },
          ].map(({ Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 13 }}>
              <Icon size={15} /> {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
