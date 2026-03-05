import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { User, Lock, Phone, Users, Plus, Shield, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { authService } from '../../services/auth.service'
import { cn } from '../../utils/cn'

const SECTIONS = [
  { key: 'profile', label: 'Profile', icon: User, desc: 'Your personal details' },
  { key: 'security', label: 'Security', icon: Shield, desc: 'Password & access' },
  { key: 'extensions', label: 'Extensions', icon: Phone, desc: 'Agents & extensions' },
  { key: 'groups', label: 'Groups', icon: Users, desc: 'Group management' },
]

interface AgentRow { id: number; name: string; email: string; extension: string; level: number; status: number; [key: string]: unknown }
interface GroupRow { id: number; group_name: string; members_count: number; [key: string]: unknown }

export function Settings() {
  const { user } = useAuth()
  const [section, setSection] = useState('profile')
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [passwordForm, setPasswordForm] = useState({ old_password: '', password: '', password_confirmation: '' })
  const [agentForm, setAgentForm] = useState({ name: '', email: '', password: '', extension: '', level: 1 })

  const { data: agentsData, isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/users'),
    enabled: section === 'extensions',
  })

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups'),
    enabled: section === 'groups',
  })

  const updateProfileMutation = useMutation({
    mutationFn: () => authService.updateProfile(profileForm),
    onSuccess: () => toast.success('Profile updated'),
  })

  const changePasswordMutation = useMutation({
    mutationFn: () => authService.changePassword(passwordForm),
    onSuccess: () => {
      toast.success('Password changed')
      setPasswordForm({ old_password: '', password: '', password_confirmation: '' })
    },
  })

  const createAgentMutation = useMutation({
    mutationFn: () => api.post('/users', agentForm),
    onSuccess: () => { toast.success('Agent created'); setShowAddAgent(false); refetchAgents() },
  })

  const agents: AgentRow[] = agentsData?.data?.data || []
  const groups: GroupRow[] = groupsData?.data?.data || []

  const agentColumns: Column<AgentRow>[] = [
    { key: 'name', header: 'Name', render: r => <span className="text-sm font-medium text-slate-900">{r.name}</span> },
    { key: 'email', header: 'Email', render: r => <span className="text-sm text-slate-500">{r.email}</span> },
    {
      key: 'extension', header: 'Extension',
      render: r => <code className="text-xs bg-slate-100 px-2 py-1 rounded-lg font-mono font-semibold text-slate-700">{r.extension}</code>,
    },
    { key: 'level', header: 'Role', render: r => {
      const lvl = Number(r.level)
      const label = lvl >= 10 ? 'SuperAdmin' : lvl >= 7 ? 'Admin' : lvl >= 5 ? 'Manager' : 'Agent'
      return <Badge variant={lvl >= 7 ? 'purple' : lvl >= 5 ? 'blue' : 'gray'}>{label}</Badge>
    }},
    { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 1 ? 'green' : 'red'}>{r.status === 1 ? 'Active' : 'Inactive'}</Badge> },
  ]

  const groupColumns: Column<GroupRow>[] = [
    { key: 'group_name', header: 'Group Name', render: r => <span className="text-sm font-medium text-slate-900">{r.group_name}</span> },
    { key: 'members_count', header: 'Members', render: r => <span className="text-sm text-slate-700">{r.members_count}</span> },
  ]

  const activeSection = SECTIONS.find(s => s.key === section)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="page-subtitle">Manage your account and system configuration</p>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar nav */}
        <div className="w-56 flex-shrink-0 space-y-1">
          {SECTIONS.map(s => {
            const isActive = section === s.key
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  isActive ? 'bg-indigo-100' : 'bg-slate-100'
                )}>
                  <s.icon size={15} className={isActive ? 'text-indigo-600' : 'text-slate-500'} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-semibold truncate', isActive ? 'text-indigo-700' : 'text-slate-700')}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{s.desc}</p>
                </div>
                {isActive && <ChevronRight size={14} className="text-indigo-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Section header */}
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

          {section === 'profile' && (
            <div className="card space-y-5">
              {/* Avatar row */}
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
                  <input
                    className="input"
                    value={profileForm.name}
                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  />
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

              <button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
                className="btn-primary"
              >
                {updateProfileMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {section === 'security' && (
            <div className="card space-y-5 max-w-lg">
              <div className="space-y-4">
                {[
                  { key: 'old_password', label: 'Current Password', placeholder: 'Enter current password' },
                  { key: 'password', label: 'New Password', placeholder: 'Min. 8 characters' },
                  { key: 'password_confirmation', label: 'Confirm New Password', placeholder: 'Repeat new password' },
                ].map(field => (
                  <div key={field.key} className="form-group">
                    <label className="label">{field.label}</label>
                    <input
                      type="password"
                      className="input"
                      placeholder={field.placeholder}
                      value={passwordForm[field.key as keyof typeof passwordForm]}
                      onChange={e => setPasswordForm(f => ({ ...f, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => changePasswordMutation.mutate()}
                disabled={!passwordForm.old_password || !passwordForm.password || changePasswordMutation.isPending}
                className="btn-primary gap-2"
              >
                <Lock size={15} />
                {changePasswordMutation.isPending ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          )}

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

          {section === 'groups' && (
            <div className="card overflow-hidden p-0">
              <DataTable columns={groupColumns} data={groups} loading={groupsLoading} emptyText="No groups found" />
            </div>
          )}
        </div>
      </div>

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
    </div>
  )
}
