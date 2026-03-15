import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Loader2, X, Zap, ToggleLeft, ToggleRight, Trash2,
  ChevronDown, ChevronRight, Clock, FileText, CheckCircle2,
  AlertCircle, SkipForward,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { CrmAutomation, AutomationTriggerType, AutomationLog } from '../../types/crm.types'

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  status_change:      'Lead Status Changed',
  field_update:       'Field Updated',
  time_elapsed:       'Time Elapsed',
  document_uploaded:  'Document Uploaded',
  deal_funded:        'Deal Funded',
  stip_uploaded:      'Stip Uploaded',
  offer_received:     'Offer Received',
}

const LOG_STATUS_CFG = {
  success: { label: 'Success', icon: CheckCircle2, color: 'text-emerald-600' },
  failed:  { label: 'Failed',  icon: AlertCircle,  color: 'text-red-600'     },
  skipped: { label: 'Skipped', icon: SkipForward,  color: 'text-slate-500'   },
}

const ACTION_TYPES = [
  { value: 'send_email',       label: 'Send Email' },
  { value: 'send_sms',         label: 'Send SMS' },
  { value: 'assign_agent',     label: 'Assign Agent' },
  { value: 'change_status',    label: 'Change Status' },
  { value: 'add_tag',          label: 'Add Tag' },
  { value: 'create_task',      label: 'Create Task' },
  { value: 'notify_manager',   label: 'Notify Manager' },
]

interface AutomationFormData {
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, string>
  actions: Array<{ type: string; config: Record<string, string> }>
}

const DEFAULT_FORM: AutomationFormData = {
  name: '',
  description: '',
  trigger_type: 'status_change',
  trigger_config: {},
  actions: [{ type: 'send_email', config: {} }],
}

function AutomationModal({ automation, onClose }: { automation?: CrmAutomation; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<AutomationFormData>(
    automation ? {
      name:           automation.name,
      description:    automation.description ?? '',
      trigger_type:   automation.trigger_type,
      trigger_config: (automation.trigger_config ?? {}) as Record<string, string>,
      actions:        automation.actions as unknown as Array<{ type: string; config: Record<string, string> }>,
    } : DEFAULT_FORM
  )

  const save = useMutation({
    mutationFn: (data: AutomationFormData) =>
      automation
        ? crmService.updateAutomation(automation.id, data as unknown as Partial<CrmAutomation>)
        : crmService.createAutomation(data as unknown as Partial<CrmAutomation>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-automations'] })
      toast.success(automation ? 'Automation updated.' : 'Automation created.')
      onClose()
    },
    onError: () => toast.error('Failed to save automation.'),
  })

  const addAction = () => setForm(f => ({ ...f, actions: [...f.actions, { type: 'send_email', config: {} }] }))
  const removeAction = (i: number) => setForm(f => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }))
  const updateAction = (i: number, key: string, val: string) =>
    setForm(f => ({ ...f, actions: f.actions.map((a, idx) => idx === i ? { ...a, [key]: val, config: key === 'type' ? {} : a.config } : a) }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold text-slate-800">{automation ? 'Edit Automation' : 'New Automation'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Email on Lead Created" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Trigger</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value as AutomationTriggerType, trigger_config: {} }))}>
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {form.trigger_type === 'status_change' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From Status (optional)</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.trigger_config.from_status ?? ''} onChange={e => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, from_status: e.target.value } }))} placeholder="Any" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To Status (optional)</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.trigger_config.to_status ?? ''} onChange={e => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, to_status: e.target.value } }))} placeholder="Any" />
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Actions</label>
              <button type="button" onClick={addAction} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            <div className="space-y-2">
              {form.actions.map((action, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={action.type} onChange={e => updateAction(i, 'type', e.target.value)}>
                    {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  {form.actions.length > 1 && (
                    <button type="button" onClick={() => removeAction(i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button
            onClick={() => save.mutate(form)}
            disabled={!form.name || !form.trigger_type || save.isPending}
            className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {save.isPending && <Loader2 size={14} className="animate-spin" />}
            {automation ? 'Save Changes' : 'Create Automation'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LogsPanel({ automationId, onClose }: { automationId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['automation-logs', automationId],
    queryFn: () => crmService.getAutomationLogs(automationId).then(r => r.data.data.logs as AutomationLog[]),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold text-slate-800">Automation Logs</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : !data?.length ? (
            <p className="text-center text-slate-400 text-sm py-8">No logs yet.</p>
          ) : (
            <div className="space-y-2">
              {data.map(log => {
                const cfg = LOG_STATUS_CFG[log.status]
                const Icon = cfg.icon
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
                    <Icon size={16} className={`mt-0.5 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-slate-400">Lead #{log.lead_id}</span>
                      </div>
                      {log.error_message && <p className="text-xs text-red-600 mt-1 truncate">{log.error_message}</p>}
                      <p className="text-xs text-slate-400 mt-1">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CrmAutomations() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<CrmAutomation | undefined>()
  const [logsId, setLogsId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['crm-automations'],
    queryFn: () => crmService.getAutomations().then(r => r.data.data.automations as CrmAutomation[]),
  })

  const toggleActive = useMutation({
    mutationFn: (id: number) => crmService.toggleAutomation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-automations'] }),
    onError: () => toast.error('Failed to toggle automation.'),
  })

  const deleteAuto = useMutation({
    mutationFn: (id: number) => crmService.deleteAutomation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-automations'] }); toast.success('Deleted.') },
    onError: () => toast.error('Failed to delete.'),
  })

  const toggleExpand = (id: number) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Zap size={20} className="text-emerald-600" /> Automations</h1>
          <p className="text-sm text-slate-500 mt-1">Trigger actions automatically based on CRM events.</p>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
        >
          <Plus size={16} /> New Automation
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : !automations.length ? (
        <div className="text-center py-16">
          <Zap size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No automations yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map(auto => {
            const isExpanded = expanded.has(auto.id)
            return (
              <div key={auto.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => toggleExpand(auto.id)} className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">{auto.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 font-medium whitespace-nowrap">
                        {TRIGGER_LABELS[auto.trigger_type]}
                      </span>
                    </div>
                    {auto.description && <p className="text-xs text-slate-400 truncate mt-0.5">{auto.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActive.mutate(auto.id)}
                      className={`transition-colors ${auto.is_active ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-400'}`}
                      title={auto.is_active ? 'Active — click to disable' : 'Inactive — click to enable'}
                    >
                      {auto.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                    <button onClick={() => setLogsId(auto.id)} className="text-slate-400 hover:text-slate-600" title="View logs">
                      <Clock size={15} />
                    </button>
                    <button onClick={() => { setEditTarget(auto); setShowModal(true) }} className="text-slate-400 hover:text-slate-600" title="Edit">
                      <FileText size={15} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this automation?')) deleteAuto.mutate(auto.id) }}
                      className="text-slate-400 hover:text-red-500" title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t bg-slate-50 px-5 py-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">Actions ({auto.actions?.length ?? 0})</p>
                    <div className="flex flex-wrap gap-2">
                      {auto.actions?.map((action, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-white border text-slate-600">
                          {ACTION_TYPES.find(a => a.value === action.type)?.label ?? action.type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && <AutomationModal automation={editTarget} onClose={() => setShowModal(false)} />}
      {logsId != null && <LogsPanel automationId={logsId} onClose={() => setLogsId(null)} />}
    </div>
  )
}

export default CrmAutomations
