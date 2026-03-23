import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  User, Lock, Shield, Mail, Phone, Globe, Camera,
  Eye, EyeOff, Save, CheckCircle2, AlertCircle, LogOut,
  Monitor, Smartphone, Tablet, Chrome, Link2, RefreshCw,
  KeyRound, Unlink, Loader2, Info, MapPin, Clock,
  Copy, Check, TrendingUp, Users, ExternalLink, Edit3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { authService } from '../../services/auth.service'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/auth.store'
import { Badge } from '../../components/ui/Badge'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { cn } from '../../utils/cn'
import { formatDateTime, timeAgo, formatPhoneNumber } from '../../utils/format'
import { showConfirm } from '../../utils/confirmDelete'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  first_name: string
  last_name: string
  email: string
  mobile: string
  extension: string
  timezone: string
}

interface PasswordForm {
  old_password: string
  password: string
  password_confirmation: string
}

interface Session {
  id: string | number
  device: string
  browser: string
  ip_address: string
  location?: string
  last_active: string
  is_current?: boolean
  [key: string]: unknown
}

interface Integration {
  provider: 'gmail' | 'google_calendar'
  label: string
  description: string
  icon: string
  connected: boolean
  account?: string
  connected_at?: string
}

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

const SECTIONS = [
  { key: 'profile',      label: 'Profile',         icon: User },
  { key: 'password',     label: 'Password',        icon: Lock },
  { key: 'sessions',     label: 'Sessions',        icon: Monitor },
  { key: '2fa',          label: '2FA',             icon: Shield },
  { key: 'integrations', label: 'Integrations',    icon: Link2 },
  { key: 'affiliate',    label: 'Affiliate Links', icon: Users },
] as const

type SectionKey = typeof SECTIONS[number]['key']

function DeviceIcon({ device }: { device: string }) {
  const d = device.toLowerCase()
  if (d.includes('mobile') || d.includes('phone')) return <Smartphone size={15} className="text-slate-400" />
  if (d.includes('tablet') || d.includes('ipad')) return <Tablet size={15} className="text-slate-400" />
  return <Monitor size={15} className="text-slate-400" />
}

// ─── Profile Info Section ─────────────────────────────────────────────────────
// Receives avatarFile from parent (banner handles the upload UI)

interface ProfileInfoProps {
  user: ReturnType<typeof useAuth>['user']
  avatarFile: File | null
  onNameChange?: (first: string, last: string) => void
}

function ProfileInfoSection({ user, avatarFile, onNameChange }: ProfileInfoProps) {
  const qc = useQueryClient()
  const { updateUser } = useAuthStore()

  const [form, setForm] = useState<ProfileForm>({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    mobile:     user?.mobile     || user?.phone || '',
    extension:  user?.extension  || '',
    timezone:   'UTC',
  })

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => authService.getProfile(),
  })

  useEffect(() => {
    const p = profileData?.data?.data || profileData?.data
    if (p) {
      const firstName = p.first_name || form.first_name
      const lastName  = p.last_name  || form.last_name
      setForm((f) => ({
        ...f,
        first_name: firstName,
        last_name:  lastName,
        email:      p.email     || f.email,
        mobile:     formatPhoneNumber(p.mobile || p.phone || f.mobile || ''),
        extension:  p.extension || f.extension,
        timezone:   p.timezone  || 'UTC',
      }))
      onNameChange?.(firstName, lastName)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData])

  const handlePhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    let formatted = ''
    if (digits.length === 0) {
      formatted = ''
    } else if (digits.startsWith('1')) {
      const rest = digits.slice(1)
      if (rest.length <= 3)      formatted = `+1 (${rest}`
      else if (rest.length <= 6) formatted = `+1 (${rest.slice(0, 3)}) ${rest.slice(3)}`
      else                       formatted = `+1 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 10)}`
    } else {
      if (digits.length <= 3)      formatted = `(${digits}`
      else if (digits.length <= 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`
      else                         formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
    setForm((f) => ({ ...f, mobile: formatted }))
  }

  const avatarMutation = useMutation({
    mutationFn: (file: File) => authService.uploadAvatar(file),
    onSuccess: (res) => {
      const pic = res.data?.data?.profile_pic || res.data?.profile_pic
      if (pic) updateUser({ profile_pic: pic })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData | Record<string, unknown>) => authService.updateProfile(data),
    onSuccess: (res) => {
      const updated = res.data?.data || res.data
      if (updated) updateUser(updated)
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success('Profile updated successfully')
      // Upload avatar separately if one was selected
      if (avatarFile) avatarMutation.mutate(avatarFile)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to update profile')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim()) { toast.error('First name is required'); return }
    const fd = new FormData()
    fd.append('id',           String(user?.id ?? ''))
    fd.append('first_name',   form.first_name)
    fd.append('last_name',    form.last_name)
    fd.append('email',        form.email)
    fd.append('phone_number', form.mobile.replace(/\D/g, '')) // backend expects digits only
    fd.append('extension',    form.extension)
    fd.append('timezone',     form.timezone)
    updateMutation.mutate(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fadeIn">
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Row 1: Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">First Name</label>
              <input
                className="input"
                value={form.first_name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, first_name: e.target.value }))
                  onNameChange?.(e.target.value, form.last_name)
                }}
                placeholder="John"
              />
            </div>
            <div className="form-group">
              <label className="label">Last Name</label>
              <input
                className="input"
                value={form.last_name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, last_name: e.target.value }))
                  onNameChange?.(form.first_name, e.target.value)
                }}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Row 2: Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label flex items-center gap-1.5">
                <Mail size={11} className="text-slate-400" />Email
              </label>
              <div className="relative">
                <input
                  className="input bg-slate-50 text-slate-400 cursor-not-allowed pr-9 select-none"
                  type="email"
                  value={form.email}
                  readOnly
                  tabIndex={-1}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Contact your administrator to change email">
                  <Info size={13} className="text-slate-300" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Contact admin to change</p>
            </div>
            <div className="form-group">
              <label className="label flex items-center gap-1.5">
                <Phone size={11} className="text-slate-400" />Phone / Mobile
              </label>
              <input
                className="input font-mono"
                type="tel"
                value={form.mobile}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(555) 555-5555"
                maxLength={18}
              />
            </div>
          </div>

          {/* Row 3: Extension + Timezone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label flex items-center gap-1.5">
                <Phone size={11} className="text-slate-400" />Extension
              </label>
              <div className="relative">
                <input
                  className="input bg-slate-50 text-slate-400 cursor-not-allowed pr-9"
                  value={form.extension}
                  readOnly
                  tabIndex={-1}
                  placeholder="—"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Managed by administrator">
                  <Info size={13} className="text-slate-300" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Managed by administrator</p>
            </div>
            <div className="form-group">
              <label className="label flex items-center gap-1.5">
                <Globe size={11} className="text-slate-400" />Timezone
              </label>
              <select
                className="input"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end mt-5 pt-4 border-t border-slate-100">
        <button
          type="submit"
          disabled={updateMutation.isPending || isLoading}
          className="btn-primary gap-2 min-w-[130px]"
        >
          {updateMutation.isPending
            ? <><Loader2 size={14} className="animate-spin" />Saving…</>
            : <><Save size={14} />Save Changes</>}
        </button>
      </div>
    </form>
  )
}

// ─── Password Section ─────────────────────────────────────────────────────────

function PasswordSection() {
  const { user } = useAuth()
  const [form, setForm] = useState<PasswordForm>({ old_password: '', password: '', password_confirmation: '' })
  const [show, setShow] = useState({ old: false, new: false, confirm: false })

  const mutation = useMutation({
    mutationFn: (data: PasswordForm) => authService.changePassword({ ...data, id: user?.id } as PasswordForm),
    onSuccess: () => {
      toast.success('Password changed successfully')
      setForm({ old_password: '', password: '', password_confirmation: '' })
    },
    onError: () => toast.error('Failed to update password. Check your current password.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.old_password) { toast.error('Current password is required'); return }
    if (form.password.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (form.password !== form.password_confirmation) { toast.error('Passwords do not match'); return }
    mutation.mutate(form)
  }

  const strength = (() => {
    const p = form.password; if (!p) return 0
    let s = 0
    if (p.length >= 8) s++; if (p.length >= 12) s++
    if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^a-zA-Z0-9]/.test(p)) s++
    return s
  })()

  const strengthConfig = [
    { label: '', color: '', bg: '' },
    { label: 'Weak',        color: 'text-red-600',     bg: 'bg-red-500' },
    { label: 'Fair',        color: 'text-amber-600',   bg: 'bg-amber-500' },
    { label: 'Good',        color: 'text-yellow-600',  bg: 'bg-yellow-400' },
    { label: 'Strong',      color: 'text-emerald-600', bg: 'bg-emerald-500' },
    { label: 'Very Strong', color: 'text-emerald-700', bg: 'bg-emerald-600' },
  ][strength]

  const toggle = (f: 'old' | 'new' | 'confirm') => setShow((s) => ({ ...s, [f]: !s[f] }))
  const EyeBtn = ({ field }: { field: 'old' | 'new' | 'confirm' }) => (
    <button type="button" onClick={() => toggle(field)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
      {show[field] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  )

  const requirements = [
    { met: form.password.length >= 8,           label: 'At least 8 characters' },
    { met: /[A-Z]/.test(form.password),         label: 'One uppercase letter' },
    { met: /[0-9]/.test(form.password),         label: 'One number' },
    { met: /[^a-zA-Z0-9]/.test(form.password),  label: 'One special character' },
  ]

  return (
    <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-5 gap-6">
      <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
          <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">Use a strong password with at least 8 characters including uppercase, numbers and symbols.</p>
        </div>

        <div className="form-group">
          <label className="label">Current Password</label>
          <div className="relative">
            <input className="input pr-10" type={show.old ? 'text' : 'password'} value={form.old_password}
              placeholder="Enter current password" onChange={(e) => setForm((f) => ({ ...f, old_password: e.target.value }))} />
            <EyeBtn field="old" />
          </div>
        </div>

        <div className="form-group">
          <label className="label">New Password</label>
          <div className="relative">
            <input className="input pr-10" type={show.new ? 'text' : 'password'} value={form.password}
              placeholder="Enter new password" onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <EyeBtn field="new" />
          </div>
          {form.password && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1 flex-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all', i < strength ? strengthConfig.bg : 'bg-slate-200')} />
                ))}
              </div>
              <span className={cn('text-xs font-semibold w-20 text-right', strengthConfig.color)}>{strengthConfig.label}</span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="label">Confirm New Password</label>
          <div className="relative">
            <input className="input pr-10" type={show.confirm ? 'text' : 'password'} value={form.password_confirmation}
              placeholder="Repeat new password" onChange={(e) => setForm((f) => ({ ...f, password_confirmation: e.target.value }))} />
            <EyeBtn field="confirm" />
          </div>
          {form.password_confirmation && form.password !== form.password_confirmation && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />Passwords do not match</p>
          )}
          {form.password_confirmation && form.password === form.password_confirmation && form.password && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 size={11} />Passwords match</p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button type="submit" disabled={mutation.isPending} className="btn-primary gap-2">
            {mutation.isPending ? <><Loader2 size={14} className="animate-spin" />Updating…</> : <><KeyRound size={14} />Update Password</>}
          </button>
        </div>
      </form>

      <div className="lg:col-span-2">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Requirements</p>
          {requirements.map((req, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all', req.met ? 'bg-emerald-100' : 'bg-slate-200')}>
                <CheckCircle2 size={11} className={req.met ? 'text-emerald-600' : 'text-slate-400'} />
              </div>
              <span className={req.met ? 'text-emerald-700' : 'text-slate-500'}>{req.label}</span>
            </div>
          ))}
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-200">Consider using a password manager.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Sessions Section ─────────────────────────────────────────────────────────

function SessionsSection() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sessions'], queryFn: () => api.get('/sessions'), retry: 1,
  })
  const revokeMutation = useMutation({
    mutationFn: (id: string | number) => api.post('/revoke-session', { session_id: id }),
    onSuccess: () => { toast.success('Session revoked'); refetch() },
    onError: () => toast.error('Could not revoke session'),
  })
  const revokeAllMutation = useMutation({
    mutationFn: () => api.post('/revoke-all-sessions'),
    onSuccess: () => { toast.success('All other sessions revoked'); refetch() },
    onError: () => toast.error('Could not revoke sessions'),
  })

  const sessions: Session[] = data?.data?.data || data?.data || []
  const fallback: Session[] = [{
    id: 'current', device: 'Desktop',
    browser: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 40) : 'Chrome',
    ip_address: '—', location: 'Current Session', last_active: new Date().toISOString(), is_current: true,
  }]
  const displaySessions = sessions.length > 0 ? sessions : (isLoading ? [] : fallback)
  const otherSessions = displaySessions.filter((s) => !s.is_current)

  const columns: Column<Session>[] = [
    {
      key: 'device', header: 'Device / Browser',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <DeviceIcon device={r.device || ''} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
              {r.browser || r.device || 'Unknown'}
              {r.is_current && <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-indigo-50 text-indigo-600 font-semibold border border-indigo-100">This device</span>}
            </p>
            <p className="text-xs text-slate-400">{r.device || 'Unknown device'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'ip_address', header: 'IP Address',
      render: (r) => <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">{r.ip_address || '—'}</span>,
    },
    {
      key: 'location', header: 'Location',
      render: (r) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          {r.location && r.location !== '—' && <MapPin size={12} className="text-slate-400" />}
          {r.location || '—'}
        </div>
      ),
    },
    {
      key: 'last_active', header: 'Last Active',
      render: (r) => (
        <div className="flex items-start gap-1.5">
          <Clock size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-slate-700 font-medium">{timeAgo(r.last_active)}</p>
            <p className="text-xs text-slate-400">{formatDateTime(r.last_active)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'actions', header: '',
      render: (r) => r.is_current ? (
        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active now
        </span>
      ) : (
        <button onClick={() => revokeMutation.mutate(r.id)} disabled={revokeMutation.isPending}
          className="btn-ghost btn-sm text-red-500 hover:bg-red-50 hover:text-red-600 gap-1.5">
          <LogOut size={12} />Revoke
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{displaySessions.length} active session{displaySessions.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-slate-400">Devices currently signed in to your account</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-ghost btn-sm p-2" title="Refresh">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          {otherSessions.length > 0 && (
            <button onClick={() => revokeAllMutation.mutate()} disabled={revokeAllMutation.isPending}
              className="btn-outline text-red-600 border-red-200 hover:bg-red-50 gap-1.5 btn-sm">
              {revokeAllMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
              Revoke All Others
            </button>
          )}
        </div>
      </div>
      {otherSessions.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">You have <strong>{otherSessions.length}</strong> other active session{otherSessions.length !== 1 ? 's' : ''}. Revoke any you don't recognize.</p>
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={displaySessions as unknown as Session[]} loading={isLoading} keyField="id" emptyText="No active sessions found" />
      </div>
    </div>
  )
}

// ─── Two-Factor Section ───────────────────────────────────────────────────────

function TwoFactorSection({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const { updateUser } = useAuthStore()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [step, setStep] = useState<'idle' | 'setup' | 'verify'>('idle')

  const isEnabled = !!(user?.is_2fa_google_enabled || user?.two_factor_enabled)

  const enableMutation = useMutation({
    mutationFn: () => api.post('/2fa/setup'),
    onSuccess: (res) => {
      const qr = res.data?.data?.qr_code || res.data?.qr_code
      if (qr) { setQrCode(qr); setStep('verify') }
      else toast.error('Could not generate QR code — please try again')
    },
    onError: () => toast.error('Could not initiate 2FA setup'),
  })
  const verifyMutation = useMutation({
    mutationFn: (code: string) => api.post('/2fa/enable', { otp: code }),
    onSuccess: () => {
      toast.success('Two-factor authentication enabled')
      updateUser({ is_2fa_google_enabled: 1 }); setStep('idle'); setQrCode(null); setOtpInput('')
    },
    onError: () => toast.error('Invalid code — please try again'),
  })
  const disableMutation = useMutation({
    mutationFn: () => api.post('/2fa/disable'),
    onSuccess: () => { toast.success('Two-factor authentication disabled'); updateUser({ is_2fa_google_enabled: 0 }) },
    onError: () => toast.error('Could not disable 2FA'),
  })

  const handleToggle = async () => {
    if (isEnabled) {
      if (await showConfirm({ message: 'Disable two-factor authentication? This will make your account less secure.', confirmText: 'Yes, disable it' }))
        disableMutation.mutate()
    } else { setStep('setup'); enableMutation.mutate() }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className={cn(
        'relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border-2 transition-all',
        isEnabled ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50' : 'border-slate-200 bg-slate-50'
      )}>
        <div className="flex items-center gap-4">
          <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0', isEnabled ? 'bg-emerald-100' : 'bg-slate-200')}>
            <Shield size={20} className={isEnabled ? 'text-emerald-600' : 'text-slate-500'} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">Authenticator App (TOTP)</p>
              <Badge variant={isEnabled ? 'green' : 'gray'}>{isEnabled ? 'Enabled' : 'Disabled'}</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{isEnabled ? 'Your account is protected with 2FA' : 'Recommended — adds a second verification step'}</p>
          </div>
        </div>
        <button onClick={handleToggle} disabled={enableMutation.isPending || disableMutation.isPending}
          className={cn('btn-sm gap-1.5 flex-shrink-0', isEnabled ? 'btn-outline text-red-600 border-red-200 hover:bg-red-50' : 'btn-primary')}>
          {(enableMutation.isPending || disableMutation.isPending) ? <Loader2 size={13} className="animate-spin" /> : isEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      </div>

      {step === 'setup' && enableMutation.isPending && (
        <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
          <Loader2 size={18} className="animate-spin text-indigo-500" /><span className="text-sm">Generating QR code…</span>
        </div>
      )}

      {step === 'verify' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 animate-fadeIn">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-slate-800">Step 1 — Scan QR Code</p>
            <p className="text-xs text-slate-500">Open Google Authenticator, Authy, or any TOTP app and scan this QR code.</p>
            {qrCode && (
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block self-start">
                <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-slate-800">Step 2 — Enter Code</p>
            <p className="text-xs text-slate-500">Enter the 6-digit code shown in your authenticator app to confirm setup.</p>
            <div className="form-group">
              <label className="label">Verification code</label>
              <input className="input font-mono tracking-[0.4em] text-center text-xl" placeholder="000000" maxLength={6}
                value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => verifyMutation.mutate(otpInput)} disabled={otpInput.length !== 6 || verifyMutation.isPending} className="btn-primary gap-2">
                {verifyMutation.isPending ? <><Loader2 size={14} className="animate-spin" />Verifying…</> : <><CheckCircle2 size={14} />Confirm &amp; Enable</>}
              </button>
              <button type="button" onClick={() => { setStep('idle'); setQrCode(null); setOtpInput('') }} className="btn-ghost btn-sm text-slate-500">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { icon: Shield,     text: 'Adds a second layer of protection beyond your password' },
          { icon: Smartphone, text: 'Works with Google Authenticator, Authy, and all TOTP apps' },
          { icon: Monitor,    text: 'Required each time you sign in from a new device' },
          { icon: KeyRound,   text: 'Backup codes can be generated if you lose your device' },
        ].map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Icon size={13} className="text-indigo-600" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Integrations Section ─────────────────────────────────────────────────────

function IntegrationsSection() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['integrations'], queryFn: () => api.get('/integrations'), retry: 1,
  })
  const connectMutation = useMutation({
    mutationFn: (provider: string) => api.post('/connect-integration', { provider }),
    onSuccess: (res) => {
      const url = res.data?.data?.redirect_url || res.data?.redirect_url
      if (url) window.location.href = url
      else { toast.success('Integration connected'); refetch() }
    },
    onError: () => toast.error('Could not connect integration'),
  })
  const disconnectMutation = useMutation({
    mutationFn: (provider: string) => api.post('/disconnect-integration', { provider }),
    onSuccess: () => { toast.success('Integration disconnected'); refetch() },
    onError: () => toast.error('Could not disconnect integration'),
  })

  const apiIntegrations: Integration[] = data?.data?.data || data?.data || []
  const defaults: Integration[] = [
    { provider: 'gmail', label: 'Gmail', description: 'Sync emails, send from Gmail, and log email activity to contacts.', icon: 'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png', connected: false },
    { provider: 'google_calendar', label: 'Google Calendar', description: 'Schedule follow-ups, sync call reminders, and manage your availability.', icon: 'https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png', connected: false },
  ]
  const integrations = defaults.map((d) => { const found = apiIntegrations.find((i) => i.provider === d.provider); return found ? { ...d, ...found } : d })

  return (
    <div className="space-y-4 animate-fadeIn">
      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>
      ) : integrations.map((intg) => (
        <div key={intg.provider} className={cn(
          'flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-200',
          intg.connected ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-white' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20'
        )}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              <img src={intg.icon} alt={intg.label} className="w-8 h-8 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900">{intg.label}</p>
                {intg.connected && <Badge variant="green">Connected</Badge>}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{intg.description}</p>
              {intg.connected && intg.account && (
                <p className="text-xs text-slate-400 mt-1.5 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded-md">{intg.account}</p>
              )}
              {intg.connected && intg.connected_at && (
                <p className="text-xs text-slate-400 mt-1">Connected {timeAgo(intg.connected_at)}</p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            {intg.connected ? (
              <button onClick={() => disconnectMutation.mutate(intg.provider)} disabled={disconnectMutation.isPending}
                className="btn-outline text-red-600 border-red-200 hover:bg-red-50 gap-1.5 btn-sm">
                {disconnectMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}Disconnect
              </button>
            ) : (
              <button onClick={() => connectMutation.mutate(intg.provider)} disabled={connectMutation.isPending}
                className="btn-primary btn-sm gap-1.5">
                {connectMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Chrome size={13} />}Connect
              </button>
            )}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
        <Shield size={11} />All integrations use OAuth 2.0 — we never store your passwords.
      </p>
    </div>
  )
}

// ─── Affiliate Links Section ──────────────────────────────────────────────────

interface MyAffiliateLink {
  affiliate_code: string | null
  affiliate_url: string | null
  has_code: boolean
}

interface AffiliateUser {
  id: number
  name: string
  email: string
  role: number
  affiliate_code: string | null
  affiliate_url: string | null
  leads_generated: number
}

function AffiliateCopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all">
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

function AffiliateLinksSection() {
  const qc = useQueryClient()
  const [customCode, setCustomCode] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const { data: myLink, isLoading: myLinkLoading } = useQuery({
    queryKey: ['my-affiliate-link'],
    queryFn: async () => { const res = await api.get<{ success: boolean; data: MyAffiliateLink }>('/crm/affiliate/my-link'); return res.data.data },
  })
  const { data: teamUsers, isLoading: teamLoading } = useQuery({
    queryKey: ['affiliate-users'],
    queryFn: async () => { const res = await api.get<{ success: boolean; data: AffiliateUser[] }>('/crm/affiliate/users'); return res.data.data },
  })

  const generateMutation = useMutation({
    mutationFn: (code?: string) => api.post('/crm/affiliate/generate-code', { custom_code: code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-affiliate-link'] })
      qc.invalidateQueries({ queryKey: ['affiliate-users'] })
      setShowCustom(false); setCustomCode('')
      toast.success('Affiliate code generated!')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err?.response?.data?.message ?? 'Failed to generate code'),
  })

  const steps = [
    { num: '1', title: 'Get Your Link',  desc: 'Generate your unique affiliate code below' },
    { num: '2', title: 'Share It',       desc: 'Send the link via email, social, or SMS' },
    { num: '3', title: 'Client Applies', desc: 'Client fills the application — no login required' },
    { num: '4', title: 'Lead Created',   desc: 'A new lead is automatically added to your CRM pipeline' },
  ]

  const totalLeads = (teamUsers ?? []).reduce((n, u) => n + u.leads_generated, 0)
  const withCodes  = (teamUsers ?? []).filter(u => u.affiliate_code).length

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* My affiliate link */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Link2 size={18} /></div>
          <div>
            <h3 className="font-bold text-lg">My Affiliate Link</h3>
            <p className="text-emerald-100 text-xs">Share this link to generate leads</p>
          </div>
        </div>

        {myLinkLoading ? (
          <div className="flex items-center gap-2 text-emerald-100"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : !myLink?.has_code ? (
          <div className="space-y-3">
            <p className="text-emerald-100 text-sm">You don't have an affiliate link yet.</p>
            <button onClick={() => generateMutation.mutate(undefined)} disabled={generateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all text-sm">
              {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              Generate My Affiliate Link
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white/15 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">Your Code</p>
                <span className="text-lg font-mono font-bold">{myLink.affiliate_code}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                <p className="flex-1 text-xs font-mono truncate text-white">{myLink.affiliate_url}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {myLink.affiliate_url && <AffiliateCopyButton text={myLink.affiliate_url} label="Copy Link" />}
              {myLink.affiliate_url && (
                <a href={myLink.affiliate_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all">
                  <ExternalLink size={12} />Preview
                </a>
              )}
              <button onClick={() => setShowCustom(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all">
                <Edit3 size={12} />Custom Code
              </button>
              <button onClick={() => generateMutation.mutate(undefined)} disabled={generateMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all">
                {generateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}Regenerate
              </button>
            </div>
            {showCustom && (
              <div className="bg-white/15 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-emerald-100">Custom Code (letters &amp; numbers only)</p>
                <div className="flex gap-2">
                  <input type="text" value={customCode}
                    onChange={e => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="e.g. johndoe or mycompany"
                    className="flex-1 bg-white/20 text-white placeholder-white/50 rounded-xl px-3 py-2 text-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <button disabled={!customCode || generateMutation.isPending} onClick={() => generateMutation.mutate(customCode)}
                    className="px-4 py-2 bg-white text-emerald-700 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-emerald-50 transition-all">
                    Set
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <TrendingUp size={15} className="text-amber-600" />
          </div>
          <h3 className="font-bold text-slate-800">How Affiliate Links Work</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map(s => (
            <div key={s.num} className="text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center mx-auto mb-2">{s.num}</div>
              <p className="font-semibold text-slate-800 text-sm mb-1">{s.title}</p>
              <p className="text-xs text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team table */}
      {!teamLoading && (teamUsers ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Users size={15} className="text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-800">Team Affiliate Links</h3>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-lg font-bold text-slate-900">{withCodes}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Active Links</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{totalLeads}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total Leads</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-slate-400 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3">Agent</th>
                  <th className="text-left px-5 py-3">Affiliate Code</th>
                  <th className="text-left px-5 py-3">Affiliate Link</th>
                  <th className="text-center px-5 py-3">Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(teamUsers ?? []).map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.affiliate_code
                        ? <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">{u.affiliate_code}</span>
                        : <span className="text-slate-300 italic text-xs">No code</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.affiliate_url
                        ? <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-mono truncate max-w-[180px]">{u.affiliate_url}</span>
                            <AffiliateCopyButton text={u.affiliate_url} />
                          </div>
                        : <span className="text-slate-300 italic text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`font-bold ${u.leads_generated > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{u.leads_generated}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Profile() {
  const { user } = useAuth()
  const [section, setSection] = useState<SectionKey>('profile')
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()

  // Avatar state lives here — single source of truth, drives the banner
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.profile_pic || null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Live name state for banner (updated as user types in the form)
  const [displayName, setDisplayName] = useState({
    first: user?.first_name || '',
    last:  user?.last_name  || '',
  })

  useEffect(() => {
    if (user?.profile_pic) setAvatarPreview(user.profile_pic)
    if (user?.first_name || user?.last_name) setDisplayName({ first: user.first_name || '', last: user.last_name || '' })
  }, [user])

  useEffect(() => {
    const integration = searchParams.get('integration')
    const status      = searchParams.get('status')
    const message     = searchParams.get('message')
    if (integration) {
      setSection('integrations')
      if (status === 'success') {
        toast.success(`${integration === 'google_calendar' ? 'Google Calendar' : 'Integration'} connected successfully`)
        qc.invalidateQueries({ queryKey: ['integrations'] })
      } else if (status === 'error') {
        toast.error(message ? decodeURIComponent(message) : 'Integration connection failed')
      }
      setSearchParams({}, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const processAvatarFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const avatarLabel = [displayName.first, displayName.last]
    .filter(Boolean).map((n) => n[0]).join('').toUpperCase() || 'U'

  const is2faEnabled = !!(user?.is_2fa_google_enabled || user?.two_factor_enabled)

  return (
    <div className="animate-fadeIn">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-5">
        {/* Cover gradient */}
        <div className="h-28 w-full" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 45%, #0ea5e9 100%)' }} />
        {/* Decorative circles */}
        <div className="absolute top-3 right-10 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute top-6 right-24 w-12 h-12 rounded-full bg-white/5" />
        <div className="absolute -top-1 right-36 w-8 h-8 rounded-full bg-white/8" />

        {/* White bottom bar */}
        <div className="bg-white border border-slate-200 border-t-0 rounded-b-2xl px-5 pt-3 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* ── Single avatar — clickable to upload ── */}
              <div
                className={cn(
                  'relative group cursor-pointer flex-shrink-0 -mt-10',
                  isDragging && 'scale-105',
                )}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) processAvatarFile(f) }}
                title="Click to change photo"
              >
                <div className={cn(
                  'w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center ring-4 ring-white shadow-lg transition-all',
                  isDragging && 'ring-indigo-300',
                  avatarPreview ? 'bg-slate-200' : 'bg-gradient-to-br from-indigo-100 to-violet-100',
                )}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    : <span className="text-2xl font-bold text-indigo-600">{avatarLabel}</span>}
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={18} className="text-white" />
                </div>
                {/* Camera badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center pointer-events-none">
                  <Camera size={10} className="text-white" />
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processAvatarFile(f) }} />
              </div>

              {/* Name + email — always inside white area */}
              <div className="pt-1">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {displayName.first || displayName.last
                    ? `${displayName.first} ${displayName.last}`.trim()
                    : 'Your Name'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
                <p className="text-xs text-slate-400 mt-1.5">Click photo to change · JPG, PNG or GIF · max 2 MB</p>
              </div>
            </div>

            {/* Badges */}
            <div className="pt-1 flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
              {user?.extension && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
                  <Phone size={10} />Ext. {user.extension}
                </div>
              )}
              {is2faEnabled && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                  <Shield size={10} />2FA Active
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────────── */}
      <div className="tab-bar mb-4">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSection(key)}
            className={cn('tab-btn flex items-center gap-2', section === key && 'tab-btn-active')}>
            <Icon size={14} />{label}
            {key === '2fa' && is2faEnabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
          </button>
        ))}
      </div>

      {/* ── Section Content ───────────────────────────────────────────── */}
      <div className="card">
        {section === 'profile'      && <ProfileInfoSection user={user} avatarFile={avatarFile} onNameChange={(f, l) => setDisplayName({ first: f, last: l })} />}
        {section === 'password'     && <PasswordSection />}
        {section === 'sessions'     && <SessionsSection />}
        {section === '2fa'          && <TwoFactorSection user={user} />}
        {section === 'integrations' && <IntegrationsSection />}
        {section === 'affiliate'    && <AffiliateLinksSection />}
      </div>
    </div>
  )
}
