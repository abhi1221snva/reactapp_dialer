import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, X, Mail, RefreshCw,
  Send, Eye, EyeOff, ChevronDown,
  Check, Server, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { Badge } from '../../components/ui/Badge'
import { RowActions } from '../../components/ui/RowActions'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import {
  emailSettingsService,
  DRIVER_PRESETS,
  MAIL_TYPES,
  type EmailSetting,
  type EmailSettingPayload,
  type EmailMailType,
} from '../../services/emailSettings.service'

// ── Helpers ───────────────────────────────────────────────────────────────────
const DRIVERS = ['Sendgrid', 'Zoho', 'Google', 'Mailgun', 'SES', 'Sendpulse', 'Custom']
const ENCRYPTIONS = ['TLS', 'SSL', 'NONE']

function mailTypeLabel(t: string) {
  return MAIL_TYPES.find(m => m.value === t)?.label ?? t
}

// ── Form Modal ────────────────────────────────────────────────────────────────
interface FormState {
  mail_type:       EmailMailType
  mail_driver:     string
  mail_host:       string
  mail_port:       string
  mail_username:   string
  mail_password:   string
  mail_encryption: string
  sender_email:    string
  sender_name:     string
  send_email_via:  'custom' | 'user_email'
}

const BLANK: FormState = {
  mail_type:       'notification',
  mail_driver:     'Sendgrid',
  mail_host:       'smtp.sendgrid.net',
  mail_port:       '587',
  mail_username:   '',
  mail_password:   '',
  mail_encryption: 'TLS',
  sender_email:    '',
  sender_name:     '',
  send_email_via:  'custom',
}

function SettingModal({
  editing,
  onClose,
  onSaved,
}: {
  editing?: EmailSetting | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc    = useQueryClient()
  const isEdit = !!editing

  const [form, setForm]         = useState<FormState>(BLANK)
  const [showPwd, setShowPwd]   = useState(false)
  const [testTo, setTestTo]     = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting]   = useState(false)

  // Populate on edit
  useEffect(() => {
    if (editing) {
      setForm({
        mail_type:       editing.mail_type as EmailMailType,
        mail_driver:     editing.mail_driver,
        mail_host:       editing.mail_host,
        mail_port:       String(editing.mail_port),
        mail_username:   editing.mail_username,
        mail_password:   '',    // never pre-fill password
        mail_encryption: editing.mail_encryption,
        sender_email:    editing.sender_email,
        sender_name:     editing.sender_name,
        send_email_via:  editing.send_email_via,
      })
    } else {
      setForm(BLANK)
    }
    setTestResult(null)
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
      const payload: Partial<EmailSettingPayload> = {
        mail_type:       form.mail_type,
        mail_driver:     form.mail_driver,
        mail_host:       form.mail_host,
        mail_port:       Number(form.mail_port),
        mail_username:   form.mail_username,
        mail_encryption: form.mail_encryption,
        sender_email:    form.sender_email,
        sender_name:     form.sender_name,
        send_email_via:  form.send_email_via,
      }
      if (form.mail_password) payload.mail_password = form.mail_password
      return isEdit
        ? emailSettingsService.update(editing!.id, payload)
        : emailSettingsService.create(payload as EmailSettingPayload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Settings updated' : 'Settings created')
      qc.invalidateQueries({ queryKey: ['crm-email-settings'] })
      onSaved()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed'
      toast.error(msg)
    },
  })

  // Test email
  async function handleTest() {
    if (!testTo) { toast.error('Enter a test recipient email'); return }
    if (!form.mail_host || !form.mail_username || !form.mail_password) {
      toast.error('Fill in host, username and password before testing')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await emailSettingsService.testEmail({
        config: {
          mail_host:      form.mail_host,
          mail_port:      Number(form.mail_port),
          mail_username:  form.mail_username,
          mail_password:  form.mail_password,
          mail_encryption:form.mail_encryption,
          sender_email:   form.sender_email,
          sender_name:    form.sender_name,
        },
        test_to: testTo,
      })
      setTestResult(res.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Test failed'
      setTestResult({ success: false, message: msg })
    } finally {
      setTesting(false)
    }
  }

  const canSave = form.mail_username && form.sender_email && (isEdit || form.mail_password)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Mail size={16} className="text-emerald-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                {isEdit ? 'Edit Email Configuration' : 'New Email Configuration'}
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

          {/* Row: type + driver */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Mail Type <span className="text-red-500">*</span></label>
              <div className="relative">
                <select className="input w-full appearance-none pr-8"
                  value={form.mail_type}
                  onChange={e => set('mail_type', e.target.value)}>
                  {MAIL_TYPES.map(m => (
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
                          ? 'bg-emerald-600 text-white border-emerald-600'
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
                    value={form.sender_email}
                    onChange={e => set('sender_email', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="label">From Name</label>
                  <input className="input w-full text-sm" placeholder="Company Name"
                    value={form.sender_name}
                    onChange={e => set('sender_name', e.target.value)} />
                </div>
              </div>

              {form.mail_type !== 'notification' && (
                <div className="form-group mb-0">
                  <label className="label">Send Email Via</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'custom',     label: 'Custom Sender' },
                      { value: 'user_email', label: 'User Email' },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => set('send_email_via', opt.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                          form.send_email_via === opt.value
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        )}
                      >
                        {form.send_email_via === opt.value && <Check size={11} />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test Email */}
          <div className="rounded-xl border border-dashed border-slate-300 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 border-b border-dashed border-slate-300">
              <Send size={13} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Send Test Email</span>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  type="email"
                  placeholder="recipient@example.com"
                  value={testTo}
                  onChange={e => setTestTo(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || !testTo}
                  className="btn-outline flex items-center gap-1.5 text-sm whitespace-nowrap disabled:opacity-50"
                >
                  {testing
                    ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                    : <><Send size={13} /> Send Test</>
                  }
                </button>
              </div>

              {/* Test result banner */}
              {testResult && (
                <div className={cn(
                  'mt-3 flex items-start gap-2 p-3 rounded-lg text-sm',
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                )}>
                  {testResult.success
                    ? <Check size={15} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                    : <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-red-500" />
                  }
                  <span>{testResult.message}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                Tests are sent using the form values above — configuration is not saved until you click Save.
              </p>
            </div>
          </div>
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
export function CrmEmailSettings() {
  const qc = useQueryClient()
  const { setDescription } = useCrmHeader()

  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<EmailSetting | null>(null)

  useEffect(() => {
    setDescription('Configure SMTP email accounts for notifications, submissions and online applications')
    return () => setDescription(undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['crm-email-settings'],
    queryFn: async () => {
      const res = await emailSettingsService.list()
      const payload = res.data?.data ?? res.data ?? {}
      return (payload.list ?? []) as EmailSetting[]
    },
    staleTime: 0,
  })

  const settings: EmailSetting[] = data ?? []

  // Toggle active/inactive
  const toggleMutation = useMutation({
    mutationFn: (id: number) => emailSettingsService.toggle(id),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['crm-email-settings'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id: number) => emailSettingsService.delete(id),
    onSuccess: () => {
      toast.success('Configuration deleted')
      qc.invalidateQueries({ queryKey: ['crm-email-settings'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  async function handleDelete(s: EmailSetting) {
    if (await confirmDelete(`${mailTypeLabel(s.mail_type)} (${s.sender_email})`)) {
      deleteMutation.mutate(s.id)
    }
  }

  function openEdit(s: EmailSetting) { setEditing(s); setShowModal(true) }
  function openAdd()                  { setEditing(null); setShowModal(true) }

  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
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

      {/* ── Info banner ── */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Mail size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Dynamic Email Routing</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Each configuration is tied to a mail type. The system automatically picks the active
            configuration for the given type when sending notifications, submissions, or applications.
            You can have multiple configs per type but only the active one is used.
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-wrapper bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
          <span className="text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading…' : `${settings.length} record${settings.length !== 1 ? 's' : ''}`}
          </span>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Updating…
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
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
                      <p className="font-medium text-slate-500">No email configurations yet</p>
                      <p className="text-xs text-slate-400 mt-1">Click "Add Configuration" to set up your first SMTP account</p>
                    </div>
                  </td>
                </tr>
              ) : (
                settings.map(s => {
                  const isActive = s.status === 1 || (s.status as unknown) == 1
                  return (
                    <tr key={s.id} className="group">
                      {/* Type */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <Mail size={13} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{mailTypeLabel(s.mail_type)}</p>
                            <p className="text-[11px] text-slate-400">{s.mail_type}</p>
                          </div>
                        </div>
                      </td>

                      {/* Provider */}
                      <td>
                        <span className="text-sm text-slate-700 font-medium">{s.mail_driver}</span>
                      </td>

                      {/* From */}
                      <td>
                        <p className="text-sm text-slate-700">{s.sender_email}</p>
                        {s.sender_name && <p className="text-[11px] text-slate-400">{s.sender_name}</p>}
                      </td>

                      {/* Host */}
                      <td>
                        <span className="text-xs font-mono text-slate-600">{s.mail_host}:{s.mail_port}</span>
                      </td>

                      {/* Status */}
                      <td>
                        <button
                          onClick={() => toggleMutation.mutate(s.id)}
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
