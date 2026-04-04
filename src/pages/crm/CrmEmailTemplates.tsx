import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X, Check, Mail,
  Search, AtSign, Zap, FileText,
  ToggleLeft, ToggleRight, ChevronRight, Inbox, Eye, Code,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { EmailTemplate } from '../../types/crm.types'
import { EMAIL_TYPES } from '../../types/crm.types'
import { confirmDelete } from '../../utils/confirmDelete'
import { PlaceholderPicker, type PickerPlaceholder } from '../../components/crm/PlaceholderPicker'
import { RichEmailEditor, type RichEmailEditorRef } from '../../components/crm/RichEmailEditor'
import { cn } from '../../utils/cn'

const EMAIL_PICKER_TIPS = [
  "[[field_key]] — replaced with lead's value",
  'Includes all custom CRM Labels',
  'Click a variable to insert at cursor',
]

// Mock data for preview mode
const PREVIEW_VARS: Record<string, string> = {
  '[[first_name]]': 'John', '[[last_name]]': 'Smith', '[[email]]': 'john.smith@example.com',
  '[[phone]]': '(555) 123-4567', '[[company_name]]': 'Acme Industries LLC',
  '[[business_phone]]': '(555) 987-6543', '[[business_city]]': 'Miami',
  '[[business_state]]': 'FL', '[[amount_requested]]': '$150,000',
  '[[lead_status]]': 'Approved', '[[assigned_to]]': 'Jane Doe',
  '[[dob]]': '01/15/1985', '[[city]]': 'Miami', '[[home_state]]': 'FL',
}

function replaceVarsWithMock(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, (match) => PREVIEW_VARS[match] ?? match)
}

// ─── Form types ───────────────────────────────────────────────────────────────
interface FormState {
  template_name: string
  subject: string
  template_html: string
  lead_status: string
  send_bcc: string
  email_type: string
}
const EMPTY_FORM: FormState = {
  template_name: '', subject: '', template_html: '', lead_status: '', send_bcc: '0', email_type: 'general',
}

// ─── Editor Modal ─────────────────────────────────────────────────────────────
function TemplateModal({
  editing, onClose, onSaved,
}: {
  editing?: EmailTemplate | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc     = useQueryClient()
  const isEdit = !!editing

  const { data: placeholders, isLoading: placeholdersLoading } = useQuery({
    queryKey: ['pdf-placeholders'],
    queryFn: async () => {
      const res = await crmService.getPdfPlaceholders()
      const raw = (res.data?.data ?? res.data ?? []) as Array<{ key: string; label: string; section: string }>
      return raw.map<PickerPlaceholder>(p => ({ key: `[[${p.key}]]`, label: p.label, section: p.section }))
    },
    staleTime: 5 * 60 * 1000,
  })

  const [form, setForm] = useState<FormState>(
    editing
      ? { template_name: editing.template_name, subject: editing.subject, template_html: editing.template_html, lead_status: editing.lead_status ?? '', send_bcc: editing.send_bcc ?? '0', email_type: editing.email_type ?? 'general' }
      : EMPTY_FORM
  )
  const [tab, setTab] = useState<'edit' | 'preview' | 'html'>('edit')

  // Track which field was last focused: 'subject' or 'body'
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body')
  const subjectRef = useRef<HTMLInputElement>(null)
  const editorRef  = useRef<RichEmailEditorRef>(null)

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Smart variable insertion — insert into whichever field was last focused
  const insertVar = useCallback((v: string) => {
    if (activeField === 'subject' && subjectRef.current) {
      const el = subjectRef.current
      const s = el.selectionStart ?? form.subject.length
      const e = el.selectionEnd ?? s
      const newVal = form.subject.slice(0, s) + v + form.subject.slice(e)
      set('subject', newVal)
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + v.length, s + v.length) })
    } else {
      // Insert into WYSIWYG editor
      if (editorRef.current) {
        editorRef.current.insertAtCursor(v)
      } else {
        set('template_html', form.template_html + v)
      }
    }
  }, [activeField, form.subject, form.template_html])

  // Sync editor content when switching tabs
  const handleTabChange = useCallback((newTab: 'edit' | 'preview' | 'html') => {
    // When leaving edit tab, reset init flag so editor gets content on re-mount
    if (tab === 'edit' && newTab !== 'edit') {
      editorInitialized.current = false
    }
    setTab(newTab)
  }, [tab])

  // Set initial content once editor mounts (or re-mounts after tab switch)
  const editorInitialized = useRef(false)
  const handleEditorChange = useCallback((html: string) => {
    set('template_html', html)
  }, [])

  useEffect(() => {
    if (editorRef.current && !editorInitialized.current) {
      editorRef.current.setContent(form.template_html || '')
      editorInitialized.current = true
    }
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        template_name: form.template_name, subject: form.subject,
        template_html: form.template_html, send_bcc: form.send_bcc,
        email_type: form.email_type || 'general',
        ...(form.lead_status ? { lead_status: form.lead_status } : {}),
      }
      return isEdit ? crmService.updateEmailTemplate(editing!.id, payload) : crmService.createEmailTemplate(payload)
    },
    onSuccess: () => { toast.success(isEdit ? 'Template updated' : 'Template created'); qc.invalidateQueries({ queryKey: ['email-templates'] }); onSaved() },
    onError: () => toast.error('Failed to save template'),
  })

  const canSave = form.template_name.trim() && form.subject.trim()

  return (
    <div className="modal-backdrop">
      <div className="modal-card flex flex-col" style={{ maxWidth: 1200, width: '96vw', maxHeight: '94vh' }}>

        {/* ── Sticky Header ── */}
        <div className="flex-shrink-0 border-b border-slate-100 bg-white">
          {/* Top row: title + close */}
          <div className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Mail size={16} className="text-indigo-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 leading-tight">
                  {isEdit ? 'Edit Template' : 'New Email Template'}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use <code className="font-mono bg-slate-100 px-1 rounded text-slate-600 text-[10px]">{'[[variable]]'}</code> syntax to personalize
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Tab toggle */}
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                {[
                  { key: 'edit' as const, label: 'Editor', icon: Pencil },
                  { key: 'preview' as const, label: 'Preview', icon: Eye },
                  { key: 'html' as const, label: 'HTML', icon: Code },
                ].map(t => (
                  <button key={t.key} onClick={() => handleTabChange(t.key)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all',
                      tab === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}>
                    <t.icon size={11} />
                    {t.label}
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Sticky field row — always visible */}
          <div className="px-6 pb-4 space-y-3">
            {/* Row 1: name + type + trigger */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Template Name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input w-full pl-8 text-sm" placeholder="e.g. Welcome Email"
                    value={form.template_name} onChange={e => set('template_name', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Template Type</label>
                <select className="input w-full text-sm" value={form.email_type} onChange={e => set('email_type', e.target.value)}>
                  {EMAIL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Lead Status Trigger <span className="text-slate-400 font-normal text-[11px]">(optional)</span></label>
                <div className="relative">
                  <Zap size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input w-full pl-8 text-sm" placeholder="e.g. Approved, Funded…"
                    value={form.lead_status} onChange={e => set('lead_status', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Row 2: subject + BCC */}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="label">Subject Line <span className="text-red-400">*</span></label>
                <input
                  ref={subjectRef}
                  className="input w-full text-sm"
                  placeholder="Hi [[first_name]], your application update…"
                  value={form.subject}
                  onChange={e => set('subject', e.target.value)}
                  onFocus={() => setActiveField('subject')}
                />
              </div>
              <div className="flex flex-col justify-end pb-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  <input type="checkbox" className="accent-indigo-600 w-4 h-4"
                    checked={form.send_bcc === '1'} onChange={e => set('send_bcc', e.target.checked ? '1' : '0')} />
                  <div>
                    <p className="text-[13px] font-medium text-slate-700">Send BCC</p>
                    <p className="text-[11px] text-slate-400">Agent gets a copy</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {tab === 'edit' ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: WYSIWYG editor */}
              <div className="flex-1 overflow-y-auto p-5 min-w-0" onFocus={() => setActiveField('body')}>
                <RichEmailEditor
                  ref={editorRef}
                  onChange={handleEditorChange}
                  placeholder="Start writing your email template..."
                  minHeight="320px"
                />
              </div>

              {/* Right: placeholder picker */}
              <div className="w-60 border-l border-slate-100 flex-shrink-0 bg-slate-50/60 flex flex-col min-h-0">
                <PlaceholderPicker placeholders={placeholders ?? []} loading={placeholdersLoading} onInsert={insertVar} tipLines={EMAIL_PICKER_TIPS} />
              </div>
            </div>

          ) : tab === 'html' ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Raw HTML editor */}
              <div className="flex-1 overflow-y-auto p-5 min-w-0">
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-[11px] text-slate-400 font-mono ml-1">HTML Source</span>
                    <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
                      {form.template_html.length > 0 ? `${form.template_html.length.toLocaleString()} chars` : ''}
                    </span>
                  </div>
                  <textarea
                    className="w-full font-mono text-[12px] p-4 resize-none outline-none bg-white text-slate-800 leading-relaxed"
                    rows={20}
                    value={form.template_html}
                    onChange={e => set('template_html', e.target.value)}
                    placeholder={'<p>Dear [[first_name]],</p>\n<p>Your application has been received.</p>'}
                  />
                </div>
              </div>

              {/* Right: placeholder picker */}
              <div className="w-60 border-l border-slate-100 flex-shrink-0 bg-slate-50/60 flex flex-col min-h-0">
                <PlaceholderPicker placeholders={placeholders ?? []} loading={placeholdersLoading} onInsert={insertVar} tipLines={EMAIL_PICKER_TIPS} />
              </div>
            </div>

          ) : (
            /* Preview tab */
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100/80">
              <div className="max-w-2xl mx-auto py-8 px-5 space-y-4">

                {/* Preview banner */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50">
                  <Eye size={13} className="text-sky-500 flex-shrink-0" />
                  <p className="text-xs text-sky-700">
                    Preview mode — variables are replaced with sample data
                  </p>
                </div>

                {form.lead_status && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
                    <Zap size={13} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Auto-sends when lead status changes to{' '}
                      <strong className="font-semibold">{form.lead_status}</strong>
                    </p>
                  </div>
                )}

                {/* Email card preview */}
                <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                  {/* Accent bar */}
                  <div className="h-1 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400" />

                  {/* Header */}
                  <div className="px-6 py-4 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px] w-14 text-right flex-shrink-0 font-medium">From</span>
                      <span className="text-slate-700 text-[12px] font-medium">Your Company &lt;noreply@company.com&gt;</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px] w-14 text-right flex-shrink-0 font-medium">To</span>
                      <span className="text-slate-700 text-[12px] font-medium">John Smith &lt;john.smith@example.com&gt;</span>
                    </div>
                    {form.send_bcc === '1' && (
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-[11px] w-14 text-right flex-shrink-0 font-medium">BCC</span>
                        <span className="text-slate-600 font-mono text-[11px]">Assigned agent (auto)</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3 border-t border-slate-200 pt-2.5">
                      <span className="text-slate-400 text-[11px] w-14 text-right flex-shrink-0 mt-0.5 font-medium">Subject</span>
                      <span className="font-semibold text-slate-900 text-sm">
                        {replaceVarsWithMock(form.subject) || <span className="text-slate-400 font-normal italic text-xs">No subject</span>}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-8 py-8 min-h-[200px] text-sm text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: replaceVarsWithMock(form.template_html) ||
                        '<p style="color:#9CA3AF;font-style:italic;font-size:13px">No content yet — switch to Editor tab to write your email.</p>',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Footer ── */}
        <div className="flex items-center gap-3 px-6 py-3.5 border-t border-slate-100 bg-white flex-shrink-0">
          <button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {isEdit ? 'Save Changes' : 'Create Template'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
          {!canSave && <p className="text-[11px] text-slate-400 ml-1">Name and subject are required</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Left panel: single list item ────────────────────────────────────────────
function ListItem({
  t, selected, onClick,
}: { t: EmailTemplate; selected: boolean; onClick: () => void }) {
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
        {/* Status dot */}
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5',
          t.status === 1 ? 'bg-emerald-400' : 'bg-slate-300'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <p className={cn('text-[13px] font-semibold truncate', selected ? 'text-indigo-700' : 'text-slate-800')}>
              {t.template_name}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {t.email_type && t.email_type !== 'general' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 uppercase tracking-wide">
                  {EMAIL_TYPES.find(x => x.value === t.email_type)?.label ?? t.email_type}
                </span>
              )}
              {t.lead_status && <Zap size={9} className="text-amber-400" />}
              {t.send_bcc === '1' && <AtSign size={9} className="text-blue-400" />}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 truncate">{t.subject}</p>
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
  t, onEdit, onToggle, onDelete, toggling, deleting,
}: {
  t: EmailTemplate
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  toggling: boolean
  deleting: boolean
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            t.status === 1 ? 'bg-indigo-50' : 'bg-slate-100'
          )}>
            <Mail size={14} className={t.status === 1 ? 'text-indigo-500' : 'text-slate-400'} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-[14px] truncate">{t.template_name}</p>
            <p className="text-[11px] text-slate-400 truncate">{t.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {/* Toggle */}
          <button onClick={onToggle} disabled={toggling}
            className={cn('flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium border transition-all',
              t.status === 1
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            )}>
            {toggling
              ? <Loader2 size={11} className="animate-spin" />
              : t.status === 1 ? <ToggleRight size={13} /> : <ToggleLeft size={13} />
            }
            {t.status === 1 ? 'Active' : 'Inactive'}
          </button>
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
        <div className="max-w-2xl mx-auto space-y-3">

          {/* Info badges */}
          {(t.email_type || t.lead_status || t.send_bcc === '1') && (
            <div className="flex flex-wrap gap-2">
              {t.email_type && (
                <div className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
                  <Mail size={11} />
                  {EMAIL_TYPES.find(x => x.value === t.email_type)?.label ?? t.email_type}
                </div>
              )}
              {t.lead_status && (
                <div className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
                  <Zap size={11} />
                  Auto-sends when status → <strong>{t.lead_status}</strong>
                </div>
              )}
              {t.send_bcc === '1' && (
                <div className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
                  <AtSign size={11} /> BCC copy to assigned agent
                </div>
              )}
            </div>
          )}

          {/* Email card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Accent top bar */}
            <div className="h-0.5 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400" />
            {/* Headers */}
            <div className="px-6 py-4 border-b border-slate-100 space-y-2">
              {t.send_bcc === '1' && (
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-[11px] w-10 text-right flex-shrink-0">BCC</span>
                  <span className="text-slate-600 font-mono text-[11px]">Assigned agent (auto)</span>
                </div>
              )}
              <div className={`flex items-start gap-3 ${t.send_bcc === '1' ? 'pt-2 border-t border-slate-100' : ''}`}>
                <span className="text-slate-400 text-[11px] w-10 text-right flex-shrink-0 mt-0.5">Subject</span>
                <span className="font-semibold text-slate-900 text-sm">{t.subject}</span>
              </div>
            </div>
            {/* Body */}
            <div className="px-8 py-6 min-h-48 text-sm text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: t.template_html ||
                  '<p style="color:#9CA3AF;font-style:italic;font-size:13px">No content in this template.</p>',
              }}
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
        <Mail size={24} className="text-slate-300" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-400">Select a template</p>
        <p className="text-xs text-slate-300 mt-0.5">Click any template on the left to preview it</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function CrmEmailTemplates() {
  const qc = useQueryClient()

  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<EmailTemplate | null>(null)
  const [selected, setSelected]       = useState<EmailTemplate | null>(null)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit   = (t: EmailTemplate) => { setEditing(t); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await crmService.getEmailTemplates()
      return (res.data?.data ?? res.data ?? []) as EmailTemplate[]
    },
    staleTime: 0,
  })

  const allTemplates = rawData ?? []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allTemplates.filter(t => {
      const matchSearch = !q || t.template_name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && t.status === 1) ||
        (statusFilter === 'inactive' && t.status !== 1)
      return matchSearch && matchStatus
    })
  }, [allTemplates, search, statusFilter])

  // Keep selected in sync when data changes
  useEffect(() => {
    if (selected && rawData) {
      const updated = rawData.find(t => t.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [rawData]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMutation = useMutation({
    mutationFn: (t: EmailTemplate) => crmService.toggleEmailTemplate(t.id, t.status === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Template updated'); qc.invalidateQueries({ queryKey: ['email-templates'] }) },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteEmailTemplate(id),
    onSuccess: () => {
      toast.success('Template deleted')
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['email-templates'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleDelete = async (t: EmailTemplate) => {
    if (await confirmDelete(t.template_name)) deleteMutation.mutate(t.id)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── .lt header toolbar ─────────────────────────────────────────────── */}
      <div className="lt">
        <div className="lt-title">
          <h1>Email Templates</h1>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, background: '#f1f5f9', padding: '1px 7px', borderRadius: 8, lineHeight: '16px' }}>
            {isLoading ? '…' : allTemplates.length}
          </span>
        </div>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input
            type="text"
            value={search}
            placeholder="Search templates…"
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        {/* Status filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 6, padding: 2, gap: 2, flexShrink: 0 }}>
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                height: 28, padding: '0 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .12s',
                background: statusFilter === f ? '#fff' : 'transparent',
                color: statusFilter === f ? '#4338ca' : '#64748b',
                boxShadow: statusFilter === f ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
              }}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={openCreate} className="lt-b lt-g">
            <Plus size={13} /> New Template
          </button>
        </div>
      </div>
      <div className="lt-accent lt-accent-green" />

      {/* ── Main panel ──────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 8 }}>
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>

      ) : allTemplates.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-20 px-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Inbox size={26} className="text-indigo-400" />
          </div>
          <p className="font-semibold text-slate-800 text-base">No email templates yet</p>
          <p className="text-sm mt-1.5 text-slate-400 max-w-xs mx-auto">
            Create your first template to start sending personalized emails to your leads
          </p>
          <button onClick={openCreate} className="btn-primary mt-5 inline-flex items-center gap-2">
            <Plus size={14} /> Create First Template
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
                  <button onClick={() => { setSearch(''); setStatusFilter('all') }}
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
                onToggle={() => toggleMutation.mutate(selected)}
                onDelete={() => handleDelete(selected)}
                toggling={toggleMutation.isPending}
                deleting={deleteMutation.isPending}
              />
            ) : (
              <SelectPrompt />
            )}
          </div>
        </div>
      )}
      </div>

      {showModal && (
        <TemplateModal editing={editing} onClose={closeModal} onSaved={closeModal} />
      )}
    </div>
  )
}
