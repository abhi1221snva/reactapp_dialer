import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Globe, Save, X, Settings2, Copy, RefreshCw, Webhook, Mail, MessageSquare, Bell, Check, ChevronDown, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { RowActions } from '../../components/ui/RowActions'
import { leadSourceService } from '../../services/leadSource.service'
import { agentService } from '../../services/agent.service'
import { showConfirm } from '../../utils/confirmDelete'
import { formatDateTime } from '../../utils/format'
import { capFirst } from '../../utils/cn'
import { useDialerHeader } from '../../layouts/DialerLayout'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadSourceItem {
  id: number
  source_title: string
  url: string
  status: number
  unique_id: string
  webhook_secret?: string
  notify_email?: boolean
  notify_sms?: boolean
  notify_user_ids?: number[]
  assign_user_ids?: number[]
  assign_method?: 'round_robin' | 'sequential'
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

interface UserOption {
  id: number
  first_name: string
  last_name: string
  email: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL as string ?? '').replace(/\/$/, '')

function buildWebhookUrl(secret: string): string {
  return `${API_BASE}/webhook/lead-source/${secret}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
    >
      <Copy size={12} className={copied ? 'text-emerald-500' : ''} />
    </button>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function LeadSourceModal({
  source,
  onClose,
  onSaved,
}: {
  source: LeadSourceItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(source?.source_title ?? '')
  const [url, setUrl] = useState(source?.url ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { source_title: title.trim(), url: url.trim() }
      if (source) return leadSourceService.update(source.id, payload)
      return leadSourceService.create(payload)
    },
    onSuccess: () => {
      toast.success(source ? 'Lead source updated' : 'Lead source created')
      onSaved()
    },
    onError: () => toast.error(source ? 'Failed to update' : 'Failed to create'),
  })

  const isValid = title.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">
            {source ? 'Edit Lead Source' : 'Add Lead Source'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">Source Title *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Google Ads, Referral, Facebook"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">URL</label>
          <input
            className="input"
            placeholder="https://example.com (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Webhook URL Modal ────────────────────────────────────────────────────────

interface FieldItem {
  id: number
  field_name: string
  field_label: string
  field_type: 'text' | 'email' | 'list'
  is_required: boolean
  allowed_values: string[] | null
}

function exampleValue(field: FieldItem): string {
  if (field.field_type === 'email') return 'john@example.com'
  if (field.field_type === 'list' && field.allowed_values?.length) return field.allowed_values[0]
  // text — guess from name
  const n = field.field_name.toLowerCase()
  if (n.includes('first')) return 'John'
  if (n.includes('last'))  return 'Doe'
  if (n.includes('phone')) return '5551234567'
  if (n.includes('company') || n.includes('business')) return 'Acme Corp'
  if (n.includes('name'))  return 'John Doe'
  if (n.includes('zip') || n.includes('postal')) return '90210'
  if (n.includes('city'))  return 'Los Angeles'
  if (n.includes('state')) return 'CA'
  return 'value'
}

function WebhookModal({
  source,
  onClose,
  onRotated,
  onUpdated,
}: {
  source: LeadSourceItem
  onClose: () => void
  onRotated: (newSecret: string) => void
  onUpdated: () => void
}) {
  const secret = (source.webhook_secret as string) ?? ''
  const webhookUrl = secret ? buildWebhookUrl(secret) : ''

  // Notification state
  const [notifyEmail, setNotifyEmail] = useState(!!source.notify_email)
  const [notifySms, setNotifySms]     = useState(!!source.notify_sms)
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(source.notify_user_ids ?? [])
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  // Assign users state
  const [assignUserIds, setAssignUserIds] = useState<number[]>(source.assign_user_ids ?? [])
  const [assignMethod, setAssignMethod] = useState<'round_robin' | 'sequential'>(source.assign_method ?? 'round_robin')
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')

  // Load all users (including admins) for notification dropdown
  const { data: usersData } = useQuery({
    queryKey: ['all-users-for-notify'],
    queryFn: async () => {
      const res = await agentService.allUsers()
      return (res.data?.data ?? []) as UserOption[]
    },
    staleTime: 60_000,
  })
  const allUsers = usersData ?? []
  const filteredUsers = allUsers.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  )

  const toggleUser = (id: number) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const filteredAssignUsers = allUsers.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(assignSearch.toLowerCase())
  )
  const toggleAssignUser = (id: number) => {
    setAssignUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const saveNotifyMutation = useMutation({
    mutationFn: () => leadSourceService.update(source.id, {
      notify_email: notifyEmail,
      notify_sms: notifySms,
      notify_user_ids: selectedUserIds,
      assign_user_ids: assignUserIds,
      assign_method: assignMethod,
    }),
    onSuccess: () => { toast.success('Settings saved'); onUpdated() },
    onError: () => toast.error('Failed to save settings'),
  })

  // Load configured fields for this source
  const { data: fieldsData, isLoading: fieldsLoading } = useQuery({
    queryKey: ['lead-source-fields', source.id],
    queryFn: () => leadSourceService.listFields(source.id),
  })

  const fields: FieldItem[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = fieldsData as any
    const d = r?.data?.data ?? r?.data
    return Array.isArray(d) ? d : []
  })()

  // Build dynamic cURL body from configured fields
  const curlBody = fields.length
    ? fields.reduce<Record<string, string>>((acc, f) => {
        acc[f.field_name] = exampleValue(f)
        return acc
      }, {})
    : { first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '5551234567' }

  const curlBodyJson = JSON.stringify(curlBody, null, 4)
  const curlText = `curl -X POST "${webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${curlBodyJson}'`

  const rotateMutation = useMutation({
    mutationFn: () => leadSourceService.rotateSecret(source.id),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSecret = (res as any)?.data?.data?.webhook_secret
      if (newSecret) {
        onRotated(newSecret)
        toast.success('Webhook secret rotated. Update any integrations using the old URL.')
      }
    },
    onError: () => toast.error('Failed to rotate secret'),
  })

  const handleRotate = async () => {
    if (!await showConfirm({
      title: 'Rotate Webhook Secret?',
      message: 'This will invalidate the current URL. Any integrations using it must be updated.',
      confirmText: 'Rotate',
      danger: true,
    })) return
    rotateMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Webhook size={15} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{capFirst(source.source_title)} — Webhook</h3>
              <p className="text-xs text-slate-400">POST endpoint for pushing lead data</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Webhook URL — full width */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-slate-400 flex-shrink-0 uppercase tracking-wide">POST</span>
          <code className="text-xs text-slate-700 flex-1 break-all">{webhookUrl || '—'}</code>
          {webhookUrl && <CopyButton text={webhookUrl} />}
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-2 gap-4 items-start">

          {/* Left: fields table + how to use */}
          <div className="space-y-3">
            {/* How to use */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-800 mb-1.5">How to use</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Send a <strong>POST</strong> request to the URL above</li>
                <li>Body: <code className="bg-blue-100 px-1 rounded">application/json</code></li>
                <li>Required fields return <code className="bg-blue-100 px-1 rounded">422</code> if missing</li>
                <li>Success returns <code className="bg-blue-100 px-1 rounded">201 &#123;"lead_id": N&#125;</code></li>
              </ul>
            </div>

            {/* Fields table */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Fields {fieldsLoading && <span className="text-slate-400 normal-case font-normal">(loading…)</span>}
              </label>
              {fields.length > 0 ? (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Key</th>
                        <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Type</th>
                        <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Req.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fields.map(f => (
                        <tr key={f.id}>
                          <td className="px-3 py-1.5 font-mono text-slate-700">{f.field_name}</td>
                          <td className="px-3 py-1.5 text-slate-500">{f.field_type}</td>
                          <td className="px-3 py-1.5">
                            {f.is_required
                              ? <span className="text-red-500 font-medium">Yes</span>
                              : <span className="text-slate-400">No</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !fieldsLoading ? (
                <p className="text-xs text-slate-400 italic">No fields configured for this source.</p>
              ) : null}
            </div>
          </div>

          {/* Right: cURL example */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Example cURL</label>
            <div className="relative h-full">
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs leading-relaxed overflow-auto" style={{ maxHeight: 320 }}>
                {curlText}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={curlText} />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Alerts */}
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-indigo-500" />
            <p className="text-xs font-semibold text-slate-700">Lead Alerts</p>
            <span className="text-[10px] text-slate-400">Notify users when a lead is received via this webhook</span>
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <Mail size={13} className="text-slate-500" />
              <span className="text-xs text-slate-700">Email Alert</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={notifySms} onChange={e => setNotifySms(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <MessageSquare size={13} className="text-slate-500" />
              <span className="text-xs text-slate-700">SMS Alert</span>
            </label>
          </div>

          {/* User multi-select dropdown */}
          {(notifyEmail || notifySms) && (
            <div className="relative">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notify Users</label>
              <button type="button" onClick={() => setUserDropdownOpen(o => !o)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <span className={selectedUserIds.length > 0 ? 'text-slate-800 text-xs' : 'text-slate-400 text-xs'}>
                  {selectedUserIds.length > 0
                    ? `${selectedUserIds.length} user${selectedUserIds.length > 1 ? 's' : ''} selected`
                    : 'Select users to notify...'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Selected user chips */}
              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedUserIds.map(uid => {
                    const u = allUsers.find(x => x.id === uid)
                    return u ? (
                      <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-medium">
                        {u.first_name} {u.last_name}
                        <button type="button" onClick={() => toggleUser(uid)} className="hover:text-indigo-900">
                          <X size={10} />
                        </button>
                      </span>
                    ) : null
                  })}
                </div>
              )}

              {userDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <input autoFocus value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search users..."
                      className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div className="overflow-y-auto max-h-44">
                    {filteredUsers.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">No users found</p>
                    ) : filteredUsers.map(u => {
                      const checked = selectedUserIds.includes(u.id)
                      return (
                        <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center gap-2 ${checked ? 'bg-indigo-50' : ''}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                            {checked && <Check size={10} className="text-white" />}
                          </div>
                          <span className="text-slate-700">{u.first_name} {u.last_name}</span>
                          <span className="text-slate-400 ml-auto">{u.email}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assign Leads To dropdown — always visible */}
          <div className="relative">
            <label className="text-xs font-medium text-slate-600 mb-0.5 block">Assign Leads To</label>
            <p className="text-[10px] text-slate-400 mb-1">Auto-assign incoming leads to selected users</p>

            {/* Assignment mode selector — only show when 2+ users */}
            {assignUserIds.length > 1 && (
              <div className="flex items-center gap-0 mb-2 rounded-lg border border-slate-200 overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => setAssignMethod('sequential')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    assignMethod === 'sequential'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Sequential
                </button>
                <button
                  type="button"
                  onClick={() => setAssignMethod('round_robin')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    assignMethod === 'round_robin'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Round Robin
                </button>
              </div>
            )}

            <button type="button" onClick={() => setAssignDropdownOpen(o => !o)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <span className={assignUserIds.length > 0 ? 'text-slate-800 text-xs' : 'text-slate-400 text-xs'}>
                {assignUserIds.length > 0
                  ? `${assignUserIds.length} user${assignUserIds.length > 1 ? 's' : ''} selected`
                  : 'Select users to assign leads...'}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Selected assign user chips */}
            {assignUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {assignUserIds.map(uid => {
                  const u = allUsers.find(x => x.id === uid)
                  return u ? (
                    <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                      {u.first_name} {u.last_name}
                      <button type="button" onClick={() => toggleAssignUser(uid)} className="hover:text-emerald-900">
                        <X size={10} />
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}

            {assignDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <input autoFocus value={assignSearch} onChange={e => setAssignSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="overflow-y-auto max-h-44">
                  {filteredAssignUsers.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">No users found</p>
                  ) : filteredAssignUsers.map(u => {
                    const checked = assignUserIds.includes(u.id)
                    return (
                      <button key={u.id} type="button" onClick={() => toggleAssignUser(u.id)}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center gap-2 ${checked ? 'bg-indigo-50' : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                          {checked && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-slate-700">{u.first_name} {u.last_name}</span>
                        <span className="text-slate-400 ml-auto">{u.email}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button onClick={() => saveNotifyMutation.mutate()} disabled={saveNotifyMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {saveNotifyMutation.isPending ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Footer: rotate secret */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-700">Rotate Secret</p>
            <p className="text-xs text-slate-400">Invalidates the current URL and generates a new one.</p>
          </div>
          <button
            onClick={handleRotate}
            disabled={rotateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
          >
            <RefreshCw size={12} className={rotateMutation.isPending ? 'animate-spin' : ''} />
            {rotateMutation.isPending ? 'Rotating…' : 'Rotate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Webhook Audit Modal ──────────────────────────────────────────────────────

interface WebhookLogEntry {
  id: number
  lead_source_id: number
  ip_address: string | null
  request_headers: Record<string, string> | null
  request_payload: Record<string, unknown> | null
  response_status: string
  response_code: number
  response_body: Record<string, unknown> | null
  lead_id: number | null
  created_at: string
  updated_at: string
}

const statusBadge: Record<string, { color: string; bg: string; label: string }> = {
  success:          { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Success' },
  error:            { color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         label: 'Error' },
  validation_error: { color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     label: 'Validation Error' },
  duplicate:        { color: 'text-orange-700',   bg: 'bg-orange-50 border-orange-200',   label: 'Duplicate' },
  rejected:         { color: 'text-slate-600',    bg: 'bg-slate-50 border-slate-200',     label: 'Rejected' },
}

function WebhookAuditModal({
  source,
  onClose,
}: {
  source: LeadSourceItem
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const perPage = 15

  const { data, isLoading } = useQuery({
    queryKey: ['webhook-audit-logs', source.id, page],
    queryFn: () => leadSourceService.getWebhookLogs(source.id, { page, per_page: perPage }),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any
  const paginated = raw?.data?.data
  const logs: WebhookLogEntry[] = Array.isArray(paginated?.data) ? paginated.data : []
  const lastPage: number = paginated?.last_page ?? 1
  const total: number = paginated?.total ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <FileText size={15} className="text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{capFirst(source.source_title)} — Webhook Audit Logs</h3>
              <p className="text-xs text-slate-400">{total} total log entries</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">No webhook logs yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Date/Time</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">HTTP</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">IP Address</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Lead ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => {
                  const badge = statusBadge[log.response_status] ?? statusBadge.error
                  const isExpanded = expandedId === log.id
                  return (
                    <tr key={log.id} className="group" >
                      <td colSpan={5} className="p-0">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="w-full text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center">
                            <span className="px-4 py-2.5 text-slate-600">{log.created_at ? formatDateTime(log.created_at) : '—'}</span>
                            <span className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badge.bg} ${badge.color}`}>
                                {badge.label}
                              </span>
                            </span>
                            <span className="px-4 py-2.5 font-mono text-slate-600">{log.response_code}</span>
                            <span className="px-4 py-2.5 text-slate-500">{log.ip_address ?? '—'}</span>
                            <span className="px-4 py-2.5 text-slate-600">{log.lead_id ?? '—'}</span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 bg-slate-50 border-t border-slate-100 space-y-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Request Headers</p>
                              <pre className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 overflow-x-auto max-h-32">
                                {log.request_headers ? JSON.stringify(log.request_headers, null, 2) : '—'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Request Payload</p>
                              <pre className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 overflow-x-auto max-h-48">
                                {log.request_payload ? JSON.stringify(log.request_payload, null, 2) : '—'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Response Body</p>
                              <pre className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 overflow-x-auto max-h-48">
                                {log.response_body ? JSON.stringify(log.response_body, null, 2) : '—'}
                              </pre>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
            <span className="text-xs text-slate-400">Page {page} of {lastPage}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function LeadSources() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [showModal, setShowModal]       = useState(false)
  const [editSource, setEditSource]     = useState<LeadSourceItem | null>(null)
  const [webhookSource, setWebhookSource] = useState<LeadSourceItem | null>(null)
  const [auditSource, setAuditSource]   = useState<LeadSourceItem | null>(null)
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-right" style={{ marginLeft: 'auto' }}>
          <button onClick={() => { setEditSource(null); setShowModal(true) }} className="lt-b lt-p">
            <Plus size={13} /> Add Lead Source
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const { data, isLoading } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => leadSourceService.list(),
  })

  const sources: LeadSourceItem[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = data as any
    const d = r?.data?.data
    return Array.isArray(d) ? d : []
  })()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadSourceService.delete(id),
    onSuccess: () => {
      toast.success('Lead source deleted')
      qc.invalidateQueries({ queryKey: ['lead-sources'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleDelete = async (row: LeadSourceItem) => {
    if (!await showConfirm({
      title: 'Delete Lead Source?',
      message: `Are you sure you want to delete "${row.source_title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    })) return
    deleteMutation.mutate(row.id)
  }

  const handleSaved = () => {
    setShowModal(false)
    setEditSource(null)
    qc.invalidateQueries({ queryKey: ['lead-sources'] })
  }

  // After rotation, patch the cached list with the new secret
  const handleRotated = (newSecret: string) => {
    if (!webhookSource) return
    setWebhookSource(prev => prev ? { ...prev, webhook_secret: newSecret } : null)
    qc.invalidateQueries({ queryKey: ['lead-sources'] })
  }

  const columns: Column<LeadSourceItem>[] = [
    {
      key: 'source_title',
      header: 'Title',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Globe size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{capFirst(row.source_title)}</span>
        </div>
      ),
    },
    {
      key: 'webhook_secret',
      header: 'Webhook URL',
      render: (row) => {
        const secret = row.webhook_secret as string | undefined
        if (!secret) return <span className="text-slate-400 text-xs">—</span>
        const url = buildWebhookUrl(secret)
        return (
          <div className="flex items-center gap-1.5 max-w-[340px]">
            <code className="text-xs text-slate-500 truncate flex-1">{url}</code>
            <CopyButton text={url} />
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={Number(row.status) === 1 ? 'green' : 'gray'}>
          {Number(row.status) === 1 ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span className="text-sm text-slate-500">
          {row.created_at ? formatDateTime(row.created_at) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'Webhook',
            icon: <Webhook size={13} />,
            variant: 'default',
            onClick: () => setWebhookSource(row),
          },
          {
            label: 'Configure Fields',
            icon: <Settings2 size={13} />,
            variant: 'default',
            onClick: () => navigate(`/settings/lead-sources/${row.id}/fields`),
          },
          {
            label: 'Audit Logs',
            icon: <FileText size={13} />,
            variant: 'view' as const,
            onClick: () => setAuditSource(row),
          },
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => { setEditSource(row); setShowModal(true) },
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: () => handleDelete(row),
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      {showModal && (
        <LeadSourceModal
          source={editSource}
          onClose={() => { setShowModal(false); setEditSource(null) }}
          onSaved={handleSaved}
        />
      )}

      {webhookSource && (
        <WebhookModal
          source={webhookSource}
          onClose={() => setWebhookSource(null)}
          onRotated={handleRotated}
          onUpdated={() => qc.invalidateQueries({ queryKey: ['lead-sources'] })}
        />
      )}

      {auditSource && (
        <WebhookAuditModal
          source={auditSource}
          onClose={() => setAuditSource(null)}
        />
      )}

      <div className="space-y-2">
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
          <DataTable
            columns={columns}
            data={sources}
            loading={isLoading}
            keyField="id"
            emptyText="No lead sources yet. Click 'Add Lead Source' to create one."
          />
        </div>
      </div>
    </>
  )
}
