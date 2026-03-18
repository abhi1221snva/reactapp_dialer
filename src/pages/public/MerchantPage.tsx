import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2, User, BarChart2, DollarSign, Landmark, FileText,
  Check, X, Upload, Eye, EyeOff, Printer, ExternalLink, Clock,
  AlertCircle, CheckCircle2, ShieldCheck, ChevronRight,
  Edit3, RefreshCw, ArrowLeft, ArrowRight,
} from 'lucide-react'
import {
  publicAppService,
  PublicFormSection, PublicFormField,
  MerchantDocument, PublicDocumentType,
} from '../../services/publicApp.service'

// ─── Tokens ───────────────────────────────────────────────────────────────────
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
const SMETA: Record<string, { icon: React.ReactNode; color: string; short: string }> = {
  'Business Information': { icon: <Building2 size={15} />, color: '#4f46e5', short: 'Business' },
  'Owner Information':    { icon: <User size={15} />,      color: '#0891b2', short: 'Owner'    },
  'Business Details':     { icon: <BarChart2 size={15} />, color: '#7c3aed', short: 'Details'  },
  'Funding Request':      { icon: <DollarSign size={15} />,color: '#059669', short: 'Funding'  },
  'Bank Information':     { icon: <Landmark size={15} />,  color: '#d97706', short: 'Banking'  },
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new_lead:     { label: 'New',         color: '#4338ca', bg: '#e0e7ff', dot: '#6366f1' },
  in_progress:  { label: 'In Progress', color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  under_review: { label: 'Under Review',color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  approved:     { label: 'Approved',    color: '#065f46', bg: '#d1fae5', dot: '#10b981' },
  funded:       { label: 'Funded',      color: '#064e3b', bg: '#bbf7d0', dot: '#22c55e' },
  declined:     { label: 'Declined',    color: '#7f1d1d', bg: '#fee2e2', dot: '#ef4444' },
  warm:         { label: 'In Review',   color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
}

const EXT_COLORS: Record<string, string> = {
  pdf: '#ef4444', jpg: '#3b82f6', jpeg: '#3b82f6', png: '#8b5cf6', doc: '#2563eb', docx: '#2563eb',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ext   = (n: string) => n.split('.').pop()?.toLowerCase() ?? 'file'
const fmtDt = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function isSectionComplete(sec: PublicFormSection, vals: Record<string, string>) {
  return sec.fields.filter(f => f.required).every(f => !!(vals[f.key] || '').trim())
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const m = STATUS_MAP[status] ?? { label: status.replace(/_/g, ' '), color: C.indigo, bg: C.indigoLt, dot: C.indigo }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: m.bg, color: m.color, fontWeight: 700, fontSize: 12, padding: '4px 11px 4px 8px', borderRadius: 20 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot }} />
      {m.label}
    </span>
  )
}

// ─── Compact field input ──────────────────────────────────────────────────────
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

  const input = (() => {
    if (f.type === 'select') return (
      <select value={value} onChange={e => onChange(f.key, e.target.value)} {...fb}
        style={{ ...base, appearance: 'none', cursor: 'pointer', paddingRight: 32,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: 14 }}>
        <option value="">Select…</option>
        {(f.options ?? []).map(o => <option key={o}>{o}</option>)}
      </select>
    )
    if (f.type === 'textarea') return (
      <textarea rows={2} value={value} onChange={e => onChange(f.key, e.target.value)} {...fb}
        style={{ ...base, resize: 'none', lineHeight: 1.5 }} />
    )
    if (f.type === 'ssn') return (
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={value} maxLength={11}
          placeholder="XXX-XX-XXXX" onChange={e => onChange(f.key, e.target.value)} {...fb}
          style={{ ...base, paddingRight: 38 }} />
        <button type="button" onClick={() => setShow(x => !x)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2, display: 'flex' }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    )
    const t = { tel: 'tel', email: 'email', date: 'date', number: 'number' }[f.type] ?? 'text'
    return <input type={t} value={value} onChange={e => onChange(f.key, e.target.value)}
      {...fb} placeholder={ph[f.type] ?? f.placeholder ?? ''} style={base} />
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

// ─── Signature pad ────────────────────────────────────────────────────────────
function SigPad({ token, existingUrl, onSaved }: {
  token: string; existingUrl: string | null; onSaved: (url: string) => void
}) {
  const ref    = useRef<HTMLCanvasElement>(null)
  const last   = useRef<{ x: number; y: number } | null>(null)
  const [mode, setMode]       = useState<'view' | 'draw'>(existingUrl ? 'view' : 'draw')
  const [drawing, setDrawing] = useState(false)
  const [hasLines, setHasLines] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  useEffect(() => {
    if (mode !== 'draw') return
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(30, 105); ctx.lineTo(570, 105); ctx.stroke()
    ctx.setLineDash([]); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    setHasLines(false)
  }, [mode])

  const pos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect()
    const sx = c.width / r.width, sy = c.height / r.height
    if ('touches' in e) return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy }
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); const c = ref.current; if (!c) return
    setDrawing(true); last.current = pos(e, c)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); if (!drawing) return
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    const p = pos(e, c)
    if (last.current) { ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasLines(true) }
    last.current = p
  }, [drawing])

  const endDraw = useCallback(() => { setDrawing(false); last.current = null }, [])

  const clear = () => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(30, 105); ctx.lineTo(570, 105); ctx.stroke()
    ctx.setLineDash([]); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5
    setHasLines(false)
  }

  const save = async () => {
    if (!hasLines) { setErr('Please draw your signature first.'); return }
    setSaving(true); setErr('')
    try {
      const r = await publicAppService.saveSignature(token, ref.current!.toDataURL('image/png'))
      onSaved(r.data.signature_url); setMode('view')
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save.')
    } finally { setSaving(false) }
  }

  if (mode === 'view' && existingUrl) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
      <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f0f4ff)', border: `2px solid ${C.successBdr}`, borderRadius: 16, padding: '18px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.success, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>
          <CheckCircle2 size={13} /> Signature on file
        </div>
        <img src={existingUrl} alt="Signature" style={{ maxHeight: 80, maxWidth: 400, filter: 'contrast(1.2)' }} />
        <p style={{ margin: 0, fontSize: 12, color: C.muted }}>This signature is included in your application PDF.</p>
      </div>
      <button type="button" onClick={() => setMode('draw')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 15px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <RefreshCw size={13} /> Retake
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {existingUrl && (
        <div style={{ background: C.amberBg, border: `1px solid ${C.amberBdr}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.amber, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={13} />Drawing a new signature replaces the current one.
        </div>
      )}
      <div style={{ border: `2px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', background: '#fafcff', touchAction: 'none', cursor: 'crosshair', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: C.subtle, pointerEvents: 'none', letterSpacing: 0.6 }}>SIGN ABOVE</div>
        <canvas ref={ref} width={600} height={130} style={{ display: 'block', width: '100%', height: 'auto' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
      </div>
      {err && <p style={{ margin: 0, fontSize: 12, color: C.error, display: 'flex', alignItems: 'center', gap: 5 }}><AlertCircle size={12} />{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={clear} style={{ padding: '7px 16px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
        {existingUrl && <button type="button" onClick={() => setMode('view')} style={{ padding: '7px 16px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>}
        <button type="button" onClick={save} disabled={saving || !hasLines}
          style={{ padding: '7px 20px', border: 'none', borderRadius: 8, background: saving || !hasLines ? '#c7d2fe' : C.indigo, color: 'white', fontSize: 13, fontWeight: 700, cursor: saving || !hasLines ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: saving || !hasLines ? 'none' : '0 2px 8px rgba(79,70,229,.3)' }}>
          {saving ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Saving…</> : <><Check size={13} />Save Signature</>}
        </button>
      </div>
    </div>
  )
}

// ─── Document step ────────────────────────────────────────────────────────────
function DocStep({ token, docs, onUploaded }: { token: string; docs: MerchantDocument[]; onUploaded: () => void }) {
  const [over, setOver]       = useState(false)
  const [docType, setDocType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [err, setErr]         = useState('')
  const inp                   = useRef<HTMLInputElement>(null)

  const { data: typeData } = useQuery({
    queryKey: ['pub-doc-types', token],
    queryFn: async () => (await publicAppService.getDocumentTypes(token)).data?.data as PublicDocumentType[] ?? [],
    staleTime: 5 * 60 * 1000,
  })
  const types = typeData ?? []

  const upload = async (file: File) => {
    if (!docType) { setErr('Select a document type first.'); return }
    setUploading(true); setErr('')
    try { await publicAppService.uploadDocument(token, file, docType); onUploaded() }
    catch (e: unknown) { setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed.') }
    finally { setUploading(false) }
  }

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) upload(f) }

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Left: upload */}
      <div style={{ flex: '0 0 360px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Document Type</label>
          <select value={docType} onChange={e => { setDocType(e.target.value); setErr('') }}
            style={{ width: '100%', padding: '8px 11px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.card, cursor: 'pointer', outline: 'none', appearance: 'none', color: docType ? C.text : C.muted,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: 14 }}>
            <option value="">— Select type —</option>
            {types.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
          </select>
        </div>

        <div onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={handleDrop}
          onClick={() => !uploading && inp.current?.click()}
          style={{ flex: 1, border: `2px dashed ${over ? C.indigo : C.border}`, borderRadius: 12, background: over ? C.indigoPale : C.card2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: uploading ? 'wait' : 'pointer', transition: 'all .2s', padding: 20 }}>
          {uploading
            ? <><div style={{ width: 32, height: 32, border: `3px solid ${C.indigoLt}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .8s linear infinite' }} /><p style={{ color: C.indigo, fontSize: 13, margin: 0, fontWeight: 600 }}>Uploading…</p></>
            : <><Upload size={26} style={{ color: over ? C.indigo : C.muted }} />
              <p style={{ fontWeight: 600, color: over ? C.indigo : C.text, margin: 0, fontSize: 14 }}>{over ? 'Drop here' : 'Drag & drop or click'}</p>
              <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>PDF, JPG, PNG, DOC — max 10 MB</p></>
          }
          <input ref={inp} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>

        {err && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBdr}`, borderRadius: 8, padding: '8px 12px', color: '#7f1d1d', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={13} />{err}</div>}
      </div>

      {/* Right: uploaded list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Uploaded Files</span>
          {docs.length > 0 && <span style={{ background: C.indigoLt, color: C.indigo, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>{docs.length}</span>}
        </div>
        {docs.length === 0
          ? <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.subtle, fontSize: 13 }}>
              <FileText size={32} style={{ opacity: .3 }} />
              <span>No documents uploaded yet</span>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map(d => {
                const e2 = ext(d.filename)
                const ec = EXT_COLORS[e2] ?? C.indigo
                return (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${ec}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={16} color={ec} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.filename}</p>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, background: `${ec}18`, color: ec, fontWeight: 700, padding: '1px 6px', borderRadius: 5, textTransform: 'uppercase' }}>{e2}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>{d.doc_type} · {fmtDt(d.uploaded)}</span>
                      </div>
                    </div>
                    <a href={d.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', border: `1.5px solid ${C.border}`, borderRadius: 7, color: C.indigo, fontSize: 12, fontWeight: 600, textDecoration: 'none', flexShrink: 0, background: C.card }}>
                      <ExternalLink size={12} /> View
                    </a>
                  </div>
                )
              })}
            </div>
        }
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MerchantPage() {
  const { leadToken } = useParams<{ leadToken: string }>()
  const qc            = useQueryClient()
  const apiBase       = import.meta.env.VITE_API_URL ?? ''

  // Wizard state
  const [step, setStep]         = useState(0)
  const [sigUrl, setSigUrl]     = useState<string | null>(null)
  // Per-section local edits: stepIdx → { fieldKey: value }
  const [edits, setEdits]       = useState<Record<number, Record<string, string>>>({})
  const [fieldErrors, setFErrors] = useState<Record<string, string>>({})
  const [saveErr, setSaveErr]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [stepSaved, setStepSaved] = useState<Record<number, boolean>>({})

  const { data, isLoading, error } = useQuery({
    queryKey: ['merchantPortal', leadToken],
    queryFn: () => publicAppService.getMerchantPortal(leadToken!).then(r => r.data.data),
    enabled: !!leadToken,
    retry: false,
  })

  useEffect(() => {
    if (data?.lead?.signature_url !== undefined) setSigUrl(data.lead.signature_url)
  }, [data?.lead?.signature_url])

  const refresh = () => qc.invalidateQueries({ queryKey: ['merchantPortal', leadToken] })

  // ── Loading ──
  if (isLoading) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: `4px solid ${C.indigoLt}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .85s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Loading your application…</p>
      </div>
    </div>
  )

  // ── Error ──
  if (error || !data) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Application not found or this link has expired.'
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff', padding: 24 }}>
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

  const { company, lead, sections } = data
  const pdfUrl = `${apiBase}/public/merchant/${leadToken}/render-pdf`

  // Steps: [section0, section1, ..., sectionN-1, signature, documents]
  const SIG_STEP  = sections.length
  const DOC_STEP  = sections.length + 1
  const TOTAL     = sections.length + 2
  const isLast    = step === TOTAL - 1

  // Get field values for a form step (merges lead.fields with local edits)
  const getVals = (idx: number, sec: PublicFormSection): Record<string, string> => {
    const base: Record<string, string> = {}
    sec.fields.forEach(f => { base[f.key] = lead.fields[f.key] || '' })
    return { ...base, ...(edits[idx] ?? {}) }
  }

  const setField = (idx: number, key: string, val: string) => {
    setEdits(prev => ({ ...prev, [idx]: { ...(prev[idx] ?? {}), [key]: val } }))
    setFErrors(prev => { const n = { ...prev }; delete n[key]; return n })
    setSaveErr('')
  }

  // Completion
  const totalReq   = sections.reduce((a: number, s: PublicFormSection) => a + s.fields.filter(f => f.required).length, 0)
  const filledReq  = sections.reduce((a: number, s: PublicFormSection, i: number) => a + s.fields.filter(f => f.required && !!(getVals(i, s)[f.key] || '').trim()).length, 0)
  const hasSig     = !!sigUrl
  const pct        = totalReq + 1 > 0 ? Math.round(((filledReq + (hasSig ? 1 : 0)) / (totalReq + 1)) * 100) : 0

  // Navigate next (with save for form steps)
  const handleNext = async () => {
    setSaveErr('')
    if (step < sections.length) {
      const sec  = sections[step]
      const vals = getVals(step, sec)

      // Validate required
      const errs: Record<string, string> = {}
      sec.fields.forEach(f => {
        if (f.required && !(vals[f.key] || '').trim()) errs[f.key] = 'Required'
        if (f.type === 'email' && vals[f.key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals[f.key])) errs[f.key] = 'Invalid email'
      })
      if (Object.keys(errs).length) { setFErrors(errs); return }

      setSaving(true)
      try {
        await publicAppService.updateMerchant(leadToken!, vals)
        setStepSaved(s => ({ ...s, [step]: true }))
        refresh()
        setStep(s => s + 1)
        setFErrors({})
      } catch (e: unknown) {
        setSaveErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed. Please try again.')
      } finally { setSaving(false) }
    } else {
      setStep(s => Math.min(s + 1, TOTAL - 1))
    }
  }

  const handleBack = () => { setStep(s => Math.max(s - 1, 0)); setFErrors({}); setSaveErr('') }

  const stepLabel = (i: number) => {
    if (i < sections.length) return sections[i].title
    if (i === SIG_STEP)  return 'Digital Signature'
    return 'Documents'
  }

  const stepIcon = (i: number) => {
    if (i < sections.length) return SMETA[sections[i].title]?.icon ?? <FileText size={15} />
    if (i === SIG_STEP)  return <Edit3 size={15} />
    return <FileText size={15} />
  }

  const stepColor = (i: number): string => {
    if (i < sections.length) return SMETA[sections[i].title]?.color ?? C.indigo
    if (i === SIG_STEP) return '#7c3aed'
    return '#9333ea'
  }

  const isStepDone = (i: number): boolean => {
    if (i < sections.length) return isSectionComplete(sections[i], getVals(i, sections[i]))
    if (i === SIG_STEP)      return hasSig
    return (lead.documents?.length ?? 0) > 0
  }

  const showNextLabel = isLast ? 'Finish' : step < sections.length ? 'Save & Next' : 'Next'

  // ── Render ──
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
          {company.logo_url
            ? <img src={company.logo_url} alt="logo" style={{ height: 30, borderRadius: 6, objectFit: 'contain', background: 'white', padding: '2px 6px' }} />
            : <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg,${C.indigo},#7c3aed)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 15 }}>{(company.company_name || 'M').slice(0, 1)}</div>
          }
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{company.company_name}</div>
            <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: 0.6 }}>MERCHANT APPLICATION</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StatusBadge status={lead.lead_status} />
          <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}>
            <Clock size={12} />{new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,.15)' }} />
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 7, color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <Printer size={12} /> PDF
          </a>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar (220px) ── */}
        <aside style={{ width: 220, background: C.sidebar, display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {/* Progress summary */}
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7 }}>Progress</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? C.success : C.indigo }}>{pct}%</span>
            </div>
            <div style={{ background: C.border, borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: pct === 100 ? 'linear-gradient(90deg,#10b981,#4ade80)' : `linear-gradient(90deg,${C.indigo},#818cf8)`, transition: 'width .5s ease' }} />
            </div>
          </div>

          {/* Steps list */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {Array.from({ length: TOTAL }, (_, i) => {
              const active = i === step
              const done   = isStepDone(i)
              const color  = stepColor(i)
              return (
                <button key={i} type="button" onClick={() => { setStep(i); setFErrors({}); setSaveErr('') }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: active ? `${color}22` : 'transparent', border: 'none', borderLeft: active ? `3px solid ${color}` : '3px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                  {/* Step icon */}
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? `${color}18` : C.card2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? color : done ? C.success : C.muted, flexShrink: 0, position: 'relative' }}>
                    {stepIcon(i)}
                    {done && !active && (
                      <div style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: '50%', background: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${C.card}` }}>
                        <Check size={7} color="white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  {/* Label */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? color : done ? C.success : C.textMid, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stepLabel(i)}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                      {done ? 'Complete' : active ? 'In progress' : 'Pending'}
                    </div>
                  </div>
                  {active && <ChevronRight size={13} style={{ color, flexShrink: 0 }} />}
                </button>
              )
            })}
          </nav>

          {/* Security note */}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 11 }}>
              <ShieldCheck size={12} style={{ flexShrink: 0 }} />
              <span>Encrypted & secure</span>
            </div>
            {company.support_email && (
              <a href={`mailto:${company.support_email}`} style={{ display: 'block', fontSize: 11, color: '#4f46e5', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>{company.support_email}</a>
            )}
          </div>
        </aside>

        {/* ── Main panel ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg }}>

          {/* Step header */}
          <div style={{ padding: '16px 28px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stepColor(step)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stepColor(step) }}>
                {stepIcon(step)}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>{stepLabel(step)}</h2>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                  {step < sections.length
                    ? (SMETA[sections[step].title]?.short ? `Step ${step + 1} of ${TOTAL} · ${sections[step].title}` : `Step ${step + 1} of ${TOTAL}`)
                    : step === SIG_STEP
                      ? `Step ${step + 1} of ${TOTAL} · Sign below to authorize your application`
                      : `Step ${step + 1} of ${TOTAL} · Upload supporting documents`
                  }
                </p>
              </div>
              {isStepDone(step) && (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: C.successBg, color: C.success, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.successBdr}` }}>
                  <CheckCircle2 size={12} /> Complete
                </span>
              )}
            </div>
          </div>

          {/* Step content area (fills, no visible scroll) */}
          <div key={step} className="step-enter" style={{ flex: 1, padding: '16px 28px', overflow: 'hidden' }}>
            {step < sections.length ? (
              /* ── Form step ── */
              <div style={{ background: C.card, borderRadius: 16, border: `1.5px solid ${saveErr ? C.errorBdr : C.border}`, height: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 2px 12px rgba(15,23,42,.05)' }}>
                {saveErr && (
                  <div style={{ background: C.errorBg, border: `1px solid ${C.errorBdr}`, borderRadius: 8, padding: '9px 13px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{saveErr}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, alignContent: 'start' }}>
                  {sections[step].fields.map(f => (
                    <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
                      <FormField
                        f={f}
                        value={getVals(step, sections[step])[f.key] || ''}
                        onChange={(k, v) => setField(step, k, v)}
                        error={fieldErrors[f.key]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : step === SIG_STEP ? (
              /* ── Signature step ── */
              <div style={{ background: C.card, borderRadius: 16, border: `1.5px solid ${hasSig ? C.successBdr : C.border}`, height: '100%', padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 2px 12px rgba(15,23,42,.05)' }}>
                <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: '#f8f9ff', border: `1px solid ${C.indigoLt}`, borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                    By signing, you certify that all information provided is accurate and complete.
                  </div>
                  <SigPad token={leadToken!} existingUrl={sigUrl} onSaved={url => { setSigUrl(url); refresh() }} />
                </div>
              </div>
            ) : (
              /* ── Documents step ── */
              <div style={{ background: C.card, borderRadius: 16, border: `1.5px solid ${C.border}`, height: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 12px rgba(15,23,42,.05)' }}>
                <DocStep token={leadToken!} docs={lead.documents ?? []} onUploaded={refresh} />
              </div>
            )}
          </div>

          {/* ── Bottom bar (52px) ── */}
          <div style={{ height: 52, background: C.card, borderTop: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 -2px 8px rgba(15,23,42,.05)' }}>
            {/* Back */}
            <button type="button" onClick={handleBack} disabled={step === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', border: `1.5px solid ${step === 0 ? '#f1f5f9' : C.border}`, borderRadius: 8, background: 'transparent', color: step === 0 ? C.subtle : C.textMid, fontSize: 13, fontWeight: 600, cursor: step === 0 ? 'not-allowed' : 'pointer', transition: 'all .15s' }}>
              <ArrowLeft size={14} /> Back
            </button>

            {/* Step indicator dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {Array.from({ length: TOTAL }, (_, i) => (
                <button key={i} type="button" onClick={() => { setStep(i); setFErrors({}); setSaveErr('') }}
                  style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? stepColor(i) : isStepDone(i) ? C.success : C.border, border: 'none', cursor: 'pointer', padding: 0, transition: 'all .2s' }} />
              ))}
            </div>

            {/* Save & Next / Finish */}
            {isLast ? (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', border: 'none', borderRadius: 8, background: C.success, color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(16,185,129,.3)' }}>
                <Printer size={14} /> Download PDF
              </a>
            ) : (
              <button type="button" onClick={handleNext} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', border: 'none', borderRadius: 8, background: saving ? '#a5b4fc' : C.indigo, color: 'white', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 2px 8px rgba(79,70,229,.3)', transition: 'all .15s' }}>
                {saving
                  ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Saving…</>
                  : <>{showNextLabel}<ArrowRight size={14} /></>
                }
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
