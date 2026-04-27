import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X, Mail, RefreshCw,
  Eye, EyeOff, ChevronDown,
  Server,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/Badge'
import { RowActions } from '../../components/ui/RowActions'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import {
  smtpService,
  DRIVER_PRESETS,
  SENDER_TYPES,
  type SmtpSetting,
  type SmtpPayload,
  type SmtpSenderType,
} from '../../services/smtp.service'

// ── Helpers ───────────────────────────────────────────────────────────────────
const DRIVERS = ['Sendgrid', 'Zoho', 'Google', 'Mailgun', 'SES', 'Sendpulse', 'Custom']
const ENCRYPTIONS = ['TLS', 'SSL', 'NONE']

function senderTypeLabel(t: string) {
  return SENDER_TYPES.find(m => m.value === t)?.label ?? t
}

// ── Form Modal ────────────────────────────────────────────────────────────────
interface FormState {
  sender_type:     SmtpSenderType
  mail_driver:     string
  mail_host:       string
  mail_port:       string
  mail_username:   string
  mail_password:   string
  mail_encryption: string
  from_email:      string
  from_name:       string
  user_id:         string
  campaign_id:     string
}

const BLANK: FormState = {
  sender_type:     'default',
  mail_driver:     'Sendgrid',
  mail_host:       'smtp.sendgrid.net',
  mail_port:       '587',
  mail_username:   '',
  mail_password:   '',
  mail_encryption: 'TLS',
  from_email:      '',
  from_name:       '',
  user_id:         '',
  campaign_id:     '',
}

function SettingModal({
  editing,
  onClose,
  onSaved,
}: {
  editing?: SmtpSetting | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc    = useQueryClient()
  const isEdit = !!editing

  const [form, setForm]         = useState<FormState>(BLANK)
  const [showPwd, setShowPwd]   = useState(false)

  // Populate on edit
  useEffect(() => {
    if (editing) {
      setForm({
        sender_type:     editing.sender_type as SmtpSenderType,
        mail_driver:     editing.mail_driver,
        mail_host:       editing.mail_host,
        mail_port:       String(editing.mail_port),
        mail_username:   editing.mail_username,
        mail_password:   '',    // never pre-fill password
        mail_encryption: editing.mail_encryption,
        from_email:      editing.from_email ?? '',
        from_name:       editing.from_name ?? '',
        user_id:         editing.user_id ? String(editing.user_id) : '',
        campaign_id:     editing.campaign_id ? String(editing.campaign_id) : '',
      })
    } else {
      setForm(BLANK)
    }
  }, [editing])

  // Auto-fill host/port/encryption when driver changes
  function handleDriverChange(driver: string) {
    const preset = DRIVER_PRESETS[driver]
    setForm(f => ({
      ...f,
      mail_driver:     driver,
      mail_host:       preset?.mail_host       || f.mail_host,
      mail_port:       String(preset?.mail_port ?? f.mail_port),
      mail_encryption: preset?.mail_encryption || f.mail_encryption,
    }))
  }

  function set(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Partial<SmtpPayload> = {
        mail_driver:     form.mail_driver,
        mail_host:       form.mail_host,
        mail_port:       form.mail_port,
        mail_username:   form.mail_username,
        mail_encryption: form.mail_encryption,
        sender_type:     form.sender_type,
        from_email:      form.from_email || undefined,
        from_name:       form.from_name || undefined,
      }
      if (form.mail_password) payload.mail_password = form.mail_password
      if (form.sender_type === 'user' && form.user_id) payload.user_id = Number(form.user_id)
      if (form.sender_type === 'campaign' && form.campaign_id) payload.campaign_id = Number(form.campaign_id)
      return isEdit
        ? smtpService.update(editing!.id, payload)
        : smtpService.create(payload as SmtpPayload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Settings updated' : 'Settings created')
      qc.invalidateQueries({ queryKey: ['smtp-settings'] })
      onSaved()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed'
      toast.error(msg)
    },
  })

  const canSave = form.mail_username && (form.sender_type === 'user' || form.from_email) && (isEdit || form.mail_password)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-400" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Mail size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                {isEdit ? 'Edit SMTP Configuration' : 'New SMTP Configuration'}
              </h2>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">

          {/* Row: sender type + driver */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Sender Type <span className="text-red-500">*</span></label>
              <div className="relative">
                <select className="input w-full appearance-none pr-8"
                  value={form.sender_type}
                  onChange={e => set('sender_type', e.target.value as SmtpSenderType)}>
                  {SENDER_TYPES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Email Provider <span className="text-red-500">*</span></label>
              <div className="relative">
                <select className="input w-full appearance-none pr-8"
                  value={form.mail_driver}
                  onChange={e => handleDriverChange(e.target.value)}>
                  {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Conditional: User ID / Campaign ID */}
          {form.sender_type === 'user' && (
            <div className="form-group">
              <label className="label">User ID <span className="text-red-500">*</span></label>
              <input className="input w-full text-sm" type="number" placeholder="Enter user ID"
                value={form.user_id}
                onChange={e => set('user_id', e.target.value)} />
            </div>
          )}
          {form.sender_type === 'campaign' && (
            <div className="form-group">
              <label className="label">Campaign ID <span className="text-red-500">*</span></label>
              <input className="input w-full text-sm" type="number" placeholder="Enter campaign ID"
                value={form.campaign_id}
                onChange={e => set('campaign_id', e.target.value)} />
            </div>
          )}

          {/* SMTP Connection */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <Server size={13} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">SMTP Connection</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 form-group mb-0">
                  <label className="label">Host</label>
                  <input className="input w-full text-sm" placeholder="smtp.sendgrid.net"
                    value={form.mail_host}
                    onChange={e => set('mail_host', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="label">Port</label>
                  <input className="input w-full text-sm" placeholder="587" type="number"
                    value={form.mail_port}
                    onChange={e => set('mail_port', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="label">Username <span className="text-red-500">*</span></label>
                  <input className="input w-full text-sm" placeholder="apikey or email"
                    value={form.mail_username}
                    onChange={e => set('mail_username', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="label">
                    Password {isEdit && <span className="text-slate-400 font-normal">(leave blank to keep)</span>}
                    {!isEdit && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      className="input w-full text-sm pr-9"
                      type={showPwd ? 'text' : 'password'}
                      placeholder={isEdit ? '••••••••' : 'API key or password'}
                      value={form.mail_password}
                      onChange={e => set('mail_password', e.target.value)}
                    />
                    <button type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="label">Encryption</label>
                <div className="flex gap-2">
                  {ENCRYPTIONS.map(enc => (
                    <button
                      key={enc}
                      type="button"
                      onClick={() => set('mail_encryption', enc)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        form.mail_encryption === enc
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      )}
                    >
                      {enc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sender Details */}
          {form.sender_type !== 'user' && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <Mail size={13} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Sender Details</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group mb-0">
                    <label className="label">From Email <span className="text-red-500">*</span></label>
                    <input className="input w-full text-sm" type="email" placeholder="noreply@company.com"
                      value={form.from_email}
                      onChange={e => set('from_email', e.target.value)} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="label">From Name</label>
                    <input className="input w-full text-sm" placeholder="Company Name"
                      value={form.from_name}
                      onChange={e => set('from_name', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Configuration'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function DialerEmailSettings() {
  const qc = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<SmtpSetting | null>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: async () => {
      const res = await smtpService.list()
      const payload = res.data?.data ?? res.data ?? []
      // Backend returns array directly or { total, data } when paginated
      return (Array.isArray(payload) ? payload : payload.data ?? []) as SmtpSetting[]
    },
    staleTime: 0,
  })

  const settings: SmtpSetting[] = data ?? []

  // Toggle active/inactive
  const toggleMutation = useMutation({
    mutationFn: (s: SmtpSetting) => {
      const isActive = s.status === 1 || (s.status as unknown) == 1
      return smtpService.toggleStatus(s.id, isActive ? 0 : 1)
    },
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['smtp-settings'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id: number) => smtpService.delete(id),
    onSuccess: () => {
      toast.success('Configuration deleted')
      qc.invalidateQueries({ queryKey: ['smtp-settings'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  async function handleDelete(s: SmtpSetting) {
    if (await confirmDelete(`${senderTypeLabel(s.sender_type)} SMTP (${s.from_email || s.mail_username})`)) {
      deleteMutation.mutate(s.id)
    }
  }

  function openEdit(s: SmtpSetting) { setEditing(s); setShowModal(true) }
  function openAdd()                  { setEditing(null); setShowModal(true) }

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">SMTP Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure SMTP email accounts for the phone system — system emails, campaign emails, and per-user email sending
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{settings.length} configuration{settings.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="btn-ghost btn-sm p-2 h-9 w-9" title="Refresh">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> Add Configuration
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Mail size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-indigo-800">Phone System Email Routing</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            Each SMTP configuration is tied to a sender type. System type is used for platform-wide emails,
            Campaign type for campaign-specific sends, and User type for individual agent emails.
            Only one System and one per Campaign/User setting is allowed.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
          <span className="text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading...' : `${settings.length} record${settings.length !== 1 ? 's' : ''}`}
          </span>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Updating...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Sender Type</th>
                <th>Provider</th>
                <th>From</th>
                <th>Host</th>
                <th>Status</th>
                <th className="w-px whitespace-nowrap !text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {[0,1,2,3,4,5].map(j => (
                      <td key={j}><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${60 - j*5}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : settings.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <Mail size={22} className="opacity-40" />
                      </div>
                      <p className="font-medium text-slate-500">No SMTP configurations yet</p>
                      <p className="text-xs text-slate-400 mt-1">Click "Add Configuration" to set up your first SMTP account</p>
                    </div>
                  </td>
                </tr>
              ) : (
                settings.map(s => {
                  const isActive = s.status === 1 || (s.status as unknown) == 1
                  const context = s.sender_type === 'campaign' && s.campaign_id
                    ? `Campaign #${s.campaign_id}`
                    : s.sender_type === 'user' && s.user_id
                      ? `User #${s.user_id}`
                      : null
                  return (
                    <tr key={s.id} className="group">
                      {/* Sender Type */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Mail size={13} className="text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{senderTypeLabel(s.sender_type)}</p>
                            {context && <p className="text-[11px] text-slate-400">{context}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Provider */}
                      <td>
                        <span className="text-sm text-slate-700 font-medium">{s.mail_driver}</span>
                      </td>

                      {/* From */}
                      <td>
                        <p className="text-sm text-slate-700">{s.from_email || '—'}</p>
                        {s.from_name && <p className="text-[11px] text-slate-400">{s.from_name}</p>}
                      </td>

                      {/* Host */}
                      <td>
                        <span className="text-xs font-mono text-slate-600">{s.mail_host}:{s.mail_port}</span>
                      </td>

                      {/* Status */}
                      <td>
                        <button
                          onClick={() => toggleMutation.mutate(s)}
                          disabled={toggleMutation.isPending}
                          title={isActive ? 'Click to deactivate' : 'Click to activate'}
                          className="disabled:opacity-60"
                        >
                          <Badge variant={isActive ? 'green' : 'gray'}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="w-px whitespace-nowrap">
                        <RowActions actions={[
                          {
                            label:   'Edit',
                            icon:    <Pencil size={13} />,
                            variant: 'edit',
                            onClick: () => openEdit(s),
                          },
                          {
                            label:   'Delete',
                            icon:    <Trash2 size={13} />,
                            variant: 'delete',
                            onClick: () => handleDelete(s),
                            disabled: deleteMutation.isPending,
                          },
                        ]} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <SettingModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
