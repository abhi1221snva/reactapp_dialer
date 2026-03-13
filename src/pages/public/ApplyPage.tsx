import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, User, BarChart2, DollarSign, Landmark, PenLine, FileText,
  ChevronLeft, ChevronRight, Check, Eye, EyeOff, Upload, X,
  Copy, ExternalLink, Printer, Lock, Shield, Mail, Phone,
} from 'lucide-react'
import { publicAppService, PublicFormSection, PublicCompany, SubmitResult } from '../../services/publicApp.service'

// ─── Design tokens (Stripe / Mercury palette) ─────────────────────────────────
const C = {
  // Backgrounds
  pageBg:      '#f7f8fc',
  white:       '#ffffff',
  cardBg:      '#ffffff',
  sectionBg:   '#f9fafb',
  // Accents
  indigo:      '#6366f1',
  indigoHov:   '#4f46e5',
  indigoLt:    '#eef2ff',
  indigoRing:  'rgba(99,102,241,.2)',
  // Status
  success:     '#10b981',
  successBg:   '#ecfdf5',
  successRing: 'rgba(16,185,129,.15)',
  error:       '#ef4444',
  errorBg:     '#fef2f2',
  // Text
  text:        '#111827',
  textMd:      '#374151',
  muted:       '#6b7280',
  mutedLt:     '#9ca3af',
  // Borders / shadows
  border:      '#e5e7eb',
  borderMd:    '#d1d5db',
  shadow:      '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)',
  shadowMd:    '0 4px 16px rgba(0,0,0,.07), 0 1px 4px rgba(0,0,0,.05)',
  shadowLg:    '0 8px 32px rgba(0,0,0,.08)',
  // Nav
  navy:        '#0f172a',
}

const ICONS: Record<string, React.ReactNode> = {
  'Business Information': <Building2 size={16} />,
  'Owner Information':    <User size={16} />,
  'Owner 2 Information':  <User size={16} />,
  'Business Details':     <BarChart2 size={16} />,
  'Funding Request':      <DollarSign size={16} />,
  'Bank Information':     <Landmark size={16} />,
  'Digital Signature':    <PenLine size={16} />,
  'Documents':            <FileText size={16} />,
}

const LARGE_ICONS: Record<string, React.ReactNode> = {
  'Business Information': <Building2 size={22} />,
  'Owner Information':    <User size={22} />,
  'Owner 2 Information':  <User size={22} />,
  'Business Details':     <BarChart2 size={22} />,
  'Funding Request':      <DollarSign size={22} />,
  'Bank Information':     <Landmark size={22} />,
  'Digital Signature':    <PenLine size={22} />,
  'Documents':            <FileText size={22} />,
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

const DOC_TYPES = [
  'Bank Statement','Driver License','Business License',
  'Tax Return','Voided Check','Profit & Loss Statement','Other',
]

// ─── Global styles injected once ─────────────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; }
  input:focus, select:focus, textarea:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,.18) !important;
    outline: none;
  }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin     { to   { transform: rotate(360deg); } }
  @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:.5; } }
  .apply-body       { background: #f7f8fc; min-height: 100vh; }
  .apply-container  { max-width: 1400px; margin: 0 auto; padding: 0 30px; }
  .apply-layout     { display: flex; gap: 32px; align-items: flex-start; padding: 36px 0 80px; }
  .apply-sidebar    { width: 280px; flex-shrink: 0; position: sticky; top: 88px; }
  .apply-main       { flex: 1; min-width: 0; }
  .apply-card       { background: #fff; border-radius: 14px; border: 1px solid #e5e7eb; box-shadow: 0 4px 16px rgba(0,0,0,.07); overflow: hidden; }
  .apply-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .apply-field-wide { grid-column: 1 / -1; }
  @media (max-width: 900px) {
    .apply-layout    { flex-direction: column; padding: 24px 0 60px; }
    .apply-sidebar   { width: 100%; position: static; }
  }
  @media (max-width: 600px) {
    .apply-container  { padding: 0 16px; }
    .apply-field-grid { grid-template-columns: 1fr !important; }
    .apply-card       { border-radius: 12px; }
  }
`

// ─── Field Input ──────────────────────────────────────────────────────────────
interface FieldDef {
  key: string; label: string; type: string; required: boolean;
  placeholder?: string; options?: string[]
}

function FieldInput({ f, val, onChange, hasErr }: { f: FieldDef; val: string; onChange: (k: string, v: string) => void; hasErr: boolean }) {
  const [show, setShow] = useState(false)

  const base: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: `1.5px solid ${hasErr ? C.error : C.border}`,
    borderRadius: 8, fontSize: 14.5, color: C.text,
    background: C.white, fontFamily: 'inherit',
    transition: 'border-color .15s, box-shadow .15s',
  }

  if (f.type === 'select') {
    const opts = f.options?.length
      ? f.options
      : f.key.toLowerCase().includes('state') ? US_STATES : []
    return (
      <select value={val} onChange={e => onChange(f.key, e.target.value)} style={{
        ...base, appearance: 'none', cursor: 'pointer', paddingRight: 38,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center', backgroundSize: 16,
      }}>
        <option value="">Select…</option>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    )
  }

  if (f.type === 'textarea') {
    return <textarea rows={3} value={val} placeholder={f.placeholder}
      onChange={e => onChange(f.key, e.target.value)}
      style={{ ...base, resize: 'vertical', minHeight: 90 }} />
  }

  if (f.type === 'ssn') {
    return (
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={val} maxLength={11}
          placeholder="•••–••–••••"
          onChange={e => onChange(f.key, e.target.value)}
          style={{ ...base, paddingRight: 44, letterSpacing: show ? 'normal' : '0.2em' }} />
        <button type="button" onClick={() => setShow(x => !x)} style={{
          position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 3,
        }}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    )
  }

  const t = ({ tel: 'tel', email: 'email', date: 'date', number: 'number' } as Record<string,string>)[f.type] ?? 'text'
  return (
    <input type={t} value={val} placeholder={f.placeholder}
      onChange={e => onChange(f.key, e.target.value)} style={base} />
  )
}

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({ onSave, saved }: { onSave: (d: string) => void; saved: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const pt = (e: MouseEvent | TouchEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const scale = ref.current!.width / r.width
    return 'touches' in e
      ? { x: (e.touches[0].clientX - r.left) * scale, y: (e.touches[0].clientY - r.top) * scale }
      : { x: ((e as MouseEvent).clientX - r.left) * scale, y: ((e as MouseEvent).clientY - r.top) * scale }
  }

  const start = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    drawing.current = true
    const p = pt(e); last.current = p
    const ctx = ref.current!.getContext('2d')!
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
    ctx.fillStyle = '#111827'; ctx.fill()
  }, [])

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    if (!drawing.current || !last.current) return
    const p = pt(e)
    const ctx = ref.current!.getContext('2d')!
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.5
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
    last.current = p
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
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 14, lineHeight: 1.6 }}>
        Draw your signature below using your mouse or finger on a touch screen.
        Your signature will be securely attached to this application.
      </p>
      <div style={{
        border: `2px dashed ${saved ? C.success : C.border}`,
        borderRadius: 10, background: saved ? '#f0fdf4' : '#fafafa',
        position: 'relative', overflow: 'hidden', transition: 'all .2s',
      }}>
        <canvas ref={ref} width={900} height={200}
          style={{ display: 'block', width: '100%', height: 200, cursor: 'crosshair', touchAction: 'none' }} />
        {!saved && (
          <span style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            color: '#d1d5db', fontSize: 13, fontStyle: 'italic', pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            Sign here
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button type="button" onClick={clear} style={{
          flex: 1, padding: '10px 0', border: `1.5px solid ${C.border}`, borderRadius: 8,
          background: C.white, color: C.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>
          Clear
        </button>
        <button type="button" onClick={() => onSave(ref.current!.toDataURL('image/png'))} style={{
          flex: 2, padding: '10px 0', border: 'none', borderRadius: 8,
          background: saved ? C.success : C.indigo, color: C.white,
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          {saved ? '✓ Signature Saved' : 'Save Signature'}
        </button>
      </div>
      {saved && (
        <div style={{ color: C.success, fontSize: 13, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <Check size={15} /> Signature captured successfully
        </div>
      )}
    </div>
  )
}

// ─── Document Upload ──────────────────────────────────────────────────────────
interface UploadFile { id: string; file: File; docType: string }

function DocUpload({ files, onChange }: { files: UploadFile[]; onChange: (f: UploadFile[]) => void }) {
  const [over, setOver] = useState(false)
  const inp = useRef<HTMLInputElement>(null)

  const add = (fs: File[]) => onChange([
    ...files,
    ...fs.map(f => ({ id: Math.random().toString(36).slice(2), file: f, docType: 'Bank Statement' })),
  ])

  const fmtSize = (n: number) => n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`

  return (
    <div>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
        Upload supporting documents. Accepted formats: PDF, JPG, PNG, DOC, DOCX (max 10 MB each).
        You can also upload more documents after submission from your merchant portal.
      </p>

      <div
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files)) }}
        onClick={() => inp.current?.click()}
        style={{
          border: `2px dashed ${over ? C.indigo : C.borderMd}`,
          borderRadius: 12, background: over ? C.indigoLt : C.sectionBg,
          padding: '40px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: over ? C.indigoLt : C.white,
          border: `1.5px solid ${over ? C.indigo : C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', color: over ? C.indigo : C.muted,
        }}>
          <Upload size={22} />
        </div>
        <p style={{ fontWeight: 700, fontSize: 15, color: over ? C.indigo : C.text, marginBottom: 4 }}>
          {over ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p style={{ color: C.muted, fontSize: 13 }}>or <span style={{ color: C.indigo, fontWeight: 600 }}>browse files</span></p>
        <input ref={inp} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          style={{ display: 'none' }}
          onChange={e => e.target.files && add(Array.from(e.target.files))} />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: C.sectionBg, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: C.indigoLt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.indigo, flexShrink: 0 }}>
                <FileText size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{fmtSize(f.file.size)}</p>
              </div>
              <select value={f.docType}
                onChange={e => onChange(files.map(x => x.id === f.id ? { ...x, docType: e.target.value } : x))}
                style={{ fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', color: C.textMd, background: C.white, cursor: 'pointer' }}>
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <button type="button" onClick={() => onChange(files.filter(x => x.id !== f.id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mutedLt, padding: 4, display: 'flex', flexShrink: 0, borderRadius: 6 }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar step list ────────────────────────────────────────────────────────
function StepSidebar({ steps, cur, onGo }: { steps: string[]; cur: number; onGo: (i: number) => void }) {
  return (
    <div className="apply-card" style={{ padding: '24px 20px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
        Application Progress
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {steps.map((s, i) => {
          const done = i < cur
          const active = i === cur
          return (
            <button
              key={i} type="button"
              onClick={() => (done || active) && onGo(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
                border: 'none', borderRadius: 9, background: active ? C.indigoLt : 'transparent',
                cursor: done ? 'pointer' : 'default', textAlign: 'left', width: '100%',
                transition: 'background .15s',
              }}
            >
              {/* Circle */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? C.success : active ? C.indigo : C.sectionBg,
                border: `2px solid ${done ? C.success : active ? C.indigo : C.borderMd}`,
                color: done || active ? C.white : C.muted,
                transition: 'all .2s',
              }}>
                {done
                  ? <Check size={14} strokeWidth={2.5} />
                  : (ICONS[s] ?? <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span>)
                }
              </div>
              {/* Label */}
              <div>
                <span style={{
                  fontSize: 13.5, fontWeight: active ? 700 : done ? 500 : 400,
                  color: active ? C.indigo : done ? C.text : C.muted,
                  lineHeight: 1.3, display: 'block',
                }}>
                  {s}
                </span>
                {done && (
                  <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>Completed</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Progress fraction */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Progress</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.indigo }}>{cur}/{steps.length}</span>
        </div>
        <div style={{ height: 5, background: C.sectionBg, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 10,
            background: `linear-gradient(90deg, ${C.indigo}, #818cf8)`,
            width: `${Math.round((cur / steps.length) * 100)}%`,
            transition: 'width .4s ease',
          }} />
        </div>
      </div>
    </div>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ res, company, apiBase }: { res: SubmitResult; company: PublicCompany | null; apiBase: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(res.merchant_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const pdfUrl = `${apiBase}/public/apply/${res.lead_token}/pdf`

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
      {/* Checkmark circle */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: C.successBg, border: `2px solid ${C.success}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px', boxShadow: `0 0 0 8px ${C.successRing}`,
      }}>
        <Check size={36} color={C.success} strokeWidth={2.5} />
      </div>

      <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 12 }}>
        Application Submitted!
      </h2>
      <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 36 }}>
        Your funding application has been received and is under review.
        Save the link below to track your application and upload additional documents.
      </p>

      {/* Merchant link box */}
      <div style={{
        background: C.sectionBg, border: `1.5px solid ${C.border}`, borderRadius: 14,
        padding: '22px 24px', marginBottom: 28, textAlign: 'left',
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Your Merchant Portal Link
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '10px 14px', fontFamily: 'monospace', fontSize: 14, color: C.text,
            wordBreak: 'break-all',
          }}>
            {res.merchant_url}
          </div>
          <button onClick={copy} style={{
            padding: '10px 16px', border: 'none', borderRadius: 8,
            background: copied ? C.success : C.navy, color: C.white,
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}>
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
          Bookmark this link — it gives you access to your application status and document uploads.
        </p>
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={res.merchant_url} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 26px', background: C.indigo, color: C.white,
          borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none',
          boxShadow: `0 4px 14px ${C.indigoRing}`,
        }}>
          <ExternalLink size={17} /> Open My Portal
        </a>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 26px', background: C.white, color: C.textMd,
          border: `1.5px solid ${C.border}`, borderRadius: 10,
          fontWeight: 600, fontSize: 15, textDecoration: 'none',
        }}>
          <Printer size={17} /> Print / Save PDF
        </a>
      </div>
    </div>
  )
}

// ─── Logo component with fallback ─────────────────────────────────────────────
function CompanyLogo({ company, size = 40 }: { company: PublicCompany | null; size?: number }) {
  const [imgErr, setImgErr] = useState(false)
  const initial = (company?.company_name || 'F').slice(0, 2).toUpperCase()

  if (company?.logo_url && !imgErr) {
    return (
      <img
        src={company.logo_url}
        alt={company.company_name}
        onError={() => setImgErr(true)}
        style={{ height: size, maxWidth: size * 3, objectFit: 'contain', borderRadius: 6 }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: C.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: C.white, fontWeight: 800, fontSize: size * 0.38,
      letterSpacing: '-0.02em', flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
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
  const isSig  = step === sections.length
  const isDoc  = step === sections.length + 1
  const isLast = step === allSteps.length - 1

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.pageBg }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: `3px solid ${C.indigoLt}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ color: C.muted, fontSize: 15 }}>Loading application form…</p>
        </div>
      </div>
    )
  }

  if (error) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'Application link not found or expired.'
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.pageBg, padding: 24 }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ background: C.white, borderRadius: 16, padding: '48px 40px', textAlign: 'center', maxWidth: 420, boxShadow: C.shadowLg }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Link Not Found</h2>
          <p style={{ color: C.muted, fontSize: 15 }}>{msg}</p>
        </div>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="apply-body">
        <style>{GLOBAL_CSS}</style>
        {/* White header */}
        <header style={{
          background: C.white, borderBottom: `1px solid ${C.border}`,
          height: 64, display: 'flex', alignItems: 'center',
        }}>
          <div className="apply-container" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CompanyLogo company={company} size={38} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{company?.company_name}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>Funding Application</div>
            </div>
          </div>
        </header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: 24 }}>
          <div className="apply-card" style={{ width: '100%', maxWidth: 700 }}>
            <SuccessScreen res={result} company={company} apiBase={apiBase} />
          </div>
        </div>
      </div>
    )
  }

  const curSec = sections[step]

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="apply-body">
      <style>{GLOBAL_CSS}</style>

      {/* ── TOP HEADER (white) ──────────────────────────────────────────── */}
      <header style={{
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        height: 68,
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: C.shadow,
      }}>
        <div className="apply-container" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: Logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CompanyLogo company={company} size={40} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text, lineHeight: 1.2 }}>
                {company?.company_name || 'Funding Application'}
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>Funding Application</div>
            </div>
          </div>
          {/* Right: contact + secure badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {company?.company_phone && (
              <a href={`tel:${company.company_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 13, textDecoration: 'none' }}>
                <Phone size={13} /> {company.company_phone}
              </a>
            )}
            {company?.support_email && (
              <a href={`mailto:${company.support_email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 13, textDecoration: 'none' }}>
                <Mail size={13} /> {company.support_email}
              </a>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              color: C.success, fontSize: 11, fontWeight: 700,
              padding: '4px 10px', borderRadius: 20,
            }}>
              <Lock size={11} /> SECURE
            </div>
          </div>
        </div>
      </header>

      {/* ── THIN PROGRESS BAR ───────────────────────────────────────────── */}
      <div style={{ height: 3, background: C.sectionBg }}>
        <div style={{
          height: '100%',
          background: `linear-gradient(90deg, ${C.indigo}, #a5b4fc)`,
          width: allSteps.length > 0 ? `${Math.round((step / allSteps.length) * 100)}%` : '0%',
          transition: 'width .4s ease',
        }} />
      </div>

      {/* ── TWO-COLUMN LAYOUT ───────────────────────────────────────────── */}
      <div className="apply-container">
        <div className="apply-layout">

          {/* LEFT SIDEBAR */}
          <aside className="apply-sidebar">
            <StepSidebar steps={allSteps} cur={step} onGo={setStep} />

            {/* Trust / Security card */}
            <div style={{
              marginTop: 16, background: C.white,
              border: `1px solid ${C.border}`, borderRadius: 12,
              padding: '18px 20px',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                Security & Privacy
              </p>
              {[
                { Icon: Lock,   text: '256-bit SSL encryption' },
                { Icon: Shield, text: 'Your data is kept private' },
              ].map(({ Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.success, flexShrink: 0 }}>
                    <Icon size={14} />
                  </div>
                  <span style={{ fontSize: 13, color: C.muted }}>{text}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* RIGHT: FORM CARD */}
          <main className="apply-main">
            <div key={step} className="apply-card" style={{ animation: 'fadeUp .22s ease' }}>

              {/* Card section header — light, clean (not dark gradient) */}
              <div style={{
                background: C.sectionBg,
                borderBottom: `1px solid ${C.border}`,
                padding: '22px 30px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: C.indigoLt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.indigo, flexShrink: 0,
                  }}>
                    {LARGE_ICONS[allSteps[step]] ?? <span style={{ fontWeight: 700, fontSize: 18, color: C.indigo }}>{step + 1}</span>}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                      {allSteps[step]}
                    </h2>
                    <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                      {isSig  ? 'Draw your signature to authorize this application.' :
                       isDoc  ? 'Upload required supporting documents.' :
                       curSec ? `Please fill in all required fields.` : ''}
                    </p>
                  </div>
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: C.muted,
                  background: C.white, border: `1px solid ${C.border}`,
                  borderRadius: 20, padding: '4px 12px', flexShrink: 0,
                }}>
                  {step + 1} / {allSteps.length}
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '30px' }}>
                {/* Dynamic fields */}
                {curSec && !isSig && !isDoc && (
                  <div className="apply-field-grid">
                    {curSec.fields.map(f => (
                      <div
                        key={f.key}
                        className={f.type === 'textarea' ? 'apply-field-wide' : undefined}
                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                      >
                        <label style={{
                          fontSize: 13, fontWeight: 600, color: C.textMd,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {f.label}
                          {f.required && <span style={{ color: C.error, fontSize: 14, lineHeight: 1 }}>*</span>}
                        </label>
                        <FieldInput f={f} val={form[f.key] || ''} onChange={change} hasErr={!!errs[f.key]} />
                        {errs[f.key] && (
                          <span style={{ fontSize: 12, color: C.error, fontWeight: 500 }}>
                            {f.label} is required.
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isSig && <SignaturePad onSave={(d) => { setSig(d); setSigSaved(true) }} saved={sigSaved} />}
                {isDoc  && <DocUpload files={docs} onChange={setDocs} />}

                {subErr && (
                  <div style={{
                    marginTop: 20, background: C.errorBg,
                    border: `1px solid #fca5a5`, borderRadius: 10,
                    padding: '12px 16px', color: '#991b1b', fontSize: 14,
                  }}>
                    {subErr}
                  </div>
                )}
              </div>

              {/* Card footer — navigation */}
              <div style={{
                borderTop: `1px solid ${C.border}`,
                padding: '20px 30px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: C.sectionBg,
              }}>
                {step > 0
                  ? <button type="button" onClick={prev} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '10px 20px', border: `1.5px solid ${C.border}`,
                      borderRadius: 9, background: C.white, color: C.textMd,
                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>
                      <ChevronLeft size={17} /> Previous
                    </button>
                  : <div />
                }

                {isLast
                  ? <button type="button" onClick={submit} disabled={submitting} style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '12px 28px', border: 'none', borderRadius: 9,
                      background: submitting ? '#a5b4fc' : C.indigo,
                      color: C.white, fontSize: 15, fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      boxShadow: submitting ? 'none' : `0 4px 14px ${C.indigoRing}`,
                    }}>
                      {submitting
                        ? <><div style={{ width: 17, height: 17, border: '2px solid rgba(255,255,255,.4)', borderTopColor: C.white, borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> Submitting…</>
                        : <><Check size={17} strokeWidth={2.5} /> Submit Application</>
                      }
                    </button>
                  : <button type="button" onClick={next} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '11px 24px', border: 'none', borderRadius: 9,
                      background: C.indigo, color: C.white,
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      boxShadow: `0 4px 14px ${C.indigoRing}`,
                    }}>
                      Continue <ChevronRight size={17} />
                    </button>
                }
              </div>
            </div>
          </main>

        </div>
      </div>
    </div>
  )
}
