import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X, Check, MessageSquare,
  Search, Layers, ToggleLeft, ToggleRight, ChevronRight,
  Smartphone, Copy, Inbox, Eye, Code,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type { SmsTemplate } from '../../types/crm.types'
import { confirmDelete } from '../../utils/confirmDelete'
import { PlaceholderPicker, type PickerPlaceholder } from '../../components/crm/PlaceholderPicker'
import { cn } from '../../utils/cn'

// ─── Variable groups ──────────────────────────────────────────────────────────
const VARIABLE_GROUPS = [
  { label: 'Lead Info', vars: ['[[first_name]]', '[[last_name]]', '[[phone_number]]', '[[email]]', '[[company_name]]'] },
  { label: 'Status',    vars: ['[[lead_status]]'] },
  { label: 'Legacy',    vars: ['[first_name]', '[last_name]'] },
]

const SMS_PICKER_TIPS = [
  "[[field_key]] — replaced with lead's value",
  'Click a variable to insert at cursor',
  'Both [[key]] and [key] formats work',
]

// Mock data for preview mode
const PREVIEW_VARS: Record<string, string> = {
  '[[first_name]]': 'John', '[[last_name]]': 'Smith', '[[phone_number]]': '(555) 123-4567',
  '[[email]]': 'john.smith@example.com', '[[company_name]]': 'Acme Industries LLC',
  '[[lead_status]]': 'Approved',
  '[first_name]': 'John', '[last_name]': 'Smith',
}

function replaceVarsWithMock(text: string): string {
  return text.replace(/\[?\[([^\]]+)\]\]?/g, (match) => PREVIEW_VARS[match] ?? match)
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormState { sms_template_name: string; sms_template: string }
const EMPTY_FORM: FormState = { sms_template_name: '', sms_template: '' }

// ─── SMS helpers ──────────────────────────────────────────────────────────────
const SEG = 160
function smsStats(text: string) {
  const len      = text.length
  const segments = len === 0 ? 0 : Math.ceil(len / SEG)
  const remaining = segments === 0 ? SEG : segments * SEG - len
  return { len, segments, remaining }
}

// ─── Phone mockup ─────────────────────────────────────────────────────────────
function PhoneMockup({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative bg-slate-900 rounded-[2rem] shadow-2xl"
        style={{ width: compact ? 180 : 210, padding: compact ? 10 : 12 }}
      >
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-slate-800 rounded-full z-10" />
        {/* Screen */}
        <div className="bg-slate-100 rounded-[1.5rem] overflow-hidden flex flex-col" style={{ minHeight: compact ? 300 : 340 }}>
          {/* Status bar */}
          <div className="bg-white px-3 pt-6 pb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-700">9:41</span>
            <div className="flex items-center gap-0.5">
              <div className="w-2.5 h-1.5 bg-slate-700 rounded-sm opacity-80" />
              <div className="w-1 h-1.5 bg-slate-700 rounded-sm opacity-60" />
              <div className="w-2.5 h-1.5 bg-slate-700 rounded-sm opacity-40" />
            </div>
          </div>
          {/* Contact header */}
          <div className="bg-white border-b border-slate-100 px-3 py-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-emerald-700">L</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-800 leading-none">Lead Name</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Text Message</p>
            </div>
          </div>
          {/* Messages area */}
          <div className="flex-1 p-2.5 bg-slate-50 overflow-y-auto">
            {message ? (
              <div className="flex justify-end">
                <div
                  className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-br-sm text-[10px] text-white leading-relaxed break-words"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  {message}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center py-6">
                <p className="text-[10px] text-slate-400 italic text-center px-2">
                  Select a template to preview
                </p>
              </div>
            )}
          </div>
          {/* Input bar */}
          <div className="bg-white border-t border-slate-100 px-2 py-1.5 flex items-center gap-1.5">
            <div className="flex-1 bg-slate-100 rounded-full px-2.5 py-1">
              <span className="text-[9px] text-slate-400">iMessage</span>
            </div>
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-bold">↑</span>
            </div>
          </div>
        </div>
        {/* Home bar */}
        <div className="mt-1.5 mx-auto w-12 h-1 bg-slate-700 rounded-full" />
      </div>
    </div>
  )
}

// ─── Segment bar ──────────────────────────────────────────────────────────────
function SegmentBar({ text }: { text: string }) {
  const { len, segments, remaining } = smsStats(text)
  if (len === 0) return null
  const pct = Math.min((len / (segments * SEG)) * 100, 100)
  const multi = segments > 1
  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, background: multi ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#10b981,#059669)' }} />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{remaining} chars left in segment</span>
        <span className={cn('font-semibold', multi ? 'text-amber-600' : 'text-slate-400')}>
          {len} chars · {segments} SMS{segments > 1 ? ` (${segments} msgs)` : ''}
        </span>
      </div>
    </div>
  )
}

// ─── Editor Modal ─────────────────────────────────────────────────────────────
function SmsModal({ editing, onClose, onSaved }: {
  editing?: SmsTemplate | null; onClose: () => void; onSaved: () => void
}) {
  const qc     = useQueryClient()
  const isEdit = !!editing
  const taRef  = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(
    editing
      ? { sms_template_name: editing.sms_template_name, sms_template: editing.sms_template }
      : EMPTY_FORM
  )
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [activeField, setActiveField] = useState<'name' | 'body'>('body')

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Fetch dynamic placeholders from backend
  const { data: placeholders, isLoading: placeholdersLoading } = useQuery({
    queryKey: ['pdf-placeholders'],
    queryFn: async () => {
      const res = await crmService.getPdfPlaceholders()
      const raw = (res.data?.data ?? res.data ?? []) as Array<{ key: string; label: string; section: string }>
      return raw.map<PickerPlaceholder>(p => ({ key: `[[${p.key}]]`, label: p.label, section: p.section }))
    },
    staleTime: 5 * 60 * 1000,
  })

  const insertVar = useCallback((v: string) => {
    if (activeField === 'name' && nameRef.current) {
      const el = nameRef.current
      const s = el.selectionStart ?? form.sms_template_name.length
      const e = el.selectionEnd ?? s
      const newVal = form.sms_template_name.slice(0, s) + v + form.sms_template_name.slice(e)
      set('sms_template_name', newVal)
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + v.length, s + v.length) })
    } else {
      const ta = taRef.current
      if (!ta) { set('sms_template', form.sms_template + v); return }
      const s = ta.selectionStart, e = ta.selectionEnd
      set('sms_template', form.sms_template.slice(0, s) + v + form.sms_template.slice(e))
      setTimeout(() => { ta.focus(); ta.setSelectionRange(s + v.length, s + v.length) }, 10)
    }
  }, [activeField, form.sms_template_name, form.sms_template])

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? crmService.updateSmsTemplate(editing!.id, form as unknown as Record<string, unknown>)
        : crmService.createSmsTemplate(form),
    onSuccess: () => {
      toast.success(isEdit ? 'Template updated' : 'Template created')
      qc.invalidateQueries({ queryKey: ['sms-templates'] })
      onSaved()
    },
    onError: () => toast.error('Failed to save template'),
  })

  const canSave = form.sms_template_name.trim() && form.sms_template.trim()

  return (
    <div className="modal-backdrop">
      <div className="modal-card flex flex-col" style={{ maxWidth: 1060, width: '96vw', maxHeight: '94vh' }}>

        {/* ── Sticky Header ── */}
        <div className="flex-shrink-0 border-b border-slate-100 bg-white">
          {/* Top row: title + tabs + close */}
          <div className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <MessageSquare size={16} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 leading-tight">
                  {isEdit ? 'Edit SMS Template' : 'New SMS Template'}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use <code className="font-mono bg-slate-100 px-1 rounded text-slate-600 text-[10px]">{'[[variable]]'}</code> to personalize messages
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Tab toggle */}
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                {[
                  { key: 'edit' as const, label: 'Editor', icon: Pencil },
                  { key: 'preview' as const, label: 'Preview', icon: Eye },
                ].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all',
                      tab === t.key ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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

          {/* Sticky field row */}
          <div className="px-6 pb-4">
            <label className="label">Template Name <span className="text-red-400">*</span></label>
            <input
              ref={nameRef}
              className="input w-full text-sm"
              placeholder="e.g. Application Received"
              value={form.sms_template_name}
              onChange={e => set('sms_template_name', e.target.value)}
              onFocus={() => setActiveField('name')}
            />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {tab === 'edit' ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: form */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 min-w-0" onFocus={() => setActiveField('body')}>
                {/* Message Body */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">Message Body <span className="text-red-400">*</span></label>
                  </div>
                  <textarea
                    ref={taRef}
                    id="sms-body"
                    className="input w-full resize-none text-sm leading-relaxed"
                    rows={8}
                    value={form.sms_template}
                    onChange={e => set('sms_template', e.target.value)}
                    placeholder="Hi [[first_name]], your application has been received…"
                  />
                  <div className="mt-2">
                    <SegmentBar text={form.sms_template} />
                  </div>
                </div>

                {/* Quick variable chips */}
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Quick Insert</p>
                  <div className="space-y-2.5">
                    {VARIABLE_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{group.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.vars.map(v => (
                            <button key={v} onMouseDown={e => e.preventDefault()} onClick={() => insertVar(v)}
                              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-mono hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                              {v} <Copy size={8} className="text-slate-300" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: placeholder picker + phone preview */}
              <div className="w-64 border-l border-slate-100 flex-shrink-0 bg-slate-50/60 flex flex-col min-h-0">
                {/* Mini phone preview */}
                <div className="flex flex-col items-center py-4 px-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    <Smartphone size={11} /> Live Preview
                  </div>
                  <PhoneMockup message={form.sms_template} compact />
                </div>

                {/* Placeholder picker */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <PlaceholderPicker placeholders={placeholders ?? []} loading={placeholdersLoading} onInsert={insertVar} tipLines={SMS_PICKER_TIPS} />
                </div>
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

                <div className="flex gap-6 items-start">
                  {/* Phone mockup with mock data */}
                  <div className="flex-shrink-0">
                    <PhoneMockup message={replaceVarsWithMock(form.sms_template)} />
                  </div>

                  {/* Info panel */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      {(() => {
                        const { len, segments, remaining } = smsStats(form.sms_template)
                        const multi = segments > 1
                        return [
                          { label: 'Characters', value: len, color: 'text-slate-700' },
                          { label: 'SMS Segments', value: segments, color: multi ? 'text-amber-600' : 'text-emerald-600' },
                          { label: 'Chars remaining', value: remaining, color: 'text-slate-500' },
                        ].map(s => (
                          <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5">
                            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                          </div>
                        ))
                      })()}
                    </div>

                    {/* Segment warning */}
                    {smsStats(form.sms_template).segments > 1 && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
                        <span className="text-amber-500 text-[13px] mt-0.5">!</span>
                        <p className="text-[12px] text-amber-700">
                          This message will be sent as <strong>{smsStats(form.sms_template).segments} separate SMS messages</strong>. Consider shortening to reduce costs.
                        </p>
                      </div>
                    )}

                    {/* Full message card */}
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Message content (with sample data)</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {replaceVarsWithMock(form.sms_template) || <span className="text-slate-400 italic">No content yet</span>}
                        </p>
                      </div>
                    </div>
                  </div>
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
          {!canSave && <p className="text-[11px] text-slate-400 ml-1">Name and message body are required</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Left panel list item ─────────────────────────────────────────────────────
function ListItem({ t, selected, onClick }: { t: SmsTemplate; selected: boolean; onClick: () => void }) {
  const { len, segments } = smsStats(t.sms_template)
  const snippet = t.sms_template.slice(0, 90)
  return (
    <button onClick={onClick} className={cn(
      'w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group relative',
      selected && 'bg-emerald-50/60 border-l-[3px] border-l-emerald-500 hover:bg-emerald-50/80'
    )}>
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5',
          t.status === 1 ? 'bg-emerald-400' : 'bg-slate-300'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className={cn('text-[13px] font-semibold truncate', selected ? 'text-emerald-700' : 'text-slate-800')}>
              {t.sms_template_name}
            </p>
            {segments > 1 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {segments} msgs
              </span>
            )}
          </div>
          {snippet && (
            <p className="text-[11px] text-slate-500 truncate leading-relaxed">{snippet}{t.sms_template.length > 90 ? '…' : ''}</p>
          )}
          <p className="text-[10px] text-slate-400 mt-0.5">{len} chars · {segments} segment{segments !== 1 ? 's' : ''}</p>
        </div>
        <ChevronRight size={11} className={cn('flex-shrink-0 transition-colors',
          selected ? 'text-emerald-400' : 'text-slate-200 group-hover:text-slate-300'
        )} />
      </div>
    </button>
  )
}

// ─── Right panel: preview ─────────────────────────────────────────────────────
function PreviewPanel({ t, onEdit, onToggle, onDelete, toggling, deleting }: {
  t: SmsTemplate; onEdit: () => void; onToggle: () => void; onDelete: () => void
  toggling: boolean; deleting: boolean
}) {
  const { len, segments, remaining } = smsStats(t.sms_template)
  const multi = segments > 1

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            t.status === 1 ? 'bg-emerald-50' : 'bg-slate-100'
          )}>
            <MessageSquare size={14} className={t.status === 1 ? 'text-emerald-600' : 'text-slate-400'} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-[14px] truncate">{t.sms_template_name}</p>
            <p className="text-[11px] text-slate-400">SMS Template Preview</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <button onClick={onToggle} disabled={toggling}
            className={cn('flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium border transition-all',
              t.status === 1
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            )}>
            {toggling ? <Loader2 size={11} className="animate-spin" /> : t.status === 1 ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
            {t.status === 1 ? 'Active' : 'Inactive'}
          </button>
          <button onClick={onEdit}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all">
            <Pencil size={11} /> Edit
          </button>
          <button onClick={onDelete} disabled={deleting}
            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-all">
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>

      {/* Preview body */}
      <div className="flex-1 overflow-y-auto bg-slate-50/80">
        <div className="flex gap-6 p-6 h-full">

          {/* Phone mockup */}
          <div className="flex flex-col items-center justify-start pt-2 flex-shrink-0">
            <PhoneMockup message={t.sms_template} />
          </div>

          {/* Info panel */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Characters', value: len, color: 'text-slate-700' },
                { label: 'SMS Segments', value: segments, color: multi ? 'text-amber-600' : 'text-emerald-600' },
                { label: 'Chars remaining', value: remaining, color: 'text-slate-500' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5">
                  <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Segment warning */}
            {multi && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
                <span className="text-amber-500 text-[13px] mt-0.5">!</span>
                <p className="text-[12px] text-amber-700">
                  This message will be sent as <strong>{segments} separate SMS messages</strong>. Consider shortening it to reduce costs.
                </p>
              </div>
            )}

            {/* Full message card */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Message content</p>
                <span className="text-[10px] text-slate-400 font-mono">{len} / {segments * SEG}</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{t.sms_template}</p>
              </div>
            </div>

            {/* Segment progress */}
            {len > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-slate-500">Segment usage</p>
                  <p className="text-[11px] text-slate-400">{segments} x 160 chars</p>
                </div>
                {Array.from({ length: segments }, (_, i) => {
                  const start = i * SEG
                  const end   = Math.min((i + 1) * SEG, len)
                  const fill  = end - start
                  const pct   = Math.round((fill / SEG) * 100)
                  return (
                    <div key={i} className="flex items-center gap-2 mb-1.5 last:mb-0">
                      <span className="text-[10px] text-slate-400 w-14 flex-shrink-0">Msg {i + 1}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: multi ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#10b981,#059669)' }} />
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right flex-shrink-0">{fill}/{SEG}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty select state ───────────────────────────────────────────────────────
function SelectPrompt() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50/60 text-slate-300">
      <div className="opacity-40">
        <PhoneMockup message="" compact />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-400">Select a template</p>
        <p className="text-xs text-slate-300 mt-0.5">Click any template on the left to preview it</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function CrmSmsTemplates() {
  const qc = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()

  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<SmsTemplate | null>(null)
  const [selected, setSelected]         = useState<SmsTemplate | null>(null)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit   = (t: SmsTemplate) => { setEditing(t); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  useEffect(() => {
    setDescription('Reusable SMS templates with dynamic lead variables')
    setActions(
      <button onClick={openCreate} className="btn-primary flex items-center gap-2">
        <Plus size={14} /> New Template
      </button>
    )
    return () => { setDescription(undefined); setActions(undefined) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const res  = await crmService.getSmsTemplates()
      const rows = (res.data?.data ?? res.data ?? []) as Record<string, unknown>[]
      return rows.map(r => ({
        ...r,
        sms_template_name: r.template_name ?? r.sms_template_name ?? '',
        sms_template:      r.template_html  ?? r.sms_template      ?? '',
        status: Number(r.status) as 0 | 1,
      })) as SmsTemplate[]
    },
    staleTime: 0,
  })

  const allTemplates  = rawData ?? []
  const activeCount   = allTemplates.filter(t => t.status === 1).length
  const inactiveCount = allTemplates.length - activeCount
  const totalSegments = allTemplates.reduce((s, t) => s + smsStats(t.sms_template).segments, 0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allTemplates.filter(t => {
      const matchSearch = !q || t.sms_template_name.toLowerCase().includes(q) || t.sms_template.toLowerCase().includes(q)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && t.status === 1) ||
        (statusFilter === 'inactive' && t.status !== 1)
      return matchSearch && matchStatus
    })
  }, [allTemplates, search, statusFilter])

  // Keep selected synced after mutations
  useEffect(() => {
    if (selected && rawData) {
      const updated = rawData.find(t => t.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [rawData]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMutation = useMutation({
    mutationFn: (t: SmsTemplate) => crmService.toggleSmsTemplate(t.id, t.status === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['sms-templates'] }) },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteSmsTemplate(id),
    onSuccess: () => { toast.success('Deleted'); setSelected(null); qc.invalidateQueries({ queryKey: ['sms-templates'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  const handleDelete = async (t: SmsTemplate) => {
    if (await confirmDelete(t.sms_template_name)) deleteMutation.mutate(t.id)
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Compact header strip ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {allTemplates.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <Layers size={12} className="text-emerald-500" /> {allTemplates.length} total
            </span>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {activeCount} active
            </span>
            {inactiveCount > 0 && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> {inactiveCount} inactive
              </span>
            )}
            {totalSegments > 0 && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
                <MessageSquare size={11} /> {totalSegments} segments
              </span>
            )}
          </div>
        )}

        {allTemplates.length > 0 && (
          <>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input className="input w-full pl-9 text-sm h-9" placeholder="Search templates…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
              {(['all', 'active', 'inactive'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn('px-3 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all',
                    statusFilter === s ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {/* New Template button - top right */}
        <div className="ml-auto">
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> New Template
          </button>
        </div>
      </div>

      {/* ── Main panel ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
        </div>

      ) : allTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-20 px-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Inbox size={26} className="text-emerald-400" />
          </div>
          <p className="font-semibold text-slate-800 text-base">No SMS templates yet</p>
          <p className="text-sm mt-1.5 text-slate-400 max-w-xs mx-auto">
            Create templates to quickly send personalized text messages to your leads
          </p>
          <button onClick={openCreate} className="btn-primary mt-5 inline-flex items-center gap-2">
            <Plus size={14} /> Create First Template
          </button>
        </div>

      ) : (
        /* Two-panel layout */
        <div className="flex rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 min-h-0" style={{ minHeight: 520 }}>

          {/* Left: list */}
          <div className="w-[320px] flex-shrink-0 border-r border-slate-100 flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 flex-shrink-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                {filtered.length} template{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Search size={22} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-xs font-medium text-slate-400">No templates match</p>
                  <button onClick={() => { setSearch(''); setStatusFilter('all') }}
                    className="text-[11px] text-emerald-500 hover:underline mt-1">Clear filters</button>
                </div>
              ) : (
                filtered.map(t => (
                  <ListItem key={t.id} t={t} selected={selected?.id === t.id} onClick={() => setSelected(t)} />
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
              <button onClick={openCreate}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-300 text-[12px] font-semibold text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all">
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
        <SmsModal editing={editing} onClose={closeModal} onSaved={closeModal} />
      )}
    </div>
  )
}
