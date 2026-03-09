import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, X, Check, Eye, Mail, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type { EmailTemplate } from '../../types/crm.types'

const VARIABLES = [
  '[[first_name]]', '[[last_name]]', '[[email]]', '[[phone_number]]',
  '[[company_name]]', '[[lead_status]]', '[[assigned_to]]',
  '[first_name]', '[last_name]', '[email]',
]

interface FormState {
  template_name: string
  subject: string
  template_html: string
  lead_status: string
  send_bcc: string
}

const EMPTY_FORM: FormState = {
  template_name: '',
  subject: '',
  template_html: '',
  lead_status: '',
  send_bcc: '',
}

function TemplateModal({
  editing,
  onClose,
  onSaved,
}: {
  editing?: EmailTemplate | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          template_name: editing.template_name,
          subject: editing.subject,
          template_html: editing.template_html,
          lead_status: editing.lead_status ?? '',
          send_bcc: editing.send_bcc ?? '',
        }
      : EMPTY_FORM
  )
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const insertVar = (v: string) => {
    const ta = document.getElementById('template-body') as HTMLTextAreaElement
    if (!ta) {
      set('template_html', form.template_html + v)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = form.template_html
    set('template_html', text.slice(0, start) + v + text.slice(end))
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + v.length, start + v.length)
    }, 10)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        template_name: form.template_name,
        subject: form.subject,
        template_html: form.template_html,
        ...(form.lead_status ? { lead_status: form.lead_status } : {}),
        ...(form.send_bcc ? { send_bcc: form.send_bcc } : {}),
      }
      return isEdit
        ? crmService.updateEmailTemplate(editing!.id, payload)
        : crmService.createEmailTemplate(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Template updated' : 'Template created')
      qc.invalidateQueries({ queryKey: ['email-templates'] })
      onSaved()
    },
    onError: () => toast.error('Failed to save template'),
  })

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? `Edit: ${editing!.template_name}` : 'New Email Template'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 p-1 rounded-lg bg-slate-100">
              {(['edit', 'preview'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-3 py-1 rounded-md text-sm font-medium capitalize transition-all"
                  style={tab === t
                    ? { background: '#FFFFFF', color: '#4F46E5', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                    : { color: '#6B7280' }
                  }
                >
                  {t === 'edit' ? <span className="flex items-center gap-1"><Pencil size={12} /> Edit</span>
                    : <span className="flex items-center gap-1"><Eye size={12} /> Preview</span>}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="action-btn">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {tab === 'edit' ? (
            <div className="flex flex-1 overflow-hidden">
              {/* Main form */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Template Name <span className="text-red-500">*</span></label>
                    <input className="input w-full" value={form.template_name} onChange={e => set('template_name', e.target.value)} placeholder="e.g. Welcome Email" />
                  </div>
                  <div>
                    <label className="label">BCC Email</label>
                    <input className="input w-full" type="email" value={form.send_bcc} onChange={e => set('send_bcc', e.target.value)} placeholder="bcc@example.com" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Subject <span className="text-red-500">*</span></label>
                    <input className="input w-full" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Hi [[first_name]], your application update..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Email Body (HTML)</label>
                    <textarea
                      id="template-body"
                      className="input w-full font-mono text-sm resize-none"
                      rows={14}
                      value={form.template_html}
                      onChange={e => set('template_html', e.target.value)}
                      placeholder="<p>Dear [[first_name]],</p>..."
                    />
                  </div>
                </div>
              </div>

              {/* Variables sidebar */}
              <div className="w-52 border-l border-slate-200 flex-shrink-0 overflow-y-auto p-4 space-y-3 bg-slate-50">
                <p className="section-label">Variables</p>
                <p className="text-xs text-slate-400">Click to insert at cursor</p>
                <div className="space-y-1.5">
                  {VARIABLES.map(v => (
                    <button
                      key={v}
                      onClick={() => insertVar(v)}
                      className="flex items-center justify-between w-full text-left text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-mono hover:bg-slate-100 transition-colors"
                      title="Insert variable"
                    >
                      <span className="truncate">{v}</span>
                      <Copy size={9} className="flex-shrink-0 ml-1 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="rounded-xl border border-slate-200 p-4 mb-4 bg-slate-50">
                  <p className="text-xs font-medium text-slate-400">Subject</p>
                  <p className="font-medium mt-0.5 text-slate-900">{form.subject || '(no subject)'}</p>
                </div>
                <div
                  className="rounded-xl border border-slate-200 p-6 bg-white"
                  dangerouslySetInnerHTML={{ __html: form.template_html || '<p style="color:#9CA3AF">No content yet</p>' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!form.template_name || !form.subject || saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Template'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function CrmEmailTemplates() {
  const qc = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EmailTemplate | null>(null)

  useEffect(() => {
    setDescription('Create reusable email templates with dynamic lead variables')
    setActions(
      <button
        onClick={() => { setEditing(null); setShowModal(true) }}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={15} /> New Template
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

  const templates = rawData ?? []

  const toggleMutation = useMutation({
    mutationFn: (t: EmailTemplate) => crmService.toggleEmailTemplate(t.id, t.status === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Template updated'); qc.invalidateQueries({ queryKey: ['email-templates'] }) },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteEmailTemplate(id),
    onSuccess: () => { toast.success('Template deleted'); qc.invalidateQueries({ queryKey: ['email-templates'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="space-y-5">

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 table-wrapper">
          <Mail size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">No email templates yet</p>
          <p className="text-sm mt-1 text-slate-400">Create your first template to start sending emails</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(t => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50">
                    <Mail size={16} className="text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate text-slate-900">{t.template_name}</p>
                    <p className="text-xs truncate mt-0.5 text-slate-500">{t.subject}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleMutation.mutate(t)}
                  className={t.status === 1
                    ? 'flex-shrink-0 badge badge-green hover:opacity-80 transition-opacity'
                    : 'flex-shrink-0 badge badge-gray hover:opacity-80 transition-opacity'
                  }
                >
                  {t.status === 1 ? <><Check size={9} /> Active</> : 'Off'}
                </button>
              </div>

              {t.lead_status && (
                <p className="text-xs text-slate-400">
                  Triggers on: <span className="text-slate-700">{t.lead_status}</span>
                </p>
              )}

              <div className="text-xs rounded-lg p-2 max-h-16 overflow-hidden bg-slate-50 text-slate-400 font-mono">
                {t.template_html?.replace(/<[^>]+>/g, ' ').slice(0, 120) || '(empty)'}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => { setEditing(t); setShowModal(true) }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium flex-1 justify-center hover:bg-slate-50 transition-colors"
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  onClick={() => { if (window.confirm(`Delete "${t.template_name}"?`)) deleteMutation.mutate(t.id) }}
                  className="action-btn-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
