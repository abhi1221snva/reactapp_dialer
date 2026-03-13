import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X, Check, Eye, Mail, Copy,
  Search, Layers, AtSign, FileText, Zap, ToggleLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type { EmailTemplate } from '../../types/crm.types'
import { confirmDelete } from '../../utils/confirmDelete'

const VARIABLE_GROUPS = [
  {
    label: 'Lead Info',
    vars: ['[[first_name]]', '[[last_name]]', '[[email]]', '[[phone_number]]', '[[company_name]]'],
  },
  {
    label: 'Status & Agent',
    vars: ['[[lead_status]]', '[[assigned_to]]'],
  },
  {
    label: 'Legacy Format',
    vars: ['[first_name]', '[last_name]', '[email]'],
  },
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

function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={19} className={iconColor} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
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
      : EMPTY_FORM,
  )
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const insertVar = (v: string) => {
    const ta = document.getElementById('email-template-body') as HTMLTextAreaElement
    if (!ta) { set('template_html', form.template_html + v); return }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    set('template_html', form.template_html.slice(0, start) + v + form.template_html.slice(end))
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

  const canSave = form.template_name.trim() && form.subject.trim()

  return (
    <div className="modal-backdrop">
      <div
        className="modal-card flex flex-col"
        style={{ maxWidth: '980px', width: '95vw', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Mail size={16} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 leading-none">
                {isEdit ? `Editing: ${editing!.template_name}` : 'New Email Template'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Use{' '}
                <code className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                  {'[[variable]]'}
                </code>{' '}
                syntax to personalize
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
              {(['edit', 'preview'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={
                    tab === t
                      ? { background: '#fff', color: '#4F46E5', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                      : { color: '#6B7280' }
                  }
                >
                  {t === 'edit' ? (
                    <><Pencil size={11} /> Edit</>
                  ) : (
                    <><Eye size={11} /> Preview</>
                  )}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="action-btn"><X size={15} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {tab === 'edit' ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Form */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-w-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="input w-full pl-9"
                        value={form.template_name}
                        onChange={e => set('template_name', e.target.value)}
                        placeholder="e.g. Welcome Email"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">
                      BCC Email{' '}
                      <span className="text-slate-400 font-normal text-xs">(optional)</span>
                    </label>
                    <div className="relative">
                      <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="input w-full pl-9"
                        type="email"
                        value={form.send_bcc}
                        onChange={e => set('send_bcc', e.target.value)}
                        placeholder="bcc@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Subject Line <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="input w-full"
                      value={form.subject}
                      onChange={e => set('subject', e.target.value)}
                      placeholder="Hi [[first_name]], your application update…"
                    />
                  </div>
                  <div>
                    <label className="label">
                      Lead Status Trigger{' '}
                      <span className="text-slate-400 font-normal text-xs">(optional)</span>
                    </label>
                    <div className="relative">
                      <Zap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="input w-full pl-9"
                        value={form.lead_status}
                        onChange={e => set('lead_status', e.target.value)}
                        placeholder="e.g. Approved, New Lead…"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">
                      Email Body (HTML) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-slate-400">
                      {form.template_html.length > 0
                        ? `${form.template_html.length.toLocaleString()} chars`
                        : ''}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <div className="flex gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      <span className="text-xs text-slate-400 font-mono">HTML Editor</span>
                    </div>
                    <textarea
                      id="email-template-body"
                      className="w-full font-mono text-xs p-4 resize-none outline-none bg-white text-slate-800 leading-relaxed"
                      rows={14}
                      value={form.template_html}
                      onChange={e => set('template_html', e.target.value)}
                      placeholder={'<p>Dear [[first_name]],</p>\n<p>Your application has been received.</p>\n<p>Best regards,<br>The Team</p>'}
                    />
                  </div>
                </div>
              </div>

              {/* Variables sidebar */}
              <div className="w-52 border-l border-slate-200 flex-shrink-0 bg-slate-50 flex flex-col min-h-0">
                <div className="px-4 pt-4 pb-3 border-b border-slate-200 flex-shrink-0">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Variables</p>
                  <p className="text-xs text-slate-400 mt-1">Click to insert at cursor</p>
                </div>
                <div className="p-3 space-y-4 overflow-y-auto flex-1">
                  {VARIABLE_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {group.vars.map(v => (
                          <button
                            key={v}
                            onClick={() => insertVar(v)}
                            className="flex items-center justify-between w-full text-left text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-mono hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
                          >
                            <span className="truncate">{v}</span>
                            <Copy size={9} className="flex-shrink-0 ml-1 text-slate-300 group-hover:text-indigo-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Preview */
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Email chrome */}
                <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white">
                  {/* Email header */}
                  <div className="px-6 py-4 border-b border-slate-100 space-y-2.5">
                    {[
                      { label: 'From', value: 'noreply@rocketdialer.com' },
                      { label: 'To', value: '[[email]]' },
                      ...(form.send_bcc ? [{ label: 'BCC', value: form.send_bcc }] : []),
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400 text-xs w-10 text-right flex-shrink-0">{row.label}</span>
                        <span className="text-slate-700 font-mono text-xs">{row.value}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                      <span className="text-slate-400 text-xs w-10 text-right flex-shrink-0 mt-0.5">Subject</span>
                      <span className="font-semibold text-slate-900 text-sm">
                        {form.subject || (
                          <span className="text-slate-400 font-normal italic">No subject</span>
                        )}
                      </span>
                    </div>
                  </div>
                  {/* Email body */}
                  <div
                    className="p-8 min-h-48"
                    dangerouslySetInnerHTML={{
                      __html:
                        form.template_html ||
                        '<p style="color:#9CA3AF;font-style:italic;font-size:14px">No content yet — switch to Edit tab to write your email.</p>',
                    }}
                  />
                </div>
                {/* Trigger info */}
                {form.lead_status && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2.5">
                    <Zap size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Auto-sends when lead status changes to{' '}
                      <strong className="font-semibold">{form.lead_status}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {isEdit ? 'Save Changes' : 'Create Template'}
          </button>
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
          {!canSave && (
            <p className="text-xs text-slate-400 ml-1">Template name and subject are required</p>
          )}
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    setDescription('Create reusable email templates with dynamic lead variables')
    setActions(
      <button
        onClick={() => {
          setEditing(null)
          setShowModal(true)
        }}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={15} /> New Template
      </button>,
    )
    return () => {
      setDescription(undefined)
      setActions(undefined)
    }
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

  const filtered = useMemo(() => {
    return allTemplates.filter(t => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        t.template_name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && t.status === 1) ||
        (statusFilter === 'inactive' && t.status !== 1)
      return matchSearch && matchStatus
    })
  }, [allTemplates, search, statusFilter])

  const activeCount = allTemplates.filter(t => t.status === 1).length
  const inactiveCount = allTemplates.length - activeCount

  const toggleMutation = useMutation({
    mutationFn: (t: EmailTemplate) =>
      crmService.toggleEmailTemplate(t.id, t.status === 1 ? 0 : 1),
    onSuccess: () => {
      toast.success('Template updated')
      qc.invalidateQueries({ queryKey: ['email-templates'] })
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteEmailTemplate(id),
    onSuccess: () => {
      toast.success('Template deleted')
      qc.invalidateQueries({ queryKey: ['email-templates'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      {allTemplates.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={Layers}
            label="Total Templates"
            value={allTemplates.length}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-500"
          />
          <StatCard
            icon={Check}
            label="Active"
            value={activeCount}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            icon={ToggleLeft}
            label="Inactive"
            value={inactiveCount}
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
          />
        </div>
      )}

      {/* Search + filter */}
      {allTemplates.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              className="input w-full pl-9 text-sm"
              placeholder="Search by name or subject…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
                style={
                  statusFilter === s
                    ? { background: '#fff', color: '#4F46E5', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                    : { color: '#6B7280' }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : allTemplates.length === 0 ? (
        /* Empty state */
        <div className="table-wrapper text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-indigo-400" />
          </div>
          <p className="font-semibold text-slate-800 text-base">No email templates yet</p>
          <p className="text-sm mt-1.5 text-slate-400 max-w-xs mx-auto">
            Create your first template to start sending personalized emails to your leads
          </p>
          <button
            onClick={() => {
              setEditing(null)
              setShowModal(true)
            }}
            className="btn-primary mt-5 inline-flex items-center gap-2"
          >
            <Plus size={14} /> Create First Template
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* No results */
        <div className="table-wrapper text-center py-12">
          <Search size={28} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-600">No templates match your search</p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all') }}
            className="text-xs text-indigo-500 hover:underline mt-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Template grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => {
            const stripped = t.template_html
              ?.replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()

            return (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group"
              >
                {/* Accent stripe */}
                <div className="h-1 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400" />

                <div className="p-5 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Mail size={16} className="text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-slate-900">{t.template_name}</p>
                        <p className="text-xs truncate text-slate-500 mt-0.5">{t.subject}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleMutation.mutate(t)}
                      className={[
                        'flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                        t.status === 1
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200',
                      ].join(' ')}
                    >
                      {t.status === 1 && <Check size={10} />}
                      {t.status === 1 ? 'Active' : 'Off'}
                    </button>
                  </div>

                  {/* Meta badges */}
                  {(t.lead_status || t.send_bcc) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {t.lead_status && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Zap size={9} /> {t.lead_status}
                        </span>
                      )}
                      {t.send_bcc && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          <AtSign size={9} /> BCC
                        </span>
                      )}
                    </div>
                  )}

                  {/* Body preview */}
                  <div
                    className="text-xs rounded-xl p-3 bg-slate-50 border border-slate-100 text-slate-400 leading-relaxed min-h-[58px] overflow-hidden"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {stripped?.slice(0, 180) || <span className="italic">No content</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => { setEditing(t); setShowModal(true) }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium flex-1 justify-center hover:bg-slate-50 transition-colors"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirmDelete(t.template_name)) deleteMutation.mutate(t.id)
                      }}
                      className="action-btn-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
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
