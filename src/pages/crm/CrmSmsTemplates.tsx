import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, X, Check, MessageSquare, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type { SmsTemplate } from '../../types/crm.types'
import { confirmDelete } from '../../utils/confirmDelete'

const VARIABLES = [
  '[[first_name]]', '[[last_name]]', '[[phone_number]]',
  '[[company_name]]', '[[lead_status]]', '[[email]]',
  '[first_name]', '[last_name]',
]

interface FormState {
  sms_template_name: string
  sms_template: string
}

const EMPTY_FORM: FormState = { sms_template_name: '', sms_template: '' }

function MAX_SMS_CHARS(text: string) {
  const len = text.length
  const segments = len === 0 ? 0 : Math.ceil(len / 160)
  return { len, segments }
}

function SmsModal({
  editing,
  onClose,
  onSaved,
}: {
  editing?: SmsTemplate | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [form, setForm] = useState<FormState>(
    editing
      ? { sms_template_name: editing.sms_template_name, sms_template: editing.sms_template }
      : EMPTY_FORM
  )

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const insertVar = (v: string) => {
    const ta = document.getElementById('sms-body') as HTMLTextAreaElement
    if (!ta) { set('sms_template', form.sms_template + v); return }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    set('sms_template', form.sms_template.slice(0, start) + v + form.sms_template.slice(end))
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + v.length, start + v.length)
    }, 10)
  }

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

  const { len, segments } = MAX_SMS_CHARS(form.sms_template)

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? `Edit: ${editing!.sms_template_name}` : 'New SMS Template'}
          </h2>
          <button onClick={onClose} className="action-btn">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Template Name <span className="text-red-500">*</span></label>
            <input
              className="input w-full"
              value={form.sms_template_name}
              onChange={e => set('sms_template_name', e.target.value)}
              placeholder="e.g. Application Received"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Message Body <span className="text-red-500">*</span></label>
              <span className={`text-xs ${len > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                {len}/160 chars · {segments} segment{segments !== 1 ? 's' : ''}
              </span>
            </div>
            <textarea
              id="sms-body"
              className="input w-full resize-none"
              rows={5}
              value={form.sms_template}
              onChange={e => set('sms_template', e.target.value)}
              placeholder="Hi [[first_name]], your application has been received..."
            />
          </div>

          {/* Variables */}
          <div>
            <p className="label-xs mb-2">Insert variable:</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(v => (
                <button
                  key={v}
                  onClick={() => insertVar(v)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-mono hover:bg-slate-100 transition-colors"
                >
                  {v} <Copy size={9} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {form.sms_template && (
            <div className="rounded-xl p-4 bg-slate-100">
              <p className="text-xs font-medium mb-2 text-slate-500">Preview</p>
              <div className="inline-block max-w-xs px-3 py-2 rounded-2xl rounded-tl-none text-sm text-white bg-indigo-500">
                {form.sms_template}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!form.sms_template_name || !form.sms_template || saveMutation.isPending}
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

export function CrmSmsTemplates() {
  const qc = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SmsTemplate | null>(null)

  useEffect(() => {
    setDescription('Manage reusable SMS templates with dynamic variables')
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
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const res = await crmService.getSmsTemplates()
      return (res.data?.data ?? res.data ?? []) as SmsTemplate[]
    },
    staleTime: 0,
  })

  const templates = rawData ?? []

  const toggleMutation = useMutation({
    mutationFn: (t: SmsTemplate) => crmService.toggleSmsTemplate(t.id, t.status === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['sms-templates'] }) },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteSmsTemplate(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['sms-templates'] }) },
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
          <MessageSquare size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">No SMS templates yet</p>
          <p className="text-sm mt-1 text-slate-400">Create templates to quickly send SMS to leads</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(t => {
            const { len, segments } = MAX_SMS_CHARS(t.sms_template)
            return (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-50">
                      <MessageSquare size={15} className="text-green-600" />
                    </div>
                    <p className="font-semibold text-sm truncate text-slate-900">{t.sms_template_name}</p>
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

                <p className="text-sm leading-relaxed text-slate-700">
                  {t.sms_template.slice(0, 100)}{t.sms_template.length > 100 ? '…' : ''}
                </p>

                <p className="text-xs text-slate-400">
                  {len} chars · {segments} SMS segment{segments !== 1 ? 's' : ''}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditing(t); setShowModal(true) }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium flex-1 justify-center hover:bg-slate-50 transition-colors"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={async () => { if (await confirmDelete(t.sms_template_name)) deleteMutation.mutate(t.id) }}
                    className="action-btn-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <SmsModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
