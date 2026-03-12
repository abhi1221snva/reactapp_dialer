import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X, Eye, FileText,
  Star, Code2, ChevronDown, ChevronUp, Copy, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { confirmDelete } from '../../utils/confirmDelete'

// ── Types ──────────────────────────────────────────────────────────────────────
interface PdfTemplate {
  id: number
  template_name: string
  template_html: string
  custom_type?: string
  subject?: string
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
  const qc      = useQueryClient()
  const isEdit  = !!editing
  const taRef   = useRef<HTMLTextAreaElement>(null)
  const [tab, setTab]               = useState<'edit' | 'preview'>('edit')
  const [name, setName]             = useState(editing?.template_name ?? '')
  const [html, setHtml]             = useState(editing?.template_html ?? STARTER_HTML)
  const [markAsApp, setMarkAsApp]   = useState(editing?.custom_type === 'signature_application')
  const [copied, setCopied]         = useState<string | null>(null)
  const [showFields, setShowFields] = useState(true)

  interface Placeholder { key: string; label: string; type: string; section: string; source: string }

  // Load ALL available placeholders from both old + new label systems
  const { data: placeholderData } = useQuery({
    queryKey: ['pdf-placeholders'],
    queryFn: async () => {
      const res = await crmService.getPdfPlaceholders()
      return (res.data?.data ?? res.data ?? []) as Placeholder[]
    },
    staleTime: 5 * 60 * 1000,
  })
  const allPlaceholders = placeholderData ?? []

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
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  function copyPlaceholder(key: string) {
    navigator.clipboard.writeText(key).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl mx-4 flex flex-col" style={{ minHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <FileText size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit PDF Template' : 'New PDF Template'}</h2>
              <p className="text-xs text-slate-400">Use <code className="bg-slate-100 px-1 rounded">[[field_key]]</code> as placeholders for lead data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left — editor */}
          <div className="flex-1 flex flex-col border-r border-slate-100 overflow-hidden">

            {/* Template name + options */}
            <div className="px-6 py-4 border-b border-slate-100 space-y-3 flex-shrink-0">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Template Name</label>
                <input
                  className="input w-full"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. MCA Application Form"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-indigo-600 w-4 h-4"
                  checked={markAsApp}
                  onChange={e => setMarkAsApp(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-semibold text-slate-700">Set as Application Template</span>
                  <p className="text-xs text-slate-400">Used when generating a lead's funding application PDF</p>
                </div>
                {markAsApp && (
                  <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    <Star size={10} /> ACTIVE
                  </span>
                )}
              </label>
            </div>

            {/* Edit / Preview tabs */}
            <div className="flex border-b border-slate-100 flex-shrink-0">
              {(['edit', 'preview'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    tab === t
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t === 'edit' ? <Code2 size={13} /> : <Eye size={13} />}
                  {t === 'edit' ? 'HTML Editor' : 'Live Preview'}
                </button>
              ))}
            </div>

            {/* Editor / Preview body */}
            <div className="flex-1 overflow-hidden relative">
              {tab === 'edit' ? (
                <textarea
                  ref={taRef}
                  id="pdf-template-body"
                  className="w-full h-full resize-none font-mono text-xs p-5 focus:outline-none border-0 bg-slate-50"
                  value={html}
                  onChange={e => setHtml(e.target.value)}
                  spellCheck={false}
                  style={{ lineHeight: 1.6 }}
                />
              ) : (
                <iframe
                  title="PDF Preview"
                  srcDoc={html}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-same-origin"
                />
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => mutation.mutate()}
                disabled={!name.trim() || !html.trim() || mutation.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {mutation.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><Check size={14} /> {isEdit ? 'Save Changes' : 'Create Template'}</>
                }
              </button>
              <button onClick={onClose} className="btn-outline">Cancel</button>
              {tab === 'edit' && (
                <button
                  onClick={() => setHtml(STARTER_HTML)}
                  className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Reset to starter template
                </button>
              )}
            </div>
          </div>

          {/* Right — placeholder picker */}
          <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-slate-100 cursor-pointer select-none"
              onClick={() => setShowFields(f => !f)}
            >
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Field Placeholders</span>
              {showFields ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </div>

            {showFields && (
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                <p className="text-[11px] text-slate-400">Click to insert at cursor position, or copy.</p>

                {/* All placeholders grouped by section */}
                {allPlaceholders.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Loading fields…</p>
                ) : (
                  (() => {
                    const sections = Array.from(new Set(allPlaceholders.map(f => f.section || 'Other')))
                    return sections.map(section => (
                      <div key={section}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">{section}</p>
                        <div className="space-y-1">
                          {allPlaceholders.filter(f => (f.section || 'Other') === section).map(f => (
                            <div key={f.key} className="flex items-center gap-1.5 group">
                              <button
                                onClick={() => insertPlaceholder(f.key)}
                                className="flex-1 text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 hover:border-indigo-200 transition-all"
                              >
                                <span className="font-mono text-[11px] truncate block">{f.key}</span>
                                {f.label && <span className="text-[10px] text-slate-400 block truncate">{f.label}</span>}
                              </button>
                              <button
                                onClick={() => copyPlaceholder(f.key)}
                                className="p-1.5 rounded text-slate-300 hover:text-indigo-500 transition-colors flex-shrink-0"
                                title="Copy"
                              >
                                {copied === f.key ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()
                )}

                {/* Tips */}
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-800 space-y-1.5">
                  <p className="font-bold">Tips</p>
                  <p>• <code className="bg-amber-100 px-1 rounded">[[field_key]]</code> — lead field value</p>
                  <p>• <code className="bg-amber-100 px-1 rounded">[[signature_image]]</code> — renders the lead's signature as an image</p>
                  <p>• Unknown placeholders are removed automatically when PDF is generated</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function CrmPdfTemplates() {
  const qc = useQueryClient()
  useCrmHeader()

  const [editingTemplate, setEditingTemplate] = useState<PdfTemplate | null | undefined>(undefined)
  // undefined = modal closed, null = creating new

  const { data, isLoading } = useQuery({
    queryKey: ['pdf-templates'],
    queryFn: async () => {
      const res = await crmService.getCustomTemplates({ start: 0, limit: 200 })
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data ?? []
      return raw as PdfTemplate[]
    },
  })

  const templates = data ?? []
  const appTemplate = templates.find(t => t.custom_type === 'signature_application')

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteCustomTemplate(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['pdf-templates'] }) },
    onError: () => toast.error('Delete failed'),
  })

  const setAppMutation = useMutation({
    mutationFn: async (tpl: PdfTemplate) => {
      // Un-set any existing app template
      if (appTemplate && appTemplate.id !== tpl.id) {
        await crmService.updateCustomTemplate(appTemplate.id, { custom_type: 'general' })
      }
      return crmService.updateCustomTemplate(tpl.id, { custom_type: 'signature_application' })
    },
    onSuccess: () => { toast.success('Set as Application Template'); qc.invalidateQueries({ queryKey: ['pdf-templates'] }) },
    onError: () => toast.error('Failed'),
  })

  return (
    <div className="space-y-6">

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4">
        <FileText size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-800">How PDF Templates Work</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Create an HTML template using <code className="bg-indigo-100 px-1 rounded font-mono">[[field_key]]</code> placeholders.
            Mark one template as the <strong>Application Template</strong> — it will be used when you click
            <em> Generate PDF Application</em> on any lead page.
          </p>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">PDF Templates</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
            {appTemplate ? ` · Application template: "${appTemplate.template_name}"` : ' · No application template set'}
          </p>
        </div>
        <button onClick={() => setEditingTemplate(null)} className="btn-primary">
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* Template list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <FileText size={28} className="text-slate-400" />
          </div>
          <p className="text-base font-bold text-slate-700">No PDF templates yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">Create your first template with the HTML editor and placeholder picker</p>
          <button onClick={() => setEditingTemplate(null)} className="btn-primary mt-5">
            <Plus size={14} /> Create Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map(tpl => {
            const isApp = tpl.custom_type === 'signature_application'
            return (
              <div
                key={tpl.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${
                  isApp ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                }`}
              >
                {/* Preview pane */}
                <div className="relative h-44 bg-slate-50 border-b border-slate-100 overflow-hidden">
                  <iframe
                    title={tpl.template_name}
                    srcDoc={tpl.template_html}
                    className="w-full h-full border-0 pointer-events-none"
                    style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}
                    sandbox="allow-same-origin"
                  />
                  {isApp && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow">
                      <Star size={10} /> APPLICATION
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800 truncate">{tpl.template_name}</p>
                    {tpl.created_at && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(tpl.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-auto flex-wrap">
                    <button
                      onClick={() => setEditingTemplate(tpl)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      <Pencil size={12} /> Edit
                    </button>

                    {!isApp && (
                      <button
                        onClick={() => setAppMutation.mutate(tpl)}
                        disabled={setAppMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        <Star size={12} /> Set as Application
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (await confirmDelete()) deleteMutation.mutate(tpl.id)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors ml-auto"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {editingTemplate !== undefined && (
        <TemplateModal
          editing={editingTemplate}
          onClose={() => setEditingTemplate(undefined)}
        />
      )}
    </div>
  )
}
