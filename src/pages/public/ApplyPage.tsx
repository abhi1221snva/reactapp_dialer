import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, User, Users, BarChart2, DollarSign, Landmark, FileText,
  Check, X, Upload, Eye, EyeOff, Printer,
  AlertCircle, CheckCircle2, ShieldCheck, ChevronRight,
  Edit3, ArrowLeft, ArrowRight, Phone, Mail, Clock, RefreshCw,
} from 'lucide-react'
import {
  publicAppService, extractPdfFilename,
  PublicFormSection, PublicFormField, PublicCompany, SubmitResult,
  PublicDocumentType,
} from '../../services/publicApp.service'
import { formatPhoneNumber, formatPartialPhoneUS } from '../../utils/format'
import { validateSection, scrollToFirstError, rulestoHtmlAttrs } from '../../utils/publicFormValidation'
import AddressAutocomplete from '../../components/ui/AddressAutocomplete'
import { isAddressAutocompleteKey, resolveAddressGroup, type ParsedPlace } from '../../utils/addressFieldMapping'

// ─── Design tokens (identical to MerchantPage) ────────────────────────────────
const C = {
  navy:       '#1e293b',
  navyMid:    '#334155',
  sidebar:    '#ffffff',
  sidebarHov: '#f8fafc',
  indigo:     '#4f46e5',
  indigoLt:   '#e0e7ff',
  indigoPale: '#f5f3ff',
  success:    '#10b981',
  successBg:  '#ecfdf5',
  successBdr: '#6ee7b7',
  error:      '#ef4444',
  errorBg:    '#fef2f2',
  errorBdr:   '#fca5a5',
  amber:      '#d97706',
  amberBg:    '#fffbeb',
  amberBdr:   '#fde68a',
  text:       '#0f172a',
  textMid:    '#334155',
  muted:      '#64748b',
  subtle:     '#94a3b8',
  border:     '#e2e8f0',
  bg:         '#f1f5f9',
  card:       '#ffffff',
  card2:      '#f8fafc',
}

// ─── Section metadata ─────────────────────────────────────────────────────────
const SMETA: Record<string, { icon: React.ReactNode; color: string }> = {
  'Business Information': { icon: <Building2 size={15} />, color: '#4f46e5' },
  'Owner Information':    { icon: <User size={15} />,      color: '#0891b2' },
  'Owner 2 Information':  { icon: <User size={15} />,      color: '#0e7490' },
  'Business Details':     { icon: <BarChart2 size={15} />, color: '#7c3aed' },
  'Funding Request':      { icon: <DollarSign size={15} />,color: '#059669' },
  'Bank Information':     { icon: <Landmark size={15} />,  color: '#d97706' },
  'Digital Signature':    { icon: <Edit3 size={15} />,     color: '#7c3aed' },
  'Documents':            { icon: <FileText size={15} />,  color: '#9333ea' },
}

const EXT_COLORS: Record<string, string> = {
  pdf: '#ef4444', jpg: '#3b82f6', jpeg: '#3b82f6', png: '#8b5cf6', doc: '#2563eb', docx: '#2563eb',
}

const fileExt = (n: string) => n.split('.').pop()?.toLowerCase() ?? 'file'

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

function parseSubValues(raw: string | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return (raw as unknown as string[]).filter(Boolean)
  if (typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch { /* fall through */ }
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

// ─── FormField (matches MerchantPage style) ───────────────────────────────────
function FormField({ f, value, onChange, error }: {
  f: PublicFormField; value: string; onChange: (k: string, v: string) => void; error?: string
}) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)

  const base: React.CSSProperties = {
    width: '100%', padding: '8px 11px',
    border: `1.5px solid ${error ? C.error : focused ? C.indigo : C.border}`,
    borderRadius: 8, fontSize: 13, color: C.text, background: C.card,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,.1)' : 'rgba(79,70,229,.1)'}` : 'none',
    transition: 'border-color .12s, box-shadow .12s',
  }
  const fb = { onFocus: () => setFocused(true), onBlur: () => setFocused(false) }
  const ph: Record<string, string> = { email: 'name@example.com', tel: '(555) 000-0000', number: '0' }
  const dbAttrs = f.validation_rules?.length ? rulestoHtmlAttrs(f.validation_rules) : {}

  const input = (() => {
    if (f.type === 'select') {
      const opts = (f.options ?? []).length
        ? (f.options ?? [])
        : f.key.toLowerCase().includes('state') ? US_STATES : []
      return (
        <select value={value} onChange={e => onChange(f.key, e.target.value)} {...fb}
          style={{ ...base, appearance: 'none', cursor: 'pointer', paddingRight: 32,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: 14 }}>
          <option value="">Select…</option>
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      )
    }
    if (f.type === 'textarea') return (
      <textarea rows={2} value={value} onChange={e => onChange(f.key, e.target.value)} {...fb}
        style={{ ...base, resize: 'none', lineHeight: 1.5 }} />
    )
    const isSSN = f.type === 'ssn' || /\bssn\b/i.test(f.key)
    if (isSSN) return (
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={value}
          {...dbAttrs}
          maxLength={11}
          placeholder="XXX-XX-XXXX"
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
            let fmt = digits
            if (digits.length > 5) fmt = `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`
            else if (digits.length > 3) fmt = `${digits.slice(0,3)}-${digits.slice(3)}`
            onChange(f.key, fmt)
          }}
          {...fb}
          style={{ ...base, paddingRight: 38 }} />
        <button type="button" onClick={() => setShow(x => !x)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2, display: 'flex' }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    )
    if (isAddressAutocompleteKey(f.key, f.label)) return (
      <AddressAutocomplete
        value={value}
        onChange={v => onChange(f.key, v)}
        onPlaceSelect={(parsed: ParsedPlace) => {
          const group = resolveAddressGroup(f.key, f.label)
          if (group) {
            onChange(group.cityKey, parsed.city)
            onChange(group.stateKey, parsed.state)
            onChange(group.zipKey, parsed.zip)
            if (group.countryKey) onChange(group.countryKey, parsed.country)
          }
        }}
        placeholder={f.placeholder ?? ''}
        className=""
        style={base}
        isPublic
      />
    )
    const isPhone = f.type === 'tel' || f.type === 'phone' || f.type === 'phone_number' || /\bphone\b/i.test(f.key)
    if (isPhone) return (
      <input type="tel" value={value}
        {...dbAttrs}
        maxLength={14}
        inputMode="tel"
        placeholder={ph.tel ?? f.placeholder ?? ''}
        onChange={e => onChange(f.key, formatPartialPhoneUS(e.target.value))}
        {...fb}
        style={base} />
    )
    const t = ({ email: 'email', date: 'date', number: 'number' } as Record<string, string>)[f.type] ?? 'text'
    return <input type={t} value={value} onChange={e => onChange(f.key, e.target.value)}
      {...fb} {...dbAttrs} placeholder={ph[f.type] ?? f.placeholder ?? ''} style={base} />
  })()

  return (
    <div data-field-key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: error ? C.error : C.muted, textTransform: 'uppercase', letterSpacing: 0.6, display: 'flex', gap: 3, alignItems: 'center' }}>
        {f.label}{f.required && <span style={{ color: C.error, fontSize: 13 }}>*</span>}
      </label>
      {input}
      {error && (
        <span style={{ fontSize: 11, color: C.error, display: 'flex', alignItems: 'center', gap: 3 }}>
          <AlertCircle size={11} />{error}
        </span>
      )}
    </div>
  )
}

// ─── Signature pad (canvas, stores to local state) ────────────────────────────
function SigPad({ onSave, saved, savedDataUrl }: { onSave: (d: string) => void; saved: boolean; savedDataUrl?: string }) {
  const ref      = useRef<HTMLCanvasElement>(null)
  const last     = useRef<{ x: number; y: number } | null>(null)
  const drawingRef = useRef(false)
  const [hasLines, setHasLines] = useState(false)

  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(30, 105); ctx.lineTo(570, 105); ctx.stroke()
    ctx.setLineDash([]); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    setHasLines(false)
  }, [])

  const pos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect()
    const sx = c.width / r.width, sy = c.height / r.height
    if ('touches' in e) return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy }
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); const c = ref.current; if (!c) return
    drawingRef.current = true; last.current = pos(e, c)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); if (!drawingRef.current) return
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    const p = pos(e, c)
    if (last.current) { ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasLines(true) }
    last.current = p
  }

  const endDraw = () => { drawingRef.current = false; last.current = null }

  const clear = () => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(30, 105); ctx.lineTo(570, 105); ctx.stroke()
    ctx.setLineDash([]); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5
    setHasLines(false)
  }

  if (saved) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
      <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f0f4ff)', border: `2px solid ${C.successBdr}`, borderRadius: 16, padding: '18px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.success, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>
          <CheckCircle2 size={13} /> Signature captured
        </div>
        {savedDataUrl && <img src={savedDataUrl} alt="Signature" style={{ maxHeight: 80, maxWidth: 400, filter: 'contrast(1.2)' }} />}
        <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Your signature will be included with your application.</p>
      </div>
      <button type="button" onClick={() => { clear(); onSave('') }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 15px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <RefreshCw size={13} /> Retake
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#f8f9ff', border: `1px solid ${C.indigoLt}`, borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={15} style={{ flexShrink: 0 }} />
        By signing, you certify that all information provided is accurate and complete.
      </div>
      <div style={{ border: `2px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', background: '#fafcff', touchAction: 'none', cursor: 'crosshair', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: C.subtle, pointerEvents: 'none', letterSpacing: 0.6 }}>SIGN ABOVE</div>
        <canvas ref={ref} width={600} height={130} style={{ display: 'block', width: '100%', height: 'auto' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={clear}
          style={{ padding: '7px 16px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Clear
        </button>
        <button type="button" onClick={() => { if (hasLines && ref.current) onSave(ref.current.toDataURL('image/png')) }}
          disabled={!hasLines}
          style={{ padding: '7px 20px', border: 'none', borderRadius: 8, background: !hasLines ? '#c7d2fe' : C.indigo, color: 'white', fontSize: 13, fontWeight: 700, cursor: !hasLines ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: !hasLines ? 'none' : '0 2px 8px rgba(79,70,229,.3)' }}>
          <Check size={13} /> Save Signature
        </button>
      </div>
    </div>
  )
}

// ─── Document upload (local queue, styled like DocStep) ───────────────────────
interface UploadFile { id: string; file: File; docType: string; subType: string }

const APPLY_MAX_FILE_MB  = 10
const APPLY_MAX_TOTAL_MB = 25
const APPLY_MAX_FILE_B   = APPLY_MAX_FILE_MB * 1024 * 1024
const APPLY_MAX_TOTAL_B  = APPLY_MAX_TOTAL_MB * 1024 * 1024

function DocUpload({ files, onChange, docTypes, isMobile }: {
  files: UploadFile[]
  onChange: (f: UploadFile[]) => void
  docTypes: PublicDocumentType[]
  isMobile?: boolean
}) {
  const [over, setOver]           = useState(false)
  const [err, setErr]             = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const inp = useRef<HTMLInputElement>(null)

  const confirmFile = confirmId ? files.find(f => f.id === confirmId) : null
  const defaultType = docTypes[0]?.title ?? ''

  const add = (fs: File[]) => {
    if (!docTypes.length) {
      setErr('No document types are configured. Please contact support.'); return
    }
    // PDF-only validation
    for (const f of fs) {
      if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
        setErr(`"${f.name}" is not a PDF. Only PDF files are accepted.`); return
      }
      if (f.size > APPLY_MAX_FILE_B) {
        setErr(`"${f.name}" exceeds the ${APPLY_MAX_FILE_MB} MB per-file limit.`); return
      }
    }
    const totalSize = files.reduce((s, x) => s + x.file.size, 0) + fs.reduce((s, f) => s + f.size, 0)
    if (totalSize > APPLY_MAX_TOTAL_B) {
      setErr(`Total size exceeds ${APPLY_MAX_TOTAL_MB} MB. Please remove some files.`); return
    }
    setErr('')
    onChange([
      ...files,
      ...fs.map(f => ({ id: Math.random().toString(36).slice(2), file: f, docType: defaultType, subType: '' })),
    ])
  }

  const fmtSize = (n: number) => n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 14 : 20, height: '100%' }}>

      {/* ── Remove confirmation modal ── */}
      {confirmFile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setConfirmId(null)}>
          <div style={{ background: C.card, borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', gap: 16 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.errorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={20} color={C.error} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: C.text }}>Remove File?</p>
                <p style={{ margin: 0, fontSize: 12, color: C.muted, marginTop: 2 }}>This file will be removed from the upload queue.</p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.textMid, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', wordBreak: 'break-all' }}>
              {confirmFile.file.name}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirmId(null)}
                style={{ padding: '8px 20px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={() => { setErr(''); onChange(files.filter(x => x.id !== confirmId)); setConfirmId(null) }}
                style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: C.error, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <X size={13} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left: drop zone */}
      <div style={{ flex: isMobile ? 'none' : '0 0 340px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files)) }}
          onClick={() => inp.current?.click()}
          style={{ flex: 1, border: `2px dashed ${over ? C.indigo : C.border}`, borderRadius: 12, background: over ? C.indigoPale : C.card2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', transition: 'all .2s', padding: 20 }}>
          <Upload size={26} style={{ color: over ? C.indigo : C.muted }} />
          <p style={{ fontWeight: 600, color: over ? C.indigo : C.text, margin: 0, fontSize: 14 }}>{over ? 'Drop here' : 'Drag & drop or click'}</p>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>PDF only · max {APPLY_MAX_FILE_MB} MB per file</p>
          <input ref={inp} type="file" multiple accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files) { add(Array.from(e.target.files)); e.target.value = '' } }} />
        </div>
        {err && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', color: '#7f1d1d', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={13} />{err}
          </div>
        )}
      </div>

      {/* Right: file list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Queued Files</span>
          {files.length > 0 && <span style={{ background: C.indigoLt, color: C.indigo, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>{files.length}</span>}
        </div>
        {files.length === 0
          ? <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.subtle, fontSize: 13 }}>
              <FileText size={32} style={{ opacity: .3 }} />
              <span>No files queued yet</span>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
              {files.map(f => {
                const e2 = fileExt(f.file.name)
                const ec = EXT_COLORS[e2] ?? C.indigo
                const selType = docTypes.find(t => t.title === f.docType) ?? null
                const subValues = parseSubValues(selType?.values)
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${ec}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={16} color={ec} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file.name}</p>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, background: `${ec}18`, color: ec, fontWeight: 700, padding: '1px 6px', borderRadius: 5, textTransform: 'uppercase' }}>{e2}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>{fmtSize(f.file.size)}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setConfirmId(f.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.subtle, padding: 4, display: 'flex', flexShrink: 0, order: isMobile ? -1 : 3, marginLeft: isMobile ? 'auto' : 0 }}>
                      <X size={15} />
                    </button>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', ...(isMobile ? { width: '100%' } : {}) }}>
                      <select value={f.docType}
                        onChange={e => onChange(files.map(x => x.id === f.id ? { ...x, docType: e.target.value, subType: '' } : x))}
                        style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 7px', color: C.textMid, background: C.card, cursor: 'pointer', maxWidth: isMobile ? '100%' : 140, flex: isMobile ? 1 : undefined }}>
                        {docTypes.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                      </select>
                      {subValues.length > 0 && (
                        <select value={f.subType}
                          onChange={e => onChange(files.map(x => x.id === f.id ? { ...x, subType: e.target.value } : x))}
                          style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 7px', color: C.textMid, background: C.card, cursor: 'pointer', maxWidth: isMobile ? '100%' : 120, flex: isMobile ? 1 : undefined }}>
                          <option value="">Select…</option>
                          {subValues.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>
    </div>
  )
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ res, company }: { res: SubmitResult; company: PublicCompany | null }) {
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePdfClick = async () => {
    if (pdfLoading) return
    setPdfLoading(true)
    const triggerDownload = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
    try {
      const r = await publicAppService.downloadApplyPdf(res.lead_token)
      triggerDownload(r.data, extractPdfFilename(r.headers as Record<string, string>))
    } catch {
      try {
        const r = await publicAppService.downloadMerchantPdf(res.lead_token)
        triggerDownload(r.data, extractPdfFilename(r.headers as Record<string, string>))
      } catch { /* silent */ }
    } finally { setPdfLoading(false) }
  }

  const openPortal = () => window.open(res.merchant_url, '_blank')

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '52px 32px', textAlign: 'center' }}>
      {/* Success icon */}
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.successBg, border: `2px solid ${C.successBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 0 0 10px rgba(16,185,129,.08)' }}>
        <Check size={36} color={C.success} strokeWidth={2.5} />
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: '0 0 14px' }}>
        Application Submitted Successfully
      </h2>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, margin: '0 0 8px' }}>
        Your application has been received and is currently under review.
        You can access your application anytime using the button below.
      </p>
      <p style={{ fontSize: 13, color: C.subtle, margin: '0 0 36px' }}>
        We may contact you if additional information is required.
      </p>

      {/* Info badge */}
      <div style={{ background: C.indigoPale, border: `1px solid ${C.indigoLt}`, borderRadius: 12, padding: '14px 20px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        <ShieldCheck size={20} color={C.indigo} style={{ flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.indigo }}>Secure Application Portal</p>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, marginTop: 2 }}>
            Your information is protected. Access your application securely via the button below.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={openPortal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: C.indigo, color: 'white', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,.3)' }}>
          <CheckCircle2 size={17} /> Open My Application
        </button>
        <button type="button" onClick={handlePdfClick} disabled={pdfLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: C.card, color: C.textMid, border: `1.5px solid ${C.border}`, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: pdfLoading ? 'wait' : 'pointer' }}>
          {pdfLoading
            ? <><div style={{ width: 15, height: 15, border: `2px solid ${C.border}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Loading…</>
            : <><Printer size={16} />Download Application PDF</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ApplyPage() {
  const { affiliateCode } = useParams<{ affiliateCode: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['applyForm', affiliateCode],
    queryFn: () => publicAppService.getApplyForm(affiliateCode!).then(r => r.data.data),
    enabled: !!affiliateCode,
    retry: false,
  })

  // Dynamic document types — same data as the CRM document type manager.
  const { data: docTypeData } = useQuery({
    queryKey: ['pub-apply-doc-types', affiliateCode],
    queryFn: async () => (await publicAppService.getAffiliateDocumentTypes(affiliateCode!)).data?.data ?? [],
    enabled: !!affiliateCode,
    staleTime: 5 * 60 * 1000,
  })
  const docTypes: PublicDocumentType[] = docTypeData ?? []

  const company: PublicCompany | null = data?.company ?? null
  const sections: PublicFormSection[] = data?.sections ?? []

  const scrollRef = useRef<HTMLDivElement>(null)

  const [step, setStep]         = useState(0)
  const [form, setForm]         = useState<Record<string, string>>({})
  const [errs, setErrs]         = useState<Record<string, string>>({})
  const [sig, setSig]             = useState('')
  const [sigSaved, setSigSaved]   = useState(false)
  const [sig2, setSig2]           = useState('')
  const [sigSaved2, setSigSaved2] = useState(false)
  const [docs, setDocs]         = useState<UploadFile[]>([])
  const [submitting, setSub]    = useState(false)
  const [subErr, setSubErr]     = useState('')
  const [sigErr, setSigErr]     = useState('')
  const [result, setResult]     = useState<SubmitResult | null>(null)
  const [hasOwner2, setHasOwner2] = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Detect Owner 2 section
  const owner2SecIdx = sections.findIndex((s: PublicFormSection) =>
    s.title === 'Owner 2 Information' || s.title.toLowerCase().includes('owner 2')
  )
  const owner1SecIdx = owner2SecIdx >= 0
    ? sections.findIndex((s: PublicFormSection) => s.title === 'Owner Information' || s.title.toLowerCase().includes('owner info'))
    : -1

  // Build step map — always exclude Owner 2 (shown inline on Owner 1 step)
  type StepInfo = { type: 'section'; secIdx: number } | { type: 'sig' } | { type: 'doc' }
  const stepMap: StepInfo[] = [
    ...sections
      .map((_: PublicFormSection, i: number) => ({ type: 'section' as const, secIdx: i }))
      .filter((s: { type: 'section'; secIdx: number }) => s.secIdx !== owner2SecIdx),
    { type: 'sig' },
    { type: 'doc' },
  ]
  const allSteps = stepMap.map(s => s.type === 'section' ? sections[s.secIdx].title : s.type === 'sig' ? 'Digital Signature' : 'Documents')
  const TOTAL    = allSteps.length
  const curStepInfo = stepMap[step]
  const isSig    = curStepInfo?.type === 'sig'
  const isDoc    = curStepInfo?.type === 'doc'
  const isLast   = step === TOTAL - 1
  const curSecIdx = curStepInfo?.type === 'section' ? curStepInfo.secIdx : -1
  const curSec   = curSecIdx >= 0 ? sections[curSecIdx] : undefined
  const isOwner1Step = curSecIdx === owner1SecIdx && owner2SecIdx >= 0

  const toggleOwner2 = (checked: boolean) => setHasOwner2(checked)

  const change = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errs[k]) setErrs(e => { const n = { ...e }; delete n[k]; return n })
  }

  // ── Core validation — uses DB validation_rules when present, type fallback otherwise ──
  const runValidation = (): Record<string, string> => {
    if (!curSec || !curSec.fields || curSec.fields.length === 0) return {}
    const errors = validateSection(curSec.fields, form)
    // Also validate inline Owner 2 fields when on Owner 1 step
    if (isOwner1Step && hasOwner2 && owner2SecIdx >= 0 && sections[owner2SecIdx]) {
      Object.assign(errors, validateSection(sections[owner2SecIdx].fields, form))
    }
    return errors
  }

  const validate = (): boolean => {
    if (isSig) {
      const needPrimary = !sigSaved
      const needCoApplicant = hasOwner2 && !sigSaved2
      if (needPrimary || needCoApplicant) {
        const parts: string[] = []
        if (needPrimary) parts.push('applicant signature')
        if (needCoApplicant) parts.push('co-applicant signature')
        setSigErr(`Please save the ${parts.join(' and ')} before continuing.`)
        return false
      }
      return true
    }
    if (isDoc) return true
    const errors = runValidation()
    setErrs(errors)
    if (Object.keys(errors).length > 0) {
      scrollToFirstError(Object.keys(errors), scrollRef.current)
      return false
    }
    return true
  }

  // Navigate forward — ALWAYS validates first. Step NEVER changes on failure.
  const handleNext = () => {
    if (isSig) {
      const needPrimary = !sigSaved
      const needCoApplicant = hasOwner2 && !sigSaved2
      if (needPrimary || needCoApplicant) {
        const parts: string[] = []
        if (needPrimary) parts.push('applicant signature')
        if (needCoApplicant) parts.push('co-applicant signature')
        setSigErr(`Please save the ${parts.join(' and ')} before continuing.`)
        return
      }
      setSigErr('')
      setStep(s => Math.min(s + 1, TOTAL - 1))
      return
    }
    if (isDoc) {
      setStep(s => Math.min(s + 1, TOTAL - 1))
      return
    }
    const errors = runValidation()
    setErrs(errors)
    if (Object.keys(errors).length > 0) {
      scrollToFirstError(Object.keys(errors), scrollRef.current)
      return   // ← HARD STOP — page does NOT advance
    }
    setErrs({})
    setStep(s => Math.min(s + 1, TOTAL - 1))
  }

  const handleBack = () => { setStep(s => Math.max(s - 1, 0)); setErrs({}); setSubErr(''); setSigErr('') }

  // Sidebar / dot nav — backward always free, forward gates on validate()
  const handleStepNav = (target: number) => {
    if (target === step) return
    if (target > step && !validate()) return
    setErrs({})
    setSubErr('')
    setStep(target)
  }

  const submit = async () => {
    setSubErr(''); setSub(true)
    try {
      const payload = { ...form }
      if (sig) payload['signature_image'] = sig
      // Tell the backend whether an Owner 2 is being submitted so it can
      // skip required validation for Owner 2 fields when absent.
      payload['has_owner_2'] = hasOwner2 ? '1' : '0'
      // Only include Owner 2 data if toggle is checked
      if (hasOwner2 && sig2) payload['owner_2_signature_image'] = sig2
      if (!hasOwner2 && owner2SecIdx >= 0) {
        // Strip Owner 2 field values from payload
        const o2Fields = sections[owner2SecIdx]?.fields ?? []
        for (const f of o2Fields) delete payload[f.key]
        delete payload['owner_2_signature_image']
      }

      const res = await publicAppService.submitApplication(affiliateCode!, payload)
      const out = (res.data as unknown as SubmitResult).lead_token
        ? (res.data as unknown as SubmitResult)
        : (res.data as { data: SubmitResult }).data

      if (docs.length && out.lead_token) {
        for (const d of docs) {
          const label = d.subType ? `${d.docType} - ${d.subType}` : d.docType
          try { await publicAppService.uploadDocument(out.lead_token, d.file, label) } catch { /* non-fatal */ }
        }
      }
      setResult(out)
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      if (resp?.errors && Object.keys(resp.errors).length > 0) {
        // Flatten server field errors: { field_key: "first message" }
        const flat: Record<string, string> = {}
        Object.entries(resp.errors).forEach(([k, msgs]) => { flat[k] = Array.isArray(msgs) ? msgs[0] : String(msgs) })
        setErrs(flat)
        // Find the first section that contains an errored field and navigate to it
        const errorKeys = Object.keys(flat)
        // Find wizard step (not raw section index) that contains the errored field
        const targetStep = stepMap.findIndex(s =>
          s.type === 'section' && sections[s.secIdx]?.fields.some((f: PublicFormField) => errorKeys.includes(f.key))
        )
        if (targetStep >= 0) setStep(targetStep)
        setSubErr(resp.message || 'Please correct the highlighted fields.')
      } else {
        setSubErr(resp?.message || 'Submission failed. Please try again.')
      }
    } finally { setSub(false) }
  }

  // Step helpers
  const stepMeta = (title: string) => SMETA[title] ?? { icon: <FileText size={15} />, color: C.indigo }
  const curMeta  = stepMeta(allSteps[step] ?? '')

  const isStepDone = (i: number): boolean => {
    const info = stepMap[i]
    if (!info) return false
    if (info.type === 'section') {
      const sec = sections[info.secIdx]
      return sec.fields
        .filter((f: PublicFormField) => f.required)
        .every((f: PublicFormField) => !!(form[f.key] || '').trim())
    }
    if (info.type === 'sig') return sigSaved && (!hasOwner2 || sigSaved2)
    return docs.length > 0
  }

  const pct = TOTAL > 0 ? Math.round((step / TOTAL) * 100) : 0

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: `4px solid ${C.indigoLt}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .85s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Loading application…</p>
      </div>
    </div>
  )

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || (!isLoading && !data)) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'Application link not found or expired.'
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff', padding: 24 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ background: C.card, borderRadius: 20, padding: '48px 40px', textAlign: 'center', maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,.1)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.errorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <AlertCircle size={32} color={C.error} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 10px' }}>Link Not Found</h2>
          <p style={{ color: C.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>{msg}</p>
        </div>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (result) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", background: C.bg, overflow: 'hidden' }}>
      <style>{`*{box-sizing:border-box;-webkit-font-smoothing:antialiased}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <header style={{ height: 54, background: C.navy, display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, boxShadow: '0 1px 0 rgba(255,255,255,.06),0 2px 12px rgba(0,0,0,.2)', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {company?.logo_url
            ? <img src={company.logo_url} alt="logo" style={{ height: 30, borderRadius: 6, objectFit: 'contain', background: 'white', padding: '2px 6px' }} />
            : <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg,${C.indigo},#7c3aed)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 15 }}>{(company?.company_name || 'F').slice(0, 1)}</div>
          }
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{company?.company_name}</div>
            <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: 0.6 }}>FUNDING APPLICATION</div>
          </div>
        </div>
      </header>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: C.card, borderRadius: 20, maxWidth: 640, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,.1)' }}>
          <SuccessScreen res={result} company={company} />
        </div>
      </div>
    </div>
  )

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", background: C.bg, overflow: 'hidden' }}>
      <style>{`
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
        html,body{overflow:hidden;height:100%}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        .step-enter{animation:fadeSlide .22s ease}
        ::-webkit-scrollbar{width:0px}
        *{scrollbar-width:none}
      `}</style>

      {/* ── Header (54px) ── */}
      <header style={{ height: 54, background: C.navy, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 0 rgba(255,255,255,.06),0 2px 12px rgba(0,0,0,.2)', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {company?.logo_url
            ? <img src={company.logo_url} alt="logo" style={{ height: 30, borderRadius: 6, objectFit: 'contain', background: 'white', padding: '2px 6px' }} />
            : <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg,${C.indigo},#7c3aed)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 15 }}>{(company?.company_name || 'F').slice(0, 1)}</div>
          }
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{company?.company_name || 'Funding Application'}</div>
            <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: 0.6 }}>FUNDING APPLICATION</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {!isMobile && company?.company_phone && (
            <a href={`tel:${company.company_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: 12, textDecoration: 'none' }}>
              <Phone size={12} /> {formatPhoneNumber(company.company_phone)}
            </a>
          )}
          {!isMobile && company?.support_email && (
            <>
              <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,.15)' }} />
              <a href={`mailto:${company.support_email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: 12, textDecoration: 'none' }}>
                <Mail size={12} /> {company.support_email}
              </a>
            </>
          )}
          {!isMobile && <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,.15)' }} />}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}>
              <Clock size={12} />{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar (220px, hidden on mobile) ── */}
        <aside style={{ width: 220, background: C.sidebar, display: isMobile ? 'none' : 'flex', flexDirection: 'column', flexShrink: 0, borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {/* Progress bar */}
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7 }}>Progress</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? C.success : C.indigo }}>{pct}%</span>
            </div>
            <div style={{ background: C.border, borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: pct === 100 ? 'linear-gradient(90deg,#10b981,#4ade80)' : `linear-gradient(90deg,${C.indigo},#818cf8)`, transition: 'width .5s ease' }} />
            </div>
          </div>

          {/* Step nav */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {allSteps.map((title, i) => {
              const active = i === step
              const done   = isStepDone(i)
              const meta   = stepMeta(title)
              const color  = meta.color
              return (
                <button key={i} type="button" onClick={() => handleStepNav(i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: active ? `${color}22` : 'transparent', border: 'none', borderLeft: active ? `3px solid ${color}` : '3px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? `${color}18` : C.card2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? color : done ? C.success : C.muted, flexShrink: 0, position: 'relative' }}>
                    {meta.icon}
                    {done && !active && (
                      <div style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: '50%', background: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${C.card}` }}>
                        <Check size={7} color="white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? color : done ? C.success : C.textMid, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{done ? 'Complete' : active ? 'In progress' : 'Pending'}</div>
                  </div>
                  {active && <ChevronRight size={13} style={{ color, flexShrink: 0 }} />}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 11 }}>
              <ShieldCheck size={12} style={{ flexShrink: 0 }} /><span>Encrypted & secure</span>
            </div>
            {company?.support_email && (
              <a href={`mailto:${company.support_email}`} style={{ display: 'block', fontSize: 11, color: C.indigo, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>{company.support_email}</a>
            )}
          </div>
        </aside>

        {/* ── Main panel ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg }}>

          {/* Mobile progress bar */}
          {isMobile && (
            <div style={{ padding: '10px 16px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Step {step + 1} of {TOTAL}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? C.success : C.indigo }}>{pct}%</span>
              </div>
              <div style={{ background: C.border, borderRadius: 4, height: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(((step + 1) / TOTAL) * 100)}%`, height: '100%', borderRadius: 4, background: pct === 100 ? 'linear-gradient(90deg,#10b981,#4ade80)' : `linear-gradient(90deg,${C.indigo},#818cf8)`, transition: 'width .3s ease' }} />
              </div>
            </div>
          )}

          {/* Step header */}
          <div style={{ padding: isMobile ? '12px 16px 0' : '16px 28px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12 }}>
              <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: isMobile ? 10 : 12, background: `${curMeta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: curMeta.color, flexShrink: 0 }}>
                {curMeta.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 16, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{allSteps[step]}</h2>
                {!isMobile && (
                  <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                    {isSig
                      ? `Step ${step + 1} of ${TOTAL} · Sign below to authorize your application`
                      : isDoc
                        ? `Step ${step + 1} of ${TOTAL} · Upload supporting documents`
                        : `Step ${step + 1} of ${TOTAL} · ${curSec?.title ?? ''}`
                    }
                  </p>
                )}
              </div>
              {isStepDone(step) && (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: C.successBg, color: C.success, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.successBdr}`, flexShrink: 0 }}>
                  <CheckCircle2 size={12} /> Complete
                </span>
              )}
            </div>
          </div>

          {/* Step content */}
          <div key={step} className="step-enter" style={{ flex: 1, padding: isMobile ? '12px 16px' : '16px 28px', overflow: 'hidden' }}>
            {!isSig && !isDoc && curSec ? (
              /* ── Form step ── */
              <div ref={scrollRef} style={{ background: C.card, borderRadius: isMobile ? 12 : 16, border: `1.5px solid ${Object.keys(errs).length ? C.errorBdr : C.border}`, height: '100%', padding: isMobile ? '16px 14px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 2px 12px rgba(15,23,42,.05)', overflowY: 'auto' }}>
                {Object.keys(errs).length > 0 && (
                  <div style={{ background: C.errorBg, border: `1px solid ${C.errorBdr}`, borderRadius: 8, padding: '9px 13px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    Please fix {Object.keys(errs).length} error{Object.keys(errs).length > 1 ? 's' : ''} before continuing.
                  </div>
                )}
                {subErr && (
                  <div style={{ background: C.errorBg, border: `1px solid ${C.errorBdr}`, borderRadius: 8, padding: '9px 13px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{subErr}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 14, alignContent: 'start' }}>
                  {curSec.fields.map((f: PublicFormField) => (
                    <div key={f.key} style={{ gridColumn: !isMobile && f.type === 'textarea' ? '1 / -1' : undefined }}>
                      <FormField f={f} value={form[f.key] || ''} onChange={change} error={errs[f.key]} />
                    </div>
                  ))}
                </div>

                {/* ── Owner 2 toggle + inline fields (shown on Owner 1 step) ── */}
                {isOwner1Step && (
                  <>
                    <div style={{ paddingTop: 12, borderTop: `1px dashed ${C.border}` }}>
                      <label onClick={() => toggleOwner2(!hasOwner2)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${hasOwner2 ? '#0891b2' : C.border}`, background: hasOwner2 ? '#f0f9ff' : C.card2, transition: 'all .2s', userSelect: 'none' }}>
                        <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${hasOwner2 ? '#0891b2' : C.border}`, background: hasOwner2 ? '#0891b2' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                          {hasOwner2 && <Check size={11} color="white" strokeWidth={3} />}
                        </span>
                        <span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: hasOwner2 ? '#0e7490' : C.text, display: 'block', lineHeight: 1.3 }}>
                            This business has a second owner
                          </span>
                          <span style={{ fontSize: 11, color: C.muted }}>
                            {hasOwner2 ? 'Owner 2 fields shown below' : 'Check to add Owner 2 information'}
                          </span>
                        </span>
                        {hasOwner2 && (
                          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: '#e0f2fe', color: '#0891b2', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                            <Users size={11} /> Added
                          </span>
                        )}
                      </label>
                    </div>
                    {/* Inline Owner 2 fields */}
                    {hasOwner2 && owner2SecIdx >= 0 && sections[owner2SecIdx] && (
                      <div style={{ paddingTop: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: '#0e749018', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={13} color="#0e7490" />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0e7490' }}>Owner 2 Information</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 14, alignContent: 'start' }}>
                          {sections[owner2SecIdx].fields.map((f: PublicFormField) => (
                            <div key={f.key} style={{ gridColumn: !isMobile && f.type === 'textarea' ? '1 / -1' : undefined }}>
                              <FormField f={f} value={form[f.key] || ''} onChange={change} error={errs[f.key]} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : isSig ? (
              /* ── Dual Signature step — side by side ── */
              <div style={{ background: C.card, borderRadius: isMobile ? 12 : 16, border: `1.5px solid ${sigSaved && (!hasOwner2 || sigSaved2) ? C.successBdr : C.border}`, height: '100%', padding: isMobile ? '16px 14px' : '20px 24px', boxShadow: '0 2px 12px rgba(15,23,42,.05)', overflowY: 'auto' }}>
                <div style={{ background: '#f8f9ff', border: `1px solid ${C.indigoLt}`, borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <ShieldCheck size={14} style={{ flexShrink: 0 }} />
                  By signing, you certify that all information provided is accurate and complete.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: hasOwner2 && !isMobile ? '1fr 1fr' : '1fr', gap: 20 }}>
                  {/* ── Signature 1: Applicant ── */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: '#7c3aed18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit3 size={12} color="#7c3aed" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Applicant Signature</span>
                      <span style={{ fontSize: 11, color: C.error }}>*</span>
                      {sigSaved && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: C.success, fontSize: 11, fontWeight: 700 }}><CheckCircle2 size={12} />Saved</span>}
                    </div>
                    <SigPad onSave={(d) => { setSig(d); setSigSaved(!!d); if (d) setSigErr('') }} saved={sigSaved} savedDataUrl={sig} />
                  </div>

                  {/* ── Signature 2: Co-Applicant (only when Owner 2 checked) ── */}
                  {hasOwner2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', borderLeft: isMobile ? 'none' : `1px solid ${C.border}`, paddingLeft: isMobile ? 0 : 20, borderTop: isMobile ? `1px solid ${C.border}` : 'none', paddingTop: isMobile ? 20 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#0891b218', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Edit3 size={12} color="#0891b2" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Co-Applicant Signature</span>
                        <span style={{ fontSize: 11, color: C.error }}>*</span>
                        {sigSaved2 && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: C.success, fontSize: 11, fontWeight: 700 }}><CheckCircle2 size={12} />Saved</span>}
                      </div>
                      <SigPad onSave={(d) => { setSig2(d); setSigSaved2(!!d); if (d) setSigErr('') }} saved={sigSaved2} savedDataUrl={sig2} />
                    </div>
                  )}
                </div>
                {sigErr && (
                  <div style={{ background: C.errorBg, border: `1px solid ${C.errorBdr}`, borderRadius: 8, padding: '9px 13px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, marginTop: 12 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{sigErr}
                  </div>
                )}
              </div>
            ) : (
              /* ── Documents step ── */
              <div style={{ background: C.card, borderRadius: isMobile ? 12 : 16, border: `1.5px solid ${C.border}`, height: '100%', padding: isMobile ? '16px 14px' : '20px 24px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 12px rgba(15,23,42,.05)' }}>
                <DocUpload files={docs} onChange={setDocs} docTypes={docTypes} isMobile={isMobile} />
              </div>
            )}
          </div>

          {/* ── Bottom bar ── */}
          <div style={{ height: 52, background: C.card, borderTop: `1px solid ${C.border}`, padding: isMobile ? '0 12px' : '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 -2px 8px rgba(15,23,42,.05)' }}>
            <button type="button" onClick={handleBack} disabled={step === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '7px 16px', border: `1.5px solid ${step === 0 ? '#f1f5f9' : C.border}`, borderRadius: 8, background: 'transparent', color: step === 0 ? C.subtle : C.textMid, fontSize: 13, fontWeight: 600, cursor: step === 0 ? 'not-allowed' : 'pointer', transition: 'all .15s' }}>
              <ArrowLeft size={14} />{!isMobile && ' Back'}
            </button>

            {/* Step dots (hidden on mobile — progress bar shown at top instead) */}
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {allSteps.map((title, i) => (
                  <button key={i} type="button" onClick={() => handleStepNav(i)}
                    style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? stepMeta(title).color : isStepDone(i) ? C.success : C.border, border: 'none', cursor: 'pointer', padding: 0, transition: 'all .2s' }} />
                ))}
              </div>
            )}

            {isLast ? (
              <button type="button" onClick={submit} disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: isMobile ? '8px 14px' : '8px 20px', border: 'none', borderRadius: 8, background: submitting ? '#a5b4fc' : C.success, color: 'white', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 2px 8px rgba(16,185,129,.3)', transition: 'all .15s' }}>
                {submitting
                  ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Submitting…</>
                  : <><Check size={14} /> Submit</>
                }
              </button>
            ) : (
              <button type="button" onClick={handleNext}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: isMobile ? '8px 14px' : '8px 20px', border: 'none', borderRadius: 8, background: C.indigo, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,.3)', transition: 'all .15s' }}>
                Next <ArrowRight size={14} />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
