import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User, Lock, Phone, Users, Plus, Shield, ChevronRight, Mail, MessageSquare,
  Globe, Server, WifiOff, Settings2, Bell, Key, Sliders, FileText, Activity,
  CheckCircle2, XCircle, Save, Eye, EyeOff, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { authService } from '../../services/auth.service'
import { userService } from '../../services/user.service'
import { cn, capFirst } from '../../utils/cn'
import { confirmDelete } from '../../utils/confirmDelete'

const SECTIONS = [
  { key: 'profile',    label: 'Profile',         icon: User,         desc: 'Your personal details' },
  { key: 'security',   label: 'Security',         icon: Shield,       desc: 'Password & 2FA' },
  { key: 'extensions', label: 'Extensions',       icon: Phone,        desc: 'Agents & extensions' },
  { key: 'groups',     label: 'Groups',            icon: Users,        desc: 'Group management' },
  { key: 'smtp',       label: 'Email (SMTP)',      icon: Mail,         desc: 'Outbound email server' },
  { key: 'sms',        label: 'SMS Provider',      icon: MessageSquare, desc: 'SMS gateway config' },
  { key: 'voip',       label: 'VoIP Settings',     icon: Phone,        desc: 'SIP & WebPhone config' },
  { key: 'api',        label: 'API Keys',          icon: Key,          desc: 'External API access' },
  { key: 'notifications', label: 'Notifications', icon: Bell,         desc: 'Alert preferences' },
]

interface AgentRow { id: number; name: string; email: string; extension: string; level: number; status: number; [key: string]: unknown }
interface GroupRow  { id: number; group_name: string; members_count?: number; [key: string]: unknown }
interface SmtpForm  { from_name: string; from_email: string; host: string; port: number; encryption: string; username: string; password: string }
interface SmsForm   { provider: string; api_key: string; api_secret: string; from_number: string }
interface ApiKey    { id: number; name: string; key: string; created_at: string; last_used?: string; [key: string]: unknown }

const DEFAULT_SMTP: SmtpForm = { from_name: '', from_email: '', host: '', port: 587, encryption: 'tls', username: '', password: '' }
const DEFAULT_SMS: SmsForm   = { provider: 'twilio', api_key: '', api_secret: '', from_number: '' }

export function Settings() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [section, setSection] = useState('profile')
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [passwordForm, setPasswordForm] = useState({ old_password: '', password: '', password_confirmation: '' })
  const [agentForm, setAgentForm] = useState({ name: '', email: '', password: '', extension: '', level: 1 })
  const [smtpForm, setSmtpForm] = useState<SmtpForm>(DEFAULT_SMTP)
  const [smsForm, setSmsForm]   = useState<SmsForm>(DEFAULT_SMS)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: agentsData, isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/users'),
    enabled: section === 'extensions',
  })

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => api.get('/extension-group'),
    enabled: section === 'groups',
  })

  const { data: smtpData } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: () => api.get('/smtp-setting'),
    enabled: section === 'smtp',
  })

  const { data: smsData } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: () => api.get('/sms-setting'),
    enabled: section === 'sms',
  })

  const { data: apiKeysData, isLoading: apiKeysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys'),
    enabled: section === 'api',
  })

  // Populate SMTP form from API
  useEffect(() => {
    const d = smtpData?.data?.data
    if (d) setSmtpForm({ from_name: d.from_name || '', from_email: d.from_email || '', host: d.host || '', port: Number(d.port) || 587, encryption: d.encryption || 'tls', username: d.username || '', password: d.password || '' })
  }, [smtpData])

  // Populate SMS form from API
  useEffect(() => {
    const d = smsData?.data?.data
    if (d) setSmsForm({ provider: d.provider || 'twilio', api_key: d.api_key || '', api_secret: d.api_secret || '', from_number: d.from_number || '' })
  }, [smsData])

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const updateProfileMutation = useMutation({
    mutationFn: () => authService.updateProfile(profileForm as unknown as FormData),
    onSuccess: () => toast.success('Profile updated'),
  })

  const changePasswordMutation = useMutation({
    mutationFn: () => authService.changePassword(passwordForm),
    onSuccess: () => { toast.success('Password changed'); setPasswordForm({ old_password: '', password: '', password_confirmation: '' }) },
  })

  const createAgentMutation = useMutation({
    mutationFn: () => userService.create(agentForm as unknown as Record<string, unknown>),
    onSuccess: () => { toast.success('Agent created'); setShowAddAgent(false); refetchAgents() },
  })

  const saveSmtpMutation = useMutation({
    mutationFn: () => api.post('/save-smtp', smtpForm),
    onSuccess: () => { toast.success('SMTP settings saved'); qc.invalidateQueries({ queryKey: ['smtp-settings'] }) },
  })

  const testSmtpMutation = useMutation({
    mutationFn: () => api.post('/test-smtp', smtpForm),
    onSuccess: () => toast.success('Test email sent successfully!'),
    onError: () => toast.error('SMTP test failed. Check settings.'),
  })

  const saveSmsMutation = useMutation({
    mutationFn: () => api.post('/save-sms-setting', smsForm),
    onSuccess: () => toast.success('SMS settings saved'),
  })

  const createApiKeyMutation = useMutation({
    mutationFn: () => api.post('/api-keys', { name: newKeyName }),
    onSuccess: (res) => {
      setCreatedKey(res.data?.data?.key || null)
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setNewKeyName('')
    },
  })

  const deleteApiKeyMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api-keys/${id}`),
    onSuccess: () => { toast.success('API key deleted'); qc.invalidateQueries({ queryKey: ['api-keys'] }) },
  })

  // ── Data ──────────────────────────────────────────────────────────────────────
  const agents: AgentRow[] = agentsData?.data?.data || []
  const groups: GroupRow[] = groupsData?.data?.data || groupsData?.data || []
  const apiKeys: ApiKey[] = apiKeysData?.data?.data || []

  const agentColumns: Column<AgentRow>[] = [
    { key: 'name',      header: 'Name',      render: r => <span className="text-sm font-medium text-slate-900">{capFirst(r.name)}</span> },
    { key: 'email',     header: 'Email',     render: r => <span className="text-sm text-slate-500">{r.email}</span> },
    { key: 'extension', header: 'Extension', render: r => <code className="text-xs bg-slate-100 px-2 py-1 rounded-lg font-mono font-semibold text-slate-700">{r.extension}</code> },
    { key: 'level',     header: 'Role',      render: r => {
      const lvl = Number(r.level); const label = lvl >= 10 ? 'SuperAdmin' : lvl >= 7 ? 'Admin' : lvl >= 5 ? 'Manager' : 'Agent'
      return <Badge variant={lvl >= 7 ? 'purple' : lvl >= 5 ? 'blue' : 'gray'}>{label}</Badge>
    }},
    { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 1 ? 'green' : 'red'}>{r.status === 1 ? 'Active' : 'Inactive'}</Badge> },
  ]

  const groupColumns: Column<GroupRow>[] = [
    { key: 'group_name',    header: 'Group Name', render: r => <span className="text-sm font-medium text-slate-900">{r.group_name}</span> },
    { key: 'members_count', header: 'Members',    render: r => <span className="text-sm text-slate-700">{r.members_count ?? 0}</span> },
  ]

  const apiKeyColumns: Column<ApiKey>[] = [
    { key: 'name',     header: 'Name',       render: r => <span className="text-sm font-medium text-slate-900">{capFirst(r.name)}</span> },
    { key: 'key',      header: 'Key',        render: r => <code className="text-xs bg-slate-100 px-2 py-1 rounded-lg font-mono text-slate-600">{String(r.key).slice(0, 24)}…</code> },
    { key: 'created_at', header: 'Created',  render: r => <span className="text-xs text-slate-500">{r.created_at}</span> },
    { key: 'last_used', header: 'Last Used', render: r => <span className="text-xs text-slate-500">{r.last_used || 'Never'}</span> },
    { key: 'actions',   header: '',          render: r => (
      <button
        onClick={async () => { if (await confirmDelete()) deleteApiKeyMutation.mutate(r.id) }}
        className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
      >
        Revoke
      </button>
    )},
  ]

  const activeSection = SECTIONS.find(s => s.key === section)

  const togglePassword = (key: string) => setShowPasswords(p => ({ ...p, [key]: !p[key] }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="page-subtitle">Manage your account and system configuration</p>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar nav */}
        <div className="w-60 flex-shrink-0 space-y-1 sticky top-4">
          {SECTIONS.map(s => {
            const isActive = section === s.key
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all',
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', isActive ? 'bg-indigo-100' : 'bg-slate-100')}>
                  <s.icon size={15} className={isActive ? 'text-indigo-600' : 'text-slate-500'} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-semibold truncate', isActive ? 'text-indigo-700' : 'text-slate-700')}>{s.label}</p>
                  <p className="text-[11px] text-slate-400 truncate">{s.desc}</p>
                </div>
                {isActive && <ChevronRight size={14} className="text-indigo-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection && (
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                <activeSection.icon size={16} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">{activeSection.label}</h2>
                <p className="text-xs text-slate-500">{activeSection.desc}</p>
              </div>
            </div>
          )}

          {/* ── PROFILE ───────────────────────────────────────────────────── */}
          {section === 'profile' && (
            <div className="card space-y-5">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-2xl font-bold flex items-center justify-center shadow-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">{user?.name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Full Name</label>
                  <input className="input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input className="input" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Email</label>
                  <input className="input opacity-60 cursor-not-allowed" value={user?.email || ''} disabled />
                </div>
                <div className="form-group">
                  <label className="label">Extension</label>
                  <input className="input opacity-60 cursor-not-allowed" value={user?.extension || ''} disabled />
                </div>
              </div>
              <button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending} className="btn-primary">
                {updateProfileMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── SECURITY ──────────────────────────────────────────────────── */}
          {section === 'security' && (
            <div className="space-y-4">
              <div className="card space-y-5 max-w-lg">
                <h3 className="font-semibold text-slate-900 text-sm pb-3 border-b border-slate-100">Change Password</h3>
                {[
                  { key: 'old_password', label: 'Current Password', placeholder: 'Enter current password' },
                  { key: 'password', label: 'New Password', placeholder: 'Min. 8 characters' },
                  { key: 'password_confirmation', label: 'Confirm New Password', placeholder: 'Repeat new password' },
                ].map(field => (
                  <div key={field.key} className="form-group">
                    <label className="label">{field.label}</label>
                    <div className="relative">
                      <input
                        type={showPasswords[field.key] ? 'text' : 'password'}
                        className="input pr-10"
                        placeholder={field.placeholder}
                        value={passwordForm[field.key as keyof typeof passwordForm]}
                        onChange={e => setPasswordForm(f => ({ ...f, [field.key]: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => togglePassword(field.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords[field.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => changePasswordMutation.mutate()}
                  disabled={!passwordForm.old_password || !passwordForm.password || changePasswordMutation.isPending}
                  className="btn-primary gap-2"
                >
                  <Lock size={15} />
                  {changePasswordMutation.isPending ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
          )}

          {/* ── EXTENSIONS ────────────────────────────────────────────────── */}
          {section === 'extensions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{agents.length} agents configured</p>
                <button onClick={() => setShowAddAgent(true)} className="btn-primary gap-2 text-sm">
                  <Plus size={14} /> Add Agent
                </button>
              </div>
              <div className="card overflow-hidden p-0">
                <DataTable columns={agentColumns} data={agents} loading={agentsLoading} emptyText="No agents found" />
              </div>
            </div>
          )}

          {/* ── GROUPS ────────────────────────────────────────────────────── */}
          {section === 'groups' && (
            <div className="card overflow-hidden p-0">
              <DataTable columns={groupColumns} data={groups} loading={groupsLoading} emptyText="No groups found" />
            </div>
          )}

          {/* ── SMTP ──────────────────────────────────────────────────────── */}
          {section === 'smtp' && (
            <div className="card space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">SMTP Configuration</h3>
                <button
                  onClick={() => testSmtpMutation.mutate()}
                  disabled={testSmtpMutation.isPending || !smtpForm.host}
                  className="btn-outline gap-2 text-sm"
                >
                  <Activity size={13} />
                  {testSmtpMutation.isPending ? 'Testing…' : 'Test Connection'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">From Name</label>
                  <input className="input" placeholder="Rocket Dialer" value={smtpForm.from_name} onChange={e => setSmtpForm(f => ({ ...f, from_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">From Email</label>
                  <input type="email" className="input" placeholder="noreply@example.com" value={smtpForm.from_email} onChange={e => setSmtpForm(f => ({ ...f, from_email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">SMTP Host</label>
                  <input className="input" placeholder="smtp.gmail.com" value={smtpForm.host} onChange={e => setSmtpForm(f => ({ ...f, host: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Port</label>
                  <input type="number" className="input" value={smtpForm.port} onChange={e => setSmtpForm(f => ({ ...f, port: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="label">Encryption</label>
                  <select className="input" value={smtpForm.encryption} onChange={e => setSmtpForm(f => ({ ...f, encryption: e.target.value }))}>
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Username</label>
                  <input className="input" placeholder="your@email.com" value={smtpForm.username} onChange={e => setSmtpForm(f => ({ ...f, username: e.target.value }))} />
                </div>
                <div className="form-group col-span-2">
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.smtp ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="SMTP password or app password"
                      value={smtpForm.password}
                      onChange={e => setSmtpForm(f => ({ ...f, password: e.target.value }))}
                    />
                    <button type="button" onClick={() => togglePassword('smtp')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPasswords.smtp ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => saveSmtpMutation.mutate()} disabled={saveSmtpMutation.isPending} className="btn-primary gap-2">
                <Save size={15} />
                {saveSmtpMutation.isPending ? 'Saving…' : 'Save SMTP Settings'}
              </button>
            </div>
          )}

          {/* ── SMS PROVIDER ──────────────────────────────────────────────── */}
          {section === 'sms' && (
            <div className="card space-y-5">
              <h3 className="font-semibold text-slate-900 pb-3 border-b border-slate-100">SMS Provider</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="label">Provider</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['twilio', 'plivo', 'telnyx'].map(p => (
                      <label key={p} className={cn(
                        'flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-all capitalize font-medium text-sm',
                        smsForm.provider === p ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      )}>
                        <input type="radio" name="provider" value={p} checked={smsForm.provider === p} onChange={e => setSmsForm(f => ({ ...f, provider: e.target.value }))} className="accent-indigo-600" />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">API Key / Account SID</label>
                  <input className="input font-mono" placeholder="Account SID or API key" value={smsForm.api_key} onChange={e => setSmsForm(f => ({ ...f, api_key: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">API Secret / Auth Token</label>
                  <div className="relative">
                    <input
                      type={showPasswords.sms_secret ? 'text' : 'password'}
                      className="input font-mono pr-10"
                      placeholder="Auth token or API secret"
                      value={smsForm.api_secret}
                      onChange={e => setSmsForm(f => ({ ...f, api_secret: e.target.value }))}
                    />
                    <button type="button" onClick={() => togglePassword('sms_secret')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPasswords.sms_secret ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="form-group col-span-2">
                  <label className="label">Default From Number</label>
                  <input className="input font-mono" placeholder="+15555555555" value={smsForm.from_number} onChange={e => setSmsForm(f => ({ ...f, from_number: e.target.value }))} />
                  <p className="text-xs text-slate-400 mt-1">Phone number in E.164 format</p>
                </div>
              </div>
              <button onClick={() => saveSmsMutation.mutate()} disabled={saveSmsMutation.isPending} className="btn-primary gap-2">
                <Save size={15} />
                {saveSmsMutation.isPending ? 'Saving…' : 'Save SMS Settings'}
              </button>
            </div>
          )}

          {/* ── VOIP ──────────────────────────────────────────────────────── */}
          {section === 'voip' && (
            <VoipSettings />
          )}

          {/* ── API KEYS ──────────────────────────────────────────────────── */}
          {section === 'api' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-600">Manage API keys for external integrations</p>
                </div>
                <button onClick={() => { setShowApiKeyModal(true); setCreatedKey(null) }} className="btn-primary gap-2 text-sm">
                  <Plus size={14} /> Create API Key
                </button>
              </div>

              {createdKey && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800">API Key created — copy it now</p>
                    <p className="text-xs text-emerald-600 mt-0.5">This key will only be shown once.</p>
                    <code className="block mt-2 text-xs font-mono bg-white border border-emerald-200 rounded-lg px-3 py-2 text-emerald-900 break-all select-all">
                      {createdKey}
                    </code>
                  </div>
                  <button onClick={() => setCreatedKey(null)} className="text-emerald-600 hover:text-emerald-800">
                    <XCircle size={16} />
                  </button>
                </div>
              )}

              <div className="card overflow-hidden p-0">
                <DataTable columns={apiKeyColumns} data={apiKeys} loading={apiKeysLoading} emptyText="No API keys created yet" />
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ─────────────────────────────────────────────── */}
          {section === 'notifications' && (
            <NotificationSettings />
          )}
        </div>
      </div>

      {/* Add Agent Modal */}
      <Modal isOpen={showAddAgent} onClose={() => setShowAddAgent(false)} title="Add New Agent" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Full Name *</label>
              <input className="input" placeholder="John Doe" value={agentForm.name} onChange={e => setAgentForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Extension *</label>
              <input className="input font-mono" placeholder="e.g. 1002" value={agentForm.extension} onChange={e => setAgentForm(f => ({ ...f, extension: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Email *</label>
            <input type="email" className="input" placeholder="john@example.com" value={agentForm.email} onChange={e => setAgentForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Password *</label>
            <input type="password" className="input" placeholder="Min. 8 characters" value={agentForm.password} onChange={e => setAgentForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Role Level</label>
            <select className="input" value={agentForm.level} onChange={e => setAgentForm(f => ({ ...f, level: Number(e.target.value) }))}>
              <option value={1}>Agent</option>
              <option value={5}>Manager</option>
              <option value={7}>Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAddAgent(false)} className="btn-outline flex-1">Cancel</button>
            <button
              onClick={() => createAgentMutation.mutate()}
              disabled={!agentForm.name || !agentForm.email || !agentForm.extension || createAgentMutation.isPending}
              className="btn-primary flex-1"
            >
              {createAgentMutation.isPending ? 'Creating…' : 'Create Agent'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create API Key Modal */}
      <Modal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} title="Create API Key" size="sm">
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Key Name *</label>
            <input className="input" placeholder="e.g. Integration v1, Zapier" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">A label to identify this key</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowApiKeyModal(false)} className="btn-outline flex-1">Cancel</button>
            <button
              onClick={() => { createApiKeyMutation.mutate(); setShowApiKeyModal(false) }}
              disabled={!newKeyName.trim() || createApiKeyMutation.isPending}
              className="btn-primary flex-1"
            >
              Generate Key
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── VoIP Settings sub-component ─────────────────────────────────────────────
function VoipSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['voip-settings'],
    queryFn: () => api.get('/voip-configuration'),
  })

  const saveMutation = useMutation({
    mutationFn: (form: Record<string, unknown>) => api.post('/voip-configuration', form),
    onSuccess: () => toast.success('VoIP settings saved'),
  })

  const config = data?.data?.data || {}
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (Object.keys(config).length) setForm(config as Record<string, string>)
  }, [data])

  const f = (k: string) => form[k] || ''
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  if (isLoading) return (
    <div className="card animate-pulse space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl" />)}
    </div>
  )

  return (
    <div className="card space-y-5">
      <div className="pb-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">VoIP / SIP Configuration</h3>
        <p className="text-xs text-slate-500 mt-0.5">WebPhone and SIP server settings</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="label">SIP Server</label>
          <input className="input font-mono" placeholder="sip.example.com" value={f('sip_server')} onChange={e => set('sip_server', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">SIP Domain</label>
          <input className="input font-mono" placeholder="example.com" value={f('sip_domain')} onChange={e => set('sip_domain', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">WebSocket Port</label>
          <input className="input font-mono" placeholder="8089" value={f('ws_port') || '8089'} onChange={e => set('ws_port', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Transport</label>
          <select className="input" value={f('transport') || 'wss'} onChange={e => set('transport', e.target.value)}>
            <option value="wss">WSS (Secure)</option>
            <option value="ws">WS</option>
          </select>
        </div>
        <div className="form-group col-span-2">
          <label className="label">STUN Server</label>
          <input className="input font-mono" placeholder="stun:stun.l.google.com:19302" value={f('stun_server')} onChange={e => set('stun_server', e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-700">Changes take effect on next agent login. Agents must re-login to the dialer.</p>
      </div>
      <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary gap-2">
        <Save size={15} />
        {saveMutation.isPending ? 'Saving…' : 'Save VoIP Settings'}
      </button>
    </div>
  )
}

// ─── Notification Settings sub-component ─────────────────────────────────────
function NotificationSettings() {
  const NOTIF_OPTIONS = [
    { key: 'inbound_call',    label: 'Inbound Call',     desc: 'Alert when a call arrives' },
    { key: 'missed_call',     label: 'Missed Call',      desc: 'Notify on missed calls' },
    { key: 'inbound_sms',     label: 'Inbound SMS',      desc: 'Alert on new SMS messages' },
    { key: 'voicemail',       label: 'New Voicemail',    desc: 'Notify on new voicemails' },
    { key: 'crm_activity',    label: 'CRM Activity',     desc: 'Lead updates and activities' },
    { key: 'agent_login',     label: 'Agent Login',      desc: 'Alert when agents log in' },
  ]

  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_OPTIONS.map(n => [n.key, true]))
  )

  const saveMutation = useMutation({
    mutationFn: () => api.post('/notification-settings', { settings: enabled }),
    onSuccess: () => toast.success('Notification preferences saved'),
  })

  return (
    <div className="card space-y-5">
      <h3 className="font-semibold text-slate-900 pb-3 border-b border-slate-100">Notification Preferences</h3>
      <div className="space-y-3">
        {NOTIF_OPTIONS.map(opt => (
          <div key={opt.key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
            <div>
              <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
              <p className="text-xs text-slate-400">{opt.desc}</p>
            </div>
            <button
              onClick={() => setEnabled(p => ({ ...p, [opt.key]: !p[opt.key] }))}
              className={cn(
                'w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0',
                enabled[opt.key] ? 'bg-indigo-600' : 'bg-slate-300'
              )}
              style={{ height: '22px' }}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                enabled[opt.key] ? 'translate-x-[18px]' : 'translate-x-0'
              )} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary gap-2">
        <Save size={15} />
        {saveMutation.isPending ? 'Saving…' : 'Save Preferences'}
      </button>
    </div>
  )
}
