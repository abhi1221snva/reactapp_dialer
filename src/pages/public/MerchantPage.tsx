import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2, User, Users, BarChart2, DollarSign, Landmark, FileText,
  Check, X, Upload, Eye, EyeOff, Printer, Clock,
  AlertCircle, CheckCircle2, ShieldCheck, ChevronRight,
  Edit3, RefreshCw, ArrowLeft, ArrowRight, Trash2,
} from 'lucide-react'
import {
  publicAppService, extractPdfFilename,
  PublicFormSection, PublicFormField,
  MerchantDocument, PublicDocumentType,
} from '../../services/publicApp.service'
import { validateSection, scrollToFirstError, rulestoHtmlAttrs } from '../../utils/publicFormValidation'

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
  'Business Information':  { icon: <Building2 size={15} />, color: '#4f46e5', short: 'Business' },
  'Owner Information':     { icon: <User size={15} />,      color: '#0891b2', short: 'Owner 1'  },
  'Owner 2 Information':   { icon: <Users size={15} />,     color: '#0e7490', short: 'Owner 2'  },
  'Business Details':      { icon: <BarChart2 size={15} />, color: '#7c3aed', short: 'Details'  },
  'Funding Request':       { icon: <DollarSign size={15} />,color: '#059669', short: 'Funding'  },
  'Bank Information':      { icon: <Landmark size={15} />,  color: '#d97706', short: 'Banking'  },
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
const ext   = (n: string | null | undefined) => (n ?? '').split('.').pop()?.toLowerCase() ?? 'file'
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
  const dbAttrs = f.validation_rules?.length ? rulestoHtmlAttrs(f.validation_rules) : {}

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
    const t = { tel: 'tel', email: 'email', date: 'date', number: 'number' }[f.type] ?? 'text'
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

// ─── Signature pad ────────────────────────────────────────────────────────────
function SigPad({ token, existingUrl, onSaved, field = 'signature_image' }: {
  token: string; existingUrl: string | null; onSaved: (url: string) => void
  field?: 'signature_image' | 'owner_2_signature_image'
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
      const r = await publicAppService.saveSignature(token, ref.current!.toDataURL('image/png'), field)
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
const MAX_FILE_MB  = 10
const MAX_TOTAL_MB = 25
const MAX_FILE_B   = MAX_FILE_MB * 1024 * 1024
const MAX_TOTAL_B  = MAX_TOTAL_MB * 1024 * 1024

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

function DocStep({ token, docs, onUploaded }: { token: string; docs: MerchantDocument[]; onUploaded: () => void }) {
  const [over, setOver]               = useState(false)
  const [docType, setDocType]         = useState('')
  const [subType, setSubType]         = useState('')
  const [uploading, setUploading]     = useState(false)
  const [err, setErr]                 = useState('')
  const [deleting, setDeleting]       = useState<number | null>(null)
  // Viewer state
  const [viewDoc, setViewDoc]         = useState<{ id: number; filename: string } | null>(null)
  const [blobUrl, setBlobUrl]         = useState<string | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewErr, setViewErr]         = useState('')
  // Confirm-delete state
  const [confirmDoc, setConfirmDoc]   = useState<{ id: number; filename: string } | null>(null)
  const inp                           = useRef<HTMLInputElement>(null)

  const { data: typeData } = useQuery({
    queryKey: ['pub-doc-types', token],
    queryFn: async () => (await publicAppService.getDocumentTypes(token)).data?.data as PublicDocumentType[] ?? [],
    staleTime: 5 * 60 * 1000,
  })
  const types = typeData ?? []
  const selectedDocType = types.find(t => t.title === docType) ?? null
  const subValues = parseSubValues(selectedDocType?.values)
  const computedDocType = docType ? (subType ? `${docType} - ${subType}` : docType) : ''

  const validateFiles = (files: File[]): string | null => {
    for (const f of files) {
      if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
        return `"${f.name}" is not a PDF. Only PDF files are accepted.`
      }
      if (f.size > MAX_FILE_B) {
        return `"${f.name}" exceeds the ${MAX_FILE_MB} MB per-file limit.`
      }
    }
    const totalSize = files.reduce((s, f) => s + f.size, 0)
    if (totalSize > MAX_TOTAL_B) {
      return `Total batch size exceeds ${MAX_TOTAL_MB} MB. Please upload fewer files.`
    }
    return null
  }

  const uploadFiles = async (files: File[]) => {
    if (!docType) { setErr('Select a document type first.'); return }
    const ve = validateFiles(files)
    if (ve) { setErr(ve); return }
    setUploading(true); setErr('')
    try {
      for (const f of files) {
        await publicAppService.uploadDocument(token, f, computedDocType)
      }
      onUploaded()
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed.')
    } finally { setUploading(false) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) uploadFiles(files)
  }

  const handleConfirmDelete = async () => {
    if (!confirmDoc) return
    const docId = confirmDoc.id
    setConfirmDoc(null)
    setDeleting(docId); setErr('')
    try {
      await publicAppService.deleteDocument(token, docId)
      onUploaded()
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Delete failed.')
    } finally { setDeleting(null) }
  }

  const openViewer = async (doc: MerchantDocument) => {
    // Revoke previous blob URL to avoid memory leaks
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlobUrl(null); setViewErr(''); setViewLoading(true)
    setViewDoc({ id: doc.id, filename: doc.filename })
    try {
      const res = await publicAppService.fetchDocumentBlob(token, doc.id)
      const url = URL.createObjectURL(res.data)
      setBlobUrl(url)
    } catch {
      setViewErr('Could not load document. Please try again.')
    } finally { setViewLoading(false) }
  }

  const closeViewer = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlobUrl(null); setViewDoc(null); setViewErr(''); setViewLoading(false)
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>

      {/* ── Delete confirmation modal ── */}
      {confirmDoc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setConfirmDoc(null)}>
          <div style={{ background: C.card, borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', gap: 16 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.errorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} color={C.error} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: C.text }}>Delete Document?</p>
                <p style={{ margin: 0, fontSize: 12, color: C.muted, marginTop: 2 }}>This action cannot be undone.</p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.textMid, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', wordBreak: 'break-all' }}>
              {confirmDoc.filename}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirmDoc(null)}
                style={{ padding: '8px 20px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDelete}
                style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: C.error, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Inline PDF viewer modal ── */}
      {viewDoc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={closeViewer}>
          <div style={{ width: '100%', maxWidth: 860, height: '90vh', background: C.card, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,.4)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: C.navy, flexShrink: 0 }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 640 }}>{viewDoc.filename}</span>
              <button type="button" onClick={closeViewer}
                style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'white', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {viewLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, border: `3px solid ${C.indigoLt}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
                    <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Loading document…</p>
                  </div>
                </div>
              )}
              {viewErr && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
                  <div style={{ textAlign: 'center', color: C.muted }}>
                    <AlertCircle size={32} style={{ marginBottom: 12, color: C.error }} />
                    <p style={{ margin: 0, fontSize: 13 }}>{viewErr}</p>
                  </div>
                </div>
              )}
              {blobUrl && <iframe src={blobUrl} title={viewDoc.filename} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />}
            </div>
          </div>
        </div>
      )}

      {/* Left: upload */}
      <div style={{ flex: '0 0 360px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Document Type</label>
          <select value={docType} onChange={e => { setDocType(e.target.value); setSubType(''); setErr('') }}
            style={{ width: '100%', padding: '8px 11px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.card, cursor: 'pointer', outline: 'none', appearance: 'none', color: docType ? C.text : C.muted,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: 14 }}>
            <option value="">— Select type —</option>
            {types.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
          </select>
        </div>
        {subValues.length > 0 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Sub-Type</label>
            <select value={subType} onChange={e => setSubType(e.target.value)}
              style={{ width: '100%', padding: '8px 11px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.card, cursor: 'pointer', outline: 'none', appearance: 'none', color: subType ? C.text : C.muted,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: 14 }}>
              <option value="">Select {selectedDocType?.title} month</option>
              {subValues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        )}

        <div onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={handleDrop}
          onClick={() => !uploading && inp.current?.click()}
          style={{ flex: 1, border: `2px dashed ${over ? C.indigo : C.border}`, borderRadius: 12, background: over ? C.indigoPale : C.card2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: uploading ? 'wait' : 'pointer', transition: 'all .2s', padding: 20 }}>
          {uploading
            ? <><div style={{ width: 32, height: 32, border: `3px solid ${C.indigoLt}`, borderTopColor: C.indigo, borderRadius: '50%', animation: 'spin .8s linear infinite' }} /><p style={{ color: C.indigo, fontSize: 13, margin: 0, fontWeight: 600 }}>Uploading…</p></>
            : <><Upload size={26} style={{ color: over ? C.indigo : C.muted }} />
              <p style={{ fontWeight: 600, color: over ? C.indigo : C.text, margin: 0, fontSize: 14 }}>{over ? 'Drop here' : 'Drag & drop or click'}</p>
              <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>PDF only · max {MAX_FILE_MB} MB per file</p></>
          }
          <input ref={inp} type="file" accept=".pdf" multiple style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) { uploadFiles(Array.from(e.target.files)); e.target.value = '' } }} />
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
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
              {docs.map(d => {
                const e2 = ext(d.filename)
                const ec = EXT_COLORS[e2] ?? C.indigo
                const isDeleting = deleting === d.id
                return (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', opacity: isDeleting ? 0.5 : 1, transition: 'opacity .2s' }}>
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
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button type="button" onClick={() => openViewer(d)} disabled={viewLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', border: `1.5px solid ${C.border}`, borderRadius: 7, color: C.indigo, fontSize: 12, fontWeight: 600, background: C.card, cursor: viewLoading ? 'wait' : 'pointer' }}>
                        <Eye size={12} /> View
                      </button>
                      <button type="button" onClick={() => setConfirmDoc({ id: d.id, filename: d.filename })} disabled={isDeleting}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: `1.5px solid ${C.errorBdr}`, borderRadius: 7, color: C.error, background: C.errorBg, cursor: isDeleting ? 'wait' : 'pointer' }}>
                        {isDeleting ? <div style={{ width: 10, height: 10, border: `2px solid ${C.errorBdr}`, borderTopColor: C.error, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <Trash2 size={12} />}
                      </button>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MerchantPage() {
  const { leadToken } = useParams<{ leadToken: string }>()
  const qc            = useQueryClient()


  // Ref for the scrollable form card (used by scrollToFirstError)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Wizard state
  const [step, setStep]           = useState(0)
  const [finished, setFinished]   = useState(false)
  const [sigUrl, setSigUrl]       = useState<string | null>(null)
  const [sigUrl2, setSigUrl2]     = useState<string | null>(null)
  const [hasOwner2, setHasOwner2] = useState(false)
  // Per-section local edits: sectionIdx → { fieldKey: value }
  const [edits, setEdits]         = useState<Record<number, Record<string, string>>>({})
  const [fieldErrors, setFErrors] = useState<Record<string, string>>({})
  const [saveErr, setSaveErr]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['merchantPortal', leadToken],
    queryFn: () => publicAppService.getMerchantPortal(leadToken!).then(r => r.data.data),
    enabled: !!leadToken,
    retry: false,
  })

  useEffect(() => {
    if (data?.lead?.signature_url   !== undefined) setSigUrl(data.lead.signature_url)
    if (data?.lead?.signature_url_2 !== undefined) setSigUrl2(data.lead.signature_url_2)
  }, [data?.lead?.signature_url, data?.lead?.signature_url_2])

  // Auto-detect Owner 2 data — if any Owner 2 fields already have values, enable the toggle
  useEffect(() => {
    if (!data?.lead?.fields || !data?.sections) return
    const secs = data.sections as PublicFormSection[]
    const o2Idx = secs.findIndex((s: PublicFormSection) =>
      s.title === 'Owner 2 Information' || s.title.toLowerCase().includes('owner 2')
    )
    if (o2Idx < 0) return
    const o2Fields = secs[o2Idx]?.fields ?? []
    const hasData = o2Fields.some((f: PublicFormField) => !!(data.lead.fields[f.key] || '').trim())
    if (hasData) setHasOwner2(true)
  }, [data])

  const refresh = () => qc.invalidateQueries({ queryKey: ['merchantPortal', leadToken] })

  // Download the application as a real PDF file (Content-Disposition: attachment).
  // Falls back to the affiliate apply-form PDF endpoint if no CRM template exists.
  const handlePdfClick = async () => {
    if (pdfLoading || !leadToken) return
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
      const res = await publicAppService.downloadMerchantPdf(leadToken)
      triggerDownload(res.data, extractPdfFilename(res.headers as Record<string, string>))
    } catch {
      // Fallback: apply-form download endpoint
      try {
        const res = await publicAppService.downloadApplyPdf(leadToken)
        triggerDownload(res.data, extractPdfFilename(res.headers as Record<string, string>))
      } catch { /* silent — both endpoints failed */ }
    } finally { setPdfLoading(false) }
  }

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

  // ── Finished overlay ──────────────────────────────────────────────────────
  if (finished) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", background: C.bg, overflow: 'hidden' }}>
      <style>{`*{box-sizing:border-box;-webkit-font-smoothing:antialiased}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <header style={{ height: 54, background: C.navy, display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, boxShadow: '0 1px 0 rgba(255,255,255,.06),0 2px 12px rgba(0,0,0,.2)', zIndex: 20 }}>
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
      </header>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: C.card, borderRadius: 20, maxWidth: 580, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,.1)', padding: '52px 40px', textAlign: 'center' }}>
          {/* Success icon */}
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.successBg, border: `2px solid ${C.successBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 0 0 10px rgba(16,185,129,.08)' }}>
            <Check size={36} color={C.success} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: '0 0 14px' }}>
            Application Complete
          </h2>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, margin: '0 0 8px' }}>
            Your application has been saved and is currently under review.
            Our team will reach out if additional information is needed.
          </p>
          <p style={{ fontSize: 13, color: C.subtle, margin: '0 0 36px' }}>
            You can return to this portal at any time to make updates.
          </p>
          {/* Info badge */}
          <div style={{ background: C.indigoPale, border: `1px solid ${C.indigoLt}`, borderRadius: 12, padding: '14px 20px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
            <ShieldCheck size={20} color={C.indigo} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.indigo }}>Secure Application Portal</p>
              <p style={{ margin: 0, fontSize: 12, color: C.muted, marginTop: 2 }}>
                Your information is protected. You can re-open this page anytime using your unique link.
              </p>
            </div>
          </div>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setFinished(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: C.indigo, color: 'white', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,.3)' }}>
              <CheckCircle2 size={17} /> Return to Application
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
      </div>
    </div>
  )

  // ── Owner 2 detection ──────────────────────────────────────────────────────
  const owner2SecIdx = sections.findIndex((s: PublicFormSection) =>
    s.title === 'Owner 2 Information' || s.title.toLowerCase().includes('owner 2')
  )
  const owner1SecIdx = owner2SecIdx >= 0
    ? sections.findIndex((s: PublicFormSection) => s.title === 'Owner Information' || s.title.toLowerCase().includes('owner info'))
    : -1

  // ── Step map (always excludes Owner 2 — shown inline on Owner 1 step) ─────
  type StepInfo = { type: 'section'; secIdx: number } | { type: 'sig' } | { type: 'doc' }
  const stepMap: StepInfo[] = [
    ...sections
      .map((_: PublicFormSection, i: number) => ({ type: 'section' as const, secIdx: i }))
      .filter((s: { type: 'section'; secIdx: number }) => s.secIdx !== owner2SecIdx),
    { type: 'sig' },
    { type: 'doc' },
  ]
  const TOTAL  = stepMap.length
  const isLast = step === TOTAL - 1

  const curInfo  = stepMap[Math.min(step, TOTAL - 1)]
  const curSecIdx = curInfo.type === 'section' ? curInfo.secIdx : -1
  const curSec    = curSecIdx >= 0 ? sections[curSecIdx] as PublicFormSection : null

  // ── Field helpers ─────────────────────────────────────────────────────────
  const getVals = (secIdx: number, sec: PublicFormSection): Record<string, string> => {
    const base: Record<string, string> = {}
    sec.fields.forEach((f: PublicFormField) => { base[f.key] = lead.fields[f.key] || '' })
    return { ...base, ...(edits[secIdx] ?? {}) }
  }

  const setField = (secIdx: number, key: string, val: string) => {
    setEdits(prev => ({ ...prev, [secIdx]: { ...(prev[secIdx] ?? {}), [key]: val } }))
    setFErrors(prev => { const n = { ...prev }; delete n[key]; return n })
    setSaveErr('')
  }

  // ── Completion ────────────────────────────────────────────────────────────
  const hasSig    = !!sigUrl
  const totalReq  = sections.reduce((a: number, s: PublicFormSection) => a + s.fields.filter((f: PublicFormField) => f.required).length, 0)
  const filledReq = sections.reduce((a: number, s: PublicFormSection, i: number) => a + s.fields.filter((f: PublicFormField) => f.required && !!(getVals(i, s)[f.key] || '').trim()).length, 0)
  const pct       = totalReq + 1 > 0 ? Math.round(((filledReq + (hasSig ? 1 : 0)) / (totalReq + 1)) * 100) : 0

  // ── Toggle Owner 2 ────────────────────────────────────────────────────────
  const toggleOwner2 = (checked: boolean) => {
    setHasOwner2(checked)
    if (!checked && owner2SecIdx >= 0) {
    }
  }

  // ── Navigate next ─────────────────────────────────────────────────────────
  const handleNext = async () => {
    setSaveErr('')
    if (curInfo.type === 'section' && curSec) {
      const vals = getVals(curSecIdx, curSec)
      const errs = validateSection(curSec.fields, vals)
      // Also validate Owner 2 fields if toggle is on and we're on Owner 1 step
      if (isOwner1Step && hasOwner2 && owner2SecIdx >= 0 && sections[owner2SecIdx]) {
        const o2Vals = getVals(owner2SecIdx, sections[owner2SecIdx])
        const o2Errs = validateSection(sections[owner2SecIdx].fields, o2Vals)
        Object.assign(errs, o2Errs)
      }
      if (Object.keys(errs).length) {
        setFErrors(errs)
        scrollToFirstError(Object.keys(errs), scrollRef.current)
        return    // HARD STOP — do NOT save, do NOT advance
      }
      // Merge Owner 2 field values into save payload
      const saveVals = isOwner1Step && hasOwner2 && owner2SecIdx >= 0 && sections[owner2SecIdx]
        ? { ...vals, ...getVals(owner2SecIdx, sections[owner2SecIdx]) }
        : vals
      setSaving(true)
      try {
        await publicAppService.updateMerchant(leadToken!, saveVals)
        refresh(); setStep(s => s + 1); setFErrors({})
      } catch (e: unknown) {
        const resp = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
        if (resp?.errors && Object.keys(resp.errors).length > 0) {
          const flat: Record<string, string> = {}
          Object.entries(resp.errors).forEach(([k, msgs]) => { flat[k] = Array.isArray(msgs) ? msgs[0] : String(msgs) })
          setFErrors(flat)
          scrollToFirstError(Object.keys(flat), scrollRef.current)
        } else {
          setSaveErr(resp?.message || 'Save failed.')
        }
      } finally { setSaving(false) }
    } else {
      setStep(s => Math.min(s + 1, TOTAL - 1))
    }
  }

  const handleBack = () => { setStep(s => Math.max(s - 1, 0)); setFErrors({}); setSaveErr('') }

  // Sidebar / dot nav — backward free, forward requires validation
  const handleStepNav = (target: number) => {
    if (target === step) return
    if (target > step) {
      if (curInfo.type === 'section' && curSec) {
        const vals = getVals(curSecIdx, curSec)
        const errs = validateSection(curSec.fields, vals)
        if (Object.keys(errs).length) { setFErrors(errs); scrollToFirstError(Object.keys(errs), scrollRef.current); return }
      }
    } else {
      setFErrors({})
      setSaveErr('')
    }
    setStep(target)
  }

  // ── Step helpers ──────────────────────────────────────────────────────────
  const stepLabel = (info: StepInfo) => {
    if (info.type === 'section') return sections[info.secIdx].title
    if (info.type === 'sig')     return 'Digital Signature'
    return 'Documents'
  }
  const stepIcon = (info: StepInfo) => {
    if (info.type === 'section') return SMETA[sections[info.secIdx].title]?.icon ?? <FileText size={15} />
    if (info.type === 'sig')     return <Edit3 size={15} />
    return <FileText size={15} />
  }
  const stepColor = (info: StepInfo): string => {
    if (info.type === 'section') return SMETA[sections[info.secIdx].title]?.color ?? C.indigo
    if (info.type === 'sig')     return '#7c3aed'
    return '#9333ea'
  }
  const isStepDone = (info: StepInfo): boolean => {
    if (info.type === 'section') return isSectionComplete(sections[info.secIdx], getVals(info.secIdx, sections[info.secIdx]))
    if (info.type === 'sig')     return hasSig
    return (lead.documents?.length ?? 0) > 0
  }

  const showNextLabel = isLast ? 'Finish' : curInfo.type === 'section' ? 'Save & Next' : 'Next'
  const isOwner1Step  = curInfo.type === 'section' && curSecIdx === owner1SecIdx && owner2SecIdx >= 0

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
        .o2-toggle:hover{border-color:#0891b2 !important}
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
          <button type="button" onClick={handlePdfClick} disabled={pdfLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 7, color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: 600, cursor: pdfLoading ? 'wait' : 'pointer' }}>
            {pdfLoading ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <Printer size={12} />}
            {pdfLoading ? 'Loading…' : 'PDF'}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar (220px) ── */}
        <aside style={{ width: 220, background: C.sidebar, display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7 }}>Progress</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? C.success : C.indigo }}>{pct}%</span>
            </div>
            <div style={{ background: C.border, borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: pct === 100 ? 'linear-gradient(90deg,#10b981,#4ade80)' : `linear-gradient(90deg,${C.indigo},#818cf8)`, transition: 'width .5s ease' }} />
            </div>
          </div>

          <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {stepMap.map((info, i) => {
              const active = i === step
              const done   = isStepDone(info)
              const color  = stepColor(info)
              return (
                <button key={i} type="button" onClick={() => handleStepNav(i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: active ? `${color}22` : 'transparent', border: 'none', borderLeft: active ? `3px solid ${color}` : '3px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? `${color}18` : C.card2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? color : done ? C.success : C.muted, flexShrink: 0, position: 'relative' }}>
                    {stepIcon(info)}
                    {done && !active && (
                      <div style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: '50%', background: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${C.card}` }}>
                        <Check size={7} color="white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? color : done ? C.success : C.textMid, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stepLabel(info)}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{done ? 'Complete' : active ? 'In progress' : 'Pending'}</div>
                  </div>
                  {active && <ChevronRight size={13} style={{ color, flexShrink: 0 }} />}
                </button>
              )
            })}
          </nav>

          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 11 }}>
              <ShieldCheck size={12} style={{ flexShrink: 0 }} /><span>Encrypted & secure</span>
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
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stepColor(curInfo)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stepColor(curInfo) }}>
                {stepIcon(curInfo)}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>{stepLabel(curInfo)}</h2>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                  {curInfo.type === 'section'
                    ? `Step ${step + 1} of ${TOTAL} · ${sections[curSecIdx].title}`
                    : curInfo.type === 'sig'
                      ? `Step ${step + 1} of ${TOTAL} · Sign below to authorize your application`
                      : `Step ${step + 1} of ${TOTAL} · Upload supporting documents`
                  }
                </p>
              </div>
              {isStepDone(curInfo) && (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: C.successBg, color: C.success, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.successBdr}` }}>
                  <CheckCircle2 size={12} /> Complete
                </span>
              )}
            </div>
          </div>

          {/* Step content */}
          <div key={step} className="step-enter" style={{ flex: 1, padding: '16px 28px', overflow: 'hidden' }}>
            {curInfo.type === 'section' && curSec ? (
              /* ── Form step ── */
              <div ref={scrollRef} style={{ background: C.card, borderRadius: 16, border: `1.5px solid ${Object.keys(fieldErrors).length || saveErr ? C.errorBdr : C.border}`, height: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 2px 12px rgba(15,23,42,.05)', overflowY: 'auto' }}>
                {Object.keys(fieldErrors).length > 0 && (
                  <div style={{ background: C.errorBg, border: `1px solid ${C.errorBdr}`, borderRadius: 8, padding: '9px 13px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    Please fix {Object.keys(fieldErrors).length} error{Object.keys(fieldErrors).length > 1 ? 's' : ''} before continuing.
                  </div>
                )}
                {saveErr && (
                  <div style={{ background: C.errorBg, border: `1px solid ${C.errorBdr}`, borderRadius: 8, padding: '9px 13px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{saveErr}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, alignContent: 'start' }}>
                  {curSec.fields.map((f: PublicFormField) => (
                    <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
                      <FormField f={f} value={getVals(curSecIdx, curSec!)[f.key] || ''}
                        onChange={(k, v) => setField(curSecIdx, k, v)} error={fieldErrors[f.key]} />
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, alignContent: 'start' }}>
                          {sections[owner2SecIdx].fields.map((f: PublicFormField) => (
                            <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
                              <FormField f={f} value={getVals(owner2SecIdx, sections[owner2SecIdx])[f.key] || ''}
                                onChange={(k, v) => setField(owner2SecIdx, k, v)} error={fieldErrors[f.key]} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : curInfo.type === 'sig' ? (
              /* ── Dual Signature step — side by side ── */
              <div style={{ background: C.card, borderRadius: 16, border: `1.5px solid ${hasSig ? C.successBdr : C.border}`, height: '100%', padding: '20px 24px', boxShadow: '0 2px 12px rgba(15,23,42,.05)', overflowY: 'auto' }}>
                <div style={{ background: '#f8f9ff', border: `1px solid ${C.indigoLt}`, borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <ShieldCheck size={14} style={{ flexShrink: 0 }} />
                  By signing, you certify that all information provided is accurate and complete.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: hasOwner2 ? '1fr 1fr' : '1fr', gap: 20 }}>
                  {/* ── Signature 1: Applicant ── */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: '#7c3aed18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit3 size={12} color="#7c3aed" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Applicant Signature</span>
                      <span style={{ fontSize: 11, color: C.error }}>*</span>
                      {sigUrl && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: C.success, fontSize: 11, fontWeight: 700 }}><CheckCircle2 size={12} />Saved</span>}
                    </div>
                    <SigPad token={leadToken!} existingUrl={sigUrl} onSaved={url => { setSigUrl(url); refresh() }} field="signature_image" />
                  </div>

                  {/* ── Signature 2: Co-Applicant (only when Owner 2 checked) ── */}
                  {hasOwner2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${C.border}`, paddingLeft: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#0891b218', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Edit3 size={12} color="#0891b2" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Co-Applicant Signature</span>
                        <span style={{ fontSize: 11, color: C.muted, marginLeft: 2 }}>(optional)</span>
                        {sigUrl2 && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: C.success, fontSize: 11, fontWeight: 700 }}><CheckCircle2 size={12} />Saved</span>}
                      </div>
                      <SigPad token={leadToken!} existingUrl={sigUrl2} onSaved={url => { setSigUrl2(url); refresh() }} field="owner_2_signature_image" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Documents step ── */
              <div style={{ background: C.card, borderRadius: 16, border: `1.5px solid ${C.border}`, height: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 12px rgba(15,23,42,.05)' }}>
                <DocStep token={leadToken!} docs={lead.documents ?? []} onUploaded={refresh} />
              </div>
            )}
          </div>

          {/* ── Bottom bar ── */}
          <div style={{ height: 52, background: C.card, borderTop: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 -2px 8px rgba(15,23,42,.05)' }}>
            <button type="button" onClick={handleBack} disabled={step === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', border: `1.5px solid ${step === 0 ? '#f1f5f9' : C.border}`, borderRadius: 8, background: 'transparent', color: step === 0 ? C.subtle : C.textMid, fontSize: 13, fontWeight: 600, cursor: step === 0 ? 'not-allowed' : 'pointer', transition: 'all .15s' }}>
              <ArrowLeft size={14} /> Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {stepMap.map((info, i) => (
                <button key={i} type="button" onClick={() => handleStepNav(i)}
                  style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? stepColor(info) : isStepDone(info) ? C.success : C.border, border: 'none', cursor: 'pointer', padding: 0, transition: 'all .2s' }} />
              ))}
            </div>

            {isLast ? (
              <button type="button" onClick={() => setFinished(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', border: 'none', borderRadius: 8, background: C.success, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,.3)' }}>
                <Check size={14} /> Finish
              </button>
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
