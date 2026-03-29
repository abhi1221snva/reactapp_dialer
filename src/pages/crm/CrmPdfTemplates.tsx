import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X,
  FileText, Star, Check, Search, Layers, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { confirmDelete } from '../../utils/confirmDelete'
import { PlaceholderPicker, type PickerPlaceholder } from '../../components/crm/PlaceholderPicker'
import { cn } from '../../utils/cn'

// ── Types ──────────────────────────────────────────────────────────────────────
interface PdfTemplate {
  id: number
  template_name: string
  template_html: string
  custom_type?: string
  created_at?: string
  updated_at?: string
}

// ── Starter template ───────────────────────────────────────────────────────────
const STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; margin: 0; padding: 40px; }
  h1 { font-size: 22px; color: #1e293b; margin-bottom: 4px; }
  .subtitle { color: #64748b; margin-bottom: 32px; font-size: 13px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; border-bottom: 2px solid #e0e7ff; padding-bottom: 6px; margin-bottom: 14px; }
  .row { display: flex; gap: 24px; margin-bottom: 12px; }
  .field { flex: 1; }
  .field label { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  .field .value { font-size: 13px; font-weight: 500; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; min-height: 20px; }
  .signature-row { display: flex; align-items: flex-end; gap: 40px; margin-top: 40px; }
  .sig-box { flex: 1; border-top: 1px solid #1e293b; padding-top: 8px; font-size: 11px; color: #64748b; }
</style>
</head>
<body>

<h1>Merchant Cash Advance Application</h1>
<p class="subtitle">Submitted via RocketDialer CRM · Date: [[lead_created_at]]</p>

<div class="section">
  <div class="section-title">Business Information</div>
  <div class="row">
    <div class="field"><label>Business Name</label><div class="value">[[company_name]]</div></div>
    <div class="field"><label>Industry</label><div class="value">[[industry_type]]</div></div>
  </div>
  <div class="row">
    <div class="field"><label>Address</label><div class="value">[[address]]</div></div>
    <div class="field"><label>City / State</label><div class="value">[[city]], [[state]]</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Owner Information</div>
  <div class="row">
    <div class="field"><label>Owner Name</label><div class="value">[[first_name]] [[last_name]]</div></div>
    <div class="field"><label>Email</label><div class="value">[[email]]</div></div>
  </div>
  <div class="row">
    <div class="field"><label>Phone</label><div class="value">[[phone_number]]</div></div>
    <div class="field"><label>Date of Birth</label><div class="value">[[dob]]</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Funding Request</div>
  <div class="row">
    <div class="field"><label>Amount Requested</label><div class="value">[[funding_amount]]</div></div>
    <div class="field"><label>Monthly Revenue</label><div class="value">[[monthly_revenue]]</div></div>
  </div>
  <div class="row">
    <div class="field"><label>Time in Business</label><div class="value">[[time_in_business]]</div></div>
    <div class="field"><label>Use of Funds</label><div class="value">[[use_of_funds]]</div></div>
  </div>
</div>

<div class="signature-row">
  <div class="sig-box">
    [[signature_image]]
    <div style="margin-top:8px">Applicant Signature</div>
  </div>
  <div class="sig-box">
    <div style="min-height:55px"></div>
    Date: [[lead_created_at]]
  </div>
</div>

</body>
</html>`

// ── Template Modal ─────────────────────────────────────────────────────────────
function TemplateModal({
  editing,
  onClose,
}: {
  editing?: PdfTemplate | null
  onClose: () => void
}) {
  const qc     = useQueryClient()
  const isEdit = !!editing
  const taRef  = useRef<HTMLTextAreaElement>(null)

  const [tab, setTab]             = useState<'edit' | 'preview'>('edit')
  const [name, setName]           = useState(editing?.template_name ?? '')
  const [html, setHtml]           = useState(editing?.template_html ?? STARTER_HTML)
  const [markAsApp, setMarkAsApp] = useState(editing?.custom_type === 'signature_application')

  const { data: placeholderData, isLoading: placeholdersLoading } = useQuery({
    queryKey: ['pdf-placeholders'],
    queryFn: async () => {
      const res = await crmService.getPdfPlaceholders()
      const raw = (res.data?.data ?? res.data ?? []) as Array<{
        key: string; label: string; section: string; type?: string
      }>
      return raw.map<PickerPlaceholder>(p => ({
        key:     `[[${p.key}]]`,
        label:   p.label,
        section: p.section,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
  const pickerPlaceholders = placeholderData ?? []

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        template_name: name.trim(),
        template_html: html,
        custom_type:   markAsApp ? 'signature_application' : (editing?.custom_type ?? 'general'),
      }
      return isEdit
        ? crmService.updateCustomTemplate(editing!.id, payload)
        : crmService.createCustomTemplate(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Template saved' : 'Template created')
      qc.invalidateQueries({ queryKey: ['pdf-templates'] })
      onClose()
    },
    onError: () => toast.error('Failed to save template'),
  })

  function insertPlaceholder(key: string) {
    const ta = taRef.current
    if (!ta) { setHtml(h => h + key); return }
    const s = ta.selectionStart, e = ta.selectionEnd
    const next = html.slice(0, s) + key + html.slice(e)
    setHtml(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(s + key.length, s + key.length)
    })
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card flex flex-col" style={{ maxWidth: 1040, width: '96vw', maxHeight: '92vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <FileText size={15} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-slate-900 leading-tight">
                {isEdit ? editing!.template_name : 'New PDF Template'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Use <code className="font-mono bg-slate-100 px-1 rounded text-slate-600 text-[10px]">{'[[field_key]]'}</code> placeholders for lead data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab toggle */}
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              {(['edit', 'preview'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn('px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all capitalize',
                    tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="action-btn"><X size={14} /></button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {tab === 'edit' ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: form */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 min-w-0">

                {/* Row: name + app template toggle */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Template Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="input w-full pl-8 text-sm"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. MCA Application Form"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-end pb-0.5">
                    <label className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        className="accent-indigo-600 w-4 h-4"
                        checked={markAsApp}
                        onChange={e => setMarkAsApp(e.target.checked)}
                      />
                      <div>
                        <p className="text-[13px] font-medium text-slate-700">Set as Application Template</p>
                        <p className="text-[11px] text-slate-400">Used when generating a lead's funding application PDF</p>
                      </div>
                      {markAsApp && (
                        <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex-shrink-0">
                          <Star size={10} /> ACTIVE
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                {/* HTML editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">HTML Body <span className="text-red-400">*</span></label>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {html.length > 0 ? `${html.length.toLocaleString()} chars` : ''}
                      </span>
                      <button
                        onClick={() => setHtml(STARTER_HTML)}
                        className="text-[11px] text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        Reset to starter
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-[11px] text-slate-400 font-mono ml-1">HTML Editor</span>
                    </div>
                    <textarea
                      ref={taRef}
                      id="pdf-template-body"
                      className="w-full font-mono text-[12px] p-4 resize-none outline-none bg-white text-slate-800 leading-relaxed"
                      rows={16}
                      value={html}
                      onChange={e => setHtml(e.target.value)}
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>

              {/* Right: placeholder picker */}
              <div className="w-60 border-l border-slate-100 flex-shrink-0 bg-slate-50/60 flex flex-col min-h-0">
                <PlaceholderPicker
                  placeholders={pickerPlaceholders}
                  loading={placeholdersLoading}
                  onInsert={insertPlaceholder}
                />
              </div>
            </div>

          ) : (
            /* Preview tab */
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
              <div className="max-w-3xl mx-auto">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400" />
                  <iframe
                    title="PDF Preview"
                    srcDoc={html}
                    className="w-full border-0 bg-white"
                    style={{ minHeight: 600 }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-100 bg-white flex-shrink-0">
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || !html.trim() || mutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {isEdit ? 'Save Changes' : 'Create Template'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
          {!name.trim() && <p className="text-[11px] text-slate-400 ml-1">Template name is required</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Left panel: single list item ─────────────────────────────────────────────
function ListItem({
  t, selected, onClick,
}: { t: PdfTemplate; selected: boolean; onClick: () => void }) {
  const isApp = t.custom_type === 'signature_application'
  const stripped = useMemo(() =>
    (t.template_html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100),
    [t.template_html]
  )
  return (
    <button onClick={onClick} className={cn(
      'w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group relative',
      selected && 'bg-indigo-50/70 border-l-[3px] border-l-indigo-500 hover:bg-indigo-50/80'
    )}>
      <div className="flex items-center gap-3">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5',
          isApp ? 'bg-amber-400' : 'bg-slate-300'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <p className={cn('text-[13px] font-semibold truncate', selected ? 'text-indigo-700' : 'text-slate-800')}>
              {t.template_name}
            </p>
            {isApp && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 uppercase tracking-wide flex-shrink-0">
                <Star size={8} /> App
              </span>
            )}
          </div>
          {t.created_at && (
            <p className="text-[11px] text-slate-400 truncate">
              {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {stripped && (
            <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-relaxed">{stripped}</p>
          )}
        </div>
        <ChevronRight size={11} className={cn('flex-shrink-0 transition-colors',
          selected ? 'text-indigo-400' : 'text-slate-200 group-hover:text-slate-300'
        )} />
      </div>
    </button>
  )
}

// ─── Right panel: preview ─────────────────────────────────────────────────────
function PreviewPanel({
  t, onEdit, onSetApp, onDelete, settingApp, deleting,
}: {
  t: PdfTemplate
  onEdit: () => void
  onSetApp: () => void
  onDelete: () => void
  settingApp: boolean
  deleting: boolean
}) {
  const isApp = t.custom_type === 'signature_application'
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            isApp ? 'bg-amber-50' : 'bg-slate-100'
          )}>
            <FileText size={14} className={isApp ? 'text-amber-500' : 'text-slate-400'} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900 text-[14px] truncate">{t.template_name}</p>
              {isApp && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 uppercase tracking-wide flex-shrink-0">
                  <Star size={8} /> Application
                </span>
              )}
            </div>
            {t.created_at && (
              <p className="text-[11px] text-slate-400">
                Created {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {/* Set as Application */}
          {!isApp && (
            <button onClick={onSetApp} disabled={settingApp}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50">
              {settingApp ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
              Set as Application
            </button>
          )}
          {/* Edit */}
          <button onClick={onEdit}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all">
            <Pencil size={11} /> Edit
          </button>
          {/* Delete */}
          <button onClick={onDelete} disabled={deleting}
            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-all">
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>

      {/* Preview body */}
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50/80">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400" />
            <iframe
              title={t.template_name}
              srcDoc={t.template_html}
              className="w-full border-0 bg-white"
              style={{ minHeight: 500 }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty select state ───────────────────────────────────────────────────────
function SelectPrompt() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-50/60 text-slate-300">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
        <FileText size={24} className="text-slate-300" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-400">Select a template</p>
        <p className="text-xs text-slate-300 mt-0.5">Click any template on the left to preview it</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function CrmPdfTemplates() {
  const qc = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()

  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<PdfTemplate | null>(null)
  const [selected, setSelected]       = useState<PdfTemplate | null>(null)
  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState<'all' | 'app' | 'general'>('all')

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit   = (t: PdfTemplate) => { setEditing(t); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  useEffect(() => {
    setDescription('HTML templates with dynamic placeholders for generating PDF applications')
    setActions(
      <button onClick={openCreate} className="btn-primary flex items-center gap-2">
        <Plus size={14} /> New Template
      </button>
    )
    return () => { setDescription(undefined); setActions(undefined) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['pdf-templates'],
    queryFn: async () => {
      const res = await crmService.getCustomTemplates({ start: 0, limit: 200 })
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data ?? []
      return raw as PdfTemplate[]
    },
  })

  const allTemplates = data ?? []
  const appCount     = allTemplates.filter(t => t.custom_type === 'signature_application').length
  const generalCount = allTemplates.length - appCount
  const appTemplate  = allTemplates.find(t => t.custom_type === 'signature_application')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allTemplates.filter(t => {
      const matchSearch = !q || t.template_name.toLowerCase().includes(q)
      const matchType   =
        typeFilter === 'all' ||
        (typeFilter === 'app'     && t.custom_type === 'signature_application') ||
        (typeFilter === 'general' && t.custom_type !== 'signature_application')
      return matchSearch && matchType
    })
  }, [allTemplates, search, typeFilter])

  // Keep selected in sync when data refreshes
  useEffect(() => {
    if (selected && data) {
      const updated = data.find(t => t.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteCustomTemplate(id),
    onSuccess: () => {
      toast.success('Template deleted')
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['pdf-templates'] })
    },
    onError: () => toast.error('Delete failed'),
  })

  const setAppMutation = useMutation({
    mutationFn: async (tpl: PdfTemplate) => {
      if (appTemplate && appTemplate.id !== tpl.id) {
        await crmService.updateCustomTemplate(appTemplate.id, {
          template_name: appTemplate.template_name,
          template_html: appTemplate.template_html,
          custom_type: 'general',
        })
      }
      return crmService.updateCustomTemplate(tpl.id, {
        template_name: tpl.template_name,
        template_html: tpl.template_html,
        custom_type: 'signature_application',
      })
    },
    onSuccess: () => {
      toast.success('Set as Application Template')
      qc.invalidateQueries({ queryKey: ['pdf-templates'] })
    },
    onError: () => toast.error('Failed'),
  })

  const handleDelete = async (t: PdfTemplate) => {
    if (await confirmDelete(t.template_name)) deleteMutation.mutate(t.id)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Compact header strip ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Stats chips */}
        {allTemplates.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <Layers size={12} className="text-indigo-500" /> {allTemplates.length} total
            </span>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <Star size={10} className="text-amber-500" /> {appCount} application
            </span>
            {generalCount > 0 && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> {generalCount} general
              </span>
            )}
          </div>
        )}

        {/* Search + filter */}
        {allTemplates.length > 0 && (
          <>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input className="input w-full pl-9 text-sm h-9" placeholder="Search templates…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
              {(['all', 'app', 'general'] as const).map(s => (
                <button key={s} onClick={() => setTypeFilter(s)}
                  className={cn('px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all',
                    typeFilter === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}>
                  {s === 'app' ? 'Application' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Main panel ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>

      ) : allTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-20 px-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <FileText size={26} className="text-indigo-400" />
          </div>
          <p className="font-semibold text-slate-800 text-base">No PDF templates yet</p>
          <p className="text-sm mt-1.5 text-slate-400 max-w-xs mx-auto">
            Create your first template with the HTML editor and placeholder picker
          </p>
          <button onClick={openCreate} className="btn-primary mt-5 inline-flex items-center gap-2">
            <Plus size={14} /> Create Template
          </button>
        </div>

      ) : (
        /* ── Two-panel layout ── */
        <div className="flex rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 min-h-0" style={{ minHeight: 520 }}>

          {/* Left: template list */}
          <div className="w-[340px] flex-shrink-0 border-r border-slate-100 flex flex-col">

            {/* List header */}
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 flex-shrink-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                {filtered.length} template{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Search size={22} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-xs font-medium text-slate-400">No templates match</p>
                  <button onClick={() => { setSearch(''); setTypeFilter('all') }}
                    className="text-[11px] text-indigo-500 hover:underline mt-1">Clear filters</button>
                </div>
              ) : (
                filtered.map(t => (
                  <ListItem
                    key={t.id}
                    t={t}
                    selected={selected?.id === t.id}
                    onClick={() => setSelected(t)}
                  />
                ))
              )}
            </div>

            {/* Add button at bottom */}
            <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
              <button onClick={openCreate}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-300 text-[12px] font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all">
                <Plus size={13} /> New Template
              </button>
            </div>
          </div>

          {/* Right: preview */}
          <div className="flex-1 min-w-0 flex flex-col">
            {selected ? (
              <PreviewPanel
                t={selected}
                onEdit={() => openEdit(selected)}
                onSetApp={() => setAppMutation.mutate(selected)}
                onDelete={() => handleDelete(selected)}
                settingApp={setAppMutation.isPending}
                deleting={deleteMutation.isPending}
              />
            ) : (
              <SelectPrompt />
            )}
          </div>
        </div>
      )}

      {showModal && (
        <TemplateModal editing={editing} onClose={closeModal} />
      )}
    </div>
  )
}
