import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, User, Phone, Shield } from 'lucide-react'
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
  dialer_mode: 'webphone',
  group_id: [] as number[],
  timezone: 'America/New_York',
  user_level: 1,
  status: 1,
  asterisk_server_id: 0,
}

type FormErrors = Partial<Record<keyof typeof DEFAULT_FORM, string>>

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-slate-100 mb-5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-indigo-600">{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

/* Field wrapper — uses gap-1.5 for uniform internal spacing.
   Label uses block + no bottom margin so the gap controls all spacing. */
function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="block text-sm font-medium text-slate-700 leading-none">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400 leading-none">{hint}</p>}
      {error && <p className="text-xs text-red-500 flex items-center gap-1 leading-none">{error}</p>}
    </div>
  )
}


export function UserForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['extension-groups'],
    queryFn: () => userService.getGroups(),
  })

  const { data: serversData } = useQuery({
    queryKey: ['client-servers'],
    queryFn: () => userService.getServers(),
  })

  const servers: Array<{ id: number; title_name?: string; detail?: string }> =
    serversData?.data?.data || serversData?.data || []

  // Auto-select first server for new user
  useEffect(() => {
    if (!isEdit && servers.length > 0 && !form.asterisk_server_id) {
      setForm(f => ({ ...f, asterisk_server_id: servers[0].id }))
    }
  }, [servers, isEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load existing user data for edit
  useEffect(() => {
    if (existing?.data?.data) {
      const u = existing.data.data
      setForm({
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        email: u.email || '',
        password: '',
        extension: u.extension || '',
        dialer_mode: u.dialer_mode || 'webphone',
        group_id: Array.isArray(u.group_id) ? u.group_id : (u.group_id ? [u.group_id] : []),
        timezone: u.timezone || 'America/New_York',
        user_level: u.user_level || u.level || 1,
        status: u.status ?? 1,
        asterisk_server_id: u.asterisk_server_id || 0,
      })
    }
  }, [existing])

  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!form.first_name.trim()) e.first_name = 'First name is required'
    if (!form.email.trim()) {
      e.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address'
    }
    if (!isEdit && !form.password) {
      e.password = 'Password is required'
    } else if (!isEdit && form.password.length < 4) {
      e.password = 'Password must be at least 4 characters'
    }
    if (!isEdit) {
      if (!form.extension) {
        e.extension = 'Extension is required'
      } else {
        const ext = Number(form.extension)
        if (!Number.isInteger(ext) || ext < 1000 || ext > 9999) {
          e.extension = 'Extension must be a 4-digit number (1000–9999)'
        }
      }
      if (!form.asterisk_server_id) {
        e.asterisk_server_id = 'Select an Asterisk server'
      }
    }
    return e
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { ...form }
      // Ensure extension is sent as integer
      if (payload.extension) payload.extension = Number(payload.extension)
      // For edit, swap in extension_id and drop password if blank
      if (isEdit) {
        payload.extension_id = Number(id)
        if (!payload.password) delete payload.password
        return userService.update(payload)
      }
      return userService.create(payload)
    },
    onSuccess: (res) => {
      const data = (res as { data?: { success?: boolean | string; message?: string } | null })?.data
      if (!data || data.success === false || data.success === 'false') {
        toast.error((data as { message?: string } | null)?.message || 'Failed to save user')
        return
      }
      toast.success(isEdit ? 'User updated successfully' : 'User created successfully')
      qc.invalidateQueries({ queryKey: ['users'] })
      if (isEdit) qc.invalidateQueries({ queryKey: ['user', id] })
      navigate('/users')
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      const interceptorHandled = status && (status === 401 || status === 403 || status === 422 || status >= 500)
      if (!interceptorHandled) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(msg || 'Failed to save user')
      }
    },
  })

  const set = (key: string, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }))
    if (submitted) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    saveMutation.mutate()
  }

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

  const inputCls = (field: keyof FormErrors) =>
    `input ${errors[field] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`

  return (
    <div className="w-full space-y-5">

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/users')} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit User' : 'Add User'}</h1>
          <p className="page-subtitle">
            {isEdit ? `Editing user #${id}` : 'Fill in the details below to create a new team member'}
          </p>
        </div>
      </div>

      {/* Row 1: Account Info + Dialer Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Account Information */}
        <div className="card">
          <SectionHeader
            icon={<User size={15} />}
            title="Account Information"
            subtitle="Name, email and login credentials"
          />

          <div className="space-y-4">
            {/* First + Last name side by side */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" required error={errors.first_name}>
                <input
                  className={inputCls('first_name')}
                  value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                  placeholder="John"
                />
              </Field>
              <Field label="Last Name">
                <input
                  className="input"
                  value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                  placeholder="Smith"
                />
              </Field>
            </div>

            <Field label="Email Address" required error={errors.email}>
              <input
                type="email"
                className={inputCls('email')}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="user@company.com"
              />
            </Field>

            <Field
              label={isEdit ? 'New Password' : 'Password'}
              required={!isEdit}
              hint={isEdit ? 'Leave blank to keep the current password' : 'Minimum 4 characters'}
              error={errors.password}
            >
              <input
                type="password"
                className={inputCls('password')}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>

        {/* Dialer Settings */}
        <div className="card">
          <SectionHeader
            icon={<Phone size={15} />}
            title="Dialer Settings"
            subtitle="Extension, mode and server configuration"
          />

          <div className="space-y-4">
            <Field
              label="Extension Number"
              required={!isEdit}
              hint="4-digit number between 1000 and 9999"
              error={errors.extension}
            >
              <input
                className={`${inputCls('extension')} font-mono`}
                value={form.extension}
                onChange={e => set('extension', e.target.value)}
                placeholder="1001"
                maxLength={4}
              />
            </Field>

            <Field label="Dialer Mode">
              <select
                className="input"
                value={form.dialer_mode}
                onChange={e => set('dialer_mode', e.target.value)}
              >
                {DIALER_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>

            <Field label="Timezone">
              <select
                className="input"
                value={form.timezone}
                onChange={e => set('timezone', e.target.value)}
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </Field>

            {servers.length > 0 && (
              <Field
                label="Asterisk Server"
                required={!isEdit}
                error={errors.asterisk_server_id}
              >
                <select
                  className={inputCls('asterisk_server_id')}
                  value={form.asterisk_server_id}
                  onChange={e => set('asterisk_server_id', Number(e.target.value))}
                >
                  <option value={0} disabled>Select a server…</option>
                  {servers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title_name || s.detail || `Server ${s.id}`}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </div>
      </div>

      {/* Role & Access — full width */}
      <div className="card">
        <SectionHeader
          icon={<Shield size={15} />}
          title="Role & Access"
          subtitle="Set permissions and assign to agent groups"
        />

        <div className="space-y-4">
          {/* Access Level + Status on same row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Access Level">
              <select
                className="input"
                value={form.user_level}
                onChange={e => set('user_level', Number(e.target.value))}
              >
                <option value={1}>Agent</option>
                <option value={5}>Manager</option>
                <option value={7}>Admin</option>
                <option value={10}>Super Admin</option>
              </select>
            </Field>

            <Field label="Account Status">
              <select
                className="input"
                value={form.status}
                onChange={e => set('status', Number(e.target.value))}
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </Field>
          </div>

          {/* Agent Groups */}
          {groups.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="block text-sm font-medium text-slate-700 leading-none">Agent Groups</label>
              <p className="text-xs text-slate-400">Select which groups this user belongs to</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-1">
                {groups.map((g) => {
                  const checked = form.group_id.includes(g.id)
                  const label = g.title || g.group_name || `Group ${g.id}`
                  return (
                    <label
                      key={g.id}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                        checked ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroup(g.id)}
                        className="rounded accent-indigo-600"
                      />
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
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/users')}
          className="btn-outline flex-1"
          disabled={saveMutation.isPending}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="btn-primary flex-1"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update User' : 'Create User'}
        </button>
      </div>
    </div>
  )
}
