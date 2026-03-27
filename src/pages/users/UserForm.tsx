import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, User, Phone, Shield, KeyRound,
  PhoneForwarded, Voicemail, Users,
  RefreshCw, Eye, EyeOff, Copy, PhoneIncoming,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { userService } from '../../services/user.service'
import { didService } from '../../services/did.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'

// ---------------------------------------------------------------------------
// Auto-generation helpers
// ---------------------------------------------------------------------------
function genExtension(): string {
  return String(Math.floor(Math.random() * 9000) + 1000)
}

function genPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const nums  = '0123456789'
  const syms  = '@#!'
  const all   = upper + lower + nums + syms
  const pick  = (s: string) => s[Math.floor(Math.random() * s.length)]
  const chars = [pick(upper), pick(lower), pick(nums), pick(syms)]
  for (let i = chars.length; i < 10; i++) chars.push(pick(all))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

function genPin(): string {
  return String(Math.floor(Math.random() * 900000) + 100000).slice(0, 4 + Math.floor(Math.random() * 3))
}

/** Strip non-digits, cap at 10, format as (XXX) XXX-XXXX */
function formatUSPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'UTC',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney',
]

const DIALER_MODES = [
  { value: 'webphone',   label: 'WebPhone' },
  { value: 'extension',  label: 'Extension' },
  { value: 'mobile_app', label: 'Mobile App' },
]

// Backend validates extension_type as string|max:3
const EXTENSION_TYPES = [
  { value: 'ext', label: 'Extension' },
  { value: 'que', label: 'Ring group/Queue' },
]

/** Map legacy long codes (stored in DB) to the ≤3-char codes the backend requires */
function mapExtType(val: string): string {
  if (val === 'extension') return 'ext'
  if (val === 'ring_group') return 'que'
  return val
}

const CLI_SETTINGS = [
  { value: 0, label: 'Area Code' },
  { value: 1, label: 'Custom' },
  { value: 2, label: 'Area Code + Randomizer' },
]

const DID_DEST_LABEL: Record<number, string> = {
  0: 'IVR', 1: 'Extension', 2: 'Voicemail', 4: 'External', 8: 'Queue',
}

const COUNTRY_CODES = [
  { code: '+1',   short: 'US',  label: '+1 United States / Canada' },
  { code: '+44',  short: 'UK',  label: '+44 United Kingdom' },
  { code: '+61',  short: 'AU',  label: '+61 Australia' },
  { code: '+33',  short: 'FR',  label: '+33 France' },
  { code: '+49',  short: 'DE',  label: '+49 Germany' },
  { code: '+91',  short: 'IN',  label: '+91 India' },
  { code: '+81',  short: 'JP',  label: '+81 Japan' },
  { code: '+86',  short: 'CN',  label: '+86 China' },
  { code: '+55',  short: 'BR',  label: '+55 Brazil' },
  { code: '+52',  short: 'MX',  label: '+52 Mexico' },
  { code: '+34',  short: 'ES',  label: '+34 Spain' },
  { code: '+39',  short: 'IT',  label: '+39 Italy' },
  { code: '+7',   short: 'RU',  label: '+7 Russia' },
  { code: '+971', short: 'UAE', label: '+971 United Arab Emirates' },
  { code: '+966', short: 'SA',  label: '+966 Saudi Arabia' },
  { code: '+92',  short: 'PK',  label: '+92 Pakistan' },
  { code: '+27',  short: 'ZA',  label: '+27 South Africa' },
  { code: '+63',  short: 'PH',  label: '+63 Philippines' },
  { code: '+60',  short: 'MY',  label: '+60 Malaysia' },
  { code: '+65',  short: 'SG',  label: '+65 Singapore' },
]

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------
const makeDefault = () => ({
  first_name: '',
  last_name: '',
  email: '',
  mobile: '',
  country_code: '+1',
  password: genPassword(),
  extension: genExtension(),
  extension_type: 'ext',
  dialer_mode: 'webphone',
  timezone: 'America/New_York',
  asterisk_server_id: 0,
  user_level: 1,
  status: 1,
  group_id: [] as number[],
  voicemail: 0,
  voicemail_send_to_email: 0,
  vm_pin: '',
  follow_me: 0,
  call_forward: 0,
  twinning: 0,
  no_answer_redirect: 0,
  no_answer_phone: '',
  cli_setting: 0,
  cli: '',
  receive_sms_on_email: 0,
  receive_sms_on_mobile: 0,
  ip_filtering: 0,
  enable_2fa: 0,
  app_status: 0,
})

type FormState = ReturnType<typeof makeDefault>
type FormErrors = Partial<Record<keyof FormState | 'asterisk_server_id', string>>

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Compact section header — less vertical space than the original */
function CSectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
      <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    </div>
  )
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600 leading-none">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400 leading-none mt-0.5">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 leading-none mt-0.5">{error}</p>}
    </div>
  )
}

/** Compact toggle chip — fits 2-per-row in a grid, replaces full-width ToggleRow */
function ToggleChip({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium w-full transition-all text-left',
        on
          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
      )}
    >
      <span className="leading-tight">{label}</span>
      {/* Mini toggle indicator */}
      <div className={cn(
        'relative flex-shrink-0 h-4 w-7 rounded-full transition-colors duration-200',
        on ? 'bg-indigo-500' : 'bg-slate-300'
      )}>
        <div className={cn(
          'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200',
          on ? 'left-3.5' : 'left-0.5'
        )} />
      </div>
    </button>
  )
}


// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function UserForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(id)
  const clientId = useAuthStore(s => s.user?.parent_id)

  const [form, setForm] = useState<FormState>(makeDefault)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const initialServerSet = useRef(false)

  // -------------------------------------------------------------------------
  // Remote data
  // -------------------------------------------------------------------------
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['extension-groups', clientId],
    queryFn: () => userService.getGroups(),
  })

  const { data: serversData } = useQuery({
    queryKey: ['client-servers'],
    queryFn: () => userService.getServers(),
  })

  const servers: Array<{ id: number; title_name?: string; detail?: string }> =
    serversData?.data?.data || serversData?.data || []

  const groups: Array<{ id: number; title?: string; group_name?: string }> =
    groupsData?.data?.data || groupsData?.data || []

  const { data: didsData } = useQuery({
    queryKey: ['did-dropdown'],
    queryFn: () => didService.list({ page: 1, limit: 500, search: '', filters: {} }),
    staleTime: 60_000,
  })
  const dids: Array<{ id: number; cli?: string; title?: string }> =
    (didsData?.data?.data ?? didsData?.data ?? []) as Array<{ id: number; cli?: string; title?: string }>

  // Auto-select first server for new users
  useEffect(() => {
    if (!isEdit && servers.length > 0 && !initialServerSet.current) {
      initialServerSet.current = true
      setForm(f => ({ ...f, asterisk_server_id: servers[0].id }))
    }
  }, [servers, isEdit])

  // Load existing data for edit
  useEffect(() => {
    if (existing?.data?.data) {
      const u = existing.data.data as Record<string, unknown>
      setForm(f => ({
        ...f,
        first_name: (u.first_name as string) || '',
        last_name:  (u.last_name  as string) || '',
        email:      (u.email      as string) || '',
        mobile:     (u.mobile     as string) || '',
        country_code: (u.country_code as string) || '+1',
        password: '',
        extension: (u.extension as string) || '',
        extension_type: mapExtType((u.extension_type as string) || 'ext'),
        dialer_mode: (u.dialer_mode as string) || 'webphone',
        timezone: (u.timezone as string) || 'America/New_York',
        asterisk_server_id: Number(u.asterisk_server_id) || 0,
        user_level: Number(u.user_level || u.level) || 1,
        status: Number(u.status ?? 1),
        group_id: Array.isArray(u.group_id)
          ? (u.group_id as number[])
          : (u.group_id ? [Number(u.group_id)] : []),
        voicemail: Number(u.voicemail ?? 0),
        voicemail_send_to_email: Number(u.voicemail_send_to_email ?? 0),
        vm_pin: (u.vm_pin as string) || '',
        follow_me: Number(u.follow_me ?? 0),
        call_forward: Number(u.call_forward ?? 0),
        twinning: Number(u.twinning ?? 0),
        no_answer_redirect: Number(u.no_answer_redirect ?? 0),
        no_answer_phone: (u.no_answer_phone as string) || '',
        cli_setting: Number(u.cli_setting ?? 0),
        cli: (u.cli as string) || '',
        receive_sms_on_email: Number(u.receive_sms_on_email ?? 0),
        receive_sms_on_mobile: Number(u.receive_sms_on_mobile ?? 0),
        ip_filtering: Number(u.ip_filtering ?? 0),
        enable_2fa: Number(u.enable_2fa ?? 0),
        app_status: Number(u.app_status ?? 0),
      }))
    }
  }, [existing])

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const set = (key: string, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }))
    if (submitted) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const toggle = (key: keyof FormState) =>
    setForm(f => ({ ...f, [key]: f[key] === 1 ? 0 : 1 }))

  const toggleGroup = (gid: number) => {
    setForm(f => ({
      ...f,
      group_id: f.group_id.includes(gid)
        ? f.group_id.filter(x => x !== gid)
        : [...f.group_id, gid],
    }))
  }

  const inputCls = (field: keyof FormErrors) =>
    cn('input', errors[field] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : '')

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => {})
  }

  const redirectActive = form.follow_me === 1 || form.call_forward === 1 || form.twinning === 1

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!form.first_name.trim()) e.first_name = 'First name is required'
    if (!form.email.trim()) {
      e.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address'
    }
    if (!form.mobile.trim()) {
      e.mobile = 'Phone number is required'
    } else if (form.mobile.replace(/\D/g, '').length !== 10) {
      e.mobile = 'Must be exactly 10 digits'
    }
    if (form.no_answer_redirect === 1) {
      if (!form.no_answer_phone.trim()) {
        e.no_answer_phone = 'Redirect number is required'
      } else if (form.no_answer_phone.replace(/\D/g, '').length !== 10) {
        e.no_answer_phone = 'Must be exactly 10 digits'
      }
    }
    if (!isEdit) {
      const ext = Number(form.extension)
      if (!form.extension || !Number.isInteger(ext) || ext < 1000 || ext > 9999) {
        e.extension = 'Must be 4-digit (1000–9999)'
      }
      if (!form.asterisk_server_id) {
        e.asterisk_server_id = 'Select an Asterisk server'
      }
    }
    return e
  }

  // -------------------------------------------------------------------------
  // Save mutation
  // -------------------------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        const payload: Record<string, unknown> = {
          extension_id: Number(id),
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          // Backend validates mobile as `numeric` — strip US formatting to raw digits
          mobile: form.mobile.replace(/\D/g, ''),
          country_code: form.country_code,
          extension_type: form.extension_type,
          dialer_mode: form.dialer_mode,
          timezone: form.timezone,
          group_id: form.group_id,
          voicemail: form.voicemail,
          voicemail_send_to_email: form.voicemail_send_to_email,
          vm_pin: form.vm_pin ? Number(form.vm_pin) : undefined,
          follow_me: form.follow_me,
          call_forward: form.call_forward,
          twinning: form.twinning,
          no_answer_redirect: form.no_answer_redirect,
          no_answer_phone: form.no_answer_redirect ? form.no_answer_phone : '',
          cli_setting: form.cli_setting,
          cli: form.cli,
          receive_sms_on_email: form.receive_sms_on_email,
          receive_sms_on_mobile: form.receive_sms_on_mobile,
          ip_filtering: form.ip_filtering,
          enable_2fa: form.enable_2fa,
          app_status: form.app_status,
        }
        if (form.password) payload.password = form.password
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])
        return userService.update(payload)
      }
      // Create
      const payload: Record<string, unknown> = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        mobile: form.mobile,
        country_code: form.country_code,
        password: form.password,
        extension: Number(form.extension),
        extension_type: form.extension_type,
        dialer_mode: form.dialer_mode,
        timezone: form.timezone,
        asterisk_server_id: form.asterisk_server_id,
        user_level: form.user_level,
        status: form.status,
        group_id: form.group_id,
        voicemail: form.voicemail,
        voicemail_send_to_email: form.voicemail_send_to_email,
        vm_pin: form.vm_pin ? Number(form.vm_pin) : undefined,
        follow_me: form.follow_me,
        call_forward: form.call_forward,
        // Backend validates twinning as string|max:3
        twinning: String(form.twinning),
        no_answer_redirect: form.no_answer_redirect,
        no_answer_phone: form.no_answer_redirect ? form.no_answer_phone : '',
        cli_setting: form.cli_setting,
        cli: form.cli,
        receive_sms_on_email: form.receive_sms_on_email,
        receive_sms_on_mobile: form.receive_sms_on_mobile,
        ip_filtering: form.ip_filtering,
        enable_2fa: form.enable_2fa,
        app_status: form.app_status,
      }
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])
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
      const interceptorHandled = status && (status === 400 || status === 401 || status === 403 || status === 422 || status >= 500)
      if (!interceptorHandled) {
        const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
        const msg = data?.message || (data?.errors ? (Object.values(data.errors)[0]?.[0] ?? '') : '')
        toast.error(msg || 'Failed to save user')
      }
      // Auto-regenerate extension on collision
      const errors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors
      if (errors?.extension) {
        set('extension', genExtension())
      }
    },
  })

  const handleSubmit = () => {
    setSubmitted(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    saveMutation.mutate()
  }

  if (isEdit && loadingExisting) return <PageLoader />

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="w-full space-y-4">

      {/* ── Page Header with inline actions ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/users')} className="btn-ghost p-1.5 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {isEdit ? 'Edit User' : 'Add New User'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Editing user #${id}` : 'Fill in the details to create a new team member'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 1: 3-column — Personal Info | Account Setup | Role & System ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Card 1: Personal & Contact */}
        <div className="card">
          <CSectionHeader icon={<User size={13} />} title="Personal & Contact" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
            <Field label="Phone Number" required hint="10-digit US format" error={errors.mobile}>
              <div className="flex gap-2">
                <select
                  className="input flex-shrink-0 w-28"
                  value={form.country_code}
                  onChange={e => set('country_code', e.target.value)}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} {c.short}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  className={cn(inputCls('mobile'), 'flex-1')}
                  value={form.mobile}
                  onChange={e => set('mobile', formatUSPhone(e.target.value))}
                  placeholder="(555) 555-5555"
                  maxLength={14}
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Card 2: Account Setup */}
        <div className="card">
          <CSectionHeader icon={<KeyRound size={13} />} title="Account Setup" />
          <div className="space-y-3">
            <Field
              label="Extension"
              hint={isEdit ? 'Cannot be changed after creation' : 'Auto-generated 4-digit'}
              error={errors.extension}
            >
              <div className="flex gap-2">
                <input
                  className="input font-mono flex-1 bg-slate-50 text-slate-500 cursor-not-allowed"
                  value={form.extension}
                  readOnly
                  disabled
                />
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => set('extension', genExtension())}
                    className="btn-ghost p-2 rounded-lg border border-slate-200 hover:bg-slate-100"
                    title="Regenerate extension"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </Field>
            {isEdit ? (
              <Field label="New Password" hint="Leave blank to keep current" error={errors.password}>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={cn(inputCls('password'), 'flex-1')}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Leave blank to keep"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="btn-ghost p-2 rounded-lg border border-slate-200 hover:bg-slate-100"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>
            ) : (
              <Field label="Password" hint="Auto-generated — copy and share" error={errors.password}>
                <div className="flex gap-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input flex-1 font-mono bg-slate-50 text-slate-700"
                    value={form.password}
                    readOnly
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="btn-ghost p-2 rounded-lg border border-slate-200 hover:bg-slate-100" title={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button type="button" onClick={() => copyToClipboard(form.password)} className="btn-ghost p-2 rounded-lg border border-slate-200 hover:bg-slate-100" title="Copy password">
                    <Copy size={14} />
                  </button>
                  <button type="button" onClick={() => set('password', genPassword())} className="btn-ghost p-2 rounded-lg border border-slate-200 hover:bg-slate-100" title="Regenerate">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </Field>
            )}
            {servers.length > 0 && (
              <Field label="Asterisk Server" required={!isEdit} error={errors.asterisk_server_id}>
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

        {/* Card 3: Role & System */}
        <div className="card">
          <CSectionHeader icon={<Shield size={13} />} title="Role & System" />
          <div className="space-y-3">
            <Field label="Extension Type">
              <select className="input" value={form.extension_type} onChange={e => set('extension_type', e.target.value)}>
                {EXTENSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Dialer Mode">
              <select className="input" value={form.dialer_mode} onChange={e => set('dialer_mode', e.target.value)}>
                {DIALER_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Timezone">
              <select className="input" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* ── Row 2: Features & Routing | Voicemail + Groups ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Card 4: Features & Call Routing */}
        <div className="card">
          <CSectionHeader icon={<PhoneForwarded size={13} />} title="Features & Call Routing" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <ToggleChip label="Follow Me"      on={form.follow_me === 1}               onToggle={() => toggle('follow_me')} />
              <ToggleChip label="Call Forward"   on={form.call_forward === 1}            onToggle={() => toggle('call_forward')} />
              <ToggleChip label="Twinning"       on={form.twinning === 1}                onToggle={() => toggle('twinning')} />
              <ToggleChip label="Voicemail"      on={form.voicemail === 1}               onToggle={() => toggle('voicemail')} />
              <ToggleChip label="VM → Email"     on={form.voicemail_send_to_email === 1} onToggle={() => toggle('voicemail_send_to_email')} />
              <ToggleChip label="IP Filtering"   on={form.ip_filtering === 1}            onToggle={() => toggle('ip_filtering')} />
              <ToggleChip label="Enable 2FA"     on={form.enable_2fa === 1}              onToggle={() => toggle('enable_2fa')} />
              <ToggleChip label="Mobile App"     on={form.app_status === 1}              onToggle={() => toggle('app_status')} />
              <ToggleChip label="SMS → Email"    on={form.receive_sms_on_email === 1}    onToggle={() => toggle('receive_sms_on_email')} />
              <ToggleChip label="SMS → Phone"    on={form.receive_sms_on_mobile === 1}   onToggle={() => toggle('receive_sms_on_mobile')} />
            </div>
            {redirectActive && (
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs border',
                form.mobile
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              )}>
                <Phone size={12} className="flex-shrink-0" />
                {form.mobile
                  ? <span>Redirect destination: <span className="font-semibold">{form.mobile}</span></span>
                  : <span>Enter a phone number above to use as redirect destination</span>
                }
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <Field label="CLI Setting">
                <select className="input" value={form.cli_setting} onChange={e => set('cli_setting', Number(e.target.value))}>
                  {CLI_SETTINGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              {form.cli_setting === 1 && (
                <Field label="Custom CLI" hint="Select a DID to display as caller ID">
                  <select className="input" value={form.cli} onChange={e => set('cli', e.target.value)}>
                    <option value="">— Select DID —</option>
                    {dids.map(d => {
                      const raw = d as Record<string, unknown>
                      const destLabel = DID_DEST_LABEL[Number(raw.dest_type)] ?? 'Other'
                      const cnam = (raw.cnam as string) || ''
                      const number = d.cli || `DID #${d.id}`
                      return (
                        <option key={d.id} value={d.cli ?? ''}>
                          {`${number}${cnam ? ` - ${cnam}` : ''} - ${destLabel}`}
                        </option>
                      )
                    })}
                  </select>
                </Field>
              )}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.no_answer_redirect === 1}
                  onChange={() => toggle('no_answer_redirect')}
                  className="w-4 h-4 mt-0.5 rounded accent-indigo-600 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <PhoneIncoming size={11} className="text-slate-400" />
                    No Answer Redirect
                  </p>
                  <p className="text-[11px] text-slate-400">Forward unanswered calls to an external number</p>
                </div>
              </label>
              {form.no_answer_redirect === 1 && (
                <div className="mt-2 ml-6 space-y-1">
                  <input
                    type="tel"
                    className={cn('input w-full', errors.no_answer_phone ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : '')}
                    value={form.no_answer_phone}
                    onChange={e => set('no_answer_phone', formatUSPhone(e.target.value))}
                    placeholder="(555) 555-5555"
                    maxLength={14}
                  />
                  {errors.no_answer_phone && <p className="text-xs text-red-500">{errors.no_answer_phone}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 5: Voicemail PIN + Agent Groups */}
        <div className="card">
          <div className="space-y-4">
            <div>
              <CSectionHeader icon={<Voicemail size={13} />} title="Voicemail PIN" />
              <Field label="VM PIN" hint="4–6 digit PIN for accessing voicemail">
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input flex-1 font-mono"
                    value={form.vm_pin}
                    onChange={e => set('vm_pin', e.target.value)}
                    placeholder="e.g. 1234"
                    min={1000}
                    max={999999}
                  />
                  <button
                    type="button"
                    onClick={() => set('vm_pin', genPin())}
                    className="btn-ghost px-3 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </Field>
            </div>
            {groups.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <CSectionHeader icon={<Users size={13} />} title="Agent Groups" />
                <Field label="Agent Group" hint="Assign this user to a group">
                  <select
                    className="input"
                    value={form.group_id[0] ?? ''}
                    onChange={e => set('group_id', e.target.value ? [Number(e.target.value)] : [])}
                  >
                    <option value="">— No Group —</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.title || g.group_name || `Group ${g.id}`}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Actions ── */}
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
