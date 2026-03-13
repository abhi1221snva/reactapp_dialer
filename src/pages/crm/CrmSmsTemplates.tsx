import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X, Check, MessageSquare,
  Copy, Search, Layers, ToggleLeft, Smartphone,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type { SmsTemplate } from '../../types/crm.types'
import { confirmDelete } from '../../utils/confirmDelete'

const VARIABLE_GROUPS = [
  {
    label: 'Lead Info',
    vars: ['[[first_name]]', '[[last_name]]', '[[phone_number]]', '[[email]]', '[[company_name]]'],
  },
  {
    label: 'Status',
    vars: ['[[lead_status]]'],
  },
  {
    label: 'Legacy',
    vars: ['[first_name]', '[last_name]'],
  },
]

interface FormState {
  sms_template_name: string
  sms_template: string
}

const EMPTY_FORM: FormState = { sms_template_name: '', sms_template: '' }

const SMS_SEGMENT_SIZE = 160

function smsStats(text: string) {
  const len = text.length
  const segments = len === 0 ? 0 : Math.ceil(len / SMS_SEGMENT_SIZE)
  const remaining = segments === 0 ? SMS_SEGMENT_SIZE : segments * SMS_SEGMENT_SIZE - len
  return { len, segments, remaining }
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

function PhoneMockup({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl"
        style={{ width: '200px' }}
      >
        {/* Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-full z-10" />
        {/* Screen */}
        <div className="bg-slate-100 rounded-[2rem] overflow-hidden flex flex-col" style={{ minHeight: '360px' }}>
          {/* Status bar */}
          <div className="bg-white px-4 pt-7 pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">9:41</span>
            <div className="flex items-center gap-0.5">
              <div className="w-3 h-1.5 bg-slate-700 rounded-sm opacity-80" />
              <div className="w-1 h-1.5 bg-slate-700 rounded-sm opacity-60" />
              <div className="w-3 h-1.5 bg-slate-700 rounded-sm opacity-40" />
            </div>
          </div>
          {/* Contact header */}
          <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-indigo-600">L</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 leading-none">Lead Name</p>
              <p className="text-xs text-slate-400 mt-0.5">Text Message</p>
            </div>
          </div>
          {/* Messages */}
          <div className="flex-1 p-3 bg-slate-50 overflow-y-auto">
            {message ? (
              <div className="flex justify-end">
                <div
                  className="max-w-[82%] px-3 py-2 rounded-2xl rounded-br-sm text-xs text-white leading-relaxed break-words"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {message}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400 italic text-center px-2">
                  Type a message to see preview
                </p>
              </div>
            )}
          </div>
          {/* Input bar */}
          <div className="bg-white border-t border-slate-200 px-2 py-2 flex items-center gap-1.5">
            <div className="flex-1 bg-slate-100 rounded-full px-3 py-1">
              <span className="text-xs text-slate-400">iMessage</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold leading-none">↑</span>
            </div>
          </div>
        </div>
        {/* Home bar */}
        <div className="mt-2 mx-auto w-14 h-1 bg-slate-700 rounded-full" />
      </div>
    </div>
  )
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
      : EMPTY_FORM,
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

  const { len, segments, remaining } = smsStats(form.sms_template)
  const progressPct = Math.min(
    (len / (segments === 0 ? SMS_SEGMENT_SIZE : segments * SMS_SEGMENT_SIZE)) * 100,
    100,
  )
  const canSave = form.sms_template_name.trim() && form.sms_template.trim()

  return (
    <div className="modal-backdrop">
      <div
        className="modal-card flex flex-col"
        style={{ maxWidth: '800px', width: '95vw', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <MessageSquare size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 leading-none">
                {isEdit ? `Editing: ${editing!.sms_template_name}` : 'New SMS Template'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Use{' '}
                <code className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                  {'[[variable]]'}
                </code>{' '}
                to personalize messages
              </p>
            </div>
          </div>
          <button onClick={onClose} className="action-btn"><X size={15} /></button>
        </div>

        {/* Body — two-panel */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Left: form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 min-w-0">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">
                  Message Body <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-medium ${segments > 1 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {len} chars · {segments} SMS segment{segments !== 1 ? 's' : ''}
                </span>
              </div>
              <textarea
                id="sms-body"
                className="input w-full resize-none"
                rows={5}
                value={form.sms_template}
                onChange={e => set('sms_template', e.target.value)}
                placeholder="Hi [[first_name]], your application has been received…"
              />
              {/* Progress bar */}
              <div className="mt-2 space-y-1">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${progressPct}%`,
                      background:
                        segments > 1
                          ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                          : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{remaining} chars remaining in this segment</span>
                  {segments > 1 && (
                    <span className="text-amber-600 font-medium">
                      Will send as {segments} messages
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Variables */}
            <div>
              <p className="label-xs mb-3">Insert variable</p>
              <div className="space-y-3">
                {VARIABLE_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.vars.map(v => (
                        <button
                          key={v}
                          onClick={() => insertVar(v)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-mono hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          {v} <Copy size={9} className="text-slate-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: phone preview */}
          <div className="w-60 border-l border-slate-200 bg-slate-50 flex-shrink-0 flex flex-col items-center justify-center p-5 gap-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Smartphone size={12} /> Live Preview
            </div>
            <PhoneMockup message={form.sms_template} />
          </div>
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    setDescription('Manage reusable SMS templates with dynamic variables')
    setActions(
      <button
        onClick={() => { setEditing(null); setShowModal(true) }}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={15} /> New Template
      </button>,
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

  const allTemplates = rawData ?? []

  const filtered = useMemo(() => {
    return allTemplates.filter(t => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        t.sms_template_name.toLowerCase().includes(q) ||
        t.sms_template.toLowerCase().includes(q)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && t.status === 1) ||
        (statusFilter === 'inactive' && t.status !== 1)
      return matchSearch && matchStatus
    })
  }, [allTemplates, search, statusFilter])

  const activeCount = allTemplates.filter(t => t.status === 1).length
  const inactiveCount = allTemplates.length - activeCount
  const totalSegments = allTemplates.reduce((sum, t) => sum + smsStats(t.sms_template).segments, 0)

  const toggleMutation = useMutation({
    mutationFn: (t: SmsTemplate) =>
      crmService.toggleSmsTemplate(t.id, t.status === 1 ? 0 : 1),
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
      {/* Stats bar */}
      {allTemplates.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={Layers}
            label="Total Templates"
            value={allTemplates.length}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            icon={Check}
            label="Active"
            value={activeCount}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-500"
          />
          <StatCard
            icon={ToggleLeft}
            label="Total SMS Segments"
            value={totalSegments}
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
              placeholder="Search templates…"
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
                    ? { background: '#fff', color: '#059669', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
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
          <Loader2 size={24} className="animate-spin text-emerald-500" />
        </div>
      ) : allTemplates.length === 0 ? (
        /* Empty state */
        <div className="table-wrapper text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-emerald-500" />
          </div>
          <p className="font-semibold text-slate-800 text-base">No SMS templates yet</p>
          <p className="text-sm mt-1.5 text-slate-400 max-w-xs mx-auto">
            Create templates to quickly send personalized text messages to your leads
          </p>
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="btn-primary mt-5 inline-flex items-center gap-2"
            style={{ background: '#059669' }}
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
            className="text-xs text-emerald-600 hover:underline mt-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Template grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => {
            const { len, segments } = smsStats(t.sms_template)
            const multiSegment = segments > 1

            return (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group"
              >
                {/* Accent stripe */}
                <div
                  className="h-1"
                  style={{ background: 'linear-gradient(90deg, #10b981, #059669, #0d9488)' }}
                />

                <div className="p-5 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors">
                        <MessageSquare size={15} className="text-emerald-600" />
                      </div>
                      <p className="font-semibold text-sm truncate text-slate-900">
                        {t.sms_template_name}
                      </p>
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

                  {/* SMS bubble preview */}
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="flex justify-end">
                      <div
                        className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm text-xs text-white leading-relaxed break-words"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      >
                        {t.sms_template.slice(0, 120)}
                        {t.sms_template.length > 120 ? '…' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{len} chars</span>
                    <span className="text-slate-200">·</span>
                    <span
                      className={[
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        multiSegment
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {segments} segment{segments !== 1 ? 's' : ''}
                    </span>
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
                        if (await confirmDelete(t.sms_template_name)) deleteMutation.mutate(t.id)
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
        <SmsModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
