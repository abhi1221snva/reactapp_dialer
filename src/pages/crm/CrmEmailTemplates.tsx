import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X, Check, Mail,
  Search, AtSign, Zap, FileText, Layers,
  ToggleLeft, ToggleRight, ChevronRight, Inbox,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type { EmailTemplate } from '../../types/crm.types'
import { confirmDelete } from '../../utils/confirmDelete'
import { PlaceholderPicker, type PickerPlaceholder } from '../../components/crm/PlaceholderPicker'
import { cn } from '../../utils/cn'

// ─── Placeholder catalogue ────────────────────────────────────────────────────
const EMAIL_PLACEHOLDERS: PickerPlaceholder[] = [
  { key: '[[first_name]]',      label: 'First Name',        section: 'Lead Info' },
  { key: '[[last_name]]',       label: 'Last Name',         section: 'Lead Info' },
  { key: '[[full_name]]',       label: 'Full Name',         section: 'Lead Info' },
  { key: '[[email]]',           label: 'Email Address',     section: 'Lead Info' },
  { key: '[[phone_number]]',    label: 'Phone Number',      section: 'Lead Info' },
  { key: '[[mobile]]',          label: 'Mobile',            section: 'Lead Info' },
  { key: '[[company_name]]',    label: 'Company Name',      section: 'Lead Info' },
  { key: '[[address]]',         label: 'Address',           section: 'Lead Info' },
  { key: '[[city]]',            label: 'City',              section: 'Lead Info' },
  { key: '[[state]]',           label: 'State',             section: 'Lead Info' },
  { key: '[[lead_status]]',     label: 'Lead Status',       section: 'Status & System' },
  { key: '[[lead_type]]',       label: 'Lead Type',         section: 'Status & System' },
  { key: '[[assigned_to]]',     label: 'Assigned Agent',    section: 'Status & System' },
  { key: '[[lead_created_at]]', label: 'Date Created',      section: 'Status & System' },
  { key: '[[specialist_name]]', label: 'Specialist Name',   section: 'Specialist' },
  { key: '[[specialist_email]]',label: 'Specialist Email',  section: 'Specialist' },
  { key: '[[specialist_phone]]',label: 'Specialist Phone',  section: 'Specialist' },
  { key: '[[office_name]]',     label: 'Company Name',      section: 'Company Branding' },
  { key: '[[office_email]]',    label: 'Company Email',     section: 'Company Branding' },
  { key: '[[office_phone]]',    label: 'Company Phone',     section: 'Company Branding' },
  { key: '[[office_address]]',  label: 'Company Address',   section: 'Company Branding' },
  { key: '[first_name]', label: 'First Name (legacy)', section: 'Legacy Format' },
  { key: '[last_name]',  label: 'Last Name (legacy)',  section: 'Legacy Format' },
  { key: '[email]',      label: 'Email (legacy)',      section: 'Legacy Format' },
]

const EMAIL_PICKER_TIPS = [
  "[[field_key]] — replaced with lead's value",
  '[field] (single brackets) — legacy format',
  'Both formats work in email templates',
]

// ─── Form types ───────────────────────────────────────────────────────────────
interface FormState {
  template_name: string
  subject: string
  template_html: string
  lead_status: string
  send_bcc: string
}
const EMPTY_FORM: FormState = {
  template_name: '', subject: '', template_html: '', lead_status: '', send_bcc: '0',
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
  const [form, setForm] = useState<FormState>(
    editing
      ? { template_name: editing.template_name, subject: editing.subject, template_html: editing.template_html, lead_status: editing.lead_status ?? '', send_bcc: editing.send_bcc ?? '0' }
      : EMPTY_FORM
  )
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const insertVar = (v: string) => {
    const ta = taRef.current
    if (!ta) { set('template_html', form.template_html + v); return }
    const s = ta.selectionStart, e = ta.selectionEnd
    set('template_html', form.template_html.slice(0, s) + v + form.template_html.slice(e))
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + v.length, s + v.length) })
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        template_name: form.template_name, subject: form.subject,
        template_html: form.template_html, send_bcc: form.send_bcc,
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
      <div className="modal-card flex flex-col" style={{ maxWidth: 1040, width: '96vw', maxHeight: '92vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Mail size={15} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-slate-900 leading-tight">
                {isEdit ? editing!.template_name : 'New Email Template'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Use <code className="font-mono bg-slate-100 px-1 rounded text-slate-600 text-[10px]">{'[[variable]]'}</code> syntax to personalize
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

                {/* Row 1: name + BCC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Template Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className="input w-full pl-8 text-sm" placeholder="e.g. Welcome Email"
                        value={form.template_name} onChange={e => set('template_name', e.target.value)} />
                    </div>
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

                {/* Row 2: subject + BCC checkbox */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Subject Line <span className="text-red-400">*</span></label>
                    <input className="input w-full text-sm" placeholder="Hi [[first_name]], your application update…"
                      value={form.subject} onChange={e => set('subject', e.target.value)} />
                  </div>
                  <div className="flex flex-col justify-end pb-0.5">
                    <label className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                      <input type="checkbox" className="accent-indigo-600 w-4 h-4"
                        checked={form.send_bcc === '1'} onChange={e => set('send_bcc', e.target.checked ? '1' : '0')} />
                      <div>
                        <p className="text-[13px] font-medium text-slate-700">Send BCC copy</p>
                        <p className="text-[11px] text-slate-400">Assigned agent receives a copy</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* HTML editor */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">Email Body (HTML) <span className="text-red-400">*</span></label>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {form.template_html.length > 0 ? `${form.template_html.length.toLocaleString()} chars` : ''}
                    </span>
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
                      id="email-template-body"
                      className="w-full font-mono text-[12px] p-4 resize-none outline-none bg-white text-slate-800 leading-relaxed"
                      rows={16}
                      value={form.template_html}
                      onChange={e => set('template_html', e.target.value)}
                      placeholder={'<p>Dear [[first_name]],</p>\n<p>Your application has been received.</p>\n<br>\n<p>Best regards,<br>The Team</p>'}
                    />
                  </div>
                </div>
              </div>

              {/* Right: placeholder picker */}
              <div className="w-60 border-l border-slate-100 flex-shrink-0 bg-slate-50/60 flex flex-col min-h-0">
                <PlaceholderPicker placeholders={EMAIL_PLACEHOLDERS} onInsert={insertVar} tipLines={EMAIL_PICKER_TIPS} />
              </div>
            </div>

          ) : (
            /* Preview tab */
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
              <div className="max-w-2xl mx-auto space-y-3">
                {form.lead_status && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
                    <Zap size={13} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Auto-sends when lead status changes to{' '}
                      <strong className="font-semibold">{form.lead_status}</strong>
                    </p>
                  </div>
                )}
                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                  <div className="px-6 py-4 border-b border-slate-100 space-y-2.5">
                    {[
                      { label: 'From', value: 'noreply@rocketdialer.com' },
                      { label: 'To',   value: '[[email]]' },
                      ...(form.send_bcc === '1' ? [{ label: 'BCC', value: 'Assigned agent (auto)' }] : []),
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="text-slate-400 text-[11px] w-12 text-right flex-shrink-0 font-medium">{row.label}</span>
                        <span className="text-slate-600 font-mono text-[11px]">{row.value}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                      <span className="text-slate-400 text-[11px] w-12 text-right flex-shrink-0 mt-0.5 font-medium">Subject</span>
                      <span className="font-semibold text-slate-900 text-sm">
                        {form.subject || <span className="text-slate-400 font-normal italic text-xs">No subject</span>}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 min-h-40 text-sm"
                    dangerouslySetInnerHTML={{
                      __html: form.template_html ||
                        '<p style="color:#9CA3AF;font-style:italic;font-size:13px">No content yet — switch to Edit tab to write your email.</p>',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-100 bg-white flex-shrink-0">
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
          {(t.lead_status || t.send_bcc === '1') && (
            <div className="flex flex-wrap gap-2">
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
              {[
                { label: 'From', value: 'noreply@rocketdialer.com' },
                { label: 'To',   value: '[[email]]' },
                ...(t.send_bcc === '1' ? [{ label: 'BCC', value: 'Assigned agent (auto)' }] : []),
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-slate-400 text-[11px] w-10 text-right flex-shrink-0">{row.label}</span>
                  <span className="text-slate-600 font-mono text-[11px]">{row.value}</span>
                </div>
              ))}
              <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
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
  const { setDescription, setActions } = useCrmHeader()

  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<EmailTemplate | null>(null)
  const [selected, setSelected]       = useState<EmailTemplate | null>(null)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit   = (t: EmailTemplate) => { setEditing(t); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  useEffect(() => {
    setDescription('Reusable email templates with dynamic lead variables')
    setActions(
      <button onClick={openCreate} className="btn-primary flex items-center gap-2">
        <Plus size={14} /> New Template
      </button>
    )
    return () => { setDescription(undefined); setActions(undefined) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await crmService.getEmailTemplates()
      return (res.data?.data ?? res.data ?? []) as EmailTemplate[]
    },
    staleTime: 0,
  })

  const allTemplates = rawData ?? []
  const activeCount   = allTemplates.filter(t => t.status === 1).length
  const inactiveCount = allTemplates.length - activeCount

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
    <div className="flex flex-col gap-4 h-full">

      {/* ── Compact header strip ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Stats chips */}
        {allTemplates.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <Layers size={12} className="text-indigo-500" /> {allTemplates.length} total
            </span>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {activeCount} active
            </span>
            {inactiveCount > 0 && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> {inactiveCount} inactive
              </span>
            )}
          </div>
        )}

        {/* Search */}
        {allTemplates.length > 0 && (
          <>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input className="input w-full pl-9 text-sm h-9" placeholder="Search templates…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
              {(['all', 'active', 'inactive'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn('px-3 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all',
                    statusFilter === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Main panel ──────────────────────────────────────────────────────── */}
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

      {showModal && (
        <TemplateModal editing={editing} onClose={closeModal} onSaved={closeModal} />
      )}
    </div>
  )
}
