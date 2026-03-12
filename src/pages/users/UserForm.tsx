import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { userService } from '../../services/user.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'UTC',
]

const DIALER_MODES = [
  { value: 'webphone', label: 'WebPhone' },
  { value: 'extension', label: 'Extension' },
  { value: 'mobile_app', label: 'Mobile App' },
]

const DEFAULT_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  extension: '',
  alt_extension: '',
  dialer_mode: 'webphone',
  group_id: [] as number[],
  timezone: 'America/New_York',
  level: 1,
  status: 1,
}

export function UserForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(DEFAULT_FORM)

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['extension-groups'],
    queryFn: () => userService.getGroups(),
  })

  useEffect(() => {
    if (existing?.data?.data) {
      const u = existing.data.data
      setForm({
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        email: u.email || '',
        password: '',
        extension: u.extension || '',
        alt_extension: u.alt_extension || '',
        dialer_mode: u.dialer_mode || 'webphone',
        group_id: Array.isArray(u.group_id) ? u.group_id : (u.group_id ? [u.group_id] : []),
        timezone: u.timezone || 'America/New_York',
        level: u.level || 1,
        status: u.status ?? 1,
      })
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, ...(isEdit ? { user_id: Number(id) } : {}) }
      if (!payload.password) delete (payload as Record<string, unknown>).password
      if (isEdit) {
        return userService.update(payload as Record<string, unknown>)
      }
      return userService.create(payload as Record<string, unknown>)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'User updated' : 'User created')
      navigate('/users')
    },
    onError: () => {
      toast.error('Failed to save user')
    },
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const groups: Array<{ id: number; title?: string; group_name?: string }> =
    groupsData?.data?.data || groupsData?.data || []

  const toggleGroup = (gid: number) => {
    setForm(f => ({
      ...f,
      group_id: f.group_id.includes(gid)
        ? f.group_id.filter(x => x !== gid)
        : [...f.group_id, gid],
    }))
  }

  if (isEdit && loadingExisting) return <PageLoader />

  return (
    <div className="w-full space-y-5">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/users')} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit User' : 'Add User'}</h1>
          <p className="page-subtitle">{isEdit ? `Editing user #${id}` : 'Create a new agent or admin'}</p>
        </div>
      </div>

      {/* Top row: Personal Info + Dialer Settings side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Personal Info */}
        <div className="card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900">Personal Info</h3>
            <p className="text-xs text-slate-500 mt-0.5">Basic account information</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">First Name <span className="text-red-500">*</span></label>
              <input className="input" value={form.first_name}
                onChange={e => set('first_name', e.target.value)} placeholder="John" />
            </div>
            <div className="form-group">
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name}
                onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Email <span className="text-red-500">*</span></label>
            <input type="email" className="input" value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="user@company.com" />
          </div>

          <div className="form-group">
            <label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" className="input" value={form.password}
              onChange={e => set('password', e.target.value)} placeholder="••••••••" />
          </div>
        </div>

        {/* Dialer Settings */}
        <div className="card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900">Dialer Settings</h3>
            <p className="text-xs text-slate-500 mt-0.5">Phone and dialer configuration</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Extension</label>
              <input className="input font-mono" value={form.extension}
                onChange={e => set('extension', e.target.value)} placeholder="1001" />
            </div>
            <div className="form-group">
              <label className="label">Alt Extension</label>
              <input className="input font-mono" value={form.alt_extension}
                onChange={e => set('alt_extension', e.target.value)} placeholder="1002" />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Dialer Mode</label>
            <select className="input" value={form.dialer_mode} onChange={e => set('dialer_mode', e.target.value)}>
              {DIALER_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Timezone</label>
            <select className="input" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Role & Access — full width */}
      <div className="card space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-semibold text-slate-900">Role & Access</h3>
          <p className="text-xs text-slate-500 mt-0.5">Permissions and group assignments</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Access Level</label>
            <select className="input" value={form.level} onChange={e => set('level', Number(e.target.value))}>
              <option value={1}>Agent (Level 1)</option>
              <option value={5}>Manager (Level 5)</option>
              <option value={7}>Admin (Level 7)</option>
              <option value={10}>Super Admin (Level 10)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', Number(e.target.value))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>
        </div>

        {groups.length > 0 && (
          <div className="form-group">
            <label className="label">Agent Groups</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-1">
              {groups.map((g: { id: number; title?: string; group_name?: string }) => {
                const checked = form.group_id.includes(g.id)
                const label = g.title || g.group_name || `Group ${g.id}`
                return (
                  <label key={g.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                    checked ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <input type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroup(g.id)}
                      className="rounded accent-indigo-600" />
                    <span className={`text-sm font-medium ${checked ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate('/users')} className="btn-outline flex-1">Cancel</button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={(!form.first_name || !form.email || (!isEdit && !form.password)) || saveMutation.isPending}
          className="btn-primary flex-1"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
        </button>
      </div>
    </div>
  )
}
